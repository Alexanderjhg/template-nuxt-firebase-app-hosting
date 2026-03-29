// server/api/protected/dms/open-ai.post.ts
// Abre o crea el DM con el Asistente IA para el usuario actual.
// Cualquier miembro del workspace puede tener su propio DM con la IA.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId } = await readBody<{ workspaceId: string }>(event);
  if (!workspaceId) {
    throw createError({ statusCode: 400, message: "workspaceId requerido" });
  }

  const db = getAdminFirestore();

  // Verificar que es miembro
  const memberDoc = await db
    .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get();

  if (!memberDoc.exists) {
    // Fallback: verificar ownerId
    const wsDoc = await db.collection("workspaces").doc(workspaceId).get();
    if (!wsDoc.exists || wsDoc.data()?.ownerId !== user.uid) {
      throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
    }
  }

  // Buscar DM de IA existente para este usuario
  const existing = await db
    .collection("workspaces").doc(workspaceId).collection("dms")
    .where("isAiDM", "==", true)
    .where("participantIds", "array-contains", user.uid)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { dmId: existing.docs[0]!.id };
  }

  // Crear nuevo DM de IA para este usuario
  const now = FieldValue.serverTimestamp();
  const dmRef = db.collection("workspaces").doc(workspaceId).collection("dms").doc();

  await dmRef.set({
    participantIds: [user.uid, "ai-assistant"],
    participantMap: {
      [user.uid]: {
        displayName: user.name ?? "Usuario",
        photoURL: user.picture ?? "",
      },
      "ai-assistant": {
        displayName: "Asistente IA",
        photoURL: "",
      },
    },
    isAiDM: true,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: "Hola, ¿en qué puedo ayudarte?",
  });

  return { dmId: dmRef.id };
});
