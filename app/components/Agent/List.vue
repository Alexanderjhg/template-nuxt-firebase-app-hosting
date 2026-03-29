<template>
  <div class="space-y-3">
    <div v-if="agents.length === 0" class="text-center py-12 text-white/30">
      <div class="text-4xl mb-3">🤖</div>
      <p class="text-sm">Sin agentes conectados</p>
      <p class="text-xs mt-1 text-white/20">
        {{ isAdmin ? 'Conecta un agente para que colabore en tus chats' : 'Solo los administradores pueden conectar agentes' }}
      </p>
    </div>

    <div
      v-for="agent in agents"
      :key="agent.id"
      class="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-3 hover:border-white/10 transition-colors"
    >
      <!-- Header del agente -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-violet-800/40 border border-violet-600/30 flex items-center justify-center text-lg">
            🤖
          </div>
          <div>
            <p class="text-sm font-semibold text-white">{{ agent.name }}</p>
            <p v-if="agent.description" class="text-xs text-white/40">{{ agent.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xs px-2 py-0.5 rounded-full" :class="agent.isActive ? 'bg-green-900/30 text-green-400' : 'bg-white/5 text-white/30'">
            {{ agent.isActive ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
      </div>

      <!-- Permisos -->
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="perm in agent.scope?.permissions"
          :key="perm"
          class="text-xs px-2 py-0.5 rounded-full bg-violet-900/20 border border-violet-500/20 text-violet-300"
        >
          {{ permLabel(perm) }}
        </span>
      </div>

      <!-- Webhook URL: solo visible para admins -->
      <p v-if="isAdmin" class="text-xs text-white/25 truncate font-mono">{{ agent.webhookUrl }}</p>
      <p v-else class="text-xs text-white/15 italic">Webhook URL oculta</p>

      <!-- Acciones: solo para admins -->
      <div v-if="isAdmin" class="flex items-center gap-2 pt-1 border-t border-white/5">
        <button
          class="text-xs transition-colors"
          :class="agent.isActive ? 'text-yellow-400/60 hover:text-yellow-400' : 'text-green-400/60 hover:text-green-400'"
          @click="$emit('toggleActive', agent)"
        >
          {{ agent.isActive ? '⏸ Desactivar' : '▶ Activar' }}
        </button>
        <span class="text-white/10">·</span>
        <button
          class="text-xs text-white/40 hover:text-white/70 transition-colors"
          @click="$emit('edit', agent)"
        >
          ✏️ Editar
        </button>
        <span class="text-white/10">·</span>
        <button
          class="text-xs text-white/40 hover:text-white/70 transition-colors"
          @click="$emit('rotateToken', agent.id)"
        >
          🔄 Rotar token
        </button>
        <span class="text-white/10">·</span>
        <button
          class="text-xs text-white/40 hover:text-white/70 transition-colors"
          @click="$emit('viewAudit', agent.id)"
        >
          📋 Auditoría
        </button>
        <span class="text-white/10">·</span>
        <button
          class="text-xs text-red-400/50 hover:text-red-400 transition-colors ml-auto"
          @click="$emit('delete', agent.id)"
        >
          Eliminar
        </button>
      </div>
      <div v-else class="pt-1 border-t border-white/5">
        <p class="text-xs text-white/20 italic">Solo los administradores pueden gestionar este agente.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Agent } from "~/types/chat";

defineProps<{ agents: Agent[]; isAdmin?: boolean }>();
defineEmits<{
  edit: [agent: Agent];
  toggleActive: [agent: Agent];
  rotateToken: [agentId: string];
  viewAudit: [agentId: string];
  delete: [agentId: string];
}>();

const PERM_LABELS: Record<string, string> = {
  read: "📖 Leer",
  notify: "📢 Notificar",
  suggest: "💡 Sugerir",
  act: "⚡ Actuar",
};

function permLabel(perm: string): string {
  return PERM_LABELS[perm] ?? perm;
}
</script>
