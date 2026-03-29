import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface LogBody {
  automationId: string;
  status: "success" | "error";
  logs?: string | Record<string, any>;
}

export default defineEventHandler(async (event) => {
  const agent = event.context.agent;
  if (!agent) throw createError({ statusCode: 401, message: "Token de agente requerido" });

  if (!agent.scope.permissions.includes("act")) {
    throw createError({ statusCode: 403, message: "El agente no tiene permiso ('act')" });
  }

  const { automationId, status, logs } = await readBody<LogBody>(event);
  if (!automationId || !status) {
    throw createError({ statusCode: 400, message: "automationId and status are required" });
  }

  const db = getAdminFirestore();
  const now = FieldValue.serverTimestamp();

  const automationRef = db
    .collection("workspaces").doc(agent.workspaceId)
    .collection("automations").doc(automationId);

  const autoDoc = await automationRef.get();
  if (!autoDoc.exists) {
    throw createError({ statusCode: 404, message: "Automatización no encontrada" });
  }

  const execRef = automationRef.collection("executions").doc();

  const batch = db.batch();
  
  batch.set(execRef, {
    id: execRef.id,
    status,
    logs: logs || null,
    executedAt: now,
  });

  batch.update(automationRef, {
    lastExecutedAt: now,
    status: status === "error" ? "error" : "active"
  });

  await batch.commit();

  return { ok: true, executionId: execRef.id };
});
