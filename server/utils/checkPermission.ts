// server/utils/checkPermission.ts
// Verifica si un miembro tiene un permiso específico.
// Prioridad: admin/owner → permiso individual del miembro → permiso global del workspace.

import { getAdminFirestore } from "./firebaseAdmin";

type PermissionKey = "canCreateChannels" | "canInviteMembers" | "canManageAgents" | "canEditObserver";

interface CheckResult {
  authorized: boolean;
  isAdminOrOwner: boolean;
  memberExists: boolean;
}

export async function checkMemberPermission(
  uid: string,
  workspaceId: string,
  permission: PermissionKey
): Promise<CheckResult> {
  const db = getAdminFirestore();

  const memberDoc = await db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(uid)
    .get();

  if (!memberDoc.exists) {
    // Fallback: verificar ownerId
    const wsDoc = await db.collection("workspaces").doc(workspaceId).get();
    if (wsDoc.exists && wsDoc.data()?.ownerId === uid) {
      return { authorized: true, isAdminOrOwner: true, memberExists: false };
    }
    return { authorized: false, isAdminOrOwner: false, memberExists: false };
  }

  const memberData = memberDoc.data()!;
  const role = memberData.role;

  // Admin/owner siempre tienen acceso
  if (["owner", "admin"].includes(role)) {
    return { authorized: true, isAdminOrOwner: true, memberExists: true };
  }

  // Permiso individual del miembro (override)
  const individualPerm = memberData.permissions?.[permission];
  if (individualPerm === true) {
    return { authorized: true, isAdminOrOwner: false, memberExists: true };
  }
  if (individualPerm === false) {
    return { authorized: false, isAdminOrOwner: false, memberExists: true };
  }

  // Fallback: permiso global del workspace
  const wsDoc = await db.collection("workspaces").doc(workspaceId).get();
  const globalPerm = wsDoc.data()?.settings?.memberPermissions?.[permission] === true;

  return { authorized: globalPerm, isAdminOrOwner: false, memberExists: true };
}
