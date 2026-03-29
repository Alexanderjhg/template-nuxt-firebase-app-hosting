// server/api/protected/channels/favorite.post.ts
// Agrega o quita un canal de los favoritos del usuario en el workspace.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, channelId, action } = await readBody<{
    workspaceId: string;
    channelId: string;
    action: "add" | "remove";
  }>(event);

  if (!workspaceId || !channelId || !action) {
    throw createError({ statusCode: 400, message: "workspaceId, channelId y action son requeridos" });
  }

  const db = getAdminFirestore();
  const memberRef = db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("members")
    .doc(user.uid);

  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }

  await memberRef.update({
    favorites: action === "add"
      ? FieldValue.arrayUnion(channelId)
      : FieldValue.arrayRemove(channelId),
  });

  return { ok: true };
});
