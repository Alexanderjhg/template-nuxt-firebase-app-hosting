<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">

    <MessagesSidebar active="dm" />

    <!-- Chat -->
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0">
          <img v-if="otherParticipant?.photoURL" :src="otherParticipant.photoURL" class="w-full h-full object-cover" alt="" />
          <span v-else>{{ otherParticipant?.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">{{ otherParticipant?.displayName ?? 'Mensaje directo' }}</h2>
          <p v-if="otherParticipant?.username" class="text-xs text-white/40">@{{ otherParticipant.username }}</p>
        </div>
        <NuxtLink
          v-if="personalPendingCount > 0"
          to="/messages/tasks"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 transition-colors"
        >
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span class="text-xs text-emerald-400 font-medium">{{ personalPendingCount }}</span>
        </NuxtLink>
        <span
          v-if="isPending"
          class="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full"
        >
          Solicitud pendiente
        </span>
        <!-- Indicador IA activa -->
        <div v-if="!isPending" class="flex items-center gap-1.5 text-xs text-violet-400/60" title="IA observadora activa">
          <div class="w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-pulse"></div>
          IA
        </div>
      </div>

      <!-- Banner: solicitud RECIBIDA -->
      <div v-if="isPending && isRecipient" class="mx-4 mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
            <img v-if="otherParticipant?.photoURL" :src="otherParticipant.photoURL" class="w-full h-full object-cover" alt="" />
            <span v-else>{{ otherParticipant?.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
          </div>
          <div class="flex-1">
            <p class="text-sm text-white font-medium">{{ otherParticipant?.displayName }} quiere enviarte mensajes</p>
            <p class="text-xs text-white/40 mt-0.5">Si aceptas, podrán chatear normalmente. Si rechazas, se eliminará esta conversación.</p>
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <button
            :disabled="responding"
            class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-medium text-white transition-colors"
            @click="respond('accept')"
          >
            {{ responding ? 'Procesando...' : 'Aceptar' }}
          </button>
          <button
            :disabled="responding"
            class="px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-900/20 disabled:opacity-40 text-sm text-red-400 transition-colors"
            @click="respond('decline')"
          >
            Rechazar
          </button>
        </div>
      </div>

      <!-- Banner: solicitud ENVIADA (esperando) -->
      <div v-if="isPending && !isRecipient" class="mx-4 mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-2">
        <svg class="w-4 h-4 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-xs text-white/40">Solicitud enviada · Esperando que <strong class="text-white/60">{{ otherParticipant?.displayName }}</strong> acepte antes de ver tus mensajes.</p>
      </div>

      <!-- Mensajes -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto py-4 space-y-0.5">
        <ChatMessageBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :is-own="msg.senderId === user?.uid"
          :suggestion="globalSuggestionByMessageId[msg.id]"
          :responded-suggestion="globalRespondedByMessageId[msg.id]"
          @react="() => {}"
          @action-click="(btn) => handleBubbleAction(msg, btn)"
          @suggestion-action="(data) => handleSuggestionFromBubble(data)"
        />
        <div ref="bottomAnchor" />
      </div>

      <!-- Input -->
      <div v-if="!isPending || !isRecipient" class="px-4 py-3 border-t border-white/5">
        <form class="flex items-center gap-3" @submit.prevent="send">
          <input
            v-model="inputText"
            type="text"
            :placeholder="isPending ? `Mensaje (solicitud pendiente)` : `Mensaje a ${otherParticipant?.displayName ?? '...'}`"
            class="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
          />
          <button
            type="submit"
            :disabled="!inputText.trim()"
            class="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>

    <!-- Modal: selector de contacto -->
    <Teleport to="body">
      <div v-if="showContactPicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 space-y-4">
          <h3 class="text-sm font-semibold text-white">Selecciona el contacto correcto</h3>
          <div class="space-y-1 max-h-60 overflow-y-auto">
            <button
              v-for="match in contactMatches"
              :key="match.uid"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
              @click="selectContactAndSend(match)"
            >
              <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 overflow-hidden">
                <img v-if="match.photoURL" :src="match.photoURL" class="w-full h-full object-cover" alt="" />
                <span v-else>{{ match.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ match.displayName }}</p>
                <p v-if="match.username" class="text-xs text-white/30">@{{ match.username }}</p>
              </div>
            </button>
          </div>
          <button class="w-full py-2 text-sm text-white/40 hover:text-white" @click="showContactPicker = false">Cancelar</button>
        </div>
      </div>
    </Teleport>

    <!-- Modal: selector de hora -->
    <Teleport to="body">
      <div v-if="showTimePicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-xs rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 space-y-4">
          <h3 class="text-sm font-semibold text-white">Selecciona la hora</h3>
          <p class="text-xs text-white/40">{{ pendingCalendar?.button?.payload?.title ?? 'Evento' }}</p>
          <input
            v-model="customTime"
            type="time"
            class="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
          />
          <div class="flex gap-2">
            <button
              class="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-colors disabled:opacity-40"
              :disabled="!customTime"
              @click="confirmCustomTime"
            >
              Agendar
            </button>
            <button
              class="flex-1 py-2 rounded-lg border border-white/10 text-sm text-white/40 hover:text-white transition-colors"
              @click="showTimePicker = false; pendingCalendar = null; customTime = '';"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import type { GlobalDM, ActionButton, AiSuggestion } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const dmId = route.params.dmId as string;
const { user, getIdToken } = useAuth();
const { $firestore } = useNuxtApp();
const { globalDMs, listenGlobalDMs, listenDMMessages, getDMMessages, sendGlobalDMMessage, getOtherParticipant, respondToDM, openGlobalDM } = useGlobalDMs();
const { observeGlobalDM, stop: stopObserver } = useAiObserver();
const { listenGlobalSuggestions, stopGlobalListening, globalSuggestionByMessageId, globalRespondedByMessageId, acceptGlobalSuggestion, dismissGlobalSuggestion } = useSuggestions();

const scrollContainer = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);
const inputText = ref("");
const responding = ref(false);

// Modales
const showContactPicker = ref(false);
const contactMatches = ref<Array<{ uid: string; displayName: string; photoURL: string; username?: string; source: string }>>([]);
const pendingOutboundMessage = ref("");
const showTimePicker = ref(false);
const pendingCalendar = ref<{ sug: AiSuggestion; button: ActionButton } | null>(null);
const customTime = ref("");

// Fallback: info del DM cargada directamente
const directDMData = ref<GlobalDM | null>(null);

const currentDM = computed(() => globalDMs.value.find((d) => d.id === dmId) ?? directDMData.value);
const otherParticipant = computed(() => currentDM.value ? getOtherParticipant(currentDM.value) : null);
const messages = computed(() => getDMMessages(dmId));
const isPending = computed(() => currentDM.value?.status === "pending");
const isRecipient = computed(() =>
  !!currentDM.value?.requestedBy && currentDM.value.requestedBy !== user.value?.uid
);


// Tareas pendientes personales
const personalPendingCount = ref(0);
let unsubTasks: (() => void) | null = null;

let dmMsgUnsub: (() => void) | null = null;

onMounted(async () => {
  try {
    const dmDoc = await getDoc(doc($firestore, "globalDMs", dmId));
    if (dmDoc.exists()) {
      directDMData.value = { id: dmDoc.id, ...dmDoc.data() } as GlobalDM;
    }
  } catch (err) {
    console.warn("[dm] direct fetch failed:", err);
  }

  listenGlobalDMs();
  dmMsgUnsub = listenDMMessages(dmId);
  listenGlobalSuggestions();
  scrollToBottom();

  // Listener de tareas pendientes personales
  if (user.value?.uid) {
    const tasksQuery = query(
      collection($firestore, "users", user.value.uid, "pending_tasks"),
      where("status", "==", "pending"),
    );
    unsubTasks = onSnapshot(tasksQuery, (snap) => {
      personalPendingCount.value = snap.size;
    });
  }

  onUnmounted(() => {
    dmMsgUnsub?.();
    unsubTasks?.();
    stopObserver();
    stopGlobalListening();
  });
});

// Observar mensajes nuevos con IA
let lastSeenMsgId = "";
watch(messages, (n, o) => {
  if (!n.length) return;
  const lastMsg = n[n.length - 1];
  const isNew = lastMsg?.id && lastMsg.id !== lastSeenMsgId;

  if (isNew) {
    lastSeenMsgId = lastMsg.id;
    scrollToBottom();
    if (!isPending.value) {
      console.log(`[dm/${dmId}] Observando: ${n.length} mensajes, ultimo=${lastMsg.id}`);
      observeGlobalDM(dmId, n);
    }
  }
});

function scrollToBottom() {
  nextTick(() => bottomAnchor.value?.scrollIntoView({ behavior: "smooth" }));
}

async function send() {
  const text = inputText.value.trim();
  if (!text) return;
  inputText.value = "";
  await sendGlobalDMMessage(dmId, text);
}

async function respond(action: "accept" | "decline") {
  responding.value = true;
  try {
    await respondToDM(dmId, action);
    if (action === "decline") navigateTo("/messages");
  } finally {
    responding.value = false;
  }
}

// ── Action handlers para burbujas de mensaje ──────────────────────────────

async function handleBubbleAction(msg: any, button: ActionButton) {
  if (button.actionType === "dismiss") return;
  const content = (button.payload?.response as string)
    || (button.payload?.text as string)
    || button.label;
  await sendGlobalDMMessage(dmId, content);
}

async function handleSuggestionFromBubble(data: { suggestion: AiSuggestion; button: ActionButton; context?: string }) {
  const { suggestion: sug, button } = data;

  if (button.actionType === "dismiss") {
    await dismissGlobalSuggestion(sug.id);
    return;
  }

  if (button.actionType === "agent_forward") {
    await forwardToAgent(sug, button);
    return;
  }

  if (button.actionType === "schedule_create") {
    await createSchedule(sug, button);
    return;
  }

  switch (button.actionType) {
    case "task_add":
      await handleTaskAdd(sug, button);
      break;
    case "dm_send":
      await handleOutboundMessage(sug, button);
      break;
    case "calendar_create":
      await handleCalendarCreate(sug, button);
      break;
    case "calendar_pick_time":
      openTimePicker(sug, button);
      break;
    case "search":
      await handleSearch(sug, button);
      break;
    default:
      await acceptGlobalSuggestion(sug.id, `Acción ejecutada: ${button.label}`);
  }
}

// ── Acciones agénticas ───────────────────────────────────────────────────

async function handleTaskAdd(sug: AiSuggestion, button: ActionButton) {
  const desc = (button.payload?.description as string) ?? sug.card.description;
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/tasks/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { title: desc, source: "globalDM", sourceDmId: dmId },
    });
    await acceptGlobalSuggestion(sug.id, `Tarea agregada: "${desc.slice(0, 100)}". Puedes verla en tus tareas pendientes.`);
  } catch (err: any) {
    console.error("[dm] Task add failed:", err?.data ?? err);
    await acceptGlobalSuggestion(sug.id, "Error al crear la tarea.");
  }
}

async function handleSearch(sug: AiSuggestion, button: ActionButton) {
  const searchQuery = (button.payload?.query as string) || sug.card?.description || "";
  if (!searchQuery.trim()) return;
  try {
    const token = await getIdToken();
    const result = await $fetch<{ ok: boolean; result: string; sources: string[] }>("/api/protected/ai/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { query: searchQuery, globalDmId: dmId, skipMessage: true },
    });
    await acceptGlobalSuggestion(sug.id, result.ok ? result.result : "No se pudo completar la búsqueda.");
  } catch (err: any) {
    console.error("[dm] Search failed:", err?.data ?? err);
    await acceptGlobalSuggestion(sug.id, "Error al realizar la búsqueda.");
  }
}

async function handleCalendarCreate(sug: AiSuggestion, button: ActionButton) {
  const payload = button.payload ?? {};
  const title = (payload.title as string) || sug.card?.title || "Evento";
  const description = (payload.description as string) || sug.card?.description || "";
  const date = (payload.date as string) || new Date().toISOString().split("T")[0];
  const time = (payload.time as string) || "09:00";
  const duration = (payload.duration as number) || 60;
  try {
    const token = await getIdToken();
    const result = await $fetch<{ ok: boolean; calendarUrl: string; createdInGoogle?: boolean }>("/api/protected/calendar/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { title, description, date, time, duration, globalDmId: dmId, skipMessage: true },
    });
    const responseText = result.createdInGoogle
      ? `Evento "${title}" agendado en tu Google Calendar para el ${date} a las ${time} (${duration} min).`
      : `Evento "${title}" guardado para el ${date} a las ${time} (${duration} min). [Agregar a Google Calendar](${result.calendarUrl})`;
    await acceptGlobalSuggestion(sug.id, responseText);
  } catch (err: any) {
    console.error("[dm] Calendar create failed:", err?.data ?? err);
    await acceptGlobalSuggestion(sug.id, "Error al crear el evento.");
  }
}

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
      await acceptGlobalSuggestion(sug.id, `No se encontró a "${recipientName}" entre tus contactos.`);
    } else if (result.matches.length === 1) {
      await sendOutboundDM(result.matches[0]!.uid, result.matches[0]!.displayName, message);
      await acceptGlobalSuggestion(sug.id, `Mensaje enviado a ${result.matches[0]!.displayName}`);
    } else {
      pendingOutboundSugId = sug.id;
      openContactPicker(result.matches, message);
    }
  } catch (err: any) {
    console.error("[dm] Resolve contact failed:", err?.data ?? err);
    await acceptGlobalSuggestion(sug.id, "Error al buscar el contacto.");
  }
}

let pendingOutboundSugId = "";

async function sendOutboundDM(recipientId: string, recipientName: string, message: string) {
  if (!message.trim()) {
    const { dmId: newDmId } = await openGlobalDM(recipientId);
    navigateTo(`/messages/dm/${newDmId}`);
    return;
  }
  try {
    const { dmId: newDmId } = await openGlobalDM(recipientId);
    await sendGlobalDMMessage(newDmId, message);
    // Response se guarda via handleOutboundMessage o selectContactAndSend
  } catch (err: any) {
    console.error("[dm] Send outbound failed:", err?.data ?? err);
  }
}

async function forwardToAgent(sug: AiSuggestion, button: ActionButton) {
  const agentId = button.payload?.agentId as string;
  const agentName = (button.payload?.agentName as string) ?? "Agente";
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
        globalDmId: dmId,
        suggestionId: sug.id,
        replyTarget: (button.payload?.replyTarget as string) ?? "dm",
      },
    });
    await acceptGlobalSuggestion(sug.id, `Tarea reenviada al ${agentName}. La respuesta llegará en el canal del agente.`);
  } catch (err: any) {
    console.error("[dm] Forward to agent failed:", err?.data ?? err);
    await acceptGlobalSuggestion(sug.id, "Error al reenviar al agente.");
  }
}

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
        sourceDmId: dmId,
        globalDmId: dmId,
        suggestionId: sug.id,
      },
    });
    const freqLabel: Record<string, string> = {
      once: "una vez", daily: "diariamente", weekly: "semanalmente", monthly: "mensualmente",
    };
    const freq = (button.payload?.frequency as string) ?? "once";
    const timeStr = button.payload?.time ? ` a las ${button.payload.time}` : "";
    await acceptGlobalSuggestion(sug.id, `Automatización programada: ${desc.slice(0, 100)}\nFrecuencia: ${freqLabel[freq] ?? freq}${timeStr}\nPróxima ejecución: ${new Date(result.nextRunAt).toLocaleString()}`);
  } catch (err: any) {
    console.error("[dm] Create schedule failed:", err?.data ?? err);
    await acceptGlobalSuggestion(sug.id, "Error al crear la automatización.");
  }
}

// ── Modales: selector de hora y contacto ──────────────────────────────────

function openTimePicker(sug: AiSuggestion, button: ActionButton) {
  pendingCalendar.value = { sug, button };
  showTimePicker.value = true;
}

async function confirmCustomTime() {
  if (!customTime.value || !pendingCalendar.value) return;
  const { sug, button } = pendingCalendar.value;
  const payload = button.payload ?? {};

  showTimePicker.value = false;
  pendingCalendar.value = null;

  const title = (payload.title as string) || sug.card?.title || "Evento";
  const description = (payload.description as string) || sug.card?.description || "";
  const date = (payload.date as string) || new Date().toISOString().split("T")[0];
  const duration = (payload.duration as number) || 60;

  try {
    const token = await getIdToken();
    const result = await $fetch<{ ok: boolean; calendarUrl: string; createdInGoogle?: boolean }>("/api/protected/calendar/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { title, description, date, time: customTime.value, duration, globalDmId: dmId, skipMessage: true },
    });
    const responseText = result.createdInGoogle
      ? `Evento "${title}" agendado en tu Google Calendar para el ${date} a las ${customTime.value}.`
      : `Evento "${title}" guardado para el ${date} a las ${customTime.value}. [Agregar a Google Calendar](${result.calendarUrl})`;
    await acceptGlobalSuggestion(sug.id, responseText);
  } catch (err: any) {
    console.error("[dm] Calendar create failed:", err?.data ?? err);
    await acceptGlobalSuggestion(sug.id, "Error al crear el evento.");
  }
  customTime.value = "";
}

function openContactPicker(matches: typeof contactMatches.value, message: string) {
  contactMatches.value = matches;
  pendingOutboundMessage.value = message;
  showContactPicker.value = true;
}

async function selectContactAndSend(contact: typeof contactMatches.value[0]) {
  showContactPicker.value = false;
  const message = pendingOutboundMessage.value;

  if (!message.trim()) {
    const { dmId: newDmId } = await openGlobalDM(contact.uid);
    navigateTo(`/messages/dm/${newDmId}`);
    return;
  }

  try {
    const { dmId: newDmId } = await openGlobalDM(contact.uid);
    await sendGlobalDMMessage(newDmId, message);
    if (pendingOutboundSugId) {
      await acceptGlobalSuggestion(pendingOutboundSugId, `Mensaje enviado a ${contact.displayName}`);
    }
  } catch (err: any) {
    console.error("[dm] Send outbound failed:", err?.data ?? err);
  }
}
</script>
