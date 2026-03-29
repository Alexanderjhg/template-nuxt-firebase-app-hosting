// server/api/protected/workspaces/join.post.ts
// Permite a un usuario unirse a un workspace usando un código de invitación.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { code } = await readBody<{ code: string }>(event);
  if (!code?.trim()) {
    throw createError({ statusCode: 400, message: "Código de invitación requerido" });
  }

  const db = getAdminFirestore();

  // Buscar invitación
  const inviteSnap = await db.collection("workspaceInvites").doc(code.trim()).get();
  if (!inviteSnap.exists) {
    throw createError({ statusCode: 404, message: "Código de invitación no válido" });
  }

  const invite = inviteSnap.data()!;

  // Verificar estado
  if (!invite.isActive) {
    throw createError({ statusCode: 410, message: "Esta invitación ya no está activa" });
  }

  if (invite.expiresAt?.toDate?.() < new Date()) {
    throw createError({ statusCode: 410, message: "Esta invitación ha expirado" });
  }

  if ((invite.usedBy?.length ?? 0) >= invite.maxUses) {
    throw createError({ statusCode: 410, message: "Esta invitación ha alcanzado el límite de usos" });
  }

  const workspaceId = invite.workspaceId;

  // Verificar que no sea ya miembro
  const existingMember = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(user.uid)
    .get();

  if (existingMember.exists) {
    // Ya es miembro, solo retornar el workspace
    const wsSnap = await db.collection("workspaces").doc(workspaceId).get();
    const defaultChannelId = wsSnap.data()?.settings?.defaultChannelId ?? "";
    return { workspaceId, defaultChannelId, alreadyMember: true };
  }

  // Obtener info del workspace
  const wsSnap = await db.collection("workspaces").doc(workspaceId).get();
  if (!wsSnap.exists) {
    throw createError({ statusCode: 404, message: "El workspace ya no existe" });
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  // Agregar como miembro
  batch.set(
    db.collection("workspaces").doc(workspaceId).collection("members").doc(user.uid),
    {
      uid: user.uid,
      role: "member",
      displayName: user.name ?? user.email ?? "Usuario",
      photoURL: user.picture ?? "",
      email: user.email ?? "",
      joinedAt: now,
      presence: { status: "offline", lastSeen: now },
    }
  );

  // Agregar al índice invertido
  batch.set(
    db.collection("userWorkspaces").doc(user.uid),
    { workspaceIds: FieldValue.arrayUnion(workspaceId) },
    { merge: true }
  );

  // Registrar uso de la invitación
  batch.update(inviteSnap.ref, {
    usedBy: FieldValue.arrayUnion(user.uid),
  });

  await batch.commit();

  const defaultChannelId = wsSnap.data()?.settings?.defaultChannelId ?? "";
  return { workspaceId, defaultChannelId, alreadyMember: false };
});
