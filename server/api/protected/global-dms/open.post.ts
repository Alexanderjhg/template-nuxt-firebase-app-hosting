// server/api/protected/global-dms/open.post.ts
// Abre (o devuelve existente) un DM global entre dos usuarios.
// Si el destinatario NO es contacto del remitente → DM queda en "pending" (solicitud).
// Si ya son contactos → DM queda en "active" directamente.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { recipientId } = await readBody<{ recipientId: string }>(event);
  if (!recipientId || recipientId === user.uid) {
    throw createError({ statusCode: 400, message: "recipientId inválido" });
  }

  const db = getAdminFirestore();

  // Participantes ordenados alfabéticamente para deduplicar
  const participantIds = [user.uid, recipientId].sort();

  // Buscar DM existente (cualquier estado)
  const existing = await db.collection("globalDMs")
    .where("participantIds", "==", participantIds)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0]!;
    return { dmId: doc.id, status: doc.data().status ?? "active" };
  }

  // Verificar si el destinatario es contacto del remitente
  const contactDoc = await db
    .collection("users").doc(user.uid)
    .collection("contacts").doc(recipientId)
    .get();
  const isContact = contactDoc.exists;

  // Cargar perfiles de ambos
  const [myDoc, recipientDoc] = await Promise.all([
    db.collection("users").doc(user.uid).get(),
    db.collection("users").doc(recipientId).get(),
  ]);

  const myData = myDoc.data() ?? {};
  const recipientData = recipientDoc.data() ?? {};

  const dmStatus = isContact ? "active" : "pending";
  const dmRef = db.collection("globalDMs").doc();

  await dmRef.set({
    participantIds,
    participantMap: {
      [user.uid]: {
        displayName: myData.displayName ?? user.name ?? "Usuario",
        photoURL: myData.photoURL ?? user.picture ?? "",
        username: myData.username ?? "",
      },
      [recipientId]: {
        displayName: recipientData.displayName ?? "Usuario",
        photoURL: recipientData.photoURL ?? "",
        username: recipientData.username ?? "",
      },
    },
    status: dmStatus,
    requestedBy: dmStatus === "pending" ? user.uid : null,
    createdAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessagePreview: "",
  });

  return { dmId: dmRef.id, status: dmStatus };
});
