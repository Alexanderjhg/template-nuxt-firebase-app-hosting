// app/composables/useChannels.ts
// Listener en tiempo real de canales del workspace activo.
// Incluye canales públicos, privados (si el usuario es miembro) y canales de agentes.

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { Channel } from "~/types/chat";

const channels = useState<Channel[]>("channels", () => []);
const channelsLoading = useState<boolean>("channelsLoading", () => false);

export function useChannels() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  // ── Escuchar canales del workspace ───────────────────────────────────────

  function listenChannels(workspaceId: string): Unsubscribe {
    channelsLoading.value = true;

    unsubscribe?.();

    const q = query(
      collection($firestore, "workspaces", workspaceId, "channels"),
      orderBy("name", "asc")
    );

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        channels.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Channel));
        channelsLoading.value = false;
      },
      (err) => {
        console.error("[useChannels] error:", err);
        channelsLoading.value = false;
      }
    );

    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    channels.value = [];
  }

  // ── Crear canal ──────────────────────────────────────────────────────────

  async function createChannel(
    workspaceId: string,
    payload: { name: string; description?: string; isPrivate?: boolean }
  ): Promise<{ channelId: string }> {
    const token = await getIdToken();
    return $fetch<{ channelId: string }>("/api/protected/channels/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, ...payload },
    });
  }

  // ── Canales organizados por tipo ─────────────────────────────────────────

  const publicChannels = computed(() =>
    channels.value.filter((c) => !c.isPrivate && c.type !== "agent" && !c.isArchived)
  );

  const privateChannels = computed(() => {
    if (!user.value?.uid) return [];
    return channels.value.filter(
      (c) => c.isPrivate && c.type !== "agent" && !c.isArchived && c.memberIds?.includes(user.value!.uid)
    );
  });

  const agentChannels = computed(() =>
    channels.value.filter((c) => c.type === "agent" && !c.isArchived)
  );

  return {
    channels: readonly(channels),
    publicChannels,
    privateChannels,
    agentChannels,
    channelsLoading: readonly(channelsLoading),
    listenChannels,
    stopListening,
    createChannel,
  };
}
