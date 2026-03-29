// server/api/protected/workspaces/[workspaceId]/invite.post.ts
// Genera un código de invitación para unirse al workspace.
// Solo admins/owners pueden generar invitaciones.

import { defineEventHandler, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const workspaceId = event.context.params?.workspaceId;
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId requerido" });

  const db = getAdminFirestore();

  // Verificar permiso: admin/owner → individual → global
  const { authorized, memberExists } = await checkMemberPermission(user.uid, workspaceId, "canInviteMembers");
  if (!memberExists && !authorized) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }
  if (!authorized) {
    throw createError({ statusCode: 403, message: "No tienes permiso para generar invitaciones" });
  }

  // Generar código único
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await db.collection("workspaceInvites").doc(code).set({
    workspaceId,
    createdBy: user.uid,
    createdByName: user.name ?? user.email ?? "Usuario",
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    usedBy: [],
    maxUses: 50,
    isActive: true,
  });

  return { code, expiresAt: expiresAt.toISOString() };
});
