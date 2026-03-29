<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">

    <!-- Sidebar -->
    <div class="w-64 flex-shrink-0 border-r border-white/5 flex flex-col">
      <div class="px-4 py-4 border-b border-white/5 flex items-center gap-2">
        <NuxtLink to="/messages" class="text-white/40 hover:text-white transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </NuxtLink>
        <h2 class="text-sm font-semibold text-white">Grupos</h2>
      </div>
      <div class="flex-1 overflow-y-auto py-2">
        <button
          v-for="group in personalGroups"
          :key="group.id"
          class="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
          :class="group.id === groupId ? 'bg-violet-600/20 text-white' : 'hover:bg-white/5 text-white/70'"
          @click="navigateTo(`/messages/group/${group.id}`)"
        >
          <div class="w-8 h-8 rounded-full bg-indigo-700/60 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {{ group.name?.[0]?.toUpperCase() ?? 'G' }}
          </div>
          <p class="text-sm truncate">{{ group.name }}</p>
        </button>
      </div>
    </div>

    <!-- Chat -->
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div class="w-8 h-8 rounded-full bg-indigo-700/60 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          {{ currentGroup?.name?.[0]?.toUpperCase() ?? 'G' }}
        </div>
        <div>
          <h2 class="text-sm font-semibold text-white">{{ currentGroup?.name ?? 'Grupo' }}</h2>
          <p class="text-xs text-white/40">{{ currentGroup?.memberIds?.length ?? 0 }} miembros</p>
        </div>
      </div>

      <!-- Mensajes -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto py-4 space-y-0.5">
        <ChatMessageBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :is-own="msg.senderId === user?.uid"
          @react="() => {}"
          @action-click="() => {}"
        />
        <div ref="bottomAnchor" />
      </div>

      <!-- Input -->
      <div class="px-4 py-3 border-t border-white/5">
        <form class="flex items-center gap-3" @submit.prevent="send">
          <input
            v-model="inputText"
            type="text"
            :placeholder="`Mensaje en ${currentGroup?.name ?? 'grupo'}...`"
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const groupId = route.params.groupId as string;
const { user } = useAuth();
const { personalGroups, listenPersonalGroups, listenGroupMessages, getGroupMessages, sendGroupMessage } = usePersonalGroups();

const scrollContainer = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);
const inputText = ref("");

const currentGroup = computed(() => personalGroups.value.find((g) => g.id === groupId));
const messages = computed(() => getGroupMessages(groupId));

onMounted(() => {
  listenPersonalGroups();
  listenGroupMessages(groupId);
  scrollToBottom();
});

watch(messages, (n, o) => {
  if (n.length > (o?.length ?? 0)) scrollToBottom();
});

function scrollToBottom() {
  nextTick(() => bottomAnchor.value?.scrollIntoView({ behavior: "smooth" }));
}

async function send() {
  const text = inputText.value.trim();
  if (!text) return;
  inputText.value = "";
  await sendGroupMessage(groupId, text);
}
</script>
