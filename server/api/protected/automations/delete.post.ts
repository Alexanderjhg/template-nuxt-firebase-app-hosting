// server/api/protected/automations/delete.post.ts
// Elimina una automatización personal del usuario.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { automationId } = await readBody<{ automationId: string }>(event);

  if (!automationId) {
    throw createError({ statusCode: 400, message: "automationId es requerido" });
  }

  const db = getAdminFirestore();
  const ref = db.collection("users").doc(user.uid).collection("automations").doc(automationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw createError({ statusCode: 404, message: "Automatización no encontrada" });
  }

  await ref.delete();

  return { ok: true };
});
