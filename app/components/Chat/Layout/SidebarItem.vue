<template>
  <div
    class="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors cursor-pointer"
    :class="[
      active
        ? 'bg-violet-600/20 text-white font-medium'
        : 'text-white/50 hover:bg-white/5 hover:text-white/80'
    ]"
    @click="$emit('click')"
  >
    <slot name="prefix" />
    <span class="flex-1 truncate text-left">{{ label }}</span>

    <!-- Botón estrella (favorito) — solo en hover o si ya es favorito -->
    <button
      v-if="showFavorite"
      class="flex-shrink-0 transition-all"
      :class="[
        isFavorite
          ? 'text-yellow-400 opacity-100'
          : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-yellow-300'
      ]"
      :title="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      @click.stop="$emit('toggleFavorite')"
    >
      <svg class="w-3.5 h-3.5" :fill="isFavorite ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    </button>

    <!-- Badge numérico -->
    <span
      v-if="badge"
      class="flex-shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white"
    >
      {{ badge }}
    </span>

    <!-- Punto de no leído -->
    <span
      v-else-if="unread"
      class="flex-shrink-0 w-2 h-2 rounded-full bg-violet-400"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  active?: boolean;
  unread?: boolean;
  badge?: string;
  icon?: string;
  isFavorite?: boolean;
  showFavorite?: boolean;
}>();

defineEmits<{
  click: [];
  toggleFavorite: [];
}>();
</script>
