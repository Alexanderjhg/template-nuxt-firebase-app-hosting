<template>
  <TransitionGroup
    v-if="suggestions.length > 0"
    name="suggestion"
    tag="div"
    class="px-4 pb-2 space-y-2"
  >
    <AISuggestionCard
      v-for="s in suggestions"
      :key="s.id"
      :suggestion="s"
      @action="handleAction(s, $event)"
      @dismiss="handleDismiss(s.id)"
    />
  </TransitionGroup>
</template>

<script setup lang="ts">
import type { AiSuggestion, ActionButton } from "~/types/chat";

const props = defineProps<{
  dmId: string;
}>();

const emit = defineEmits<{
  calendarPick: [sug: AiSuggestion, button: ActionButton];
  contactPick: [matches: Array<{ uid: string; displayName: string; photoURL: string; username?: string; source: string }>, message: string];
}>();

const { getSuggestionsForDM, dismissGlobalSuggestion, acceptGlobalSuggestion } = useSuggestions();
const { openGlobalDM, sendGlobalDMMessage } = useGlobalDMs();
const { getIdToken } = useAuth();

const suggestions = computed(() => getSuggestionsForDM(props.dmId));

async function handleDismiss(suggestionId: string) {
  await dismissGlobalSuggestion(suggestionId);
}

async function handleAction(suggestion: AiSuggestion, button: ActionButton) {
  if (button.actionType === "dismiss") {
    await dismissGlobalSuggestion(suggestion.id);
    return;
  }

  if (button.actionType === "agent_forward") {
    await forwardToAgent(suggestion, button);
    return;
  }

  if (button.actionType === "schedule_create") {
    await createSchedule(suggestion, button);
    return;
  }

  await acceptGlobalSuggestion(suggestion.id);

  switch (button.actionType) {
    case "task_add":
      await handleTaskAdd(suggestion, button);
      break;
    case "dm_send":
      await handleOutboundMessage(suggestion, button);
      break;
    case "calendar_create":
      await handleCalendarCreate(suggestion, button);
      break;
    case "calendar_pick_time":
      emit("calendarPick", suggestion, button);
      break;
    case "search":
      await handleSearch(suggestion, button);
      break;
    default:
      console.log("[SuggestionTrayGlobal] Acción sin handler:", button.actionType);
  }
}

// ── Tareas pendientes ────────────────────────────────────────────────────

async function handleTaskAdd(sug: AiSuggestion, button: ActionButton) {
  const desc = (button.payload?.description as string) ?? sug.card.description;
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/tasks/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { title: desc, source: "globalDM", sourceDmId: props.dmId },
    });
    await sendGlobalDMMessage(props.dmId, `✅ Tarea agregada: ${desc.slice(0, 100)}`);
  } catch (err: any) {
    console.error("[SuggestionTrayGlobal] Task add failed:", err?.data ?? err);
  }
}

// ── Buscar con IA ─────────────────────────────────────────────────────────

async function handleSearch(sug: AiSuggestion, button: ActionButton) {
  const query = (button.payload?.query as string) || sug.card?.description || "";
  if (!query.trim()) return;

  try {
    const token = await getIdToken();
    await $fetch("/api/protected/ai/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { query, globalDmId: props.dmId },
    });
  } catch (err: any) {
    console.error("[SuggestionTrayGlobal] Search failed:", err?.data ?? err);
    await sendGlobalDMMessage(props.dmId, "❌ Error al realizar la búsqueda.");
  }
}

// ── Crear evento de calendario ────────────────────────────────────────────

async function handleCalendarCreate(sug: AiSuggestion, button: ActionButton) {
  const payload = button.payload ?? {};
  const title = (payload.title as string) || sug.card?.title || "Evento";
  const description = (payload.description as string) || sug.card?.description || "";
  const date = (payload.date as string) || new Date().toISOString().split("T")[0];
  const time = (payload.time as string) || "09:00";
  const duration = (payload.duration as number) || 60;

  try {
    const token = await getIdToken();
    await $fetch("/api/protected/calendar/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { title, description, date, time, duration, globalDmId: props.dmId },
    });
    await sendGlobalDMMessage(props.dmId, `📅 Evento creado: ${title} — ${date} a las ${time}`);
  } catch (err: any) {
    console.error("[SuggestionTrayGlobal] Calendar create failed:", err?.data ?? err);
    await sendGlobalDMMessage(props.dmId, "❌ Error al crear el evento.");
  }
}

// ── Enviar mensaje a contacto ─────────────────────────────────────────────

async function handleOutboundMessage(sug: AiSuggestion, button: ActionButton) {
  const recipientName = (button.payload?.recipientName as string) ?? "";
  const message = (button.payload?.suggestedMessage as string) || sug.card?.description || "";

  if (!recipientName) return;

  try {
    const token = await getIdToken();
    const result = await $fetch<{ matches: Array<{ uid: string; displayName: string; photoURL: string; username?: string; source: string }> }>(
      "/api/protected/ai/resolve-contact",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { recipientName },
      },
    );

    if (result.matches.length === 0) {
      await sendGlobalDMMessage(props.dmId, `❌ No se encontró a "${recipientName}" entre tus contactos.`);
    } else if (result.matches.length === 1) {
      await sendOutboundDM(result.matches[0]!.uid, result.matches[0]!.displayName, message);
    } else {
      emit("contactPick", result.matches, message);
    }
  } catch (err: any) {
    console.error("[SuggestionTrayGlobal] Resolve contact failed:", err?.data ?? err);
  }
}

async function sendOutboundDM(recipientId: string, recipientName: string, message: string) {
  if (!message.trim()) {
    const { dmId } = await openGlobalDM(recipientId);
    navigateTo(`/messages/dm/${dmId}`);
    return;
  }

  try {
    const { dmId } = await openGlobalDM(recipientId);
    await sendGlobalDMMessage(dmId, message);
    await sendGlobalDMMessage(props.dmId, `✅ Mensaje enviado a ${recipientName}`);
  } catch (err: any) {
    console.error("[SuggestionTrayGlobal] Send outbound failed:", err?.data ?? err);
  }
}

// ── Forward a agente externo ──────────────────────────────────────────────

async function forwardToAgent(sug: AiSuggestion, button: ActionButton) {
  const agentId = button.payload?.agentId as string;
  const taskDesc = (button.payload?.taskDescription as string) ?? sug.card.description;

  if (!agentId) return;

  try {
    const token = await getIdToken();
    await $fetch("/api/protected/ai/forward-to-agent", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        agentId,
        taskDescription: taskDesc,
        globalDmId: props.dmId,
        suggestionId: sug.id,
        replyTarget: (button.payload?.replyTarget as string) ?? "dm",
      },
    });
    await sendGlobalDMMessage(props.dmId, `🤖 Tarea enviada al agente: ${(button.payload?.agentName as string) ?? "Agente"}`);
  } catch (err: any) {
    console.error("[SuggestionTrayGlobal] Forward to agent failed:", err?.data ?? err);
    await sendGlobalDMMessage(props.dmId, "❌ Error al reenviar al agente.");
  }
}

// ── Crear automatización ──────────────────────────────────────────────────

async function createSchedule(sug: AiSuggestion, button: ActionButton) {
  const desc = (button.payload?.description as string) ?? sug.card.description;

  try {
    const token = await getIdToken();
    const result = await $fetch<{ automationId: string; nextRunAt: string }>("/api/protected/automations/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: sug.card?.title ?? desc.slice(0, 60),
        description: desc,
        frequency: button.payload?.frequency ?? "once",
        time: button.payload?.time ?? null,
        dayOfWeek: button.payload?.dayOfWeek ?? null,
        dayOfMonth: button.payload?.dayOfMonth ?? null,
        date: button.payload?.date ?? null,
        sourceType: "personal",
        sourceDmId: props.dmId,
        globalDmId: props.dmId,
        suggestionId: sug.id,
      },
    });

    const freqLabel: Record<string, string> = {
      once: "una vez", daily: "diariamente", weekly: "semanalmente", monthly: "mensualmente",
    };
    const freq = (button.payload?.frequency as string) ?? "once";
    const timeStr = button.payload?.time ? ` a las ${button.payload.time}` : "";
    await sendGlobalDMMessage(props.dmId, `⏰ Automatización programada: ${desc.slice(0, 100)}\nFrecuencia: ${freqLabel[freq] ?? freq}${timeStr}\nPróxima ejecución: ${new Date(result.nextRunAt).toLocaleString()}`);
  } catch (err: any) {
    console.error("[SuggestionTrayGlobal] Create schedule failed:", err?.data ?? err);
    await sendGlobalDMMessage(props.dmId, "❌ Error al crear la automatización.");
  }
}
</script>

<style scoped>
.suggestion-enter-active {
  transition: all 0.3s ease-out;
}
.suggestion-leave-active {
  transition: all 0.2s ease-in;
}
.suggestion-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.suggestion-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
