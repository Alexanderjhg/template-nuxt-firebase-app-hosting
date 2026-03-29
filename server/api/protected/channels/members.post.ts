// server/api/protected/channels/members.post.ts
// Agrega o quita miembros de un canal privado.
// Solo admins/owners del workspace o el creador del canal pueden modificar miembros.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, channelId, memberIds, action } = await readBody<{
    workspaceId: string;
    channelId: string;
    memberIds: string[];
    action: "add" | "remove";
  }>(event);

  if (!workspaceId || !channelId || !memberIds?.length || !action) {
    throw createError({ statusCode: 400, message: "workspaceId, channelId, memberIds y action son requeridos" });
  }

  if (!["add", "remove"].includes(action)) {
    throw createError({ statusCode: 400, message: "action debe ser 'add' o 'remove'" });
  }

  const db = getAdminFirestore();

  // Verificar que el canal existe y es privado
  const channelRef = db.collection("workspaces").doc(workspaceId).collection("channels").doc(channelId);
  const channelDoc = await channelRef.get();

  if (!channelDoc.exists) {
    throw createError({ statusCode: 404, message: "Canal no encontrado" });
  }

  const channelData = channelDoc.data()!;
  if (!channelData.isPrivate) {
    throw createError({ statusCode: 400, message: "Solo se pueden gestionar miembros en canales privados" });
  }

  // Verificar permisos: admin/owner del workspace O creador del canal
  const memberDoc = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(user.uid)
    .get();

  const isAdminOrOwner = memberDoc.exists && ["owner", "admin"].includes(memberDoc.data()?.role);
  const isChannelCreator = channelData.createdBy === user.uid;

  if (!isAdminOrOwner && !isChannelCreator) {
    throw createError({ statusCode: 403, message: "No tienes permiso para gestionar miembros de este canal" });
  }

  // Verificar que los miembros a agregar son miembros del workspace
  if (action === "add") {
    for (const uid of memberIds) {
      const wsMember = await db
        .collection("workspaces").doc(workspaceId)
        .collection("members").doc(uid)
        .get();
      if (!wsMember.exists) {
        throw createError({ statusCode: 400, message: `El usuario ${uid} no es miembro del workspace` });
      }
    }
  }

  // Actualizar memberIds
  if (action === "add") {
    await channelRef.update({
      memberIds: FieldValue.arrayUnion(...memberIds),
    });
  } else {
    // No permitir quitar al creador
    const filtered = memberIds.filter((id) => id !== channelData.createdBy);
    if (filtered.length > 0) {
      await channelRef.update({
        memberIds: FieldValue.arrayRemove(...filtered),
      });
    }
  }

  console.info(`[channels/members] ${action} ${memberIds.length} members in ${channelId} by ${user.uid}`);

  return { ok: true };
});
