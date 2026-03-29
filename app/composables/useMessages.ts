// app/composables/useMessages.ts
// Mensajes en tiempo real con paginación y gestión de estado.
// Estrategia: onSnapshot para mensajes nuevos + cursor independiente para cargar anteriores.

import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import type { Message } from "~/types/chat";

const PAGE_SIZE = 100;

// Estado por canal (keyed por channelId o dmId)
const messagesMap = useState<Record<string, Message[]>>("messagesMap", () => ({}));
const loadingMore = useState<Record<string, boolean>>("loadingMore", () => ({}));
const hasMore = useState<Record<string, boolean>>("hasMore", () => ({}));

export function useMessages() {
  const { $firestore } = useNuxtApp();
  const { getIdToken } = useAuth();

  // Cursores para paginación (no reactivos, internos)
  const cursors: Record<string, QueryDocumentSnapshot<DocumentData> | null> = {};

  // ── Escuchar mensajes nuevos (último PAGE_SIZE) ──────────────────────────

  function listenMessages(
    workspaceId: string,
    channelId: string,
    isDM = false
  ): Unsubscribe {
    const colPath = isDM
      ? `workspaces/${workspaceId}/dms/${channelId}/messages`
      : `workspaces/${workspaceId}/channels/${channelId}/messages`;

    const q = query(
      collection($firestore, colPath),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    // Inicializar estado
    if (!messagesMap.value[channelId]) messagesMap.value[channelId] = [];
    hasMore.value[channelId] = true;

    return onSnapshot(
      q,
      (snap) => {
        const newMessages = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Message))
          .reverse(); // ordenar cronológicamente para la UI

        // El cursor inicial se asignará abajo si es la primera vez

        // Si no hay mensajes previos cargados, reemplazar directamente
        if (!messagesMap.value[channelId]?.length) {
          messagesMap.value[channelId] = newMessages;
          hasMore.value[channelId] = snap.docs.length === PAGE_SIZE;
          if (snap.docs.length > 0) {
             cursors[channelId] = snap.docs[snap.docs.length - 1] ?? null;
          }
          return;
        }

        // Si ya había mensajes (scroll hacia arriba cargado), solo agregar los nuevos
        const existingIds = new Set(messagesMap.value[channelId]!.map((m) => m.id));
        for (const msg of newMessages) {
          if (!existingIds.has(msg.id)) {
            messagesMap.value[channelId]!.push(msg);
          }
        }
      },
      (err) => console.error("[useMessages] error:", err)
    );
  }

  // ── Cargar mensajes anteriores (paginación) ──────────────────────────────

  async function loadMore(
    workspaceId: string,
    channelId: string,
    isDM = false
  ): Promise<void> {
    if (loadingMore.value[channelId] || !hasMore.value[channelId]) return;

    const cursor = cursors[channelId];
    if (!cursor) return;

    loadingMore.value[channelId] = true;

    const colPath = isDM
      ? `workspaces/${workspaceId}/dms/${channelId}/messages`
      : `workspaces/${workspaceId}/channels/${channelId}/messages`;

    try {
      const q = query(
        collection($firestore, colPath),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const older = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Message))
        .reverse();

      // Prepend al inicio del array (mensajes más antiguos van arriba)
      messagesMap.value[channelId] = [...older, ...(messagesMap.value[channelId] ?? [])];
      hasMore.value[channelId] = snap.docs.length === PAGE_SIZE;

      if (snap.docs.length > 0) {
        cursors[channelId] = snap.docs[snap.docs.length - 1] ?? null;
      }
    } finally {
      loadingMore.value[channelId] = false;
    }
  }

  // ── Enviar mensaje ───────────────────────────────────────────────────────

  async function sendMessage(
    workspaceId: string,
    channelId: string,
    content: string,
    isDM = false,
    reply?: { replyToId: string; replyToPreview: string; replyToSenderName: string }
  ): Promise<string> {
    const token = await getIdToken();
    const response = await $fetch<{ messageId: string }>("/api/protected/channels/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, channelId, content, isDM, ...(reply ?? {}) },
    });
    return response.messageId;
  }

  // ── Editar mensaje ───────────────────────────────────────────────────────

  async function editMessage(
    workspaceId: string,
    channelId: string,
    messageId: string,
    content: string,
    isDM = false
  ): Promise<void> {
    const token = await getIdToken();
    await $fetch(`/api/protected/channels/messages/${messageId}/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, channelId, content, isDM },
    });
  }

  // ── Eliminar mensaje (soft delete) ───────────────────────────────────────

  async function deleteMessage(
    workspaceId: string,
    channelId: string,
    messageId: string,
    isDM = false
  ): Promise<void> {
    const token = await getIdToken();
    await $fetch(`/api/protected/channels/messages/${messageId}/delete`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, channelId, isDM },
    });
  }

  // ── Agregar reacción ─────────────────────────────────────────────────────

  async function toggleReaction(
    workspaceId: string,
    channelId: string,
    messageId: string,
    emoji: string,
    isDM = false
  ): Promise<void> {
    const token = await getIdToken();
    await $fetch(`/api/protected/channels/messages/${messageId}/react`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, channelId, emoji, isDM },
    });
  }

  // ── Limpiar estado de un canal ───────────────────────────────────────────

  function clearChannel(channelId: string) {
    delete messagesMap.value[channelId];
    delete cursors[channelId];
    delete loadingMore.value[channelId];
    delete hasMore.value[channelId];
  }

  function getMessages(channelId: string): Message[] {
    return messagesMap.value[channelId] ?? [];
  }

  return {
    messagesMap: readonly(messagesMap),
    loadingMore: readonly(loadingMore),
    hasMore: readonly(hasMore),
    getMessages,
    listenMessages,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    clearChannel,
  };
}
