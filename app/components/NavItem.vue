<template>
  <NuxtLink
    :to="to"
    :title="title"
    class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative group"
    :class="active
      ? 'bg-violet-600/30 text-violet-300'
      : 'text-white/30 hover:bg-white/5 hover:text-white/70'"
  >
    <slot />
    <!-- Tooltip -->
    <span class="absolute left-full ml-2 px-2 py-1 rounded-md bg-[#1a1a2e] text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10">
      {{ title }}
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  to: string;
  title: string;
  active: boolean;
}>();
</script>
