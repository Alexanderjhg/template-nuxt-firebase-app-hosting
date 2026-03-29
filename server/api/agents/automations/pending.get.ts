// server/api/agents/automations/pending.get.ts
// Endpoint de polling para n8n: devuelve automatizaciones cuyo nextRunAt <= ahora.
// n8n llama esto cada 5 minutos para saber qué ejecutar.
// Autenticación: Bearer token del agente.

import { defineEventHandler, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const agent = event.context.agent;
  if (!agent) throw createError({ statusCode: 401, message: "Token de agente requerido" });

  const db = getAdminFirestore();
  const now = Timestamp.now();

  // Buscar automatizaciones activas cuya próxima ejecución ya pasó
  const snap = await db
    .collection("workspaces").doc(agent.workspaceId)
    .collection("automations")
    .where("status", "==", "active")
    .where("schedule.nextRunAt", "<=", now)
    .limit(20)
    .get();

  const pending = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? data.name ?? "",
      description: data.description ?? "",
      createdBy: data.createdBy ?? null,
      createdByName: data.createdByName ?? data.agentName ?? "",
      schedule: {
        frequency: data.schedule?.frequency ?? "once",
        time: data.schedule?.time ?? null,
        dayOfWeek: data.schedule?.dayOfWeek ?? null,
        dayOfMonth: data.schedule?.dayOfMonth ?? null,
        timezone: data.schedule?.timezone ?? "America/Bogota",
        nextRunAt: data.schedule?.nextRunAt?.toDate?.()?.toISOString() ?? null,
      },
      source: data.source ?? null,
      runCount: data.runCount ?? 0,
    };
  });

  console.info(
    `[automations/pending] agent=${agent.agentId} workspace=${agent.workspaceId} found=${pending.length}`,
  );

  return { pending, count: pending.length };
});
