// server/api/protected/automations/personal.get.ts
// Lista las automatizaciones personales del usuario (users/{uid}/automations).

import { defineEventHandler, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const db = getAdminFirestore();

  const snap = await db
    .collection("users").doc(user.uid)
    .collection("automations")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const automations = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => {
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
