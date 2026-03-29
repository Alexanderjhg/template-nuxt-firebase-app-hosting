// server/api/protected/agents/[agentId]/update.patch.ts
// Actualiza propiedades de un agente: nombre, descripción, webhookUrl, estado.
// Los canales de acceso, permisos y scope NO se pueden editar después de creado.
// Solo owners/admins pueden editar.
// Si cambia el nombre, actualiza también el canal dedicado.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

interface UpdateBody {
  workspaceId: string;
  name?: string;
  description?: string;
  webhookUrl?: string;
  isActive?: boolean;
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const agentId = event.context.params?.agentId;
  if (!agentId) throw createError({ statusCode: 400, message: "agentId requerido" });

  const body = await readBody<UpdateBody>(event);
  const { workspaceId, name, description, webhookUrl, isActive } = body;

  if (!workspaceId) {
    throw createError({ statusCode: 400, message: "workspaceId requerido" });
  }

  const db = getAdminFirestore();

  // Verificar permiso: admin/owner → individual → global
  const { authorized } = await checkMemberPermission(user.uid, workspaceId, "canManageAgents");
  if (!authorized) {
    throw createError({ statusCode: 403, message: "No tienes permiso para editar agentes" });
  }

  // Verificar que el agente existe
  const agentRef = db
    .collection("workspaces").doc(workspaceId)
    .collection("agents").doc(agentId);

  const agentDoc = await agentRef.get();
  if (!agentDoc.exists) {
    throw createError({ statusCode: 404, message: "Agente no encontrado" });
  }

  // Construir updates solo con campos proporcionados
  const updates: Record<string, unknown> = {};

  if (name !== undefined && name.trim()) {
    updates.name = name.trim();
  }
  if (description !== undefined) {
    updates.description = description.trim();
  }
  if (webhookUrl !== undefined && webhookUrl.trim()) {
    updates.webhookUrl = webhookUrl.trim();
  }
  if (typeof isActive === "boolean") {
    updates.isActive = isActive;
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: "No hay campos para actualizar" });
  }

  // Actualizar agente
  await agentRef.update(updates);

  // Si cambió el nombre, actualizar también el canal dedicado
  if (updates.name) {
    const dedicatedChannelId = agentDoc.data()?.dedicatedChannelId;
    if (dedicatedChannelId) {
      await db
        .collection("workspaces").doc(workspaceId)
        .collection("channels").doc(dedicatedChannelId)
        .update({
          name: `🤖 ${updates.name}`,
          description: updates.description ?? agentDoc.data()?.description ?? "",
        });
    }
  }

  console.info(`[agents/update] agentId=${agentId} updated by uid=${user.uid}`);

  return { ok: true };
});
