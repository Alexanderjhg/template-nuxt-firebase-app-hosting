// server/api/agents/notify.post.ts
// API PÚBLICA: el agente envía un mensaje a un destino permitido.
// Puede enviar como agent_notification (con action cards) o como texto normal (asText).
// Requiere permiso "notify". Valida permisos de escritura y rate limit.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { checkAgentRateLimit } from "~/server/utils/agentRateLimit";
import * as bcryptjs from "bcryptjs";

interface NotifyBody {
  message: string;
  actions?: Array<{
    label: string;
    actionType: string;
    payload?: Record<string, unknown>;
    style?: "primary" | "secondary" | "danger";
  }>;
  cardTitle?: string;
  targetUserId?: string; // Solo este usuario puede ejecutar las acciones
  channelId?: string;    // Responder en un canal específico (en vez del dedicado)
  dmId?: string;         // Responder en un DM específico
  groupId?: string;      // Responder en un personalGroup específico
  asText?: boolean;      // true = mensaje tipo "text", false/undefined = "agent_notification"
  pin?: string;          // PIN del usuario si el agente requiere validación
}

export default defineEventHandler(async (event) => {
  const agent = event.context.agent;
  if (!agent) throw createError({ statusCode: 401, message: "Token de agente requerido" });

  if (!agent.scope.permissions.includes("notify")) {
    throw createError({ statusCode: 403, message: "El agente no tiene permiso de notificación" });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const maxPerMinute = agent.rateLimit?.maxPerMinute ?? 4;
  const rl = await checkAgentRateLimit(agent.agentId, maxPerMinute);
  if (!rl.allowed) {
    throw createError({
      statusCode: 429,
      message: `Límite de ${maxPerMinute} mensajes por minuto alcanzado. Reintenta después de ${rl.resetAt.toISOString()}`,
    });
  }

  const { message, actions, cardTitle, targetUserId, channelId, dmId, groupId, asText, pin } = await readBody<NotifyBody>(event);

  if (!message?.trim()) {
    throw createError({ statusCode: 400, message: "message es requerido" });
  }

  if (message.length > 2000) {
    throw createError({ statusCode: 400, message: "El mensaje no puede superar 2000 caracteres" });
  }

  const db = getAdminFirestore();
  const now = FieldValue.serverTimestamp();

  // ── Validar PIN del agente si está configurado ────────────────────────────
  if (agent.pinHash) {
    if (!pin) {
      throw createError({ statusCode: 403, message: "PIN requerido para este agente" });
    }

    // Validar el PIN contra el hash del agente
    const pinValid = await bcryptjs.compare(pin, agent.pinHash);
    if (!pinValid) {
      throw createError({ statusCode: 403, message: "PIN incorrecto" });
    }
  }

  // Construir action buttons (solo si NO es asText)
  let actionButtons: Array<{ label: string; actionType: string; payload: Record<string, unknown>; style: string }> = [];
  if (!asText) {
    actionButtons = actions?.map((a) => ({
      label: a.label,
      actionType: a.actionType,
      payload: a.payload ?? {},
      style: a.style ?? "primary",
    })) ?? [];

    if (actionButtons.length === 0) {
      actionButtons.push({ label: "OK", actionType: "dismiss", payload: {}, style: "secondary" });
    }
  }

  const msgType = asText ? "text" : "agent_notification";

  const msgData: Record<string, unknown> = {
    senderId: agent.agentId,
    senderName: agent.name,
    senderPhoto: "",
    content: message.trim(),
    type: msgType,
    createdAt: now,
  };

  if (!asText) {
    msgData.actionCardTitle = cardTitle ?? null;
    msgData.actionButtons = actionButtons;
    msgData.targetUserId = targetUserId ?? null;
  }

  const batch = db.batch();
  let targetRef: FirebaseFirestore.DocumentReference;
  let msgRef: FirebaseFirestore.DocumentReference;
  let actualTargetId: string;

  // ── Agente global ─────────────────────────────────────────────────────────
  if (agent.isGlobal) {
    const dedicatedDmId = agent.dedicatedDmId;
    const writeGroups: string[] = agent.scope.writeGroups ?? [];

    if (groupId) {
      // Verificar permiso de escritura al grupo personal
      if (!writeGroups.includes(groupId)) {
        throw createError({ statusCode: 403, message: "El agente no tiene permiso de escritura en este grupo" });
      }
      targetRef = db.collection("personalGroups").doc(groupId);
      actualTargetId = groupId;
    } else if (dmId) {
      // Solo puede escribir a su DM dedicado
      if (dmId !== dedicatedDmId) {
        throw createError({ statusCode: 403, message: "El agente solo puede escribir a su DM dedicado o grupos permitidos" });
      }
      targetRef = db.collection("globalDMs").doc(dmId);
      actualTargetId = dmId;
    } else if (dedicatedDmId) {
      targetRef = db.collection("globalDMs").doc(dedicatedDmId);
      actualTargetId = dedicatedDmId;
    } else {
      throw createError({ statusCode: 404, message: "No se encontró destino para la respuesta" });
    }

    msgRef = targetRef.collection("messages").doc();

    batch.set(msgRef, msgData);
    batch.update(targetRef, {
      lastMessageAt: now,
      lastMessagePreview: message.trim().slice(0, 80),
    });

    await batch.commit();
    return { ok: true, messageId: msgRef.id, remaining: rl.remaining };
  }

  // ── Agente de workspace ───────────────────────────────────────────────────
  const agentDoc = await db
    .collection("workspaces").doc(agent.workspaceId)
    .collection("agents").doc(agent.agentId).get();

  if (!agentDoc.exists) {
    throw createError({ statusCode: 404, message: "Agente no encontrado" });
  }

  const dedicatedChannelId = agentDoc.data()!.dedicatedChannelId;
  const writeChannels: string[] = agent.scope.writeChannels ?? [];

  if (channelId) {
    // Verificar permiso de escritura al canal
    if (!writeChannels.includes(channelId)) {
      throw createError({ statusCode: 403, message: "El agente no tiene permiso de escritura en este canal" });
    }
    targetRef = db.collection("workspaces").doc(agent.workspaceId)
      .collection("channels").doc(channelId);
    actualTargetId = channelId;
  } else if (dedicatedChannelId) {
    targetRef = db.collection("workspaces").doc(agent.workspaceId)
      .collection("channels").doc(dedicatedChannelId);
    actualTargetId = dedicatedChannelId;
  } else {
    throw createError({ statusCode: 404, message: "No se encontró destino para la respuesta" });
  }

  msgRef = targetRef.collection("messages").doc();

  batch.set(msgRef, msgData);
  batch.update(targetRef, {
    lastMessageAt: now,
    lastMessagePreview: message.trim().slice(0, 80),
  });

  await batch.commit();

  // Auditoría
  db.collection("workspaces").doc(agent.workspaceId).collection("agent_audit").doc().set({
    agentId: agent.agentId,
    action: "send_notification",
    targetId: actualTargetId,
    payload: { messageId: msgRef.id, asText: !!asText },
    timestamp: FieldValue.serverTimestamp(),
  }).catch(() => {});

  return { ok: true, messageId: msgRef.id, remaining: rl.remaining };
});
