// server/api/protected/global-agents/[agentId]/delete.delete.ts
// Elimina un agente global del usuario y su DM dedicado.

import { defineEventHandler, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const agentId = getRouterParam(event, "agentId");
  if (!agentId) throw createError({ statusCode: 400, message: "agentId requerido" });

  const db = getAdminFirestore();
  const agentRef = db.collection("users").doc(user.uid).collection("globalAgents").doc(agentId);
  const agentDoc = await agentRef.get();

  if (!agentDoc.exists) {
    throw createError({ statusCode: 404, message: "Agente no encontrado" });
  }

  const dedicatedDmId = agentDoc.data()?.dedicatedDmId;

  const batch = db.batch();
  // Eliminar el agente
  batch.delete(agentRef);
  // Eliminar el DM dedicado
  if (dedicatedDmId) {
    batch.delete(db.collection("globalDMs").doc(dedicatedDmId));
  }

  await batch.commit();

  console.info(`[global-agents/delete] uid=${user.uid} agentId=${agentId}`);
  return { ok: true };
});
