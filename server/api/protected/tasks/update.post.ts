// server/api/protected/tasks/update.post.ts
// Actualiza el estado de una tarea pendiente del usuario.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { taskId, status } = await readBody<{ taskId: string; status: string }>(event);

  if (!taskId || !status) {
    throw createError({ statusCode: 400, message: "taskId y status son requeridos" });
  }

  if (!["pending", "in_progress", "done"].includes(status)) {
    throw createError({ statusCode: 400, message: "status debe ser 'pending', 'in_progress' o 'done'" });
  }

  const db = getAdminFirestore();
  const ref = db.collection("users").doc(user.uid).collection("pending_tasks").doc(taskId);
  const doc = await ref.get();

  if (!doc.exists || doc.data()?.userId !== user.uid) {
    throw createError({ statusCode: 404, message: "Tarea no encontrada" });
  }

  await ref.update({ status });

  return { ok: true };
});
