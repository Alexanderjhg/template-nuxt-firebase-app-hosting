// server/api/agents/suggest.post.ts
// API PÚBLICA: el agente envía una sugerencia PRIVADA a un usuario específico.
// Solo visible para ese usuario (como las sugerencias de IA del sistema).
// Requiere permiso "suggest" y que el userId esté en scope.writeToUsers.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const agent = event.context.agent;
  if (!agent) throw createError({ statusCode: 401, message: "Token de agente requerido" });

  if (!agent.scope.permissions.includes("suggest")) {
    throw createError({ statusCode: 403, message: "El agente no tiene permiso de sugerencia" });
  }

  const { userId, channelId, message, actions, cardTitle } = await readBody<{
    userId: string;
    channelId?: string;
    message: string;
    cardTitle?: string;
    actions?: Array<{
      label: string;
      actionType: string;
      payload?: Record<string, unknown>;
      style?: "primary" | "secondary" | "danger";
    }>;
  }>(event);

  if (!userId || !message?.trim()) {
    throw createError({ statusCode: 400, message: "userId y message son requeridos" });
  }

  // Verificar scope.writeToUsers (solo para agentes de workspace)
  if (!agent.isGlobal) {
    const writeToUsers = agent.scope.writeToUsers;
    if (!writeToUsers.includes("*") && !writeToUsers.includes(userId)) {
      throw createError({
        statusCode: 403,
        message: `El agente no tiene permiso para enviar sugerencias a ${userId}`,
      });
    }
  }

  const db = getAdminFirestore();
  const now = FieldValue.serverTimestamp();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  const actionButtons = actions?.map((a) => ({
    label: a.label,
    actionType: a.actionType,
    payload: a.payload ?? {},
    style: a.style ?? "primary",
  })) ?? [{ label: "OK", actionType: "dismiss", payload: {}, style: "secondary" }];

  // ── Agente global: sugerencia directa en globalDM ───────────────────────
  if (agent.isGlobal) {
    // Para agentes globales, enviar como mensaje en el DM dedicado
    const dedicatedDmId = agent.dedicatedDmId;
    if (!dedicatedDmId) {
      throw createError({ statusCode: 400, message: "Agente global sin DM dedicado" });
    }

    const msgRef = db.collection("globalDMs").doc(dedicatedDmId).collection("messages").doc();
    await msgRef.set({
      senderId: agent.agentId,
      senderName: agent.name,
      senderPhoto: "",
      content: message.trim(),
      type: "agent_notification",
      actionCardTitle: cardTitle ?? `Sugerencia de ${agent.name}`,
      actionButtons,
      targetUserId: userId,
      createdAt: now,
    });

    await db.collection("globalDMs").doc(dedicatedDmId).update({
      lastMessageAt: now,
      lastMessagePreview: message.trim().slice(0, 80),
    });

    return { ok: true, messageId: msgRef.id };
  }

  // ── Agente de workspace: lógica original ────────────────────────────────
  const suggestionRef = db
    .collection("workspaces").doc(agent.workspaceId)
    .collection("ai_suggestions").doc();

  await suggestionRef.set({
    recipientId: userId,
    channelId: channelId ?? agent.agentId,
    triggeredByMessageId: `agent_${agent.agentId}_${Date.now()}`,
    intent: "agent_forward",
    confidence: 1.0,
    card: {
      title: cardTitle ?? `Mensaje de ${agent.name}`,
      description: message.trim(),
      actions: actionButtons,
    },
    status: "pending",
    source: "agent",
    agentId: agent.agentId,
    createdAt: now,
    expiresAt,
  });

  // Auditoría
  db.collection("workspaces").doc(agent.workspaceId).collection("agent_audit").doc().set({
    agentId: agent.agentId,
    action: "send_suggestion",
    targetId: userId,
    payload: { suggestionId: suggestionRef.id },
    timestamp: FieldValue.serverTimestamp(),
  }).catch(() => {});

  return { ok: true, suggestionId: suggestionRef.id };
});
