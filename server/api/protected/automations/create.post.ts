// server/api/protected/automations/create.post.ts
// Crea una automatización programada desde una sugerencia del observador IA.
// Calcula nextRunAt según la frecuencia y hora indicadas.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

interface CreateBody {
  workspaceId?: string;
  title: string;
  description: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "custom";
  time?: string;         // "HH:mm"
  dayOfWeek?: number;    // 0-6
  dayOfMonth?: number;   // 1-31
  date?: string;         // "YYYY-MM-DD" para once
  timezone?: string;
  // Origen
  sourceType: "channel" | "dm" | "agent" | "global" | "personal";
  sourceChannelId?: string;
  sourceChannelName?: string;
  sourceDmId?: string;
  globalDmId?: string;
  // Sugerencia que originó esto
  suggestionId?: string;
}

function computeNextRunAt(body: CreateBody): Date {
  const now = new Date();
  const [hours, minutes] = (body.time ?? "09:00").split(":").map(Number);

  if (body.frequency === "once" && body.date) {
    const d = new Date(body.date + "T00:00:00");
    d.setHours(hours, minutes, 0, 0);
    return d > now ? d : new Date(now.getTime() + 60_000); // mínimo 1 min en el futuro
  }

  // Para recurrentes, calcular la próxima ocurrencia
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (body.frequency === "weekly" && body.dayOfWeek !== undefined) {
    const currentDay = next.getDay();
    let daysUntil = body.dayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
    next.setDate(next.getDate() + daysUntil);
  } else if (body.frequency === "monthly" && body.dayOfMonth !== undefined) {
    next.setDate(body.dayOfMonth);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  } else {
    // daily o custom: próxima ocurrencia hoy o mañana
    if (next <= now) next.setDate(next.getDate() + 1);
  }

  return next;
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const body = await readBody<CreateBody>(event);

  if (!body.description) {
    throw createError({ statusCode: 400, message: "description es requerido" });
  }

  const db = getAdminFirestore();
  const isGlobal = body.sourceType === "personal" || !body.workspaceId;

  let createdByName = user.name ?? "Usuario";

  if (!isGlobal) {
    // Verificar membresía en workspace
    const memberDoc = await db
      .collection("workspaces").doc(body.workspaceId!)
      .collection("members").doc(user.uid)
      .get();

    if (!memberDoc.exists) {
      throw createError({ statusCode: 403, message: "No eres miembro de este workspace" });
    }
    createdByName = memberDoc.data()!.displayName ?? createdByName;
  }

  const nextRunAt = computeNextRunAt(body);

  // Guardar en workspace o en usuario según el contexto
  const autoRef = isGlobal
    ? db.collection("users").doc(user.uid).collection("automations").doc()
    : db.collection("workspaces").doc(body.workspaceId!).collection("automations").doc();

  await autoRef.set({
    ...(isGlobal ? {} : { workspaceId: body.workspaceId }),
    createdBy: user.uid,
    createdByName,
    title: body.title || body.description.slice(0, 60),
    description: body.description,
    schedule: {
      frequency: body.frequency ?? "once",
      time: body.time ?? null,
      dayOfWeek: body.dayOfWeek ?? null,
      dayOfMonth: body.dayOfMonth ?? null,
      customCron: null,
      timezone: body.timezone ?? "America/Bogota",
      nextRunAt: Timestamp.fromDate(nextRunAt),
      endsAt: null,
    },
    source: {
      type: body.sourceType ?? (isGlobal ? "personal" : "channel"),
      channelId: body.sourceChannelId ?? null,
      channelName: body.sourceChannelName ?? null,
      dmId: body.sourceDmId ?? null,
      globalDmId: body.globalDmId ?? null,
    },
    status: "active",
    lastRunAt: null,
    lastRunResult: null,
    runCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Marcar sugerencia como aceptada (si existe)
  if (body.suggestionId) {
    const sugRef = isGlobal
      ? db.collection("users").doc(user.uid).collection("ai_suggestions").doc(body.suggestionId)
      : db.collection("workspaces").doc(body.workspaceId!).collection("ai_suggestions").doc(body.suggestionId);
    try {
      await sugRef.update({ status: "accepted" });
    } catch (err: any) {
      // Si el documento no existe, ignorar el error
      if (!err.message?.includes("No document to update")) {
        throw err;
      }
    }
  }

  console.info(
    `[automations/create] uid=${user.uid} autoId=${autoRef.id} freq=${body.frequency} nextRun=${nextRunAt.toISOString()}`,
  );

  return { ok: true, automationId: autoRef.id, nextRunAt: nextRunAt.toISOString() };
});
