// server/api/protected/global-agents/[agentId]/update.patch.ts
// Actualiza un agente global del usuario: nombre, descripción, webhookUrl, estado.
// Los canales de acceso, permisos y scope NO se pueden editar después de creado.

import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const agentId = getRouterParam(event, "agentId");
  if (!agentId) throw createError({ statusCode: 400, message: "agentId requerido" });

  const { name, description, webhookUrl, isActive } = await readBody<{
    name?: string;
    description?: string;
    webhookUrl?: string;
    isActive?: boolean;
  }>(event);

  const db = getAdminFirestore();
  const agentRef = db.collection("users").doc(user.uid).collection("globalAgents").doc(agentId);
  const agentDoc = await agentRef.get();

  if (!agentDoc.exists) {
    throw createError({ statusCode: 404, message: "Agente no encontrado" });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (webhookUrl !== undefined) updates.webhookUrl = webhookUrl.trim();
  if (isActive !== undefined) updates.isActive = isActive;

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: "Nada que actualizar" });
  }

  await agentRef.update(updates);

  // Si cambió el nombre, actualizar el DM dedicado
  if (name !== undefined) {
    const agentData = agentDoc.data()!;
    if (agentData.dedicatedDmId) {
      await db.collection("globalDMs").doc(agentData.dedicatedDmId).update({
        [`participantMap.agent_${agentId}.displayName`]: `🤖 ${name.trim()}`,
      });
    }
  }

  return { ok: true };
});
