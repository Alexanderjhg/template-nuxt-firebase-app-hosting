<!-- app/components/UI/Button.vue -->
<template>
  <button
    :disabled="loading || disabled"
    class="relative inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group overflow-hidden"
  >
    <!-- Background glow on hover -->
    <div class="absolute inset-0 w-full h-full transition-all duration-300 transform scale-0 bg-white/20 group-hover:scale-100 rounded-xl"></div>
    
    <!-- Loading spinner -->
    <svg v-if="loading" class="w-5 h-5 mr-3 animate-spin" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  loading?: boolean;
  disabled?: boolean;
}>();
</script>
