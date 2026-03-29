// server/api/protected/channels/messages/[messageId]/edit.patch.ts
// Edita el contenido de un mensaje propio.

import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { sanitizeMessage } from "~/server/utils/sanitizeMessage";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const messageId = getRouterParam(event, "messageId");
  const { workspaceId, channelId, content, isDM } = await readBody<{
    workspaceId: string;
    channelId: string;
    content: string;
    isDM?: boolean;
  }>(event);

  if (!workspaceId || !channelId || !messageId || !content?.trim()) {
    throw createError({ statusCode: 400, message: "Parámetros requeridos faltantes" });
  }

  const db = getAdminFirestore();
  const msgRef = isDM
    ? db.collection("workspaces").doc(workspaceId).collection("dms").doc(channelId).collection("messages").doc(messageId)
    : db.collection("workspaces").doc(workspaceId).collection("channels").doc(channelId).collection("messages").doc(messageId);

  const msgDoc = await msgRef.get();
  if (!msgDoc.exists) throw createError({ statusCode: 404, message: "Mensaje no encontrado" });
  if (msgDoc.data()!.senderId !== user.uid) {
    throw createError({ statusCode: 403, message: "Solo puedes editar tus propios mensajes" });
  }

  await msgRef.update({
    content: sanitizeMessage(content.trim()),
    editedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});
