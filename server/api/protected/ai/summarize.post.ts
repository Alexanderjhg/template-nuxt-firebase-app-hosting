// server/api/protected/ai/summarize.post.ts
// Genera un resumen de los últimos N mensajes de un canal y lo publica
// como respuesta del Asistente IA directamente en el mismo canal.

import { defineEventHandler, readBody, createError } from "h3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { checkAiRateLimit } from "~/server/utils/rateLimit";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, channelId } = await readBody<{
    workspaceId: string;
    channelId: string;
  }>(event);

  if (!workspaceId || !channelId) {
    throw createError({ statusCode: 400, message: "workspaceId y channelId son requeridos" });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const rateCheck = await checkAiRateLimit(user.uid);
  if (!rateCheck.allowed) {
    throw createError({ statusCode: 429, message: "Límite de consultas IA alcanzado. Intenta en 1 hora." });
  }

  const db = getAdminFirestore();

  // Verificar membresía
  const memberDoc = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(user.uid)
    .get();

  if (!memberDoc.exists) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }

  // ── Leer últimos 20 mensajes humanos del canal ────────────────────────────
  const snap = await db
    .collection("workspaces").doc(workspaceId)
    .collection("channels").doc(channelId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const messages = snap.docs
    .map((d) => {
      const data = d.data();
      return { senderId: data.senderId as string, senderName: data.senderName as string, content: data.content as string, type: data.type as string };
    })
    .filter((m) =>
      m.senderId !== "ai-assistant" &&
      !m.senderId?.startsWith("ai-") &&
      !["ai_search_result", "calendar_event", "ai_suggestion", "agent_notification", "system"].includes(m.type)
    )
    .reverse();

  if (messages.length === 0) {
    throw createError({ statusCode: 400, message: "No hay mensajes para resumir en este canal" });
  }

  // ── Llamar Gemini ─────────────────────────────────────────────────────────
  const config = useRuntimeConfig();
  const apiKey = (config.geminiApiKey as string)?.trim();
  if (!apiKey) throw createError({ statusCode: 503, message: "IA no configurada" });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Eres un asistente de resumen de conversaciones.
Genera resúmenes claros, concisos y útiles en español.
Usa formato de texto simple con bullet points si hay varios temas.
Máximo 300 palabras.`,
    generationConfig: { temperature: 0.3 } as any,
  });

  const contextText = messages.map((m) => `${m.senderName}: ${m.content}`).join("\n");
  const prompt = `Resume los siguientes ${messages.length} mensajes del canal:\n\n${contextText}`;

  let summary = "No pude generar el resumen. Intenta de nuevo.";
  try {
    const result = await model.generateContent(prompt);
    summary = result.response.text().trim() || summary;
  } catch (err) {
    console.error("[ai/summarize] Error con Gemini:", err);
  }

  // ── Escribir resumen en el canal como mensaje del Asistente IA ────────────
  const now = FieldValue.serverTimestamp();
  const channelRef = db.collection("workspaces").doc(workspaceId).collection("channels").doc(channelId);
  const msgRef = channelRef.collection("messages").doc();

  const batch = db.batch();

  batch.set(msgRef, {
    senderId: "ai-assistant",
    senderName: "Asistente IA",
    senderPhoto: "",
    content: `📝 **Resumen del canal**\n\n${summary}`,
    type: "ai_suggestion",
    createdAt: now,
  });

  batch.update(channelRef, {
    lastMessageAt: now,
    lastMessagePreview: `📝 Resumen del canal`,
  });

  await batch.commit();

  console.info(`[ai/summarize] uid=${user.uid} workspaceId=${workspaceId} channelId=${channelId} msgId=${msgRef.id}`);

  return { ok: true, messageId: msgRef.id };
});
