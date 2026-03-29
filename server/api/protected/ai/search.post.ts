// server/api/protected/ai/search.post.ts
// Web search powered by Gemini with Google Search grounding.
// Saves the result as a message in the specified channel or DM.

import { defineEventHandler, readBody, createError } from "h3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { checkAiRateLimit } from "~/server/utils/rateLimit";
import { FieldValue } from "firebase-admin/firestore";

const SYSTEM_PROMPT =
  "You are a helpful search assistant. Answer the user's question using the search results provided. Be concise and informative. Always cite sources when possible. Respond in the same language as the query.";

export default defineEventHandler(async (event) => {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  // ── Body validation ────────────────────────────────────────────────────────
  const { workspaceId, query, channelId, dmId, skipMessage } = await readBody<{
    workspaceId: string;
    query: string;
    channelId?: string;
    dmId?: string;
    skipMessage?: boolean;
  }>(event);

  if (!workspaceId || !query?.trim()) {
    throw createError({
      statusCode: 400,
      message: "workspaceId y query son requeridos",
    });
  }

  if (!channelId && !dmId) {
    throw createError({
      statusCode: 400,
      message: "Se requiere channelId o dmId",
    });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const rateCheck = await checkAiRateLimit(user.uid);
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      message: "Límite de consultas IA alcanzado. Intenta en 1 hora.",
    });
  }

  // ── Gemini setup ──────────────────────────────────────────────────────────
  const config = useRuntimeConfig();
  const apiKey = (config.geminiApiKey as string)?.trim();
  if (!apiKey) {
    throw createError({ statusCode: 503, message: "IA no configurada" });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ googleSearch: {} } as any],
  });

  // ── Call Gemini with Google Search grounding ──────────────────────────────
  let resultText = "No pude completar la búsqueda. Intenta de nuevo.";
  let sources: string[] = [];

  try {
    const result = await model.generateContent(query.trim());
    const response = result.response;
    resultText = response.text().trim() || resultText;

    // Extract grounding sources from the response metadata
    const candidates = response.candidates;
    if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = candidates[0].groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => chunk.web.uri);
    }
    // Fallback: check webSearchQueries or supportChunks
    if (
      sources.length === 0 &&
      candidates?.[0]?.groundingMetadata?.webSearchQueries
    ) {
      // No direct URLs available, but search was performed
      sources = [];
    }
  } catch (err) {
    console.error("[ai/search] Error calling Gemini:", err);
    throw createError({
      statusCode: 502,
      message: "Error al realizar la búsqueda con IA",
    });
  }

  // ── Save message to Firestore ─────────────────────────────────────────────
  const db = getAdminFirestore();
  const now = FieldValue.serverTimestamp();

  if (!skipMessage) {
    let parentRef: FirebaseFirestore.DocumentReference;
    let messagesRef: FirebaseFirestore.CollectionReference;

    if (dmId) {
      parentRef = db
        .collection("workspaces")
        .doc(workspaceId)
        .collection("dms")
        .doc(dmId);
      messagesRef = parentRef.collection("messages");
    } else {
      parentRef = db
        .collection("workspaces")
        .doc(workspaceId)
        .collection("channels")
        .doc(channelId!);
      messagesRef = parentRef.collection("messages");
    }

    const msgRef = messagesRef.doc();

    try {
      await msgRef.set({
        senderId: "ai-assistant",
        senderName: "\uD83D\uDD0D B\u00FAsqueda IA",
        senderPhoto: "",
        content: resultText,
        type: "ai_search_result",
        createdAt: now,
      });

      await parentRef.update({
        lastMessageAt: now,
        lastMessagePreview: resultText.slice(0, 80),
      });
    } catch (err) {
      console.error("[ai/search] Error saving message to Firestore:", err);
      throw createError({
        statusCode: 500,
        message: "Error al guardar el resultado de búsqueda",
      });
    }
  }

  console.info(
    `[ai/search] uid=${user.uid} workspace=${workspaceId} sources=${sources.length}`,
  );

  return { ok: true, result: resultText, sources };
});
