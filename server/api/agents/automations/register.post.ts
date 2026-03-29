import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface RegisterBody {
  name: string;
  description?: string;
  triggerId?: string;
}

export default defineEventHandler(async (event) => {
  const agent = event.context.agent;
  if (!agent) throw createError({ statusCode: 401, message: "Token de agente requerido" });
  
  if (!agent.scope.permissions.includes("act")) {
    throw createError({ statusCode: 403, message: "El agente no tiene permiso para crear automatizaciones ('act')" });
  }

  const { name, description, triggerId } = await readBody<RegisterBody>(event);
  if (!name) throw createError({ statusCode: 400, message: "name is required" });

  const db = getAdminFirestore();
  const now = FieldValue.serverTimestamp();

  const automationRef = db
    .collection("workspaces").doc(agent.workspaceId)
    .collection("automations").doc();

  await automationRef.set({
    id: automationRef.id,
    agentId: agent.agentId,
    agentName: agent.name,
    name,
    description: description || "",
    triggerId: triggerId || null,
    status: "active",
    createdAt: now,
    lastExecutedAt: null,
  });

  return { ok: true, automationId: automationRef.id };
});
