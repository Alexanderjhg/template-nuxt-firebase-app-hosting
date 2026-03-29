// app/composables/useAiObserver.ts
// Observa nuevos mensajes en el canal activo y llama al endpoint de IA
// con un debounce de 2000ms para agrupar mensajes rápidos.
// Soporta modo automático y manual.
// Soporta tanto workspace channels como global DMs (mensajes personales).

import type { Message } from "~/types/chat";

const DEBOUNCE_MS = 2000;
const MIN_MESSAGES_TO_OBSERVE = 3;

export function useAiObserver() {
  const { getIdToken } = useAuth();
  const { activeWorkspace } = useWorkspace();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastObservedMessageId = "";

  /** Modo actual del observer (workspace) */
  function getMode(): "auto" | "manual" | "off" {
    const settings = activeWorkspace.value?.settings;
    if (!settings) return "off";
    if (settings.aiObserverMode) return settings.aiObserverMode;
    if (settings.aiObserverEnabled === true) return "auto";
    if (settings.aiObserverEnabled === false) return "off";
    return "auto";
  }

  /**
   * Observación automática (workspace) — se llama en cada mensaje nuevo.
   */
  function observe(workspaceId: string, channelId: string, messages: Message[]) {
    if (getMode() !== "auto") return;
    if (messages.length < MIN_MESSAGES_TO_OBSERVE) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;
    if (lastMsg.id === lastObservedMessageId) return;
    if (["system", "ai_suggestion", "agent_notification"].includes(lastMsg.type)) return;

    lastObservedMessageId = lastMsg.id;

    clearTimeout(debounceTimer!);
    debounceTimer = setTimeout(() => {
      callObserve({ workspaceId, channelId }, messages, lastMsg.id);
    }, DEBOUNCE_MS);
  }

  /**
   * Observación automática (global DM) — siempre activo para DMs personales.
   */
  function observeGlobalDM(dmId: string, messages: Message[]) {
    console.log(`[useAiObserver] observeGlobalDM: dmId=${dmId} msgs=${messages.length} min=${MIN_MESSAGES_TO_OBSERVE}`);

    if (messages.length < MIN_MESSAGES_TO_OBSERVE) {
      console.log(`[useAiObserver] Ignorado: menos de ${MIN_MESSAGES_TO_OBSERVE} mensajes`);
      return;
    }

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.id === lastObservedMessageId) {
      console.log(`[useAiObserver] Ignorado: ya observado msgId=${lastMsg.id}`);
      return;
    }

    if (["system", "ai_suggestion", "agent_notification"].includes(lastMsg.type)) {
      console.log(`[useAiObserver] Ignorado: tipo=${lastMsg.type}`);
      return;
    }

    lastObservedMessageId = lastMsg.id;

    clearTimeout(debounceTimer!);
    debounceTimer = setTimeout(() => {
      console.log(`[useAiObserver] Llamando callObserve para dmId=${dmId} targetMsg=${lastMsg.id}`);
      callObserve({ dmId }, messages, lastMsg.id);
    }, DEBOUNCE_MS);
  }

  /**
   * Observación manual (workspace).
   */
  function observeManual(workspaceId: string, channelId: string, messages: Message[], targetMessageId: string) {
    const mode = getMode();
    if (mode === "off") return;
    callObserve({ workspaceId, channelId }, messages, targetMessageId);
  }

  /**
   * Observación manual (global DM).
   */
  function observeGlobalDMManual(dmId: string, messages: Message[], targetMessageId: string) {
    callObserve({ dmId }, messages, targetMessageId);
  }

  async function callObserve(
    target: { workspaceId?: string; channelId?: string; dmId?: string },
    messages: Message[],
    targetMessageId: string,
  ) {
    try {
      const token = await getIdToken();
      if (!token) return;

      const humanMessages = messages.filter((m) =>
        m.senderId !== "ai-assistant" &&
        !m.senderId?.startsWith("ai-") &&
        !["ai_search_result", "calendar_event", "ai_suggestion", "agent_notification"].includes(m.type)
      );

      const context = humanMessages.slice(-20).map((m) => ({
        senderId: m.senderId,
        senderName: m.senderName,
        content: m.content,
      }));

      console.log(`[useAiObserver] Enviando a /api/protected/ai/observe:`, { ...target, messageCount: context.length, targetMessageId });
      const response = await $fetch("/api/protected/ai/observe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { ...target, messages: context, targetMessageId },
      });
      console.log("[useAiObserver] Respuesta del servidor:", response);
    } catch (err: any) {
      console.error("[useAiObserver] Error en observe:", err?.statusCode, err?.data?.message ?? err?.message ?? err);
    }
  }

  function stop() {
    clearTimeout(debounceTimer!);
    debounceTimer = null;
    lastObservedMessageId = "";
  }

  return { observe, observeGlobalDM, observeManual, observeGlobalDMManual, stop, getMode };
}
