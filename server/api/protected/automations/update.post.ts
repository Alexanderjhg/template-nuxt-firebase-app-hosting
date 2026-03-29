// server/api/protected/automations/update.post.ts
// Actualiza el estado de una automatización personal del usuario.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { automationId, status } = await readBody<{ automationId: string; status: string }>(event);

  if (!automationId || !status) {
    throw createError({ statusCode: 400, message: "automationId y status son requeridos" });
  }

  if (!["active", "paused", "completed"].includes(status)) {
    throw createError({ statusCode: 400, message: "status debe ser 'active', 'paused' o 'completed'" });
  }

  const db = getAdminFirestore();
  const ref = db.collection("users").doc(user.uid).collection("automations").doc(automationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw createError({ statusCode: 404, message: "Automatización no encontrada" });
  }

  await ref.update({ status });

  return { ok: true };
});
