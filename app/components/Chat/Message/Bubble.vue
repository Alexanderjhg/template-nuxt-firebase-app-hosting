<template>
  <div
    class="group flex px-4 py-2 hover:bg-white/[0.02] rounded-md transition-colors"
    :class="[
      { 'opacity-40 italic': message.deletedAt },
      isOwn ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
    ]"
  >
    <!-- Avatar -->
    <div class="flex-shrink-0 w-8 h-8 mt-auto mb-1">
      <img
        v-if="message.senderPhoto && message.type !== 'system' && message.type !== 'ai_suggestion'"
        :src="message.senderPhoto"
        :alt="message.senderName"
        class="w-full h-full rounded-full object-cover"
      />
      <div
        v-else-if="message.type === 'ai_suggestion' || message.type === 'agent_notification'"
        class="w-full h-full rounded-full bg-violet-700/50 border border-violet-500/30 flex items-center justify-center text-sm"
      >
        🤖
      </div>
      <div
        v-else-if="message.type === 'system'"
        class="w-full h-full rounded-full bg-white/5 flex items-center justify-center"
      >
        <svg class="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div
        v-else
        class="w-full h-full rounded-full bg-violet-800 flex items-center justify-center text-xs font-bold text-white shadow"
      >
        {{ message.senderName?.[0]?.toUpperCase() ?? '?' }}
      </div>
    </div>

    <!-- Contenido -->
    <div
      class="flex flex-col relative group max-w-[80%]"
      :class="isOwn ? 'items-end mr-3' : 'items-start ml-3'"
    >
      <!-- Header: nombre + hora -->
      <div
        class="flex items-baseline gap-2 mb-1 pl-1 pr-1"
        :class="isOwn ? 'flex-row-reverse' : 'flex-row'"
      >
        <span
          class="text-xs font-medium"
          :class="{
            'text-violet-400': message.type === 'ai_suggestion' || message.type === 'agent_notification',
            'text-white/30': message.type === 'system',
            'text-white/70': !['ai_suggestion', 'agent_notification', 'system'].includes(message.type),
          }"
        >
          {{ senderLabel }}
        </span>
        <span class="text-[10px] text-white/30">{{ formattedTime }}</span>
        <span v-if="message.editedAt" class="text-[10px] text-white/20 italic">(editado)</span>
      </div>

      <!-- Cita de respuesta -->
      <div
        v-if="message.replyToPreview"
        class="mb-1 flex items-start gap-1.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
      >
        <div class="w-0.5 rounded-full bg-violet-500 flex-shrink-0 self-stretch min-h-[1.5rem]" />
        <div class="min-w-0">
          <span class="text-[10px] font-medium text-violet-400">{{ message.replyToSenderName }}</span>
          <p class="text-[11px] text-white/50 truncate max-w-xs">{{ message.replyToPreview }}</p>
        </div>
      </div>

      <!-- Texto del mensaje en Burbuja -->
      <div class="relative flex items-start gap-1.5">
        <div
          v-if="message.content"
          class="px-4 py-2.5 rounded-2xl shadow-sm relative text-[15px] leading-relaxed break-words"
          :class="[
            message.type === 'system' ? 'bg-transparent text-white/40 italic px-0' :
            isOwn ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-[#1e1e2d] text-emerald-50/90 border border-white/5 rounded-bl-sm text-left'
          ]"
        >
          <p class="whitespace-pre-wrap" v-html="renderContent(message.content)" />
        </div>

        <!-- Punto azul: indica que hay una sugerencia IA asociada -->
        <button
          v-if="suggestion && suggestion.status === 'pending'"
          class="flex-shrink-0 mt-3 relative"
          title="Sugerencia de IA disponible"
          @click="showSuggestion = !showSuggestion"
        >
          <span class="block w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
          <span class="absolute inset-0 w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping opacity-30" />
        </button>
      </div>

      <!-- Card de sugerencia IA (colapsable) -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 -translate-y-1 max-h-0"
        enter-to-class="opacity-100 translate-y-0 max-h-60"
        leave-from-class="opacity-100 translate-y-0 max-h-60"
        leave-to-class="opacity-0 -translate-y-1 max-h-0"
      >
        <div
          v-if="suggestion && showSuggestion"
          class="mt-2 rounded-lg border border-blue-500/20 bg-blue-900/10 p-3 space-y-2 overflow-hidden"
        >
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-blue-300">
              {{ suggestion.card.title }}
            </p>
            <button
              class="text-white/30 hover:text-white/60 transition-colors"
              title="Cerrar"
              @click="showSuggestion = false"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-white/50">{{ suggestion.card.description }}</p>

          <!-- Textarea de contexto adicional (colapsable) -->
          <div v-if="showContextInput" class="space-y-1.5">
            <textarea
              ref="contextTextarea"
              v-model="additionalContext"
              rows="3"
              class="w-full rounded-md border border-blue-500/20 bg-blue-950/30 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none resize-none"
              placeholder="Describe con mas detalle que quieres que haga..."
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <!-- Botón agregar contexto -->
            <button
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70"
              @click="toggleContextInput"
            >
              {{ showContextInput ? 'Ocultar contexto' : '+ Agregar contexto' }}
            </button>

            <button
              v-for="btn in suggestion.card.actions"
              :key="btn.label"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              :class="{
                'bg-blue-600 hover:bg-blue-500 text-white': btn.style === 'primary' || !btn.style,
                'bg-white/5 hover:bg-white/10 text-white/70': btn.style === 'secondary',
                'bg-red-600/20 hover:bg-red-600/30 text-red-400': btn.style === 'danger',
              }"
              @click="$emit('suggestionAction', { suggestion, button: btn, context: additionalContext.trim() || undefined })"
            >
              {{ btn.label }}
            </button>
          </div>
        </div>
      </Transition>

      <!-- Botón "Ver respuesta" del observador (sugerencia aceptada con response) -->
      <div v-if="respondedSuggestion?.response && !suggestion" class="mt-1.5">
        <button
          class="flex items-center gap-1.5 text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
          @click="showResponse = !showResponse"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {{ showResponse ? 'Ocultar respuesta' : 'Ver respuesta del observador' }}
          <svg
            class="w-3 h-3 transition-transform"
            :class="showResponse ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          leave-active-class="transition-all duration-150 ease-in"
          enter-from-class="opacity-0 -translate-y-1 max-h-0"
          enter-to-class="opacity-100 translate-y-0 max-h-96"
          leave-from-class="opacity-100 translate-y-0 max-h-96"
          leave-to-class="opacity-0 -translate-y-1 max-h-0"
        >
          <div
            v-if="showResponse"
            class="mt-1.5 rounded-lg border border-blue-500/15 bg-blue-900/5 px-3 py-2 overflow-hidden"
          >
            <p class="text-xs text-white/60 whitespace-pre-wrap leading-relaxed" v-html="renderContent(respondedSuggestion.response!)" />
          </div>
        </Transition>
      </div>

      <!-- Action card (para agent_notification existentes) -->
      <div
        v-if="message.actionButtons?.length && !message.deletedAt && message.type === 'agent_notification'"
        class="mt-2 rounded-lg border border-violet-500/20 bg-violet-900/10 p-3 space-y-2"
      >
        <p v-if="message.actionCardTitle" class="text-xs font-semibold text-violet-300">
          {{ message.actionCardTitle }}
        </p>
        <p v-if="message.targetUserId && message.targetUserId !== user?.uid" class="text-xs text-white/30 italic">
          Solo el usuario que solicitó esta acción puede ejecutarla.
        </p>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="btn in message.actionButtons"
            :key="btn.label"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            :class="{
              'bg-violet-600 hover:bg-violet-500 text-white': btn.style === 'primary' || !btn.style,
              'bg-white/5 hover:bg-white/10 text-white/70': btn.style === 'secondary',
              'bg-red-600/20 hover:bg-red-600/30 text-red-400': btn.style === 'danger',
            }"
            @click="$emit('actionClick', btn)"
          >
            {{ btn.label }}
          </button>
        </div>
      </div>

      <!-- Adjuntos -->
      <ChatMessageFileAttachment
        v-for="att in message.attachments"
        :key="att.fileUrl"
        :attachment="att"
        class="mt-2"
      />

      <!-- Reacciones -->
      <div v-if="hasReactions" class="flex flex-wrap gap-1 mt-1.5">
        <button
          v-for="(users, emoji) in message.reactions"
          :key="emoji"
          v-show="users.length > 0"
          class="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors"
          :class="[
            userHasReacted(emoji)
              ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
              : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
          ]"
          @click="$emit('react', emoji)"
        >
          <span>{{ emoji }}</span>
          <span>{{ users.length }}</span>
        </button>
        <button
          class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
          @click="$emit('addReaction')"
        >
          +
        </button>
      </div>
    </div>

    <!-- Acciones hover (menú) -->
    <div
      v-if="!message.deletedAt && message.type === 'text'"
      class="hidden group-hover:flex items-center gap-1 self-start mt-0.5"
    >
      <button
        class="p-1 rounded text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors"
        title="Responder en hilo"
        @click="$emit('reply')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
      <button
        v-if="isOwn"
        class="p-1 rounded text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors"
        title="Editar"
        @click="$emit('edit')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <!-- Menú de tres puntos -->
      <div class="relative">
        <button
          class="p-1 rounded text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="Más opciones"
          @click="showMenu = !showMenu"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        <!-- Dropdown menu -->
        <Transition
          enter-active-class="transition duration-100 ease-out"
          leave-active-class="transition duration-75 ease-in"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="showMenu"
            ref="menuDropdown"
            class="absolute z-50 mt-1 w-44 rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl py-1"
            :class="isOwn ? 'right-0' : 'left-0'"
          >
            <!-- Fijar / Desfijar mensaje -->
            <button
              v-if="canPin"
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
              @click="showMenu = false; $emit('pin', message)"
            >
              <svg class="w-3.5 h-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {{ isPinned ? 'Desfijar' : 'Fijar mensaje' }}
            </button>
            <!-- Analizar con IA -->
            <button
              v-if="observerMode !== 'off'"
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
              @click="handleObserveManual"
            >
              <svg class="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analizar con IA
            </button>
            <!-- Eliminar -->
            <button
              v-if="isOwn || isAdmin"
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              @click="showMenu = false; $emit('delete')"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message, ActionButton, AiSuggestion } from "~/types/chat";

const props = defineProps<{
  message: Message;
  isOwn?: boolean;
  isAdmin?: boolean;
  isPinned?: boolean;
  canPin?: boolean;
  suggestion?: AiSuggestion;
  respondedSuggestion?: AiSuggestion;
  observerMode?: "auto" | "manual" | "off";
}>();

const emit = defineEmits<{
  react: [emoji: string];
  addReaction: [];
  reply: [];
  edit: [];
  delete: [];
  pin: [message: Message];
  actionClick: [button: ActionButton];
  suggestionAction: [data: { suggestion: AiSuggestion; button: ActionButton; context?: string }];
  observeManual: [messageId: string];
}>();

const showSuggestion = ref(false);
const showResponse = ref(false);
const showMenu = ref(false);
const menuDropdown = ref<HTMLElement | null>(null);
const showContextInput = ref(false);
const additionalContext = ref("");
const contextTextarea = ref<HTMLTextAreaElement | null>(null);

function toggleContextInput() {
  showContextInput.value = !showContextInput.value;
  if (showContextInput.value) {
    nextTick(() => contextTextarea.value?.focus());
  }
}

// Cerrar menú al hacer click fuera
function onClickOutside(e: MouseEvent) {
  if (menuDropdown.value && !menuDropdown.value.contains(e.target as Node)) {
    showMenu.value = false;
  }
}
watch(showMenu, (open) => {
  if (open) {
    setTimeout(() => document.addEventListener("click", onClickOutside), 0);
  } else {
    document.removeEventListener("click", onClickOutside);
  }
});
onUnmounted(() => document.removeEventListener("click", onClickOutside));

const senderLabel = computed(() => {
  if (props.message.type === "ai_suggestion") return "Asistente IA";
  if (props.message.type === "agent_notification") return props.message.senderName ?? "Agente";
  if (props.message.type === "system") return "Sistema";
  return props.message.senderName;
});

const formattedTime = computed(() => {
  const ts = props.message.createdAt;
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
});

const hasReactions = computed(() => {
  const r = props.message.reactions;
  return r && Object.values(r).some((users) => users.length > 0);
});

const { user } = useAuth();
function userHasReacted(emoji: string): boolean {
  return props.message.reactions?.[emoji]?.includes(user.value?.uid ?? "") ?? false;
}

function handleObserveManual() {
  showMenu.value = false;
  emit('observeManual', props.message.id);
}

function renderContent(content: string): string {
  // Escape HTML first to prevent XSS
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Replace @mentions with styled spans
  return escaped.replace(
    /@([a-zA-Z0-9_]+)/g,
    '<span class="text-violet-400 font-medium cursor-pointer hover:underline">@$1</span>'
  );
}
</script>
