// server/api/protected/agents/confirm-action.post.ts
// Verifica el PIN del usuario para permitir que un agente ejecute una acción.
// El PIN se almacena como bcrypt hash en el documento de miembro del workspace.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";

// Usamos SHA-256 simple para no necesitar dependencia bcrypt en Edge Runtime.
// En producción con Node, se puede reemplazar por bcrypt.
function hashPin(pin: string): string {
  return createHash("sha256").update(pin + "clowpen-pin-salt").digest("hex");
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, agentId, pendingActionId, pin } = await readBody<{
    workspaceId: string;
    agentId: string;
    pendingActionId: string;
    pin: string;
  }>(event);

  if (!workspaceId || !agentId || !pendingActionId || !pin) {
    throw createError({ statusCode: 400, message: "Parámetros requeridos faltantes" });
  }

  if (pin.length < 4 || pin.length > 12) {
    throw createError({ statusCode: 400, message: "PIN inválido" });
  }

  const db = getAdminFirestore();

  // Verificar PIN del usuario
  const memberDoc = await db
    .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get();
  if (!memberDoc.exists) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }

  const memberData = memberDoc.data()!;
  if (!memberData.pinHash) {
    throw createError({
      statusCode: 400,
      message: "No tienes un PIN configurado. Configúralo en ajustes de perfil.",
    });
  }

  if (hashPin(pin) !== memberData.pinHash) {
    // Log de intento fallido
    await db
      .collection("workspaces").doc(workspaceId).collection("agent_audit").doc()
      .set({
        agentId,
        action: "pin_failed",
        targetId: user.uid,
        payload: { pendingActionId },
        timestamp: FieldValue.serverTimestamp(),
      });
    throw createError({ statusCode: 403, message: "PIN incorrecto" });
  }

  // Marcar la acción pendiente como confirmada
  const actionRef = db
    .collection("workspaces").doc(workspaceId).collection("pending_agent_actions").doc(pendingActionId);
  const actionDoc = await actionRef.get();
  if (!actionDoc.exists) {
    throw createError({ statusCode: 404, message: "Acción pendiente no encontrada o expirada" });
  }

  await actionRef.update({
    status: "confirmed",
    confirmedBy: user.uid,
    confirmedAt: FieldValue.serverTimestamp(),
  });

  // Log de auditoría
  await db.collection("workspaces").doc(workspaceId).collection("agent_audit").doc().set({
    agentId,
    action: "execute_action",
    targetId: user.uid,
    payload: { pendingActionId },
    confirmedBy: user.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { ok: true, action: actionDoc.data() };
});
