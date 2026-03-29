// server/api/protected/channels/messages/send.post.ts
// Envía un mensaje a un canal o DM.
// Sanitiza el contenido antes de guardarlo.
// Actualiza el preview del canal/DM en tiempo real.
// Si el canal es de tipo "agent", dispara webhook firmado al agente.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { sanitizeMessage } from "~/server/utils/sanitizeMessage";
import { FieldValue } from "firebase-admin/firestore";
import { dispatchWebhook } from "~/server/utils/webhookDispatch";
import { resolveUserInfo } from "~/server/utils/resolveDisplayName";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, channelId, content, isDM, replyToId, replyToPreview, replyToSenderName } = await readBody<{
    workspaceId: string;
    channelId: string;
    content: string;
    isDM?: boolean;
    replyToId?: string;
    replyToPreview?: string;
    replyToSenderName?: string;
  }>(event);

  if (!workspaceId || !channelId || !content?.trim()) {
    throw createError({ statusCode: 400, message: "workspaceId, channelId y content son requeridos" });
  }

  if (content.length > 4000) {
    throw createError({ statusCode: 400, message: "El mensaje no puede superar 4000 caracteres" });
  }

  const db = getAdminFirestore();
  const now = FieldValue.serverTimestamp();

  // Obtener datos del miembro para denormalizar
  const memberDoc = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("members")
    .doc(user.uid)
    .get();

  if (!memberDoc.exists) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }

  const member = memberDoc.data()!;
  // Priorizar nombre del perfil global (users/{uid}) sobre el del workspace member
  const profile = await resolveUserInfo(db, user.uid, member.displayName, member.photoURL);
  const sanitized = sanitizeMessage(content.trim());

  const colPath = isDM
    ? db.collection("workspaces").doc(workspaceId).collection("dms").doc(channelId).collection("messages")
    : db.collection("workspaces").doc(workspaceId).collection("channels").doc(channelId).collection("messages");

  const messageRef = colPath.doc();
  const parentRef = isDM
    ? db.collection("workspaces").doc(workspaceId).collection("dms").doc(channelId)
    : db.collection("workspaces").doc(workspaceId).collection("channels").doc(channelId);

  const batch = db.batch();

  batch.set(messageRef, {
    senderId: user.uid,
    senderName: profile.displayName,
    senderPhoto: profile.photoURL,
    content: sanitized,
    contentRaw: content.trim(),
    type: "text",
    createdAt: now,
    ...(replyToId ? { replyToId, replyToPreview: replyToPreview?.slice(0, 150) ?? "", replyToSenderName: replyToSenderName ?? "" } : {}),
  });

  batch.update(parentRef, {
    lastMessageAt: now,
    lastMessagePreview: sanitized.slice(0, 80),
  });

  await batch.commit();

  // ── Webhook saliente a agentes (fire-and-forget) ───────────────────────────
  // Solo se dispara en canales de agente (tipo "agent"), no en DMs ni canales normales.
  if (!isDM) {
    const channelDoc = await db
      .collection("workspaces").doc(workspaceId)
      .collection("channels").doc(channelId)
      .get();

    const channelData = channelDoc.data();
    console.info(
      `[send] channelId=${channelId} type=${channelData?.type ?? "unknown"} agentId=${channelData?.agentId ?? "none"}`
    );
    if (channelData?.type === "agent" && channelData.agentId) {
      const agentDoc = await db
        .collection("workspaces").doc(workspaceId)
        .collection("agents").doc(channelData.agentId)
        .get();

      const agentData = agentDoc.data();
      console.info(
        `[send] agent found=${agentDoc.exists} isActive=${agentData?.isActive} hasWebhook=${!!agentData?.webhookUrl} hasSecret=${!!agentData?.webhookSecret}`
      );
      if (agentData?.webhookUrl && agentData.webhookSecret && agentData.isActive) {
        // Cargar historial reciente del canal para dar contexto al agente
        const recentSnap = await db
          .collection("workspaces").doc(workspaceId)
          .collection("channels").doc(channelId)
          .collection("messages")
          .orderBy("createdAt", "desc")
          .limit(20)
          .get();

        const conversationHistory = recentSnap.docs
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

        dispatchWebhook(agentData.webhookUrl, agentData.webhookSecret, {
          event: "message.created",
          workspaceId,
          agentId: channelData.agentId,
          data: {
            messageId: messageRef.id,
            channelId,
            senderId: user.uid,
            senderName: profile.displayName,
            content: sanitized,
            createdAt: new Date().toISOString(),
            conversationHistory,
          },
        });
      }
    }
  }

  return { messageId: messageRef.id };
});
