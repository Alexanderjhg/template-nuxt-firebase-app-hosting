// server/api/protected/workspaces/[workspaceId]/settings.patch.ts
// Actualiza settings del workspace. Solo owners/admins.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const workspaceId = event.context.params?.workspaceId;
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId requerido" });

  const body = await readBody<Record<string, unknown>>(event);
  if (!body || Object.keys(body).length === 0) {
    throw createError({ statusCode: 400, message: "Body vacío" });
  }

  const db = getAdminFirestore();

  // Verificar permisos: admin/owner tienen acceso completo
  // Miembros con canEditObserver solo pueden cambiar campos del observer
  const onlyObserverKeys = Object.keys(body).every((k) => ["aiObserverMode", "aiObserverEnabled"].includes(k));

  if (onlyObserverKeys) {
    const { authorized } = await checkMemberPermission(user.uid, workspaceId, "canEditObserver");
    if (!authorized) {
      throw createError({ statusCode: 403, message: "No tienes permiso para cambiar esta configuración" });
    }
  } else {
    // Para cambios generales (memberPermissions, allowGuestLinks, etc.) se requiere admin
    const memberDoc = await db
      .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get();

    let isAdmin = false;
    if (memberDoc.exists) {
      isAdmin = ["owner", "admin"].includes(memberDoc.data()?.role);
    }
    if (!isAdmin) {
      const wsDoc = await db.collection("workspaces").doc(workspaceId).get();
      if (wsDoc.exists && wsDoc.data()?.ownerId === user.uid) {
        isAdmin = true;
      }
    }
    if (!isAdmin) {
      throw createError({ statusCode: 403, message: "Solo admins pueden cambiar configuración" });
    }
  }

  // Solo permitir campos válidos
  const allowed = ["aiObserverEnabled", "aiObserverMode", "allowGuestLinks"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[`settings.${key}`] = body[key];
    }
  }

  // memberPermissions se maneja como objeto completo
  if (body.memberPermissions && typeof body.memberPermissions === "object") {
    const mp = body.memberPermissions as Record<string, unknown>;
    const validKeys = ["canCreateChannels", "canInviteMembers", "canManageAgents", "canEditObserver"];
    for (const k of validKeys) {
      if (k in mp && typeof mp[k] === "boolean") {
        updates[`settings.memberPermissions.${k}`] = mp[k];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: "No hay campos válidos para actualizar" });
  }

  await db.collection("workspaces").doc(workspaceId).update(updates);

  return { ok: true };
});
