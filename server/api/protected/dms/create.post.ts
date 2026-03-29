// server/api/protected/dms/create.post.ts
// Crea o devuelve un DM existente entre dos usuarios.
// Los participantIds siempre se ordenan alfabéticamente para evitar duplicados.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, recipientId } = await readBody<{
    workspaceId: string;
    recipientId: string;
  }>(event);

  if (!workspaceId || !recipientId) {
    throw createError({ statusCode: 400, message: "workspaceId y recipientId son requeridos" });
  }

  if (recipientId === user.uid) {
    throw createError({ statusCode: 400, message: "No puedes enviarte un DM a ti mismo" });
  }

  const db = getAdminFirestore();

  // Ordenar para deduplicar
  const participantIds = [user.uid, recipientId].sort();

  // Buscar DM existente
  const existing = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("dms")
    .where("participantIds", "==", participantIds)
    .where("isAiDM", "==", false)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { dmId: existing.docs[0]!.id };
  }

  // Obtener datos de los participantes para el map
  const [senderDoc, recipientDoc] = await Promise.all([
    db.collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get(),
    db.collection("workspaces").doc(workspaceId).collection("members").doc(recipientId).get(),
  ]);

  if (!senderDoc.exists || !recipientDoc.exists) {
    throw createError({ statusCode: 404, message: "Uno o ambos usuarios no son miembros del workspace" });
  }

  const now = FieldValue.serverTimestamp();
  const dmRef = db.collection("workspaces").doc(workspaceId).collection("dms").doc();

  await dmRef.set({
    participantIds,
    participantMap: {
      [user.uid]: {
        displayName: senderDoc.data()!.displayName,
        photoURL: senderDoc.data()!.photoURL ?? "",
      },
      [recipientId]: {
        displayName: recipientDoc.data()!.displayName,
        photoURL: recipientDoc.data()!.photoURL ?? "",
      },
    },
    isAiDM: false,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: "",
  });

  return { dmId: dmRef.id };
});
