// app/composables/usePresence.ts
// Presencia de usuarios basada en heartbeat de Firestore.
// Escribe lastSeen cada 30s. Un usuario es "offline" si lastSeen > 90s.
// No requiere Firebase Realtime Database.

import {
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { MemberPresence, PresenceStatus } from "~/types/chat";

const HEARTBEAT_INTERVAL_MS = 30_000;
const OFFLINE_THRESHOLD_MS = 90_000;

const presenceMap = useState<Record<string, MemberPresence>>("presenceMap", () => ({}));

export function usePresence() {
  const { $firestore } = useNuxtApp();
  const { user } = useAuth();

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let workspaceId: string | null = null;

  // ── Escribir presencia propia ────────────────────────────────────────────

  async function writePresence(status: PresenceStatus) {
    if (!user.value?.uid || !workspaceId) return;
    try {
      await updateDoc(
        doc($firestore, "workspaces", workspaceId, "members", user.value.uid),
        {
          "presence.status": status,
          "presence.lastSeen": serverTimestamp(),
        }
      );
    } catch {
      // Fallo silencioso: la presencia no es crítica
    }
  }

  // ── Iniciar heartbeat ────────────────────────────────────────────────────

  function startHeartbeat(wsId: string) {
    workspaceId = wsId;
    writePresence("online");

    heartbeatTimer = setInterval(() => writePresence("online"), HEARTBEAT_INTERVAL_MS);

    // Marcar offline al cerrar/ocultar la pestaña
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        writePresence("offline");
      } else {
        writePresence("online");
      }
    };

    const handleBeforeUnload = () => writePresence("offline");

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    writePresence("offline");
    workspaceId = null;
  }

  // ── Indicar que el usuario está escribiendo ──────────────────────────────

  async function setTypingIn(wsId: string, channelId: string | null) {
    if (!user.value?.uid) return;
    try {
      await updateDoc(
        doc($firestore, "workspaces", wsId, "members", user.value.uid),
        { "presence.isTypingIn": channelId }
      );
    } catch {
      // Fallo silencioso
    }
  }

  // ── Escuchar presencia de todos los miembros ─────────────────────────────

  function listenPresence(wsId: string, memberIds: string[]): Unsubscribe[] {
    return memberIds.map((uid) =>
      onSnapshot(
        doc($firestore, "workspaces", wsId, "members", uid),
        (snap) => {
          if (snap.exists()) {
            const presence = snap.data().presence as MemberPresence;
            // Si lastSeen > 90s, considerar offline independientemente del campo status
            const lastSeenMs = presence?.lastSeen?.toMillis?.() ?? 0;
            const isStale = Date.now() - lastSeenMs > OFFLINE_THRESHOLD_MS;
            presenceMap.value[uid] = {
              ...presence,
              status: isStale ? "offline" : presence.status,
            };
          }
        }
      )
    );
  }

  function getStatus(uid: string): PresenceStatus {
    return presenceMap.value[uid]?.status ?? "offline";
  }

  function getTypingIn(uid: string): string | undefined {
    return presenceMap.value[uid]?.isTypingIn;
  }

  return {
    presenceMap: readonly(presenceMap),
    startHeartbeat,
    stopHeartbeat,
    setTypingIn,
    listenPresence,
    getStatus,
    getTypingIn,
  };
}
