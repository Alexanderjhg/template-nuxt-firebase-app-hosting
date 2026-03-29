// server/api/protected/tasks/create.post.ts
// Crea una tarea pendiente para el usuario.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, title, assignedByName, sourceChannelId, sourceMessageId } =
    await readBody<{
      workspaceId: string;
      title: string;
      assignedByName?: string;
      sourceChannelId?: string;
      sourceMessageId?: string;
    }>(event);

  if (!workspaceId || !title?.trim()) {
    throw createError({ statusCode: 400, message: "workspaceId y title son requeridos" });
  }

  const db = getAdminFirestore();
  const taskRef = db.collection("workspaces").doc(workspaceId).collection("pending_tasks").doc();

  await taskRef.set({
    userId: user.uid,
    workspaceId,
    title: title.trim().slice(0, 200),
    assignedByName: assignedByName ?? null,
    sourceChannelId: sourceChannelId ?? null,
    sourceMessageId: sourceMessageId ?? null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { taskId: taskRef.id };
});
