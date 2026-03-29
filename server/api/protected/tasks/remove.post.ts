// server/api/protected/tasks/remove.post.ts
// Elimina una tarea pendiente del usuario.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { taskId } = await readBody<{ taskId: string }>(event);

  if (!taskId) {
    throw createError({ statusCode: 400, message: "taskId es requerido" });
  }

  const db = getAdminFirestore();
  const ref = db.collection("users").doc(user.uid).collection("pending_tasks").doc(taskId);
  const doc = await ref.get();

  if (!doc.exists || doc.data()?.userId !== user.uid) {
    throw createError({ statusCode: 404, message: "Tarea no encontrada" });
  }

  await ref.delete();

  return { ok: true };
});
