// server/api/protected/ai/suggestions/[id]/accept.post.ts
// Marca una sugerencia como aceptada y ejecuta la acción correspondiente.

import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const id = getRouterParam(event, "id");
  const { workspaceId, global: isGlobal, response } = await readBody<{
    workspaceId?: string;
    global?: boolean;
    response?: string;
  }>(event);

  if (!id || (!workspaceId && !isGlobal)) {
    throw createError({ statusCode: 400, message: "workspaceId o global=true y id son requeridos" });
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

  const updateData: Record<string, unknown> = { status: "accepted" };
  if (response) {
    updateData.response = response.slice(0, 2000);
    updateData.respondedAt = FieldValue.serverTimestamp();
  }

  await ref.update(updateData);

  return { ok: true, intent: doc.data()!.intent, meta: doc.data()!.meta ?? {} };
});
