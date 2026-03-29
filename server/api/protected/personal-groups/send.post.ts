// server/api/protected/personal-groups/send.post.ts
// Envía un mensaje en un grupo personal.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { sanitizeMessage } from "~/server/utils/sanitizeMessage";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { groupId, content } = await readBody<{ groupId: string; content: string }>(event);
  if (!groupId || !content?.trim()) {
    throw createError({ statusCode: 400, message: "groupId y content son requeridos" });
  }
  if (content.length > 4000) {
    throw createError({ statusCode: 400, message: "Mensaje demasiado largo" });
  }

  const db = getAdminFirestore();

  const groupDoc = await db.collection("personalGroups").doc(groupId).get();
  if (!groupDoc.exists) throw createError({ statusCode: 404, message: "Grupo no encontrado" });

  const groupData = groupDoc.data()!;
  if (!groupData.memberIds?.includes(user.uid)) {
    throw createError({ statusCode: 403, message: "No eres miembro de este grupo" });
  }

  const myDoc = await db.collection("users").doc(user.uid).get();
  const myData = myDoc.data() ?? {};
  const sanitized = sanitizeMessage(content.trim());
  const now = FieldValue.serverTimestamp();

  const msgRef = db.collection("personalGroups").doc(groupId).collection("messages").doc();
  const batch = db.batch();

  batch.set(msgRef, {
    senderId: user.uid,
    senderName: myData.displayName ?? user.name ?? "Usuario",
    senderPhoto: myData.photoURL ?? user.picture ?? "",
    content: sanitized,
    type: "text",
    createdAt: now,
  });

  batch.update(db.collection("personalGroups").doc(groupId), {
    lastMessageAt: now,
    lastMessagePreview: sanitized.slice(0, 80),
  });

  await batch.commit();
  return { messageId: msgRef.id };
});
