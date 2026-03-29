// server/api/protected/channels/read.post.ts
// Marca un canal como leído para el usuario (actualiza lastReadAt).

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, channelId } = await readBody<{
    workspaceId: string;
    channelId: string;
  }>(event);

  if (!workspaceId || !channelId) {
    throw createError({ statusCode: 400, message: "workspaceId y channelId son requeridos" });
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
    [`channelReads.${channelId}`]: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});
