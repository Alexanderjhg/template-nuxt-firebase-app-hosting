// server/api/protected/dms/open-notifications.post.ts
// Abre o crea el DM de notificaciones personales para el usuario.
// Aquí llegan las automatizaciones configuradas como "personal".

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

  // Verificar membresía
  const memberDoc = await db
    .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get();

  if (!memberDoc.exists) {
    const wsDoc = await db.collection("workspaces").doc(workspaceId).get();
    if (!wsDoc.exists || wsDoc.data()?.ownerId !== user.uid) {
      throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
    }
  }

  // Buscar DM de notificaciones existente
  const existing = await db
    .collection("workspaces").doc(workspaceId).collection("dms")
    .where("isNotificationsDM", "==", true)
    .where("participantIds", "array-contains", user.uid)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { dmId: existing.docs[0]!.id };
  }

  // Crear nuevo DM de notificaciones
  const now = FieldValue.serverTimestamp();
  const dmRef = db.collection("workspaces").doc(workspaceId).collection("dms").doc();

  await dmRef.set({
    participantIds: [user.uid, "system:automations"],
    participantMap: {
      [user.uid]: {
        displayName: user.name ?? "Usuario",
        photoURL: user.picture ?? "",
      },
      "system:automations": {
        displayName: "🔔 DM Personal",
        photoURL: "",
      },
    },
    isNotificationsDM: true,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: "Aquí recibirás tus notificaciones personales",
  });

  return { dmId: dmRef.id };
});
