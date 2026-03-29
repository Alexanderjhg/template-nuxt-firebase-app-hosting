// app/composables/useDMs.ts
// Gestión de mensajes directos (DMs).
// Incluye el DM especial con el Asistente IA (isAiDM: true).

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { DM } from "~/types/chat";

// ID especial para el Asistente IA (no es un Firebase uid real)
export const AI_ASSISTANT_DM_ID = "ai-assistant";

const dms = useState<DM[]>("dms", () => []);
const dmsLoading = useState<boolean>("dmsLoading", () => false);

export function useDMs() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  // ── Escuchar DMs del usuario ─────────────────────────────────────────────

  function listenDMs(workspaceId: string): Unsubscribe {
    if (!user.value?.uid) return () => {};
    dmsLoading.value = true;

    unsubscribe?.();

    const q = query(
      collection($firestore, "workspaces", workspaceId, "dms"),
      where("participantIds", "array-contains", user.value.uid)
      // orderBy omitido intencionalmente para evitar error requires_index
    );

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const allDms = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DM));
        dms.value = allDms.sort((a, b) => {
          const tA = (a.lastMessageAt || a.createdAt)?.toDate?.()?.getTime() ?? 0;
          const tB = (b.lastMessageAt || b.createdAt)?.toDate?.()?.getTime() ?? 0;
          return tB - tA;
        });
        dmsLoading.value = false;
      },
      (err) => {
        console.error("[useDMs] error:", err);
        dmsLoading.value = false;
      }
    );

    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    dms.value = [];
  }

  // ── Abrir o crear un DM con otro usuario ─────────────────────────────────

  async function openDM(
    workspaceId: string,
    recipientId: string
  ): Promise<{ dmId: string }> {
    const token = await getIdToken();
    return $fetch<{ dmId: string }>("/api/protected/dms/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, recipientId },
    });
  }

  // ── Abrir o crear DM con el Asistente IA ─────────────────────────────────

  async function openAiDM(
    workspaceId: string
  ): Promise<{ dmId: string }> {
    const token = await getIdToken();
    return $fetch<{ dmId: string }>("/api/protected/dms/open-ai", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId },
    });
  }

  // ── Abrir o crear DM de notificaciones personales ────────────────────────

  async function openNotificationsDM(
    workspaceId: string
  ): Promise<{ dmId: string }> {
    const token = await getIdToken();
    return $fetch<{ dmId: string }>("/api/protected/dms/open-notifications", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId },
    });
  }

  // ── DMs separados por tipo ───────────────────────────────────────────────

  const regularDMs = computed(() => dms.value.filter((d) => !d.isAiDM && !d.isNotificationsDM));
  const aiDM = computed(() => dms.value.find((d) => d.isAiDM) ?? null);
  const notificationsDM = computed(() => dms.value.find((d) => d.isNotificationsDM) ?? null);

  return {
    dms: readonly(dms),
    regularDMs,
    aiDM,
    notificationsDM,
    dmsLoading: readonly(dmsLoading),
    listenDMs,
    stopListening,
    openDM,
    openAiDM,
    openNotificationsDM,
    AI_ASSISTANT_DM_ID,
  };
}
