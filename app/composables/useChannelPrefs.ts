// app/composables/useChannelPrefs.ts
// Gestiona preferencias del usuario por canal: favoritos y marcas de leído.
// Escucha el documento del miembro en Firestore para reactividad en tiempo real.

import {
  doc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

interface ChannelReads {
  [channelId: string]: { toDate: () => Date } | null;
}

interface MemberPrefs {
  favorites: string[];
  channelReads: ChannelReads;
}

const favorites = useState<string[]>("channelFavorites", () => []);
const channelReads = useState<ChannelReads>("channelReads", () => ({}));

export function useChannelPrefs() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  // ── Escuchar preferencias del miembro en tiempo real ─────────────────────

  function listenPrefs(workspaceId: string): Unsubscribe {
    if (!user.value?.uid) return () => {};

    unsubscribe?.();

    const memberRef = doc(
      $firestore,
      "workspaces",
      workspaceId,
      "members",
      user.value.uid
    );

    unsubscribe = onSnapshot(memberRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<MemberPrefs>;
      favorites.value = data.favorites ?? [];
      channelReads.value = (data.channelReads ?? {}) as ChannelReads;
    });

    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    favorites.value = [];
    channelReads.value = {};
  }

  // ── Togglear favorito ────────────────────────────────────────────────────

  async function toggleFavorite(workspaceId: string, channelId: string) {
    const isFav = favorites.value.includes(channelId);
    // Optimistic update
    if (isFav) {
      favorites.value = favorites.value.filter((id) => id !== channelId);
    } else {
      favorites.value = [...favorites.value, channelId];
    }

    try {
      const token = await getIdToken();
      await $fetch("/api/protected/channels/favorite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: {
          workspaceId,
          channelId,
          action: isFav ? "remove" : "add",
        },
      });
    } catch (err) {
      // Revertir si falla
      if (isFav) {
        favorites.value = [...favorites.value, channelId];
      } else {
        favorites.value = favorites.value.filter((id) => id !== channelId);
      }
      console.error("[useChannelPrefs] toggleFavorite error:", err);
    }
  }

  // ── Marcar canal como leído ──────────────────────────────────────────────

  async function markRead(workspaceId: string, channelId: string) {
    // Optimistic update: usar Date actual
    channelReads.value = {
      ...channelReads.value,
      [channelId]: { toDate: () => new Date() },
    };

    try {
      const token = await getIdToken();
      await $fetch("/api/protected/channels/read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { workspaceId, channelId },
      });
    } catch (err) {
      console.error("[useChannelPrefs] markRead error:", err);
    }
  }

  // ── Computar si un canal tiene mensajes no leídos ────────────────────────

  function isUnread(channelId: string, lastMessageAt?: { toDate: () => Date } | null): boolean {
    if (!lastMessageAt) return false;
    const read = channelReads.value[channelId];
    if (!read) return true; // Nunca se leyó
    try {
      return lastMessageAt.toDate() > read.toDate();
    } catch {
      return false;
    }
  }

  return {
    favorites: readonly(favorites),
    channelReads: readonly(channelReads),
    listenPrefs,
    stopListening,
    toggleFavorite,
    markRead,
    isUnread,
  };
}
