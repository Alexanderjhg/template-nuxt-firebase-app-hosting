<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <!-- Sidebar -->
    <ChatLayoutSidebar
      :workspace-name="activeWorkspace?.name"
      :pending-count="pendingCount"
      @select-channel="navigateTo(`/chat/${workspaceId}/${$event}`)"
      @select-d-m="navigateTo(`/chat/${workspaceId}/dm/${$event}`)"
      @select-pending="goToPending"
      @open-create-channel="() => {}"
      @open-new-d-m="() => {}"
      @open-settings="() => {}"
    />

    <!-- Settings content -->
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <!-- Header con navegación de Settings -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold text-white">Configuración</h1>
            <UIButton v-if="canManageAgents" @click="showCreate = true">+ Conectar agente</UIButton>
          </div>
          
          <div class="flex gap-6 border-b border-white/5 pb-2 overflow-x-auto">
            <NuxtLink :to="`/chat/${workspaceId}/settings/general`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              General
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/members`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Miembros
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/agents`" class="text-sm font-medium border-b-2 border-violet-500 text-white pb-2 -mb-[9px] whitespace-nowrap">
              Agentes IA
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/automations`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Automatizaciones
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/profile`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Mi perfil
            </NuxtLink>
          </div>
          
          <p class="text-sm text-white/40">
            Conecta tus agentes de IA externos para que colaboren en el chat
          </p>
        </div>

        <!-- Lista de agentes -->
        <AgentList
          :agents="agents"
          :is-admin="canManageAgents"
          @edit="handleEdit"
          @toggle-active="handleToggleActive"
          @rotate-token="handleRotateToken"
          @view-audit="handleViewAudit"
          @delete="handleDelete"
        />

        <!-- Sección de PIN (solo admins) -->
        <div v-if="isAdmin" class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">PIN de confirmación</h3>
            <p class="text-xs text-white/40 mt-1">
              Requerido cuando un agente con permiso "Actuar" quiere ejecutar acciones
            </p>
          </div>
          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label class="text-xs text-white/50 mb-1 block">Nuevo PIN (4-12 caracteres)</label>
              <input
                v-model="newPin"
                type="password"
                inputmode="numeric"
                placeholder="••••"
                maxlength="12"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
            <UIButton :loading="savingPin" @click="savePin">Guardar PIN</UIButton>
          </div>
          <p v-if="pinSuccess" class="text-xs text-green-400">✓ PIN configurado correctamente</p>
          <p v-if="pinError" class="text-xs text-red-400">{{ pinError }}</p>
        </div>

        <!-- Documentación de la API (solo admins) -->
        <div v-if="isAdmin" class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
          <h3 class="text-sm font-semibold text-white">API de agentes</h3>
          <p class="text-xs text-white/40">Tu agente puede usar estos endpoints:</p>
          <div class="space-y-2">
            <div v-for="ep in apiEndpoints" :key="ep.path" class="flex items-start gap-3">
              <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-300 flex-shrink-0">
                {{ ep.method }}
              </span>
              <div>
                <code class="text-xs text-white/60 font-mono">{{ ep.path }}</code>
                <p class="text-xs text-white/30 mt-0.5">{{ ep.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal crear agente -->
    <AgentCreateModal
      v-if="showCreate"
      :workspace-id="workspaceId"
      @close="showCreate = false"
      @created="handleAgentCreated"
    />

    <!-- Modal editar agente -->
    <AgentEditModal
      v-if="editingAgent"
      :workspace-id="workspaceId"
      :agent="editingAgent"
      @close="editingAgent = null"
      @updated="editingAgent = null"
    />

    <!-- Modal mostrar configuración (solo una vez) -->
    <Teleport to="body">
      <div v-if="newConfig" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Agente conectado: {{ newConfig.agentName }}</h3>
          <AgentTokenReveal :config="newConfig" />
          <button
            class="w-full py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            @click="newConfig = null"
          >
            Ya guardé la configuración, cerrar
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Modal rotar token -->
    <Teleport to="body">
      <div v-if="rotatedToken" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Token rotado</h3>
          <p class="text-xs text-white/40">El token anterior ya no funciona. Actualiza tu agente con el nuevo.</p>
          <AgentTokenReveal :token="rotatedToken" />
          <button
            class="w-full py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            @click="rotatedToken = ''"
          >
            Ya guardé el token, cerrar
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const workspaceId = route.params.workspaceId as string;

const { activeWorkspace, loadUserWorkspaces, workspacesMap, setActiveWorkspace } = useWorkspace();
const { agents, listenAgents, stopListening, updateAgent, rotateToken, deleteAgent, setPin } = useAgents();
const { listenChannels, publicChannels } = useChannels();
const { listenDMs } = useDMs();
const { user, getIdToken } = useAuth();
const { listenTasks, stopListening: stopTasks, pendingCount } = usePendingTasks();

import type { Agent, AgentConfig, MemberPermissions } from "~/types/chat";

const isAdmin = ref(false);
const myPermissions = ref<MemberPermissions>({});

// Permiso efectivo: admin → individual → global
const canManageAgents = computed(() => {
  if (isAdmin.value) return true;
  if (myPermissions.value.canManageAgents !== undefined) return myPermissions.value.canManageAgents;
  return activeWorkspace.value?.settings?.memberPermissions?.canManageAgents === true;
});
const showCreate = ref(false);
const editingAgent = ref<Agent | null>(null);
const newConfig = ref<AgentConfig | null>(null);
const rotatedToken = ref("");
const newPin = ref("");
const savingPin = ref(false);
const pinSuccess = ref(false);
const pinError = ref("");

const apiEndpoints = [
  { method: "GET", path: "/api/agents/messages?channelId=X", desc: "Leer mensajes de un canal" },
  { method: "POST", path: "/api/agents/notify", desc: "Enviar notificación al canal del agente" },
  { method: "POST", path: "/api/agents/suggest", desc: "Enviar sugerencia privada a un usuario" },
];

onMounted(async () => {
  await loadUserWorkspaces();
  const ws = workspacesMap.value[workspaceId];
  if (ws) setActiveWorkspace(ws);
  listenChannels(workspaceId);
  listenDMs(workspaceId);
  listenAgents(workspaceId);
  listenTasks(workspaceId);

  // Verificar si el usuario es admin/owner + permisos individuales
  try {
    const token = await getIdToken();
    const members = await $fetch<Array<{ uid: string; role: string; permissions?: MemberPermissions }>>(
      `/api/protected/workspaces/${workspaceId}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const me = members.find((m) => m.uid === user.value?.uid);
    isAdmin.value = !!me && ["owner", "admin"].includes(me.role);
    if (me?.permissions) myPermissions.value = me.permissions;
  } catch {
    isAdmin.value = activeWorkspace.value?.ownerId === user.value?.uid;
  }
});

onUnmounted(() => { stopListening(); stopTasks(); });

function goToPending() {
  const firstChannel = publicChannels.value[0];
  if (firstChannel) {
    navigateTo(`/chat/${workspaceId}/${firstChannel.id}?view=pending`);
  }
}

function handleAgentCreated(result: { agentId: string; config: AgentConfig }) {
  showCreate.value = false;
  newConfig.value = result.config;
}

function handleEdit(agent: Agent) {
  editingAgent.value = agent;
}

async function handleToggleActive(agent: Agent) {
  const action = agent.isActive ? "desactivar" : "activar";
  if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} el agente "${agent.name}"?`)) return;
  try {
    await updateAgent(workspaceId, agent.id, { isActive: !agent.isActive });
  } catch (e: unknown) {
    console.error("[agents] toggle failed:", e);
    alert(`Error al ${action} el agente`);
  }
}

async function handleRotateToken(agentId: string) {
  if (!confirm("¿Rotar el token? El token actual dejará de funcionar inmediatamente.")) return;
  const result = await rotateToken(workspaceId, agentId);
  rotatedToken.value = result.plainToken;
}

async function handleDelete(agentId: string) {
  if (!confirm("¿Eliminar este agente? Esta acción no se puede deshacer.")) return;
  await deleteAgent(workspaceId, agentId);
}

function handleViewAudit(agentId: string) {
  navigateTo(`/chat/${workspaceId}/settings/agents/${agentId}/audit`);
}

async function savePin() {
  if (newPin.value.length < 4) return;
  savingPin.value = true;
  pinSuccess.value = false;
  pinError.value = "";
  try {
    await setPin(workspaceId, newPin.value);
    pinSuccess.value = true;
    newPin.value = "";
    setTimeout(() => (pinSuccess.value = false), 3000);
  } catch (e: unknown) {
    pinError.value = (e as { message?: string }).message ?? "Error al guardar el PIN";
  } finally {
    savingPin.value = false;
  }
}
</script>
