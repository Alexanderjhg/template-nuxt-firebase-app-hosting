<template>
  <div class="mb-1">
    <button
      class="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors"
      @click="collapsible && (collapsed = !collapsed)"
    >
      <span>{{ label }}</span>
      <div class="flex items-center gap-1">
        <button
          v-if="$slots.default && actionTitle"
          class="p-0.5 hover:text-white/90 transition-colors"
          :title="actionTitle"
          @click.stop="$emit('action')"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <svg
          v-if="collapsible"
          class="w-3 h-3 transition-transform"
          :class="{ '-rotate-90': collapsed }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
    <div v-show="!collapsed">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  collapsible?: boolean;
  actionTitle?: string;
}>();

defineEmits<{ action: [] }>();

const collapsed = ref(false);
</script>
