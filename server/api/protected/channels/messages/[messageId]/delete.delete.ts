// server/api/protected/channels/messages/[messageId]/delete.delete.ts
// Soft-delete de un mensaje (reemplaza el contenido, no borra el documento).

import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const messageId = getRouterParam(event, "messageId");
  const { workspaceId, channelId, isDM } = await readBody<{
    workspaceId: string;
    channelId: string;
    isDM?: boolean;
  }>(event);

  if (!workspaceId || !channelId || !messageId) {
    throw createError({ statusCode: 400, message: "Parámetros requeridos faltantes" });
  }

  const db = getAdminFirestore();
  const msgRef = isDM
    ? db.collection("workspaces").doc(workspaceId).collection("dms").doc(channelId).collection("messages").doc(messageId)
    : db.collection("workspaces").doc(workspaceId).collection("channels").doc(channelId).collection("messages").doc(messageId);

  const msgDoc = await msgRef.get();
  if (!msgDoc.exists) throw createError({ statusCode: 404, message: "Mensaje no encontrado" });

  // Solo el dueño o admins pueden borrar
  const isOwner = msgDoc.data()!.senderId === user.uid;
  if (!isOwner) {
    const memberDoc = await db
      .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get();
    const role = memberDoc.data()?.role;
    if (!["owner", "admin"].includes(role)) {
      throw createError({ statusCode: 403, message: "Sin permiso para borrar este mensaje" });
    }
  }

  await msgRef.update({
    content: "Este mensaje fue eliminado",
    deletedAt: FieldValue.serverTimestamp(),
    type: "system",
  });

  return { ok: true };
});
