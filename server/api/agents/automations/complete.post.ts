// server/api/agents/automations/complete.post.ts
// n8n llama este endpoint después de ejecutar una automatización.
// 1. Registra el resultado en executions
// 2. Actualiza nextRunAt o marca como "completed" si es once
// 3. Envía un mensaje al canal/DM de origen para que el usuario lo vea

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

interface CompleteBody {
  automationId: string;
  status: "success" | "failed" | "skipped";
  result?: string;          // texto del resultado para mostrar al usuario
  logs?: Record<string, unknown>;
}

/** Calcula la siguiente ejecución según la frecuencia */
function computeNextRun(schedule: Record<string, any>): Date | null {
  const freq = schedule.frequency;
  if (freq === "once") return null; // ya terminó

  const [hours, minutes] = (schedule.time ?? "09:00").split(":").map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  switch (freq) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly": {
      const target = schedule.dayOfWeek ?? 1;
      let daysUntil = target - next.getDay();
      if (daysUntil <= 0) daysUntil += 7;
      next.setDate(next.getDate() + daysUntil);
      break;
    }
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (schedule.dayOfMonth) next.setDate(schedule.dayOfMonth);
      break;
    default:
      // custom: avanzar 1 día por defecto
      next.setDate(next.getDate() + 1);
  }

  return next;
}

export default defineEventHandler(async (event) => {
  const agent = event.context.agent;
  if (!agent) throw createError({ statusCode: 401, message: "Token de agente requerido" });

  const body = await readBody<CompleteBody>(event);
  if (!body.automationId || !body.status) {
    throw createError({ statusCode: 400, message: "automationId y status son requeridos" });
  }

  const db = getAdminFirestore();
  const now = FieldValue.serverTimestamp();

  const autoRef = db
    .collection("workspaces").doc(agent.workspaceId)
    .collection("automations").doc(body.automationId);

  const autoDoc = await autoRef.get();
  if (!autoDoc.exists) {
    throw createError({ statusCode: 404, message: "Automatización no encontrada" });
  }

  const autoData = autoDoc.data()!;
  const schedule = autoData.schedule ?? {};
  const source = autoData.source ?? {};

  // 1. Registrar ejecución
  const execRef = autoRef.collection("executions").doc();
  const batch = db.batch();

  batch.set(execRef, {
    status: body.status,
    result: body.result ?? null,
    logs: body.logs ?? null,
    executedAt: now,
  });

  // 2. Actualizar automatización
  const nextRun = computeNextRun(schedule);
  const autoUpdates: Record<string, unknown> = {
    lastRunAt: now,
    lastRunResult: body.result ?? body.status,
    runCount: FieldValue.increment(1),
  };

  if (nextRun) {
    autoUpdates["schedule.nextRunAt"] = Timestamp.fromDate(nextRun);
  } else {
    // Ejecución única → completada
    autoUpdates.status = "completed";
  }

  if (body.status === "failed") {
    autoUpdates.status = "failed";
  }

  batch.update(autoRef, autoUpdates);

  // 3. Enviar mensaje al canal de origen
  const resultText = body.result ?? (body.status === "success" ? "Automatización completada" : "Automatización falló");
  const messageContent = `⚡ **${autoData.title ?? "Automatización"}**\n${resultText}`;

  // Determinar dónde enviar el mensaje
  let messagesCol: FirebaseFirestore.CollectionReference | null = null;
  let parentRef: FirebaseFirestore.DocumentReference | null = null;

  if (source.type === "dm" && source.dmId) {
    parentRef = db.collection("workspaces").doc(agent.workspaceId)
      .collection("dms").doc(source.dmId);
    messagesCol = parentRef.collection("messages");
  } else if (source.channelId) {
    parentRef = db.collection("workspaces").doc(agent.workspaceId)
      .collection("channels").doc(source.channelId);
    messagesCol = parentRef.collection("messages");
  } else if (agent.scope?.dedicatedChannelId) {
    // Fallback: canal dedicado del agente
    parentRef = db.collection("workspaces").doc(agent.workspaceId)
      .collection("channels").doc(agent.scope.dedicatedChannelId);
    messagesCol = parentRef.collection("messages");
  }

  if (messagesCol && parentRef) {
    const msgRef = messagesCol.doc();
    batch.set(msgRef, {
      senderId: `agent:${agent.agentId}`,
      senderName: `🤖 ${agent.name}`,
      senderPhoto: "",
      content: messageContent,
      type: "agent_notification",
      actionCardTitle: autoData.title ?? "Resultado de automatización",
      createdAt: now,
    });

    batch.update(parentRef, {
      lastMessageAt: now,
      lastMessagePreview: messageContent.slice(0, 80),
    });
  }

  await batch.commit();

  console.info(
    `[automations/complete] autoId=${body.automationId} status=${body.status} nextRun=${nextRun?.toISOString() ?? "none"} sentTo=${source.type}:${source.channelId ?? source.dmId ?? "agent-channel"}`,
  );

  return {
    ok: true,
    executionId: execRef.id,
    nextRunAt: nextRun?.toISOString() ?? null,
    automationStatus: nextRun ? "active" : (body.status === "failed" ? "failed" : "completed"),
  };
});
