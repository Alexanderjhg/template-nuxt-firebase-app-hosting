<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
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

    <div class="flex-1 overflow-y-auto">
      <div class="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <div class="space-y-6">
          <h1 class="text-xl font-bold text-white">Configuración</h1>

          <div class="flex gap-6 border-b border-white/5 pb-2 overflow-x-auto">
            <NuxtLink :to="`/chat/${workspaceId}/settings/general`" class="text-sm font-medium border-b-2 border-violet-500 text-white pb-2 -mb-[9px] whitespace-nowrap">
              General
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/members`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Miembros
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/agents`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Agentes IA
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/automations`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Automatizaciones
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/profile`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Mi perfil
            </NuxtLink>
          </div>
        </div>

        <!-- Permisos de miembros (solo admin) -->
        <div v-if="isAdmin" class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Permisos de miembros</h3>
            <p class="text-xs text-white/40 mt-1">
              Controla qué pueden hacer los miembros regulares en este workspace. Los administradores siempre tienen acceso completo.
            </p>
          </div>

          <div class="space-y-3">
            <label
              v-for="perm in permissionOptions"
              :key="perm.key"
              class="flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer"
              :class="memberPerms[perm.key] ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/5 hover:border-white/10'"
            >
              <div class="flex-1 mr-4">
                <span class="text-sm text-white">{{ perm.label }}</span>
                <p class="text-xs text-white/40 mt-0.5">{{ perm.description }}</p>
              </div>
              <button
                class="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                :class="memberPerms[perm.key] ? 'bg-violet-600' : 'bg-white/10'"
                @click="togglePermission(perm.key)"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  :class="memberPerms[perm.key] ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </label>
          </div>

          <p v-if="permError" class="text-xs text-red-400">{{ permError }}</p>
        </div>

        <!-- Observador IA nativo -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Observador IA nativo</h3>
            <p class="text-xs text-white/40 mt-1">
              El observador analiza las conversaciones en canales y sugiere acciones como crear tareas, agendar reuniones o buscar información.
            </p>
          </div>

          <!-- Selector de modo -->
          <div class="space-y-2">
            <label
              v-for="option in modeOptions"
              :key="option.value"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="[
                currentMode === option.value
                  ? 'border-violet-500/40 bg-violet-500/5'
                  : 'border-white/5 hover:border-white/10',
                !canEditObserver ? 'opacity-50 cursor-not-allowed' : ''
              ]"
            >
              <input
                type="radio"
                name="observer-mode"
                :value="option.value"
                :checked="currentMode === option.value"
                :disabled="!canEditObserver"
                class="mt-0.5 accent-violet-500"
                @change="canEditObserver && setMode(option.value)"
              />
              <div>
                <span class="text-sm font-medium text-white">{{ option.label }}</span>
                <p class="text-xs text-white/40 mt-0.5">{{ option.description }}</p>
              </div>
            </label>
          </div>

          <p v-if="!canEditObserver" class="text-xs text-white/20 italic">Solo los administradores pueden cambiar esta configuración.</p>
          <p v-if="settingsError" class="text-xs text-red-400">{{ settingsError }}</p>
        </div>

        <!-- Google Calendar -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Google Calendar</h3>
            <p class="text-xs text-white/40 mt-1">
              Conecta tu Google Calendar para que los eventos se creen directamente en tu calendario personal.
            </p>
          </div>

          <div v-if="calendarConnected" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500" />
              <span class="text-sm text-green-400">Conectado</span>
            </div>
            <button
              class="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40"
              :disabled="calendarLoading"
              @click="disconnectCalendar"
            >
              Desconectar
            </button>
          </div>

          <div v-else>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 text-sm text-white transition-colors"
              :disabled="calendarLoading"
              @click="connectCalendar"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8.25h15V19.5z"/>
              </svg>
              {{ calendarLoading ? 'Redirigiendo...' : 'Conectar Google Calendar' }}
            </button>
            <p class="text-xs text-white/20 mt-2">Sin conectar, los eventos se crean con un link para agregar manualmente.</p>
          </div>
        </div>

        <!-- Info sobre agentes -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
          <h3 class="text-sm font-semibold text-white">Agentes conectados</h3>
          <p class="text-xs text-white/40">
            Si tienes agentes externos conectados (como n8n + Gemini), puedes usar el modo manual
            y dejar que tus agentes manejen las respuestas inteligentes directamente en sus canales dedicados.
          </p>
          <NuxtLink
            :to="`/chat/${workspaceId}/settings/agents`"
            class="inline-block text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Gestionar agentes →
          </NuxtLink>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const workspaceId = route.params.workspaceId as string;

const { activeWorkspace, loadUserWorkspaces, workspacesMap, setActiveWorkspace, listenWorkspace } = useWorkspace();
const { user, getIdToken } = useAuth();
const { listenChannels, publicChannels } = useChannels();
const { listenDMs } = useDMs();
const { listenTasks, stopListening: stopTasks, pendingCount } = usePendingTasks();

import type { MemberPermissions } from "~/types/chat";

const isAdmin = ref(false);
const myPermissions = ref<MemberPermissions>({});
const settingsError = ref("");
const permError = ref("");
const calendarConnected = ref(false);
const calendarLoading = ref(false);

// Permisos globales de miembros (reactivo, se sincroniza con Firestore via listenWorkspace)
const memberPerms = computed(() => ({
  canCreateChannels: activeWorkspace.value?.settings?.memberPermissions?.canCreateChannels ?? false,
  canInviteMembers: activeWorkspace.value?.settings?.memberPermissions?.canInviteMembers ?? false,
  canManageAgents: activeWorkspace.value?.settings?.memberPermissions?.canManageAgents ?? false,
  canEditObserver: activeWorkspace.value?.settings?.memberPermissions?.canEditObserver ?? false,
}));

// ¿Puede este usuario editar el observer? admin → individual → global
const canEditObserver = computed(() => {
  if (isAdmin.value) return true;
  if (myPermissions.value.canEditObserver !== undefined) return myPermissions.value.canEditObserver;
  return memberPerms.value.canEditObserver;
});

const permissionOptions = [
  {
    key: "canCreateChannels" as const,
    label: "Crear canales",
    description: "Los miembros pueden crear canales públicos y privados.",
  },
  {
    key: "canInviteMembers" as const,
    label: "Invitar personas",
    description: "Los miembros pueden invitar nuevas personas al workspace.",
  },
  {
    key: "canManageAgents" as const,
    label: "Gestionar agentes",
    description: "Los miembros pueden agregar, editar y eliminar agentes de IA.",
  },
  {
    key: "canEditObserver" as const,
    label: "Configurar observador IA",
    description: "Los miembros pueden cambiar el modo del observador de IA.",
  },
];

const modeOptions = [
  {
    value: "auto" as const,
    label: "Automático",
    description: "El observador analiza todos los mensajes automáticamente y muestra sugerencias cuando detecta una intención clara.",
  },
  {
    value: "manual" as const,
    label: "Manual",
    description: "El observador no analiza automáticamente. Los usuarios pueden analizar mensajes individuales desde el menú de opciones de cada mensaje.",
  },
  {
    value: "off" as const,
    label: "Desactivado",
    description: "El observador está completamente desactivado. No se generarán sugerencias de IA.",
  },
];

const currentMode = computed(() => {
  const settings = activeWorkspace.value?.settings;
  if (!settings) return "auto";
  if (settings.aiObserverMode) return settings.aiObserverMode;
  if (settings.aiObserverEnabled === false) return "off";
  return "auto";
});

let unsubWS: (() => void) | null = null;

onMounted(async () => {
  await loadUserWorkspaces();
  const ws = workspacesMap.value[workspaceId];
  if (ws) setActiveWorkspace(ws);
  unsubWS = listenWorkspace(workspaceId);
  listenChannels(workspaceId);
  listenDMs(workspaceId);
  listenTasks(workspaceId);

  // Verificar estado de Google Calendar
  try {
    const token = await getIdToken();
    const calStatus = await $fetch<{ connected: boolean }>("/api/protected/calendar/status", {
      headers: { Authorization: `Bearer ${token}` },
    });
    calendarConnected.value = calStatus.connected;
  } catch { /* ignorar */ }

  // Verificar si viene del callback de Calendar
  if (route.query.calendarConnected === "true") {
    calendarConnected.value = true;
  }

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

onUnmounted(() => { unsubWS?.(); stopTasks(); });

function goToPending() {
  const firstChannel = publicChannels.value[0];
  if (firstChannel) {
    navigateTo(`/chat/${workspaceId}/${firstChannel.id}?view=pending`);
  }
}

async function connectCalendar() {
  calendarLoading.value = true;
  try {
    const token = await getIdToken();
    const res = await $fetch<{ url: string }>("/api/protected/calendar/auth", {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        workspaceId,
        returnTo: `/chat/${workspaceId}/settings/general`,
      },
    });
    window.location.href = res.url;
  } catch (e: unknown) {
    console.error("[Calendar] Connect error:", e);
    calendarLoading.value = false;
  }
}

async function disconnectCalendar() {
  calendarLoading.value = true;
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/calendar/disconnect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    calendarConnected.value = false;
  } catch (e: unknown) {
    console.error("[Calendar] Disconnect error:", e);
  } finally {
    calendarLoading.value = false;
  }
}

async function setMode(mode: "auto" | "manual" | "off") {
  settingsError.value = "";
  try {
    const token = await getIdToken();
    await $fetch(`/api/protected/workspaces/${workspaceId}/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { aiObserverMode: mode },
    });
  } catch (e: unknown) {
    settingsError.value = (e as { message?: string }).message ?? "Error al actualizar";
  }
}

async function togglePermission(key: keyof typeof memberPerms.value) {
  permError.value = "";
  const newValue = !memberPerms.value[key];
  try {
    const token = await getIdToken();
    await $fetch(`/api/protected/workspaces/${workspaceId}/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        memberPermissions: { [key]: newValue },
      },
    });
  } catch (e: unknown) {
    permError.value = (e as { message?: string }).message ?? "Error al actualizar permisos";
  }
}
</script>
