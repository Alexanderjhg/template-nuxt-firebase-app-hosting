<template>
  <div class="px-4 pb-4">
    <!-- Typing indicator -->
    <ChatPresenceTypingIndicator :workspace-id="workspaceId" :channel-id="channelId" />

    <!-- AI Suggestion Tray -->
    <slot name="suggestions" />

    <!-- Input box -->
    <div class="relative rounded-xl border border-white/10 bg-white/5 focus-within:border-violet-500/50 transition-colors">

      <!-- Banner: Respondiendo a -->
      <div v-if="replyingTo" class="flex items-start gap-2 px-3 pt-2 pb-1 border-b border-white/5">
        <svg class="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        <div class="flex-1 min-w-0">
          <span class="text-[11px] text-violet-400 font-medium">Respondiendo a {{ replyingTo.senderName }}</span>
          <p class="text-[11px] text-white/40 truncate">{{ replyingTo.content }}</p>
        </div>
        <button class="text-white/30 hover:text-white transition-colors flex-shrink-0" @click="$emit('cancelReply')">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Banner: Editando mensaje -->
      <div v-if="editingContent" class="flex items-center gap-2 px-3 pt-2 text-xs text-violet-300">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Editando mensaje
        <button class="ml-auto text-white/40 hover:text-white transition-colors" @click="$emit('cancelEdit')">✕</button>
      </div>

      <!-- Slash command dropdown -->
      <div
        v-if="showSlashMenu && filteredCommands.length > 0"
        class="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-white/10 bg-[#12121a] shadow-xl z-50 overflow-hidden"
      >
        <div class="px-3 py-1.5 border-b border-white/5">
          <span class="text-[10px] text-white/30 font-medium uppercase tracking-wider">Comandos</span>
        </div>
        <button
          v-for="(cmd, idx) in filteredCommands"
          :key="cmd.id"
          class="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
          :class="idx === slashIndex ? 'bg-violet-500/20 text-white' : 'text-white/70 hover:bg-white/5'"
          @mousedown.prevent="selectCommand(cmd)"
        >
          <span class="text-lg w-6 text-center flex-shrink-0">{{ cmd.icon }}</span>
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium text-blue-400">{{ cmd.name }}</span>
            <p class="text-[11px] text-white/40 truncate">{{ cmd.description }}</p>
          </div>
        </button>
      </div>

      <!-- Mention dropdown -->
      <div
        v-if="showMentions && filteredMembers.length > 0"
        class="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#12121a] shadow-xl z-50"
      >
        <button
          v-for="(member, idx) in filteredMembers"
          :key="member.uid"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
          :class="idx === mentionIndex ? 'bg-violet-500/20 text-white' : 'text-white/70 hover:bg-white/5'"
          @mousedown.prevent="selectMention(member)"
        >
          <img
            v-if="member.photoURL"
            :src="member.photoURL"
            class="w-6 h-6 rounded-full object-cover flex-shrink-0"
          />
          <div v-else class="w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
            {{ member.displayName?.[0]?.toUpperCase() ?? '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-sm truncate">{{ member.displayName }}</span>
            <span v-if="member.username" class="text-xs text-white/30 ml-1.5">@{{ member.username }}</span>
          </div>
          <span class="text-[10px] text-white/20 flex-shrink-0">{{ member.role }}</span>
        </button>
      </div>

      <textarea
        ref="textareaRef"
        v-model="inputValue"
        class="w-full resize-none bg-transparent px-4 py-3 text-sm placeholder-white/30 focus:outline-none"
        :class="isSlashCommand ? 'text-blue-400' : 'text-white'"
        :placeholder="placeholder"
        rows="1"
        @keydown="handleKeydown"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <div class="flex items-center gap-1 px-3 pb-2">
        <!-- Adjuntar archivo -->
        <button
          class="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
          title="Adjuntar archivo"
          @click="fileInputRef?.click()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref="fileInputRef" type="file" class="hidden" @change="handleFileSelect" />

        <div class="flex-1" />

        <!-- Contador de caracteres -->
        <span
          v-if="inputValue.length > 3500"
          class="text-xs"
          :class="inputValue.length > 4000 ? 'text-red-400' : 'text-white/30'"
        >
          {{ inputValue.length }}/4000
        </span>

        <!-- Enviar -->
        <button
          class="px-3 py-1 rounded-md text-xs font-medium transition-colors"
          :class="canSubmit
            ? 'bg-violet-600 hover:bg-violet-500 text-white'
            : 'bg-white/5 text-white/20 cursor-not-allowed'"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ editingContent ? 'Guardar' : 'Enviar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from "~/types/chat";

interface MemberInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  role?: string;
}

interface SlashCommand {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: "recordar",  name: "/recordar",  icon: "⏰", description: "Crear un recordatorio o automatización" },
  { id: "estado",    name: "/estado",    icon: "💬", description: "Ver o cambiar tu estado actual" },
  { id: "quienes",   name: "/quienes",   icon: "👥", description: "Ver quiénes están en este canal" },
  { id: "activos",   name: "/activos",   icon: "🌍", description: "Ver usuarios activos con zona horaria" },
  { id: "workflow",  name: "/workflow",  icon: "⚙️",  description: "Información de este workspace" },
  { id: "resumir",   name: "/resumir",   icon: "📝", description: "Resumir los últimos 20 mensajes" },
];

const props = defineProps<{
  workspaceId: string;
  channelId: string;
  placeholder?: string;
  editingContent?: string;
  isDM?: boolean;
  members?: MemberInfo[];
  replyingTo?: Message | null;
}>();

const emit = defineEmits<{
  send: [content: string];
  fileSelected: [file: File];
  cancelEdit: [];
  cancelReply: [];
  typing: [isTyping: boolean];
  command: [commandId: string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref(props.editingContent ?? "");

// ── Slash commands ─────────────────────────────────────────────────────────
const showSlashMenu = ref(false);
const slashQuery = ref("");
const slashIndex = ref(0);

const isSlashCommand = computed(() => /^\/\S*$/.test(inputValue.value.trim()));

const filteredCommands = computed(() => {
  if (!slashQuery.value) return SLASH_COMMANDS;
  const q = slashQuery.value.toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.id.startsWith(q));
});

function detectSlash() {
  const val = inputValue.value;
  const slashMatch = val.match(/^\/([a-zA-Z]*)$/);
  if (slashMatch) {
    showSlashMenu.value = true;
    slashQuery.value = slashMatch[1] ?? "";
    slashIndex.value = 0;
  } else {
    showSlashMenu.value = false;
    slashQuery.value = "";
  }
}

function selectCommand(cmd: SlashCommand) {
  inputValue.value = "";
  showSlashMenu.value = false;
  emit("command", cmd.id);
  nextTick(() => textareaRef.value?.focus());
}

// ── Mentions state ────────────────────────────────────────────────────────
const showMentions = ref(false);
const mentionQuery = ref("");
const mentionIndex = ref(0);
const mentionStartPos = ref(0);

const filteredMembers = computed(() => {
  if (!props.members) return [];
  if (!mentionQuery.value) return (props.members ?? []).slice(0, 8);
  const q = mentionQuery.value.toLowerCase();
  return (props.members ?? []).filter((m) =>
    m.displayName?.toLowerCase().includes(q) ||
    m.username?.toLowerCase().includes(q)
  ).slice(0, 8);
});

// Sincronizar cuando cambia el mensaje a editar
watch(() => props.editingContent, (val) => {
  inputValue.value = val ?? "";
  nextTick(() => textareaRef.value?.focus());
});

// Limpiar input al cancelar reply
watch(() => props.replyingTo, (val) => {
  if (val) nextTick(() => textareaRef.value?.focus());
});

const canSubmit = computed(() => inputValue.value.trim().length > 0 && inputValue.value.length <= 4000);

let typingTimeout: ReturnType<typeof setTimeout> | null = null;

function handleInput() {
  const el = textareaRef.value;
  if (el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }
  detectSlash();
  detectMention();
}

function detectMention() {
  const el = textareaRef.value;
  if (!el || !props.members?.length) return;

  const cursorPos = el.selectionStart ?? 0;
  const textBefore = inputValue.value.slice(0, cursorPos);

  const mentionMatch = textBefore.match(/(^|[^a-zA-Z0-9])@([a-zA-Z0-9_]*)$/);

  if (mentionMatch) {
    showMentions.value = true;
    mentionQuery.value = mentionMatch[2];
    mentionStartPos.value = cursorPos - mentionMatch[2].length - 1;
    mentionIndex.value = 0;
  } else {
    showMentions.value = false;
    mentionQuery.value = "";
  }
}

function selectMention(member: MemberInfo) {
  const before = inputValue.value.slice(0, mentionStartPos.value);
  const after = inputValue.value.slice(
    mentionStartPos.value + 1 + mentionQuery.value.length
  );
  const mentionText = `@${member.username || member.displayName.replace(/\s/g, '')}`;
  inputValue.value = `${before}${mentionText} ${after}`;
  showMentions.value = false;
  mentionQuery.value = "";

  nextTick(() => {
    const newPos = before.length + mentionText.length + 1;
    textareaRef.value?.setSelectionRange(newPos, newPos);
    textareaRef.value?.focus();
  });
}

function handleKeydown(e: KeyboardEvent) {
  // Navegación en slash menu
  if (showSlashMenu.value && filteredCommands.value.length > 0) {
    if (e.key === "ArrowDown") { e.preventDefault(); slashIndex.value = (slashIndex.value + 1) % filteredCommands.value.length; return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); slashIndex.value = (slashIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length; return; }
    if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); selectCommand(filteredCommands.value[slashIndex.value]!); return; }
    if (e.key === "Escape")    { e.preventDefault(); showSlashMenu.value = false; return; }
  }

  // Navegación en mention dropdown
  if (showMentions.value && filteredMembers.value.length > 0) {
    if (e.key === "ArrowDown") { e.preventDefault(); mentionIndex.value = (mentionIndex.value + 1) % filteredMembers.value.length; return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); mentionIndex.value = (mentionIndex.value - 1 + filteredMembers.value.length) % filteredMembers.value.length; return; }
    if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); selectMention(filteredMembers.value[mentionIndex.value]!); return; }
    if (e.key === "Escape")    { e.preventDefault(); showMentions.value = false; return; }
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submit();
    return;
  }

  if (e.key === "Escape") {
    if (props.replyingTo) { emit("cancelReply"); return; }
    emit("cancelEdit");
  }
}

function handleFocus() {
  emit("typing", true);
  clearTimeout(typingTimeout!);
  typingTimeout = setTimeout(() => emit("typing", false), 3000);
}

function handleBlur() {
  setTimeout(() => {
    showMentions.value = false;
    showSlashMenu.value = false;
  }, 150);
  emit("typing", false);
  clearTimeout(typingTimeout!);
}

function submit() {
  if (!canSubmit.value) return;
  emit("send", inputValue.value.trim());
  inputValue.value = "";
  showMentions.value = false;
  showSlashMenu.value = false;
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
  }
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) emit("fileSelected", file);
}
</script>
