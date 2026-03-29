// server/api/protected/agents/[agentId]/delete.delete.ts
import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const agentId = getRouterParam(event, "agentId");
  const { workspaceId } = await readBody<{ workspaceId: string }>(event);

  if (!agentId || !workspaceId) {
    throw createError({ statusCode: 400, message: "Parámetros requeridos faltantes" });
  }

  const db = getAdminFirestore();
  const { authorized } = await checkMemberPermission(user.uid, workspaceId, "canManageAgents");
  if (!authorized) {
    throw createError({ statusCode: 403, message: "No tienes permiso para eliminar agentes" });
  }

  const agentRef = db.collection("workspaces").doc(workspaceId).collection("agents").doc(agentId);
  const agentDoc = await agentRef.get();
  if (!agentDoc.exists) throw createError({ statusCode: 404, message: "Agente no encontrado" });

  const dedicatedChannelId = agentDoc.data()!.dedicatedChannelId;

  const batch = db.batch();
  // Eliminar el agente
  batch.delete(agentRef);
  // Eliminar el canal dedicado
  if (dedicatedChannelId) {
    batch.delete(
      db.collection("workspaces").doc(workspaceId).collection("channels").doc(dedicatedChannelId)
    );
  }

  await batch.commit();

  console.info(`[agents/delete] agentId=${agentId} deleted by uid=${user.uid}`);
  return { ok: true };
});
