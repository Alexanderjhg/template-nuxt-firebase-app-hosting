<template>
  <!-- Los DMs usan el mismo layout que los canales, indicando isDM=true -->
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <ChatLayoutSidebar
      :workspace-name="activeWorkspace?.name"
      :active-d-m-id="dmId"
      :pending-count="pendingCount"
      @select-channel="navigateTo(`/chat/${workspaceId}/${$event}`)"
      @select-d-m="navigateTo(`/chat/${workspaceId}/dm/${$event}`)"
      @select-pending="goToPending"
      @open-create-channel="() => {}"
      @open-new-d-m="() => {}"
      @open-settings="navigateTo(`/chat/${workspaceId}/settings/general`)"
    />

    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div class="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-sm">
          {{ dmHeaderIcon }}
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">{{ dmHeaderTitle }}</h2>
          <p v-if="isAiDM" class="text-xs text-white/40">Asistente con memoria de tus conversaciones</p>
        </div>
        <button
          v-if="pendingCount > 0"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 transition-colors"
          @click="goToPending"
        >
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span class="text-xs text-emerald-400 font-medium">{{ pendingCount }}</span>
        </button>
      </div>

      <!-- Messages -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto py-4 space-y-0.5">
        <ChatMessageBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :is-own="msg.senderId === user?.uid"
          @react="(emoji) => doReact(workspaceId, dmId, msg.id, emoji, true)"
          @action-click="handleActionClick"
        />
        <!-- Thinking indicator para el Asistente IA -->
        <div v-if="isThinking && isAiDM" class="flex items-center gap-3 px-4 py-2">
          <div class="w-8 h-8 rounded-full bg-violet-700/50 border border-violet-500/30 flex items-center justify-center text-base flex-shrink-0">
            🤖
          </div>
          <div class="flex items-center gap-1.5 rounded-xl bg-violet-900/20 border border-violet-500/15 px-3 py-2">
            <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style="animation-delay:0ms" />
            <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style="animation-delay:150ms" />
            <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style="animation-delay:300ms" />
            <span class="text-xs text-violet-300 ml-1">Buscando en tus conversaciones...</span>
          </div>
        </div>

        <!-- Error del Asistente IA -->
        <div v-if="aiError && isAiDM" class="px-4 py-2">
          <p class="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
            ⚠️ {{ aiError }}
          </p>
        </div>

        <div ref="bottomAnchor" />
      </div>

      <!-- Input -->
      <ChatMessageInput
        :workspace-id="workspaceId"
        :channel-id="dmId"
        :placeholder="isAiDM ? 'Pregúntale algo... &quot;busca mi conversación con Jorge&quot;' : 'Escribe un mensaje...'"
        :is-d-m="true"
        @send="handleSend"
        @typing="handleTyping"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActionButton } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const workspaceId = route.params.workspaceId as string;
const dmId = route.params.dmId as string;

const { user } = useAuth();
const { activeWorkspace, loadUserWorkspaces, workspacesMap, setActiveWorkspace } = useWorkspace();
const { listenChannels, publicChannels } = useChannels();
const { listenDMs, regularDMs, aiDM } = useDMs();
const { listenMessages, getMessages, sendMessage, toggleReaction: doReact } = useMessages();
const { startHeartbeat, stopHeartbeat, setTypingIn } = usePresence();
const { askAssistant, isThinking, aiError } = useAiDM();
const { listenTasks, stopListening: stopTasks, pendingCount } = usePendingTasks();

const scrollContainer = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);

const messages = computed(() => getMessages(dmId));

const currentDM = computed(() =>
  aiDM.value?.id === dmId
    ? aiDM.value
    : regularDMs.value.find((d) => d.id === dmId)
);

const isAiDM = computed(() => currentDM.value?.isAiDM ?? false);

const dmHeaderIcon = computed(() => {
  if (isAiDM.value) return "🤖";
  if (!user.value?.uid || !currentDM.value) return "?";
  const otherId = currentDM.value.participantIds.find((id) => id !== user.value!.uid);
  const name = otherId ? currentDM.value.participantMap[otherId]?.displayName ?? "" : "";
  return name[0]?.toUpperCase() ?? "?";
});

const dmHeaderTitle = computed(() => {
  if (isAiDM.value) return "Asistente IA";
  if (!user.value?.uid || !currentDM.value) return "Mensaje directo";
  const otherId = currentDM.value.participantIds.find((id) => id !== user.value!.uid);
  return otherId ? currentDM.value.participantMap[otherId]?.displayName ?? "DM" : "DM";
});

onMounted(async () => {
  await loadUserWorkspaces();
  const ws = workspacesMap.value[workspaceId];
  if (ws) setActiveWorkspace(ws);
  listenChannels(workspaceId);
  listenDMs(workspaceId);
  listenMessages(workspaceId, dmId, true);
  listenTasks(workspaceId);
  startHeartbeat(workspaceId);
  scrollToBottom();
});

onUnmounted(() => {
  stopHeartbeat();
  stopTasks();
});

function goToPending() {
  const firstChannel = publicChannels.value[0];
  if (firstChannel) {
    navigateTo(`/chat/${workspaceId}/${firstChannel.id}?view=pending`);
  }
}

function scrollToBottom() {
  nextTick(() => bottomAnchor.value?.scrollIntoView({ behavior: "smooth" }));
}

watch(messages, (n, o) => {
  if (n.length > (o?.length ?? 0)) scrollToBottom();
});

async function handleSend(content: string) {
  if (isAiDM.value) {
    // Ruta especial: el Asistente IA maneja el envío y la respuesta
    await askAssistant(workspaceId, dmId, content);
  } else {
    await sendMessage(workspaceId, dmId, content, true);
  }
}

function handleTyping(isTyping: boolean) {
  setTypingIn(workspaceId, isTyping ? dmId : null);
}

function handleActionClick(button: ActionButton) {
  console.log("[DM] Action clicked:", button.actionType, button.payload);
}
</script>
