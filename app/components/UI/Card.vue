<!-- app/components/UI/Card.vue -->
<template>
  <div class="relative p-6 transition-all duration-300 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl hover:shadow-2xl hover:bg-white/15 overflow-hidden">
    <!-- Subtle top light effect -->
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
    
    <div v-if="$slots.header" class="pb-4 mb-4 border-b border-white/10">
      <slot name="header" />
    </div>

    <slot />
    
    <div v-if="$slots.footer" class="pt-4 mt-6 border-t border-white/10">
      <slot name="footer" />
    </div>
  </div>
</template>
