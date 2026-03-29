<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <MessagesSidebar active="agents" />

    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div class="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">Agentes externos</h2>
          <p class="text-xs text-white/40">Conecta servicios externos para interactuar en tus chats</p>
        </div>
        <button
          class="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
          @click="showCreate = true"
        >
          + Nuevo agente
        </button>
      </div>

      <!-- Lista de agentes -->
      <div class="flex-1 overflow-y-auto py-4 px-4 space-y-3">
        <div
          v-for="agent in globalAgents"
          :key="agent.id"
          class="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-700/40 flex items-center justify-center text-lg flex-shrink-0">
              <span>🤖</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-medium text-white truncate">{{ agent.name }}</h3>
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                  :class="agent.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'"
                >{{ agent.isActive ? 'Activo' : 'Inactivo' }}</span>
              </div>
              <p class="text-xs text-white/40 mt-0.5">{{ agent.description || 'Sin descripcion' }}</p>

              <!-- Permisos -->
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="p in agent.scope?.permissions ?? []"
                  :key="p"
                  class="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/40"
                >{{ permLabel(p) }}</span>
              </div>
            </div>

            <div class="flex gap-1 flex-shrink-0">
              <button
                class="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                title="Activar/Desactivar"
                @click="toggleActive(agent)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
                </svg>
              </button>
              <button
                class="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                title="Eliminar"
                @click="confirmDelete(agent.id)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Webhook info -->
          <div class="mt-3 px-2 py-1.5 rounded-lg bg-black/20 text-xs text-white/20 font-mono truncate">
            {{ agent.webhookUrl }}
          </div>

          <!-- Chat con agente -->
          <button
            v-if="agent.dedicatedDmId"
            class="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            @click="navigateTo(`/messages/dm/${agent.dedicatedDmId}`)"
          >
            Ir al chat del agente →
          </button>
        </div>

        <div v-if="globalAgents.length === 0 && !globalAgentsLoading" class="flex-1 flex items-center justify-center py-20">
          <div class="text-center text-white/20 space-y-3">
            <div class="text-4xl">🤖</div>
            <p class="text-sm">No tienes agentes conectados</p>
            <p class="text-xs text-white/15">Los agentes permiten conectar servicios externos que interactuan en tus chats</p>
            <button
              class="mt-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-colors"
              @click="showCreate = true"
            >
              Conectar agente
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: crear agente -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Nuevo agente externo</h3>

          <div class="space-y-3">
            <div>
              <label class="text-xs text-white/40 mb-1 block">Nombre</label>
              <input v-model="form.name" type="text" placeholder="Mi agente"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
            </div>
            <div>
              <label class="text-xs text-white/40 mb-1 block">Descripcion</label>
              <input v-model="form.description" type="text" placeholder="Que hace este agente..."
                class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
            </div>
            <div>
              <label class="text-xs text-white/40 mb-1 block">Webhook URL</label>
              <input v-model="form.webhookUrl" type="url" placeholder="https://..."
                class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
            </div>
            <div>
              <label class="text-xs text-white/40 mb-1 block">Permisos</label>
              <div class="flex flex-wrap gap-2">
                <label v-for="p in availablePerms" :key="p.value" class="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                  <input type="checkbox" :value="p.value" v-model="form.permissions" class="accent-violet-500" />
                  {{ p.label }}
                </label>
              </div>
            </div>

            <div>
              <label class="text-xs text-white/40 mb-2 block">Seguridad</label>
              <label class="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 cursor-pointer hover:border-white/10 transition-colors mb-2">
                <input
                  v-model="form.setAgentPin"
                  type="checkbox"
                  class="mt-0.5 accent-violet-500"
                />
                <div>
                  <p class="text-xs font-medium text-white">Proteger este agente con PIN</p>
                  <p class="text-xs text-white/40 mt-0.5">
                    El agente solo podrá ejecutar acciones si se proporciona el PIN correcto.
                  </p>
                </div>
              </label>

              <!-- Campos de PIN si está habilitado -->
              <div v-if="form.setAgentPin" class="space-y-2">
                <input
                  v-model="form.agentPin"
                  type="password"
                  placeholder="Ingresa un PIN para este agente"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
                />
                <input
                  v-model="form.agentPinConfirm"
                  type="password"
                  placeholder="Confirma el PIN"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
                />
                <p v-if="form.agentPin && form.agentPin !== form.agentPinConfirm" class="text-xs text-red-400">
                  Los PINs no coinciden
                </p>
              </div>
            </div>
          </div>

          <!-- Configuración generada -->
          <AgentTokenReveal v-if="createdConfig" :config="createdConfig" />

          <div class="flex gap-2 justify-end">
            <button class="text-sm text-white/40 hover:text-white px-3 py-1.5" @click="closeCreate">
              {{ createdConfig ? 'Cerrar' : 'Cancelar' }}
            </button>
            <button
              v-if="!createdConfig"
              :disabled="!form.name || !form.webhookUrl || creating"
              class="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm text-white font-medium transition-colors"
              @click="doCreate"
            >
              {{ creating ? 'Creando...' : 'Crear agente' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { GlobalAgent } from "~/composables/useGlobalAgents";
import type { AgentConfig } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const { globalAgents, globalAgentsLoading, listenGlobalAgents, stopListening, createGlobalAgent, updateGlobalAgent, deleteGlobalAgent } = useGlobalAgents();

const showCreate = ref(false);
const creating = ref(false);
const createdConfig = ref<AgentConfig | null>(null);
const form = reactive({ name: "", description: "", webhookUrl: "", permissions: ["read", "notify"] as string[], setAgentPin: false, agentPin: "", agentPinConfirm: "" });

const availablePerms = [
  { value: "read", label: "Leer mensajes" },
  { value: "notify", label: "Escribir mensajes" },
  { value: "suggest", label: "Sugerir acciones" },
  { value: "act", label: "Ejecutar acciones" },
];

function permLabel(p: string) {
  const map: Record<string, string> = { read: "Leer", notify: "Notificar", suggest: "Sugerir", act: "Ejecutar" };
  return map[p] ?? p;
}

onMounted(() => {
  listenGlobalAgents();
  onUnmounted(() => stopListening());
});

async function doCreate() {
  // Validar PIN si está habilitado
  if (form.setAgentPin) {
    if (!form.agentPin?.trim()) {
      alert("Ingresa un PIN para el agente");
      return;
    }
    if (form.agentPin !== form.agentPinConfirm) {
      alert("Los PINs no coinciden");
      return;
    }
  }

  creating.value = true;
  try {
    const result = await createGlobalAgent({
      name: form.name,
      description: form.description,
      webhookUrl: form.webhookUrl,
      scope: {
        permissions: form.permissions,
      },
      agentPin: form.setAgentPin ? form.agentPin : undefined,
    });
    createdConfig.value = result.config;
  } catch (err) {
    console.error("[agents] Create failed:", err);
  }
  creating.value = false;
}

function closeCreate() {
  showCreate.value = false;
  createdConfig.value = null;
  form.name = "";
  form.description = "";
  form.webhookUrl = "";
  form.permissions = ["read", "notify"];
  form.setAgentPin = false;
  form.agentPin = "";
  form.agentPinConfirm = "";
}

async function toggleActive(agent: GlobalAgent) {
  try {
    await updateGlobalAgent(agent.id, { isActive: !agent.isActive });
  } catch (err) {
    console.error("[agents] Toggle failed:", err);
  }
}

async function confirmDelete(agentId: string) {
  if (!confirm("¿Eliminar este agente? Esta accion no se puede deshacer.")) return;
  try {
    await deleteGlobalAgent(agentId);
  } catch (err) {
    console.error("[agents] Delete failed:", err);
  }
}
</script>
