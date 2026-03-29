// server/api/agents/messages.get.ts
// API PÚBLICA para agentes: lee los últimos mensajes de un canal asignado.
// Autenticado por agentAuth middleware con Bearer token del agente.
// Respeta el scope.readChannels configurado en el agente.

import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const agent = event.context.agent;
  if (!agent) throw createError({ statusCode: 401, message: "Token de agente requerido" });

  if (!agent.scope.permissions.includes("read")) {
    throw createError({ statusCode: 403, message: "El agente no tiene permiso de lectura" });
  }

  const { channelId, dmId, limit = "20" } = getQuery(event) as {
    channelId?: string;
    dmId?: string;
    limit?: string;
  };

  if (!channelId && !dmId) {
    throw createError({ statusCode: 400, message: "channelId o dmId es requerido" });
  }

  const db = getAdminFirestore();
  const maxLimit = Math.min(parseInt(limit), 100);

  // ── Agente global: leer desde globalDMs ─────────────────────────────────
  if (agent.isGlobal) {
    const targetDmId = dmId ?? agent.dedicatedDmId;
    if (!targetDmId) {
      throw createError({ statusCode: 400, message: "dmId requerido para agente global" });
    }

    const snap = await db
      .collection("globalDMs")
      .doc(targetDmId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(maxLimit)
      .get();

    return {
      messages: snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId,
            senderName: data.senderName,
            content: data.content,
            type: data.type,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          };
        })
        .reverse(),
    };
  }

  // ── Agente de workspace: lógica original ────────────────────────────────
  if (!channelId) {
    throw createError({ statusCode: 400, message: "channelId es requerido para agentes de workspace" });
  }

  const readChannels = agent.scope.readChannels;
  if (!readChannels.includes("*") && !readChannels.includes(channelId)) {
    throw createError({
      statusCode: 403,
      message: `El agente no tiene acceso al canal ${channelId}`,
    });
  }

  const snap = await db
    .collection("workspaces")
    .doc(agent.workspaceId)
    .collection("channels")
    .doc(channelId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(maxLimit)
    .get();

  // Auditoría
  db.collection("workspaces")
    .doc(agent.workspaceId)
    .collection("agent_audit")
    .doc()
    .set({
      agentId: agent.agentId,
      action: "read_channel",
      targetId: channelId,
      payload: { messagesRead: snap.size },
      timestamp: FieldValue.serverTimestamp(),
    })
    .catch(() => {});

  return {
    messages: snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          type: data.type,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        };
      })
      .reverse(),
  };
});
