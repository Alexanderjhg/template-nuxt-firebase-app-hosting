<template>
  <span
    class="inline-block w-2 h-2 rounded-full flex-shrink-0"
    :class="{
      'bg-green-500': status === 'online',
      'bg-yellow-400': status === 'away',
      'bg-white/20': status === 'offline',
    }"
    :title="statusLabel"
  />
</template>

<script setup lang="ts">
import type { PresenceStatus } from "~/types/chat";

const props = defineProps<{ status: PresenceStatus }>();

const statusLabel = computed(() => ({
  online: "En línea",
  away: "Ausente",
  offline: "Desconectado",
}[props.status]));
</script>
