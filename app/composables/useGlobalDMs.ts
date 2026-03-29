// app/composables/useGlobalDMs.ts
// DMs globales entre usuarios (fuera de workspace).
// Colección: globalDMs/{dmId}
//
// IMPORTANTE: dmsUnsub, msgUnsubs y cursors son module-level para que solo
// exista UN listener activo independientemente de cuántas veces se llame
// useGlobalDMs(). Esto permite escuchar desde app.vue sin duplicar listeners.

import {
  collection, query, where, orderBy, onSnapshot,
  limit, startAfter, getDocs, type Unsubscribe, type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { GlobalDM, Message } from "~/types/chat";

// State module-level: solo existe UNA instancia sin importar cuántas veces
// se llame useGlobalDMs(). Esto permite escuchar desde app.vue sin duplicar.
const globalDMs = ref<GlobalDM[]>([]);
const globalDMMessages = ref<Record<string, Message[]>>({});

// Listeners module-level (JS puro, no necesitan contexto de Nuxt)
let dmsUnsub: Unsubscribe | null = null;
const msgUnsubs: Record<string, Unsubscribe> = {};
const cursors: Record<string, QueryDocumentSnapshot | null> = {};

export function useGlobalDMs() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  // ── Escuchar mis DMs globales ─────────────────────────────────────────────
  // Sin orderBy para evitar requerir índice compuesto. Se ordena del lado cliente.

  function listenGlobalDMs(): Unsubscribe {
    if (!user.value?.uid) return () => {};
    dmsUnsub?.(); // cancela listener anterior si existe

    const q = query(
      collection($firestore, "globalDMs"),
      where("participantIds", "array-contains", user.value.uid),
    );

    dmsUnsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GlobalDM));
      all.sort((a, b) => {
        const aTime = (a.lastMessageAt as any)?.seconds ?? 0;
        const bTime = (b.lastMessageAt as any)?.seconds ?? 0;
        return bTime - aTime;
      });
      globalDMs.value = all;
    }, (err) => console.error("[useGlobalDMs] listenGlobalDMs error:", err));

    return dmsUnsub;
  }

  // ── Escuchar mensajes de un DM ────────────────────────────────────────────

  function listenDMMessages(dmId: string): Unsubscribe {
    msgUnsubs[dmId]?.();

    const q = query(
      collection($firestore, "globalDMs", dmId, "messages"),
      orderBy("createdAt", "desc"),
      limit(30),
    );

    msgUnsubs[dmId] = onSnapshot(q, (snap) => {
      cursors[dmId] = snap.docs[snap.docs.length - 1] ?? null;
      globalDMMessages.value = {
        ...globalDMMessages.value,
        [dmId]: [...snap.docs].reverse().map((d) => ({ id: d.id, ...d.data() } as Message)),
      };
    }, (err) => console.error(`[useGlobalDMs] listenDMMessages(${dmId}) error:`, err));

    return msgUnsubs[dmId]!;
  }

  async function loadMoreDMMessages(dmId: string): Promise<void> {
    const cursor = cursors[dmId];
    if (!cursor) return;

    const q = query(
      collection($firestore, "globalDMs", dmId, "messages"),
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(30),
    );

    const snap = await getDocs(q);
    cursors[dmId] = snap.docs[snap.docs.length - 1] ?? null;
    const older = [...snap.docs].reverse().map((d) => ({ id: d.id, ...d.data() } as Message));
    globalDMMessages.value = {
      ...globalDMMessages.value,
      [dmId]: [...older, ...(globalDMMessages.value[dmId] ?? [])],
    };
  }

  function getDMMessages(dmId: string): Message[] {
    return globalDMMessages.value[dmId] ?? [];
  }

  function stopListening() {
    dmsUnsub?.();
    dmsUnsub = null;
    Object.values(msgUnsubs).forEach((u) => u());
    globalDMs.value = [];
  }

  // ── Abrir o crear DM global ───────────────────────────────────────────────

  async function openGlobalDM(recipientId: string): Promise<{ dmId: string; status: "active" | "pending" }> {
    const token = await getIdToken();
    return $fetch<{ dmId: string; status: "active" | "pending" }>("/api/protected/global-dms/open", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { recipientId },
    });
  }

  // ── Enviar mensaje ────────────────────────────────────────────────────────

  async function sendGlobalDMMessage(dmId: string, content: string): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/global-dms/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { dmId, content },
    });
  }

  // ── Responder a solicitud de mensaje ──────────────────────────────────────

  async function respondToDM(dmId: string, action: "accept" | "decline"): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/global-dms/respond", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { dmId, action },
    });
  }

  // ── Obtener info del otro participante ────────────────────────────────────

  function getOtherParticipant(dm: GlobalDM): { displayName: string; photoURL: string; username: string } {
    // Para DMs de agentes, el agente no está en participantIds sino en participantMap con key "agent_..."
    if ((dm as any).isAgentDM && dm.participantMap) {
      const agentKey = Object.keys(dm.participantMap).find((k) => k.startsWith("agent_"));
      if (agentKey) {
        const agent = dm.participantMap[agentKey];
        return { displayName: agent?.displayName ?? "Agente", photoURL: agent?.photoURL ?? "", username: "" };
      }
    }

    const otherId = dm.participantIds.find((id) => id !== user.value?.uid);
    return otherId
      ? (dm.participantMap[otherId] ?? { displayName: "Usuario", photoURL: "", username: "" })
      : { displayName: "Usuario", photoURL: "", username: "" };
  }

  // ── Conteos para badges ───────────────────────────────────────────────────

  const pendingRequestCount = computed(() =>
    globalDMs.value.filter(
      (dm) => dm.status === "pending" && dm.requestedBy !== user.value?.uid
    ).length
  );

  return {
    globalDMs: readonly(globalDMs),
    listenGlobalDMs,
    listenDMMessages,
    loadMoreDMMessages,
    getDMMessages,
    stopListening,
    openGlobalDM,
    sendGlobalDMMessage,
    respondToDM,
    getOtherParticipant,
    pendingRequestCount,
  };
}
