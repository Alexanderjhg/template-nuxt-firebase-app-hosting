<template>
  <div v-if="typingNames.length > 0" class="px-1 pb-1 text-xs text-white/40 flex items-center gap-1">
    <!-- Puntos animados -->
    <span class="flex gap-0.5">
      <span class="w-1 h-1 rounded-full bg-white/40 animate-bounce" style="animation-delay: 0ms" />
      <span class="w-1 h-1 rounded-full bg-white/40 animate-bounce" style="animation-delay: 150ms" />
      <span class="w-1 h-1 rounded-full bg-white/40 animate-bounce" style="animation-delay: 300ms" />
    </span>
    <span>{{ typingLabel }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  workspaceId: string;
  channelId: string;
}>();

const { presenceMap } = usePresence();
const { user } = useAuth();

const typingNames = computed(() => {
  return Object.entries(presenceMap.value)
    .filter(([uid, p]) => uid !== user.value?.uid && p.isTypingIn === props.channelId)
    .map(([, p]) => {
      // El nombre está en presenceMap... pero presenceMap solo guarda MemberPresence.
      // En producción se cruzaría con el mapa de miembros. Por ahora: "alguien"
      return "alguien";
    });
});

const typingLabel = computed(() => {
  if (typingNames.value.length === 1) return `${typingNames.value[0]} está escribiendo...`;
  if (typingNames.value.length === 2) return `${typingNames.value[0]} y ${typingNames.value[1]} están escribiendo...`;
  return "Varios están escribiendo...";
});
</script>
