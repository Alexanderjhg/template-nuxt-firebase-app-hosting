// server/api/protected/channels/messages/[messageId]/react.post.ts
// Toggle de reacción (emoji) en un mensaje. Agrega si no existe, quita si ya está.

import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const messageId = getRouterParam(event, "messageId");
  const { workspaceId, channelId, emoji, isDM } = await readBody<{
    workspaceId: string;
    channelId: string;
    emoji: string;
    isDM?: boolean;
  }>(event);

  if (!workspaceId || !channelId || !messageId || !emoji) {
    throw createError({ statusCode: 400, message: "Parámetros requeridos faltantes" });
  }

  const db = getAdminFirestore();
  const msgRef = isDM
    ? db.collection("workspaces").doc(workspaceId).collection("dms").doc(channelId).collection("messages").doc(messageId)
    : db.collection("workspaces").doc(workspaceId).collection("channels").doc(channelId).collection("messages").doc(messageId);

  const msgDoc = await msgRef.get();
  if (!msgDoc.exists) throw createError({ statusCode: 404, message: "Mensaje no encontrado" });

  const reactions: Record<string, string[]> = msgDoc.data()!.reactions ?? {};
  const field = `reactions.${emoji}`;

  if (reactions[emoji]?.includes(user.uid)) {
    await msgRef.update({ [field]: FieldValue.arrayRemove(user.uid) });
  } else {
    await msgRef.update({ [field]: FieldValue.arrayUnion(user.uid) });
  }

  return { ok: true };
});
