// server/api/protected/tasks/add.post.ts
// Crea una tarea pendiente — soporta tanto workspace como DMs globales.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { title, source, sourceDmId, workspaceId, assignedByName, sourceChannelId, sourceMessageId } =
    await readBody<{
      title: string;
      source?: string;
      sourceDmId?: string;
      workspaceId?: string;
      assignedByName?: string;
      sourceChannelId?: string;
      sourceMessageId?: string;
    }>(event);

  if (!title?.trim()) {
    throw createError({ statusCode: 400, message: "title es requerido" });
  }

  const db = getAdminFirestore();

  const isGlobal = source === "globalDM" || !workspaceId;

  const taskData: Record<string, unknown> = {
    userId: user.uid,
    title: title.trim().slice(0, 200),
    assignedByName: assignedByName ?? null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  };

  let taskRef;

  if (isGlobal) {
    taskData.source = "globalDM";
    taskData.sourceDmId = sourceDmId ?? null;
    taskRef = db.collection("users").doc(user.uid).collection("pending_tasks").doc();
  } else {
    taskData.workspaceId = workspaceId;
    taskData.sourceChannelId = sourceChannelId ?? null;
    taskData.sourceMessageId = sourceMessageId ?? null;
    taskRef = db.collection("workspaces").doc(workspaceId!).collection("pending_tasks").doc();
  }

  await taskRef.set(taskData);

  return { taskId: taskRef.id };
});
