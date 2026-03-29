<template>
  <div class="w-64 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0a0a0f]">
    <!-- Header -->
    <div class="px-4 py-4 flex items-center justify-between border-b border-white/5">
      <NuxtLink to="/messages" class="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
        <svg v-if="activePage !== 'index'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <h2 class="text-sm font-semibold">Mensajes</h2>
      </NuxtLink>
      <div v-if="showHeaderActions" class="flex gap-1">
        <button class="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Nuevo mensaje" @click="$emit('new-dm')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button class="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Nuevo grupo" @click="$emit('new-group')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="showSearch" class="px-3 py-2">
      <input
        v-model="internalSearch"
        type="text"
        placeholder="Buscar..."
        class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
      />
    </div>

    <!-- Menú Herramientas Personales -->
    <div class="px-2 py-2 space-y-0.5 border-b border-white/5">
      <NuxtLink to="/messages/notifications" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" :class="{'bg-violet-600/20 text-white': activePage === 'notifications'}">
        <span class="text-base w-5 text-center">🔔</span>
        <span class="text-sm font-medium">Notificaciones</span>
      </NuxtLink>
      <NuxtLink to="/messages/tasks" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" :class="{'bg-violet-600/20 text-white': activePage === 'tasks'}">
        <span class="text-base w-5 text-center">✅</span>
        <span class="text-sm font-medium">Tareas</span>
      </NuxtLink>
      <NuxtLink to="/messages/automations" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" :class="{'bg-violet-600/20 text-white': activePage === 'automations'}">
        <span class="text-base w-5 text-center">⚡</span>
        <span class="text-sm font-medium">Automatizaciones</span>
      </NuxtLink>
      <NuxtLink to="/messages/agents" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" :class="{'bg-violet-600/20 text-white': activePage === 'agents'}">
        <span class="text-base w-5 text-center">🤖</span>
        <span class="text-sm font-medium">Agentes Externos</span>
      </NuxtLink>
      <NuxtLink to="/messages/assistant" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/70 hover:text-white" :class="{'bg-violet-600/20 text-white': activePage === 'assistant'}">
        <span class="text-base w-5 text-center">✨</span>
        <span class="text-sm font-medium">Asistente IA</span>
      </NuxtLink>
    </div>

    <!-- Lista de DMs/Requests (Viene de slots si las páginas quieren renderizar su propia lista, u opcionalmente podemos poner el scroll context aquí) -->
    <div class="flex-1 overflow-y-auto py-2">
      <slot />
    </div>

    <!-- Footer usuario -->
    <div class="px-3 py-3 border-t border-white/5 flex items-center gap-2">
      <NuxtLink to="/profile" class="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
        <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
          <img v-if="user?.photoURL" :src="user.photoURL" class="w-full h-full object-cover" alt="" />
          <span v-else>{{ user?.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-white truncate">{{ user?.displayName ?? 'Usuario' }}</p>
          <p class="text-xs text-white/30 truncate">Mi perfil</p>
        </div>
      </NuxtLink>
      <NuxtLink to="/contacts" class="text-white/30 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from "#imports";

const props = defineProps<{
  activePage: 'index' | 'notifications' | 'tasks' | 'automations' | 'agents' | 'assistant' | 'dm' | 'group';
  showSearch?: boolean;
  showHeaderActions?: boolean;
  modelValue?: string; // Para v-model del buscador
}>();

const emit = defineEmits(["update:modelValue", "new-dm", "new-group"]);

const { user } = useAuth();

const internalSearch = computed({
  get: () => props.modelValue || "",
  set: (val) => emit("update:modelValue", val)
});
</script>
