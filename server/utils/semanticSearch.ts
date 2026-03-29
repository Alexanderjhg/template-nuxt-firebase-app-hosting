// server/utils/semanticSearch.ts
// Carga el historial de mensajes del usuario para el DM con Asistente IA.
// Agrega mensajes de todos los canales y DMs del workspace.

import { getAdminFirestore } from "./firebaseAdmin";
import { sanitizeMessage } from "./sanitizeMessage";

export interface MessageContext {
  channelId: string;
  channelName: string;
  messageId: string;
  senderName: string;
  content: string;
  createdAt: Date;
}

/**
 * Carga los últimos N mensajes donde el usuario participó en el workspace.
 * Incluye canales y DMs.
 */
export async function loadUserMessageHistory(
  workspaceId: string,
  userId: string,
  limit = 200
): Promise<MessageContext[]> {
  const db = getAdminFirestore();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // últimos 7 días
  const messages: MessageContext[] = [];

  // ── Canales (públicos y privados del usuario) ────────────────────────────
  const channelsSnap = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("channels")
    .get();

  for (const channelDoc of channelsSnap.docs) {
    const channelData = channelDoc.data();
    // Filtrar canales privados donde el usuario es miembro
    if (channelData.isPrivate && !channelData.memberIds?.includes(userId)) continue;
    // Excluir canales de agente
    if (channelData.type === "agent") continue;

    const msgsSnap = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("channels")
      .doc(channelDoc.id)
      .collection("messages")
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    for (const msgDoc of msgsSnap.docs) {
      const msg = msgDoc.data();
      if (msg.deletedAt) continue;
      messages.push({
        channelId: channelDoc.id,
        channelName: `#${channelData.name}`,
        messageId: msgDoc.id,
        senderName: msg.senderName ?? "Desconocido",
        content: msg.content ?? "",
        createdAt: msg.createdAt?.toDate?.() ?? new Date(),
      });
    }
  }

  // ── DMs del usuario ──────────────────────────────────────────────────────
  const dmsSnap = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("dms")
    .where("participantIds", "array-contains", userId)
    .get();

  for (const dmDoc of dmsSnap.docs) {
    const dmData = dmDoc.data();
    if (dmData.isAiDM) continue; // No incluir el DM con la propia IA

    const otherId = dmData.participantIds?.find((id: string) => id !== userId);
    const otherName = otherId ? dmData.participantMap?.[otherId]?.displayName ?? "Alguien" : "Alguien";

    const msgsSnap = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("dms")
      .doc(dmDoc.id)
      .collection("messages")
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    for (const msgDoc of msgsSnap.docs) {
      const msg = msgDoc.data();
      if (msg.deletedAt) continue;
      messages.push({
        channelId: dmDoc.id,
        channelName: `DM con ${otherName}`,
        messageId: msgDoc.id,
        senderName: msg.senderName ?? "Desconocido",
        content: msg.content ?? "",
        createdAt: msg.createdAt?.toDate?.() ?? new Date(),
      });
    }
  }

  // Ordenar por fecha y limitar
  messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return messages.slice(0, limit);
}

/**
 * Formatea el historial para enviarlo a Gemini como contexto.
 */
export function formatHistoryForAI(messages: MessageContext[]): string {
  // Ordenar cronológicamente para que Gemini entienda el flujo
  const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return sorted
    .map((m) => {
      const date = m.createdAt.toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${m.channelName} · ${date}] ${m.senderName}: ${sanitizeMessage(m.content, 300)}`;
    })
    .join("\n");
}
