// app/composables/useSuggestions.ts
// Escucha en tiempo real las sugerencias de IA para el usuario actual.
// Solo muestra sugerencias "pending" no expiradas.
// Soporta tanto workspace (workspaces/{wsId}/ai_suggestions) como
// global (users/{uid}/ai_suggestions) para DMs personales.

import {
  collection,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { AiSuggestion } from "~/types/chat";

const activeSuggestions = useState<AiSuggestion[]>("aiSuggestions", () => []);
const globalSuggestions = useState<AiSuggestion[]>("aiGlobalSuggestions", () => []);
// Sugerencias aceptadas que tienen una respuesta del observador
const respondedSuggestions = useState<AiSuggestion[]>("aiRespondedSuggestions", () => []);
const globalRespondedSuggestions = useState<AiSuggestion[]>("aiGlobalRespondedSuggestions", () => []);

export function useSuggestions() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;
  let globalUnsub: Unsubscribe | null = null;

  // ── Filtrar y ordenar sugerencias ──────────────────────────────────────

  function filterSuggestions(docs: AiSuggestion[]): AiSuggestion[] {
    const now = new Date();
    return docs
      .filter((s) => s.status === "pending")
      .filter((s) => {
        const exp = s.expiresAt?.toDate?.();
        return !exp || exp > now;
      })
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return timeB - timeA;
      });
  }

  // ── Escuchar sugerencias de workspace ──────────────────────────────────

  function listenSuggestions(workspaceId: string): Unsubscribe {
    if (!user.value?.uid) return () => {};
    unsubscribe?.();

    const q = query(
      collection($firestore, "workspaces", workspaceId, "ai_suggestions"),
      where("recipientId", "==", user.value.uid)
    );

    unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AiSuggestion));
      activeSuggestions.value = filterSuggestions(all);
      respondedSuggestions.value = all.filter((s) => s.status === "accepted" && s.response);
    }, (error) => {
      console.error("[useSuggestions] Workspace Snapshot Error:", error);
    });

    return unsubscribe;
  }

  // ── Escuchar sugerencias globales (DMs personales) ─────────────────────

  function listenGlobalSuggestions(): Unsubscribe {
    if (!user.value?.uid) {
      console.warn("[useSuggestions] listenGlobalSuggestions: no user uid, skipping");
      return () => {};
    }
    globalUnsub?.();

    console.log("[useSuggestions] listenGlobalSuggestions: starting for uid=", user.value.uid);

    const q = query(
      collection($firestore, "users", user.value.uid, "ai_suggestions"),
      where("recipientId", "==", user.value.uid)
    );

    globalUnsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AiSuggestion));
      const filtered = filterSuggestions(all);
      globalSuggestions.value = filtered;
      globalRespondedSuggestions.value = all.filter((s) => s.status === "accepted" && s.response);
    }, (error) => {
      console.error("[useSuggestions] Global Snapshot Error:", error);
    });

    return globalUnsub;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    activeSuggestions.value = [];
  }

  function stopGlobalListening() {
    globalUnsub?.();
    globalUnsub = null;
    globalSuggestions.value = [];
  }

  // ── Mapa de sugerencias por messageId ──────────────────────────────────

  const suggestionByMessageId = computed(() => {
    const map: Record<string, AiSuggestion> = {};
    for (const s of activeSuggestions.value) {
      if (s.triggeredByMessageId) {
        map[s.triggeredByMessageId] = s;
      }
    }
    return map;
  });

  const globalSuggestionByMessageId = computed(() => {
    const map: Record<string, AiSuggestion> = {};
    for (const s of globalSuggestions.value) {
      if (s.triggeredByMessageId) {
        map[s.triggeredByMessageId] = s;
      }
    }
    return map;
  });

  // Mapa de respuestas del observador por messageId (sugerencias aceptadas con response)
  const respondedByMessageId = computed(() => {
    const map: Record<string, AiSuggestion> = {};
    for (const s of respondedSuggestions.value) {
      if (s.triggeredByMessageId) map[s.triggeredByMessageId] = s;
    }
    return map;
  });

  const globalRespondedByMessageId = computed(() => {
    const map: Record<string, AiSuggestion> = {};
    for (const s of globalRespondedSuggestions.value) {
      if (s.triggeredByMessageId) map[s.triggeredByMessageId] = s;
    }
    return map;
  });

  // ── Aceptar sugerencia ───────────────────────────────────────────────────

  async function acceptSuggestion(workspaceId: string, suggestionId: string, response?: string) {
    const token = await getIdToken();
    const result = await $fetch<{ ok: boolean; intent: string; meta: Record<string, unknown> }>(
      `/api/protected/ai/suggestions/${suggestionId}/accept`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { workspaceId, response },
      }
    );
    activeSuggestions.value = activeSuggestions.value.filter((s) => s.id !== suggestionId);
    return result;
  }

  async function acceptGlobalSuggestion(suggestionId: string, response?: string) {
    const token = await getIdToken();
    const result = await $fetch<{ ok: boolean; intent: string; meta: Record<string, unknown> }>(
      `/api/protected/ai/suggestions/${suggestionId}/accept`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { global: true, response },
      }
    );
    globalSuggestions.value = globalSuggestions.value.filter((s) => s.id !== suggestionId);
    return result;
  }

  // ── Descartar sugerencia ─────────────────────────────────────────────────

  async function dismissSuggestion(workspaceId: string, suggestionId: string) {
    const token = await getIdToken();
    await $fetch(`/api/protected/ai/suggestions/${suggestionId}/dismiss`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId },
    });
    activeSuggestions.value = activeSuggestions.value.filter((s) => s.id !== suggestionId);
  }

  async function dismissGlobalSuggestion(suggestionId: string) {
    const token = await getIdToken();
    await $fetch(`/api/protected/ai/suggestions/${suggestionId}/dismiss`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { global: true },
    });
    globalSuggestions.value = globalSuggestions.value.filter((s) => s.id !== suggestionId);
  }

  // ── Sugerencias filtradas por canal/DM ───────────────────────────────────

  function getSuggestionsForChannel(channelId: string): AiSuggestion[] {
    return activeSuggestions.value.filter((s) => s.channelId === channelId);
  }

  function getSuggestionsForDM(dmId: string): AiSuggestion[] {
    return globalSuggestions.value.filter((s) => s.channelId === dmId);
  }

  return {
    activeSuggestions: readonly(activeSuggestions),
    globalSuggestions: readonly(globalSuggestions),
    suggestionByMessageId,
    globalSuggestionByMessageId,
    respondedByMessageId,
    globalRespondedByMessageId,
    listenSuggestions,
    listenGlobalSuggestions,
    stopListening,
    stopGlobalListening,
    acceptSuggestion,
    acceptGlobalSuggestion,
    dismissSuggestion,
    dismissGlobalSuggestion,
    getSuggestionsForChannel,
    getSuggestionsForDM,
  };
}
