<template>
  <aside class="flex h-full w-64 flex-shrink-0 flex-col bg-[#0f0f1a] border-r border-white/5">
    <!-- Workspace header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-white/5">
      <button
        class="flex items-center gap-2 text-white font-semibold hover:text-violet-400 transition-colors truncate"
        @click="$emit('openWorkspaceSwitcher')"
      >
        <span class="w-6 h-6 rounded bg-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {{ workspaceName?.[0]?.toUpperCase() ?? 'W' }}
        </span>
        <span class="truncate text-sm">{{ workspaceName }}</span>
      </button>
      <div class="flex items-center gap-1">
        <button
          v-if="canInviteMembers"
          class="text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5 text-xs flex items-center gap-1"
          title="Invitar personas"
          @click="$emit('openSettings')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span class="hidden sm:inline">Invitar</span>
        </button>
        <button
          class="text-white/40 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-white/5"
          title="Nueva acción"
          @click="$emit('openCompose')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
          </svg>
        </button>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto py-2 space-y-1 px-2">

      <!-- ── Favoritos ─────────────────────────────────────────────────── -->
      <ChatLayoutSidebarSection
        v-if="favoriteChannels.length > 0"
        label="Favoritos"
        :collapsible="true"
      >
        <ChatLayoutSidebarItem
          v-for="ch in favoriteChannels"
          :key="ch.id"
          :label="(ch.isPrivate ? '🔒 ' : '# ') + ch.name"
          :active="activeChannelId === ch.id"
          :unread="isUnread(ch.id, ch.lastMessageAt)"
          :is-favorite="true"
          :show-favorite="true"
          @click="$emit('selectChannel', ch.id)"
          @toggle-favorite="toggleFavorite(ch.id)"
        />
      </ChatLayoutSidebarSection>

      <!-- ── Canales ───────────────────────────────────────────────────── -->
      <ChatLayoutSidebarSection
        label="Canales"
        :collapsible="true"
        :action-title="canCreateChannels ? 'Nuevo canal' : undefined"
        @action="canCreateChannels && $emit('openCreateChannel')"
      >
        <ChatLayoutSidebarItem
          v-for="ch in publicChannels"
          :key="ch.id"
          :label="'# ' + ch.name"
          :active="activeChannelId === ch.id"
          :unread="isUnread(ch.id, ch.lastMessageAt)"
          :is-favorite="favorites.includes(ch.id)"
          :show-favorite="true"
          @click="$emit('selectChannel', ch.id)"
          @toggle-favorite="toggleFavorite(ch.id)"
        />
        <ChatLayoutSidebarItem
          v-for="ch in privateChannels"
          :key="ch.id"
          :label="'🔒 ' + ch.name"
          :active="activeChannelId === ch.id"
          :unread="isUnread(ch.id, ch.lastMessageAt)"
          :is-favorite="favorites.includes(ch.id)"
          :show-favorite="true"
          @click="$emit('selectChannel', ch.id)"
          @toggle-favorite="toggleFavorite(ch.id)"
        />
      </ChatLayoutSidebarSection>

      <!-- ── Mensajes directos ─────────────────────────────────────────── -->
      <ChatLayoutSidebarSection
        label="Mensajes directos"
        :collapsible="true"
        @action="$emit('openNewDM')"
        action-title="Nuevo DM"
      >
        <!-- DM con Asistente IA (siempre primero) -->
        <ChatLayoutSidebarItem
          label="🤖 Asistente IA"
          :active="activeDMId === aiDM?.id"
          :unread="false"
          @click="handleAiDMClick"
        />
        <!-- DM de notificaciones personales -->
        <ChatLayoutSidebarItem
          label="🔔 DM Personal"
          :active="activeDMId === notificationsDM?.id"
          :unread="false"
          @click="handleNotificationsDMClick"
        />
        <!-- DMs regulares -->
        <ChatLayoutSidebarItem
          v-for="dm in regularDMs"
          :key="dm.id"
          :label="getDMLabel(dm)"
          :active="activeDMId === dm.id"
          :unread="false"
          @click="$emit('selectDM', dm.id)"
        >
          <template #prefix>
            <ChatPresenceDot :status="getDMPresence(dm)" />
          </template>
        </ChatLayoutSidebarItem>
      </ChatLayoutSidebarSection>

      <!-- ── Agentes conectados ─────────────────────────────────────────── -->
      <ChatLayoutSidebarSection
        v-if="agentChannels.length > 0"
        label="Agentes"
        :collapsible="true"
      >
        <ChatLayoutSidebarItem
          v-for="ch in agentChannels"
          :key="ch.id"
          :label="ch.name"
          :active="activeChannelId === ch.id"
          :unread="false"
          icon="🤖"
          @click="$emit('selectChannel', ch.id)"
        />
      </ChatLayoutSidebarSection>

      <!-- ── Automatizaciones ──────────────────────────────────────────── -->
      <ChatLayoutSidebarItem
        label="⚡ Automatizaciones"
        :active="activePage === 'automations'"
        :unread="false"
        @click="navigateTo(`/chat/${route.params.workspaceId}/settings/automations`)"
      />

      <!-- ── Tareas pendientes ──────────────────────────────────────────── -->
      <ChatLayoutSidebarItem
        label="📋 Pendientes"
        :active="activePage === 'pending'"
        :unread="pendingCount > 0"
        :badge="pendingCount > 0 ? String(pendingCount) : undefined"
        @click="$emit('selectPending')"
      />
    </nav>

    <!-- Usuario actual (footer) -->
    <div class="flex items-center gap-2 px-3 py-3 border-t border-white/5">
      <div class="relative">
        <img
          v-if="currentUser?.photoURL"
          :src="currentUser.photoURL"
          :alt="currentUser.displayName"
          class="w-7 h-7 rounded-full object-cover"
        />
        <div v-else class="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs text-white font-bold">
          {{ currentUser?.displayName?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0f0f1a]" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-medium text-white truncate">{{ currentUser?.displayName ?? 'Usuario' }}</p>
        <p class="text-xs text-white/40 truncate">En línea</p>
      </div>
      <button
        class="text-white/40 hover:text-white transition-colors"
        title="Configuración"
        @click="$emit('openSettings')"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { DM, MemberPermissions } from "~/types/chat";

const props = defineProps<{
  workspaceName?: string;
  activeChannelId?: string;
  activeDMId?: string;
  activePage?: string;
  pendingCount?: number;
  workspaceId?: string;
}>();

const route = useRoute();
const wsId = computed(() => (props.workspaceId ?? route.params.workspaceId) as string);

const { user, getIdToken } = useAuth();
const { publicChannels, privateChannels, agentChannels, channels } = useChannels();
const { regularDMs, aiDM, notificationsDM, openAiDM, openNotificationsDM } = useDMs();
const { getStatus } = usePresence();
const { activeWorkspace } = useWorkspace();
const { favorites, listenPrefs, stopListening, toggleFavorite: doToggleFavorite, isUnread } = useChannelPrefs();

const aiDMLoading = ref(false);
const notifDMLoading = ref(false);
const isMemberAdmin = ref(false);
const myPermissions = ref<MemberPermissions>({});

// ── Favoritos ────────────────────────────────────────────────────────────────

const favoriteChannels = computed(() =>
  channels.value.filter((c) => favorites.value.includes(c.id) && c.type !== "agent" && !c.isArchived)
);

function toggleFavorite(channelId: string) {
  doToggleFavorite(wsId.value, channelId);
}

// ── Permisos ─────────────────────────────────────────────────────────────────

function hasPerm(key: keyof MemberPermissions): boolean {
  if (isMemberAdmin.value) return true;
  const individual = myPermissions.value[key];
  if (individual !== undefined) return individual;
  return activeWorkspace.value?.settings?.memberPermissions?.[key] === true;
}

const canCreateChannels = computed(() => hasPerm("canCreateChannels"));
const canInviteMembers = computed(() => hasPerm("canInviteMembers"));

onMounted(async () => {
  const workspaceId = wsId.value;
  if (!workspaceId || !user.value?.uid) return;

  // Escuchar preferencias (favoritos + reads)
  listenPrefs(workspaceId);

  try {
    const token = await getIdToken();
    const members = await $fetch<Array<{ uid: string; role: string; permissions?: MemberPermissions }>>(
      `/api/protected/workspaces/${workspaceId}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const me = members.find((m) => m.uid === user.value?.uid);
    isMemberAdmin.value = !!me && ["owner", "admin"].includes(me.role);
    if (me?.permissions) myPermissions.value = me.permissions;
  } catch {
    isMemberAdmin.value = activeWorkspace.value?.ownerId === user.value?.uid;
  }
});

// No llamar stopListening aquí: el estado es compartido con la página padre
// y limpiar el estado aquí causaría pérdida de datos al navegar entre canales

const currentUser = computed(() => user.value
  ? { displayName: user.value.displayName, photoURL: user.value.photoURL, uid: user.value.uid }
  : null
);

const emit = defineEmits<{
  selectChannel: [channelId: string];
  selectDM: [dmId: string];
  selectPending: [];
  openCreateChannel: [];
  openNewDM: [];
  openWorkspaceSwitcher: [];
  openCompose: [];
  openSettings: [];
}>();

async function handleAiDMClick() {
  if (aiDM.value) {
    emit('selectDM', aiDM.value.id);
    return;
  }
  const workspaceId = wsId.value;
  if (!workspaceId || aiDMLoading.value) return;
  aiDMLoading.value = true;
  try {
    const { dmId } = await openAiDM(workspaceId);
    emit('selectDM', dmId);
  } catch (e) {
    console.error("[Sidebar] Error al abrir DM con IA:", e);
  } finally {
    aiDMLoading.value = false;
  }
}

async function handleNotificationsDMClick() {
  if (notificationsDM.value) {
    emit('selectDM', notificationsDM.value.id);
    return;
  }
  const workspaceId = wsId.value;
  if (!workspaceId || notifDMLoading.value) return;
  notifDMLoading.value = true;
  try {
    const { dmId } = await openNotificationsDM(workspaceId);
    emit('selectDM', dmId);
  } catch (e) {
    console.error("[Sidebar] Error al abrir DM de notificaciones:", e);
  } finally {
    notifDMLoading.value = false;
  }
}

function getDMLabel(dm: DM): string {
  if (!user.value?.uid) return "DM";
  const otherId = dm.participantIds.find((id) => id !== user.value!.uid);
  if (!otherId) return "DM";
  return dm.participantMap[otherId]?.displayName ?? "Usuario";
}

function getDMPresence(dm: DM) {
  if (!user.value?.uid) return "offline" as const;
  const otherId = dm.participantIds.find((id) => id !== user.value!.uid);
  return otherId ? getStatus(otherId) : ("offline" as const);
}
</script>
