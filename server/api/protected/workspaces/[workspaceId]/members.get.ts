// server/api/protected/workspaces/[workspaceId]/members.get.ts
// Lista los miembros de un workspace (solo si el usuario es miembro).

import { defineEventHandler, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const workspaceId = event.context.params?.workspaceId;
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId requerido" });

  const db = getAdminFirestore();

  // Verificar que el usuario es miembro
  const memberSnap = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(user.uid)
    .get();

  if (!memberSnap.exists) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }

  // Listar todos los miembros
  const membersSnap = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members")
    .orderBy("joinedAt", "asc")
    .get();

  const members = membersSnap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));

  return members;
});
