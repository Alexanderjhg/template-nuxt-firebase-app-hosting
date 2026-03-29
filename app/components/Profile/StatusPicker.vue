<template>
  <div class="relative" ref="container">
    <button
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors w-full"
      @click="open = !open"
    >
      <span class="text-base">{{ currentEmoji }}</span>
      <span :class="dotClass" class="w-2 h-2 rounded-full flex-shrink-0" />
      <span class="text-white/70 flex-1 text-left truncate">{{ currentLabel }}</span>
      <svg class="w-3 h-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="open" class="absolute bottom-full mb-1 left-0 w-full rounded-xl border border-white/10 bg-[#1a1a2e] shadow-xl z-50 overflow-hidden">
      <button
        v-for="opt in options"
        :key="opt.value"
        class="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
        :class="modelValue === opt.value ? 'text-white' : 'text-white/60'"
        @click="select(opt.value)"
      >
        <span class="text-base">{{ opt.emoji }}</span>
        <span :class="opt.dotClass" class="w-2 h-2 rounded-full flex-shrink-0" />
        <span>{{ opt.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserStatus } from "~/types/chat";

const props = defineProps<{ modelValue: UserStatus }>();
const emit = defineEmits<{ "update:modelValue": [value: UserStatus] }>();

const open = ref(false);
const container = ref<HTMLElement | null>(null);

const options: { value: UserStatus; label: string; emoji: string; dotClass: string }[] = [
  { value: "online",  label: "En línea",     emoji: "🟢", dotClass: "bg-green-400" },
  { value: "away",    label: "Ausente",       emoji: "🟡", dotClass: "bg-yellow-400" },
  { value: "busy",    label: "No molestar",   emoji: "🔴", dotClass: "bg-red-400" },
  { value: "offline", label: "Desconectado",  emoji: "⚫", dotClass: "bg-white/30" },
];

const current = computed(() => options.find((o) => o.value === props.modelValue) ?? options[0]!);
const currentLabel = computed(() => current.value.label);
const currentEmoji = computed(() => current.value.emoji);
const dotClass = computed(() => current.value.dotClass);

function select(value: UserStatus) {
  emit("update:modelValue", value);
  open.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (container.value && !container.value.contains(e.target as Node)) {
    open.value = false;
  }
}
onMounted(() => document.addEventListener("mousedown", handleClickOutside));
onUnmounted(() => document.removeEventListener("mousedown", handleClickOutside));
</script>
