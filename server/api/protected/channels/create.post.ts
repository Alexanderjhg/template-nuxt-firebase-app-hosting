// server/api/protected/channels/create.post.ts
// Crea un canal nuevo (público o privado) en el workspace.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, name, description, isPrivate } = await readBody<{
    workspaceId: string;
    name: string;
    description?: string;
    isPrivate?: boolean;
  }>(event);

  if (!workspaceId || !name?.trim()) {
    throw createError({ statusCode: 400, message: "workspaceId y name son requeridos" });
  }

  const db = getAdminFirestore();

  // Verificar permiso: admin/owner → individual → global
  const { authorized, memberExists } = await checkMemberPermission(user.uid, workspaceId, "canCreateChannels");
  if (!memberExists && !authorized) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }
  if (!authorized) {
    throw createError({ statusCode: 403, message: "No tienes permiso para crear canales" });
  }

  const channelName = name.trim().toLowerCase().replace(/\s+/g, "-");
  const now = FieldValue.serverTimestamp();

  const channelRef = db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("channels")
    .doc();

  await channelRef.set({
    name: channelName,
    description: description?.trim() ?? "",
    type: isPrivate ? "private" : "public",
    isPrivate: isPrivate ?? false,
    createdBy: user.uid,
    createdAt: now,
    memberIds: isPrivate ? [user.uid] : [],
    lastMessageAt: now,
    lastMessagePreview: "",
  });

  return { channelId: channelRef.id };
});
