// server/api/protected/workspaces/[workspaceId]/my-profile.patch.ts
// Permite al usuario actualizar su perfil público dentro del workspace:
// estado, rol, contacto. Visible para todos los miembros del workspace.
// Si el estado es available_in_Xh, crea una automatización personal que
// restituye el estado a "available" después de X horas.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const VALID_STATUSES = ["available", "in_meeting", "busy", "available_in_1h", "available_in_2h", "available_in_3h"];

const STATUS_HOURS: Record<string, number> = {
  available_in_1h: 1,
  available_in_2h: 2,
  available_in_3h: 3,
};

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const workspaceId = event.context.params?.workspaceId;
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId requerido" });

  const { workspaceStatus, workspaceRole, contactPhone, contactEmail } = await readBody<{
    workspaceStatus?: string;
    workspaceRole?: string;
    contactPhone?: string;
    contactEmail?: string;
  }>(event);

  if (workspaceStatus && !VALID_STATUSES.includes(workspaceStatus)) {
    throw createError({ statusCode: 400, message: "Estado inválido" });
  }

  const db = getAdminFirestore();

  const memberRef = db
    .collection("workspaces").doc(workspaceId)
    .collection("members").doc(user.uid);

  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
  }

  const updates: Record<string, string | null> = {};
  if (workspaceStatus !== undefined) updates.workspaceStatus = workspaceStatus || null;
  if (workspaceRole !== undefined) updates.workspaceRole = workspaceRole?.trim().slice(0, 80) || null;
  if (contactPhone !== undefined) updates.contactPhone = contactPhone?.trim().slice(0, 30) || null;
  if (contactEmail !== undefined) updates.contactEmail = contactEmail?.trim().slice(0, 120) || null;

  await memberRef.update(updates);

  // Si el nuevo estado es "available_in_Xh", crear automatización que revierta a "available"
  if (workspaceStatus && STATUS_HOURS[workspaceStatus]) {
    const hours = STATUS_HOURS[workspaceStatus];
    const nextRunAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const userAutomationsRef = db.collection("users").doc(user.uid).collection("automations");

    // Cancelar cualquier automatización previa de cambio de estado para este workspace
    const existingSnap = await userAutomationsRef
      .where("actionType", "==", "set_workspace_status")
      .where("actionPayload.workspaceId", "==", workspaceId)
      .where("status", "==", "active")
      .get();

    const batch = db.batch();
    for (const doc of existingSnap.docs) {
      batch.update(doc.ref, { status: "completed" });
    }

    const newAutoRef = userAutomationsRef.doc();
    batch.set(newAutoRef, {
      createdBy: user.uid,
      createdByName: user.name ?? "Usuario",
      title: `Cambiar estado a Disponible`,
      description: `Restaurar estado a disponible automáticamente después de ${hours}h`,
      schedule: {
        frequency: "once",
        time: null,
        dayOfWeek: null,
        dayOfMonth: null,
        customCron: null,
        timezone: "America/Bogota",
        nextRunAt: Timestamp.fromDate(nextRunAt),
        endsAt: null,
      },
      source: {
        type: "personal",
        channelId: null,
        channelName: null,
        dmId: null,
        globalDmId: null,
      },
      actionType: "set_workspace_status",
      actionPayload: {
        workspaceId,
        uid: user.uid,
        status: "available",
      },
      status: "active",
      lastRunAt: null,
      lastRunResult: null,
      runCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.info(
      `[my-profile] uid=${user.uid} wsId=${workspaceId} status=${workspaceStatus} → auto restore in ${hours}h at ${nextRunAt.toISOString()}`,
    );
  }

  return { ok: true };
});
