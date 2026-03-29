<template>
  <div
    class="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/60 to-indigo-950/40 p-3 backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="text-base leading-none">{{ intentIcon }}</span>
        <div>
          <p class="text-xs font-semibold text-violet-200">{{ suggestion.card.title }}</p>
          <p class="text-xs text-white/50 mt-0.5">{{ suggestion.card.description }}</p>
        </div>
      </div>
      <button
        class="flex-shrink-0 p-1 rounded text-white/30 hover:text-white/60 transition-colors"
        title="Descartar"
        @click="$emit('dismiss')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Action buttons -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="btn in nonDismissActions"
        :key="btn.label"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
        :class="{
          'bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-900/50': btn.style === 'primary' || !btn.style,
          'bg-white/8 hover:bg-white/12 text-white/70 border border-white/10': btn.style === 'secondary',
          'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20': btn.style === 'danger',
        }"
        @click="$emit('action', btn)"
      >
        {{ btn.label }}
      </button>
    </div>

    <!-- Confidence indicator (sutil) -->
    <div class="mt-2 flex items-center gap-1.5">
      <div class="flex-1 h-0.5 rounded-full bg-white/5 overflow-hidden">
        <div
          class="h-full rounded-full bg-violet-500/40 transition-all"
          :style="{ width: `${Math.round(suggestion.confidence * 100)}%` }"
        />
      </div>
      <span class="text-[10px] text-white/20">IA · {{ Math.round(suggestion.confidence * 100) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AiSuggestion, ActionButton } from "~/types/chat";

const props = defineProps<{ suggestion: AiSuggestion }>();

defineEmits<{
  action: [button: ActionButton];
  dismiss: [];
}>();

const intentIcon = computed(() => {
  const icons: Record<string, string> = {
    calendar: "📅",
    task_assigned: "📋",
    outbound_msg: "💬",
    outbound_message: "💬",
    search: "🔍",
    agent_forward: "🤖",
    schedule: "⏰",
    none: "💡",
  };
  return icons[props.suggestion.intent] ?? "💡";
});

const nonDismissActions = computed(() =>
  props.suggestion.card.actions.filter((a) => a.actionType !== "dismiss")
);
</script>
