// server/api/protected/global-dms/send.post.ts
// Envía un mensaje en un DM global (globalDMs/{dmId}/messages/).

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { sanitizeMessage } from "~/server/utils/sanitizeMessage";
import { FieldValue } from "firebase-admin/firestore";
import { resolveUserInfo } from "~/server/utils/resolveDisplayName";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { dmId, content } = await readBody<{ dmId: string; content: string }>(event);
  if (!dmId || !content?.trim()) {
    throw createError({ statusCode: 400, message: "dmId y content son requeridos" });
  }
  if (content.length > 4000) {
    throw createError({ statusCode: 400, message: "Mensaje demasiado largo" });
  }

  const db = getAdminFirestore();

  // Verificar que el usuario es participante
  const dmDoc = await db.collection("globalDMs").doc(dmId).get();
  if (!dmDoc.exists) throw createError({ statusCode: 404, message: "DM no encontrado" });

  const dmData = dmDoc.data()!;
  if (!dmData.participantIds?.includes(user.uid)) {
    throw createError({ statusCode: 403, message: "No eres participante de este DM" });
  }

  const myInfo = dmData.participantMap?.[user.uid] ?? {};
  // Priorizar nombre del perfil global sobre participantMap/auth
  const profile = await resolveUserInfo(db, user.uid, myInfo.displayName ?? user.name, myInfo.photoURL ?? user.picture);
  const sanitized = sanitizeMessage(content.trim());
  const now = FieldValue.serverTimestamp();

  const msgRef = db.collection("globalDMs").doc(dmId).collection("messages").doc();
  const batch = db.batch();

  batch.set(msgRef, {
    senderId: user.uid,
    senderName: profile.displayName,
    senderPhoto: profile.photoURL,
    content: sanitized,
    type: "text",
    createdAt: now,
  });

  batch.update(db.collection("globalDMs").doc(dmId), {
    lastMessageAt: now,
    lastMessagePreview: sanitized.slice(0, 80),
  });

  await batch.commit();
  return { messageId: msgRef.id };
});
