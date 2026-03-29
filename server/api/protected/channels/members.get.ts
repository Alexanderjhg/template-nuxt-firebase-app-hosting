// server/api/protected/channels/members.get.ts
// Obtiene los miembros de un canal privado.

import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, channelId } = getQuery(event) as { workspaceId: string; channelId: string };

  if (!workspaceId || !channelId) {
    throw createError({ statusCode: 400, message: "workspaceId y channelId son requeridos" });
  }

  const db = getAdminFirestore();

  // Verificar que el usuario es miembro del workspace
  const wsMember = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(user.uid)
    .get();

  if (!wsMember.exists) {
    throw createError({ statusCode: 403, message: "No eres miembro del workspace" });
  }

  // Obtener el canal
  const channelDoc = await db
    .collection("workspaces").doc(workspaceId)
    .collection("channels").doc(channelId)
    .get();

  if (!channelDoc.exists) {
    throw createError({ statusCode: 404, message: "Canal no encontrado" });
  }

  const channelData = channelDoc.data()!;
  const memberIds: string[] = channelData.memberIds ?? [];

  // Obtener datos de cada miembro
  const members: Array<{ uid: string; displayName: string; photoURL: string; role: string }> = [];

  for (const uid of memberIds) {
    const memberDoc = await db
      .collection("workspaces").doc(workspaceId)
      .collection("members").doc(uid)
      .get();

    if (memberDoc.exists) {
      const d = memberDoc.data()!;
      members.push({
        uid,
        displayName: d.displayName ?? uid,
        photoURL: d.photoURL ?? "",
        role: d.role ?? "member",
      });
    }
  }

  return {
    channelId,
    isPrivate: channelData.isPrivate ?? false,
    createdBy: channelData.createdBy,
    members,
  };
});
