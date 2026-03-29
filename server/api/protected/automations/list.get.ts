// server/api/protected/automations/list.get.ts
// Lista las automatizaciones del usuario en un workspace.

import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId } = getQuery(event) as { workspaceId?: string };
  if (!workspaceId) {
    throw createError({ statusCode: 400, message: "workspaceId requerido" });
  }

  const db = getAdminFirestore();

  const snap = await db
    .collection("workspaces").doc(workspaceId)
    .collection("automations")
    .where("createdBy", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const automations = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      description: data.description,
      schedule: {
        frequency: data.schedule?.frequency,
        time: data.schedule?.time,
        dayOfWeek: data.schedule?.dayOfWeek,
        dayOfMonth: data.schedule?.dayOfMonth,
        nextRunAt: data.schedule?.nextRunAt?.toDate?.()?.toISOString() ?? null,
        timezone: data.schedule?.timezone,
      },
      source: data.source,
      status: data.status,
      runCount: data.runCount ?? 0,
      lastRunAt: data.lastRunAt?.toDate?.()?.toISOString() ?? null,
      lastRunResult: data.lastRunResult,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return { automations };
});
