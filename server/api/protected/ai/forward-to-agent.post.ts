// server/api/protected/ai/forward-to-agent.post.ts
// Reenvía una tarea detectada por el observador a un agente externo.
// Envía un mensaje al canal dedicado del agente y dispara el webhook.
// La respuesta del agente llegará al canal dedicado vía /api/agents/notify.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { dispatchWebhook } from "~/server/utils/webhookDispatch";
import { FieldValue } from "firebase-admin/firestore";
import * as bcryptjs from "bcryptjs";

interface ForwardBody {
  workspaceId: string;
  agentId: string;
  taskDescription: string;
  additionalContext?: string;
  sourceChannelId: string;
  suggestionId?: string;
  replyTarget?: "source" | "dm" | "agent"; // dónde debe llegar la respuesta
  pin?: string; // PIN del usuario si el agente lo requiere
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, agentId, taskDescription, additionalContext, sourceChannelId, suggestionId, replyTarget, pin } =
    await readBody<ForwardBody>(event);

  if (!workspaceId || !agentId || !taskDescription) {
    throw createError({ statusCode: 400, message: "workspaceId, agentId y taskDescription son requeridos" });
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

  const member = memberDoc.data()!;

  // Obtener agente
  const agentDoc = await db
    .collection("workspaces").doc(workspaceId)
    .collection("agents").doc(agentId)
    .get();

  if (!agentDoc.exists) {
    throw createError({ statusCode: 404, message: "Agente no encontrado" });
  }

  const agent = agentDoc.data()!;
  if (!agent.isActive) {
    throw createError({ statusCode: 400, message: "El agente está desactivado" });
  }

  // ── Validar PIN del agente si está configurado ────────────────────────────
  if (agent.pinHash) {
    if (!pin) {
      throw createError({ statusCode: 403, message: "PIN requerido para usar este agente" });
    }

    // Validar el PIN contra el hash del agente
    const pinValid = await bcryptjs.compare(pin, agent.pinHash);
    if (!pinValid) {
      throw createError({ statusCode: 403, message: "PIN incorrecto" });
    }
  }

  const dedicatedChannelId = agent.dedicatedChannelId;
  if (!dedicatedChannelId) {
    throw createError({ statusCode: 400, message: "El agente no tiene canal dedicado" });
  }

  const now = FieldValue.serverTimestamp();

  // Escribir mensaje del usuario en el canal del agente
  const msgRef = db
    .collection("workspaces").doc(workspaceId)
    .collection("channels").doc(dedicatedChannelId)
    .collection("messages").doc();

  const channelRef = db
    .collection("workspaces").doc(workspaceId)
    .collection("channels").doc(dedicatedChannelId);

  const messageContent = additionalContext
    ? `[Reenviado desde #canal] ${taskDescription}\n\n📝 Contexto adicional:\n${additionalContext}`
    : `[Reenviado desde #canal] ${taskDescription}`;

  const batch = db.batch();

  batch.set(msgRef, {
    senderId: user.uid,
    senderName: member.displayName,
    senderPhoto: member.photoURL ?? "",
    content: messageContent,
    type: "text",
    createdAt: now,
  });

  batch.update(channelRef, {
    lastMessageAt: now,
    lastMessagePreview: messageContent.slice(0, 80),
  });

  await batch.commit();

  // ── Determinar dónde debe responder el agente ─────────────────────────
  let replyToChannelId = dedicatedChannelId; // default: canal del agente
  let replyToDmId: string | null = null;

  if (replyTarget === "source") {
    // Responder en el canal origen donde el usuario está chateando
    replyToChannelId = sourceChannelId;
  } else if (replyTarget === "dm") {
    // Responder en un DM entre el agente y el usuario
    // Buscar DM existente o crear uno
    const dmsSnap = await db
      .collection("workspaces").doc(workspaceId)
      .collection("dms")
      .where("participantIds", "array-contains", user.uid)
      .get();

    const existingDm = dmsSnap.docs.find((d) => {
      const data = d.data();
      return data.agentId === agentId;
    });

    if (existingDm) {
      replyToDmId = existingDm.id;
    } else {
      // Crear DM del agente con el usuario
      const dmRef = db
        .collection("workspaces").doc(workspaceId)
        .collection("dms").doc();

      await dmRef.set({
        participantIds: [user.uid],
        agentId,
        isAgentDM: true,
        participantMap: {
          [user.uid]: { displayName: member.displayName, photoURL: member.photoURL ?? "" },
          [agentId]: { displayName: agent.name, photoURL: "" },
        },
        createdAt: now,
        lastMessageAt: now,
        lastMessagePreview: "",
      });
      replyToDmId = dmRef.id;
    }
    replyToChannelId = null as any;
  }

  // Disparar webhook al agente con contexto del canal origen
  if (agent.webhookUrl && agent.webhookSecret) {
    // Cargar historial reciente del canal origen para dar contexto
    const sourceSnap = await db
      .collection("workspaces").doc(workspaceId)
      .collection("channels").doc(sourceChannelId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(15)
      .get();

    const sourceMessages = sourceSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          type: data.type,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        };
      })
      .reverse();

    dispatchWebhook(agent.webhookUrl, agent.webhookSecret, {
      event: "task.forwarded",
      workspaceId,
      agentId,
      data: {
        messageId: msgRef.id,
        channelId: dedicatedChannelId,
        sourceChannelId,
        senderId: user.uid,
        senderName: member.displayName,
        taskDescription,
        additionalContext: additionalContext || undefined,
        sourceMessages,
        forwardedAt: new Date().toISOString(),
        // Indica al agente dónde enviar su respuesta
        replyTo: {
          target: replyTarget ?? "agent",
          channelId: replyToChannelId ?? null,
          dmId: replyToDmId ?? null,
        },
      },
    });
  }

  // Marcar sugerencia como aceptada si se proporcionó
  if (suggestionId) {
    await db
      .collection("workspaces").doc(workspaceId)
      .collection("ai_suggestions").doc(suggestionId)
      .update({ status: "forwarded" });
  }

  console.info(
    `[forward-to-agent] uid=${user.uid} agentId=${agentId} replyTarget=${replyTarget ?? "agent"} channel=${dedicatedChannelId}`,
  );

  return {
    ok: true,
    messageId: msgRef.id,
    dedicatedChannelId,
    replyTarget: replyTarget ?? "agent",
    replyDmId: replyToDmId,
  };
});
