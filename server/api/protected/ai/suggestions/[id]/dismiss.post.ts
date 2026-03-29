// server/api/protected/ai/suggestions/[id]/dismiss.post.ts
import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const id = getRouterParam(event, "id");
  const { workspaceId, global: isGlobal } = await readBody<{ workspaceId?: string; global?: boolean }>(event);

  if (!id || (!workspaceId && !isGlobal)) {
    throw createError({ statusCode: 400, message: "Parámetros requeridos faltantes" });
  }

  const db = getAdminFirestore();
  const ref = isGlobal
    ? db.collection("users").doc(user.uid).collection("ai_suggestions").doc(id)
    : db.collection("workspaces").doc(workspaceId!).collection("ai_suggestions").doc(id);
  const doc = await ref.get();

  if (!doc.exists) throw createError({ statusCode: 404, message: "Sugerencia no encontrada" });
  if (doc.data()!.recipientId !== user.uid) {
    throw createError({ statusCode: 403, message: "Sin permiso" });
  }

  await ref.update({ status: "dismissed" });
  return { ok: true };
});
