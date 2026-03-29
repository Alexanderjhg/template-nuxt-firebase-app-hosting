// server/api/protected/agents/[agentId]/audit.get.ts
// Devuelve el log de auditoría de un agente (paginado, solo admins).

import { defineEventHandler, getQuery, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const agentId = getRouterParam(event, "agentId");
  const { workspaceId, limit = "20" } = getQuery(event) as { workspaceId: string; limit?: string };

  if (!agentId || !workspaceId) {
    throw createError({ statusCode: 400, message: "Parámetros requeridos faltantes" });
  }

  const db = getAdminFirestore();
  const memberDoc = await db
    .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get();
  if (!memberDoc.exists || !["owner", "admin"].includes(memberDoc.data()!.role)) {
    throw createError({ statusCode: 403, message: "Solo admins pueden ver la auditoría" });
  }

  const snap = await db
    .collection("workspaces").doc(workspaceId).collection("agent_audit")
    .where("agentId", "==", agentId)
    .orderBy("timestamp", "desc")
    .limit(Math.min(parseInt(limit), 100))
    .get();

  return {
    entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
});
