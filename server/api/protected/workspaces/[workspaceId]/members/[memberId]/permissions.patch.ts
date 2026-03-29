// server/api/protected/workspaces/[workspaceId]/members/[memberId]/permissions.patch.ts
// Actualiza permisos individuales de un miembro. Solo owners/admins.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

const validKeys = ["canCreateChannels", "canInviteMembers", "canManageAgents", "canEditObserver"];

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const workspaceId = event.context.params?.workspaceId;
  const memberId = event.context.params?.memberId;
  if (!workspaceId || !memberId) {
    throw createError({ statusCode: 400, message: "workspaceId y memberId requeridos" });
  }

  const body = await readBody<Record<string, unknown>>(event);
  if (!body || Object.keys(body).length === 0) {
    throw createError({ statusCode: 400, message: "Body vacío" });
  }

  const db = getAdminFirestore();

  // Verificar que quien hace la petición es admin/owner
  const callerDoc = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(user.uid)
    .get();

  let isAuthorized = false;
  if (callerDoc.exists) {
    isAuthorized = ["owner", "admin"].includes(callerDoc.data()?.role);
  }
  if (!isAuthorized) {
    const wsDoc = await db.collection("workspaces").doc(workspaceId).get();
    if (wsDoc.exists && wsDoc.data()?.ownerId === user.uid) {
      isAuthorized = true;
    }
  }
  if (!isAuthorized) {
    throw createError({ statusCode: 403, message: "Solo admins pueden cambiar permisos de miembros" });
  }

  // No permitir editar permisos de owners/admins (ya tienen acceso completo)
  const targetDoc = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(memberId)
    .get();

  if (!targetDoc.exists) {
    throw createError({ statusCode: 404, message: "Miembro no encontrado" });
  }

  const targetRole = targetDoc.data()?.role;
  if (["owner", "admin"].includes(targetRole)) {
    throw createError({ statusCode: 400, message: "Los admins ya tienen acceso completo" });
  }

  // Construir updates solo con claves válidas
  const updates: Record<string, boolean> = {};
  for (const key of validKeys) {
    if (key in body && typeof body[key] === "boolean") {
      updates[`permissions.${key}`] = body[key] as boolean;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: "No hay permisos válidos para actualizar" });
  }

  await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(memberId)
    .update(updates);

  return { ok: true };
});
