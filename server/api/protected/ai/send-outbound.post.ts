// server/api/protected/ai/send-outbound.post.ts
// Envía un mensaje a otro usuario vía DM.
// Se usa cuando el observador de IA detecta un intent "outbound_msg"
// y el usuario confirma el envío.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { resolveUserInfo } from "~/server/utils/resolveDisplayName";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, recipientId, message } = await readBody<{
    workspaceId: string;
    recipientId: string;
    message: string;
  }>(event);

  if (!workspaceId || !recipientId || !message) {
    throw createError({
      statusCode: 400,
      message: "workspaceId, recipientId y message son requeridos",
    });
  }

  const db = getAdminFirestore();

  // ── Buscar DM existente entre los dos usuarios ────────────────────────────
  const participantIds = [user.uid, recipientId].sort();

  // Buscar DM existente por participantIds exactos
  const existing = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("dms")
    .where("participantIds", "==", participantIds)
    .limit(1)
    .get();

  // Filtrar DMs especiales (AI, notificaciones)
  const regularDM = existing.docs.find(
    (d) => !d.data().isAiDM && !d.data().isNotificationsDM
  );

  let dmId: string;

  if (regularDM) {
    dmId = regularDM.id;
  } else {
    // ── Crear nuevo DM ────────────────────────────────────────────────────
    // Obtener nombres de los participantes
    const recipientMemberDoc = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("members")
      .doc(recipientId)
      .get();

    let recipientName = "Usuario";
    let recipientPhoto = "";

    if (recipientMemberDoc.exists) {
      recipientName = recipientMemberDoc.data()!.displayName ?? "Usuario";
      recipientPhoto = recipientMemberDoc.data()!.photoURL ?? "";
    } else {
      // Fallback: buscar en la colección global de usuarios
      const recipientUserDoc = await db
        .collection("users")
        .doc(recipientId)
        .get();

      if (recipientUserDoc.exists) {
        recipientName = recipientUserDoc.data()!.displayName ?? "Usuario";
        recipientPhoto = recipientUserDoc.data()!.photoURL ?? "";
      }
    }

    const now = FieldValue.serverTimestamp();
    const dmRef = db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("dms")
      .doc();

    // Resolver nombre del perfil del remitente
    const senderProfile = await resolveUserInfo(db, user.uid, user.name, user.picture);

    await dmRef.set({
      participantIds,
      participantMap: {
        [user.uid]: {
          displayName: senderProfile.displayName,
          photoURL: senderProfile.photoURL,
        },
        [recipientId]: {
          displayName: recipientName,
          photoURL: recipientPhoto,
        },
      },
      isAiDM: false,
      createdAt: now,
      lastMessageAt: now,
      lastMessagePreview: message.slice(0, 100),
    });

    dmId = dmRef.id;
  }

  // ── Enviar mensaje en la subcolección de mensajes del DM ────────────────
  const dmRef = db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("dms")
    .doc(dmId);

  // Resolver nombre del perfil para el mensaje
  const msgProfile = await resolveUserInfo(db, user.uid, user.name, user.picture);

  await dmRef.collection("messages").add({
    senderId: user.uid,
    senderName: msgProfile.displayName,
    senderPhoto: msgProfile.photoURL,
    content: message,
    createdAt: FieldValue.serverTimestamp(),
  });

  // ── Actualizar último mensaje del DM ────────────────────────────────────
  await dmRef.update({
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessagePreview: message.slice(0, 100),
  });

  return { ok: true, dmId };
});
