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
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-xl font-bold text-white">Configuración</h1>
          </div>
          
          <div class="flex gap-6 border-b border-white/5 pb-2 overflow-x-auto">
            <NuxtLink :to="`/chat/${workspaceId}/settings/general`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              General
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/members`" class="text-sm font-medium border-b-2 border-violet-500 text-white pb-2 -mb-[9px] whitespace-nowrap">
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

          <p class="text-sm text-white/40">Invita personas y gestiona los miembros del workspace</p>
        </div>

        <!-- Invitar personas -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-white">Invitar personas</h3>
              <p class="text-xs text-white/40 mt-0.5">Genera un enlace para compartir</p>
            </div>
            <UIButton :loading="generatingCode" @click="generateInvite">
              {{ inviteCode ? '🔄 Generar nuevo' : '+ Generar enlace' }}
            </UIButton>
          </div>

          <!-- Link generado -->
          <div v-if="inviteCode" class="space-y-3">
            <div class="flex items-center gap-2">
              <input
                :value="inviteLink"
                readonly
                class="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono focus:outline-none select-all"
                @click="($event.target as HTMLInputElement)?.select()"
              />
              <button
                class="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex-shrink-0"
                @click="copyLink"
              >
                {{ copied ? '✓ Copiado' : 'Copiar' }}
              </button>
            </div>

            <div class="flex items-center gap-4 text-xs text-white/30">
              <span>Código: <code class="text-violet-400">{{ inviteCode }}</code></span>
              <span v-if="inviteExpires">Expira: {{ formatDate(inviteExpires) }}</span>
            </div>

            <!-- También mostrar el código para pegar manualmente -->
            <div class="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3">
              <p class="text-xs text-white/40 mb-1">O comparte este código para unirse:</p>
              <p class="text-lg font-mono font-bold text-violet-400 tracking-wider text-center">{{ inviteCode }}</p>
            </div>
          </div>
        </div>

        <!-- Lista de miembros -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white">Miembros ({{ members.length }})</h3>
          </div>

          <div v-if="loadingMembers" class="text-center py-8 text-white/20 text-sm">
            Cargando miembros...
          </div>

          <div v-else class="space-y-1">
            <div
              v-for="m in members"
              :key="m.uid"
              class="rounded-lg hover:bg-white/5 transition-colors"
            >
              <div class="flex items-center gap-3 px-3 py-2.5">
                <div class="w-9 h-9 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                  <img v-if="m.photoURL" :src="m.photoURL" class="w-full h-full object-cover" alt="" />
                  <span v-else>{{ m.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">{{ m.displayName }}</p>
                  <p class="text-xs text-white/30 truncate">{{ m.email }}</p>
                </div>
                <span
                  class="text-xs px-2 py-0.5 rounded-full border"
                  :class="roleBadgeClasses(m.role)"
                >
                  {{ roleLabel(m.role) }}
                </span>
                <button
                  v-if="isAdmin && m.role === 'member'"
                  class="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1"
                  @click="toggleMemberPerms(m.uid)"
                >
                  {{ expandedMember === m.uid ? 'Cerrar' : 'Permisos' }}
                </button>
              </div>

              <!-- Panel de permisos individuales (expandible) -->
              <div
                v-if="isAdmin && expandedMember === m.uid && m.role === 'member'"
                class="px-3 pb-3 pt-1 ml-12 space-y-2"
              >
                <p class="text-xs text-white/40 mb-2">Permisos individuales (sobreescriben los globales)</p>
                <label
                  v-for="perm in permissionOptions"
                  :key="perm.key"
                  class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer transition-colors"
                  :class="getMemberPerm(m, perm.key) ? 'bg-violet-500/5' : 'hover:bg-white/5'"
                >
                  <span class="text-xs text-white/70">{{ perm.label }}</span>
                  <button
                    class="relative w-8 h-4 rounded-full transition-colors flex-shrink-0"
                    :class="getMemberPerm(m, perm.key) ? 'bg-violet-600' : 'bg-white/10'"
                    @click="setMemberPerm(m.uid, perm.key, !getMemberPerm(m, perm.key))"
                  >
                    <span
                      class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform"
                      :class="getMemberPerm(m, perm.key) ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </button>
                </label>
                <p v-if="permError" class="text-xs text-red-400 mt-1">{{ permError }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Member, MemberRole, MemberPermissions } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const workspaceId = route.params.workspaceId as string;

const { activeWorkspace, loadUserWorkspaces, workspacesMap, setActiveWorkspace } = useWorkspace();
const { user, getIdToken } = useAuth();
const { listenChannels, publicChannels } = useChannels();
const { listenDMs } = useDMs();
const { listenTasks, stopListening: stopTasks, pendingCount } = usePendingTasks();

const members = ref<Member[]>([]);
const loadingMembers = ref(true);
const generatingCode = ref(false);
const inviteCode = ref("");
const inviteExpires = ref("");
const copied = ref(false);
const isAdmin = ref(false);
const expandedMember = ref<string | null>(null);
const permError = ref("");

const permissionOptions: { key: keyof MemberPermissions; label: string }[] = [
  { key: "canCreateChannels", label: "Crear canales" },
  { key: "canInviteMembers", label: "Invitar personas" },
  { key: "canManageAgents", label: "Gestionar agentes" },
  { key: "canEditObserver", label: "Configurar observador IA" },
];

const inviteLink = computed(() => {
  if (!inviteCode.value) return "";
  const base = window.location.origin;
  return `${base}/join?code=${inviteCode.value}`;
});

onMounted(async () => {
  await loadUserWorkspaces();
  const ws = workspacesMap.value[workspaceId];
  if (ws) setActiveWorkspace(ws);
  listenChannels(workspaceId);
  listenDMs(workspaceId);
  listenTasks(workspaceId);
  await loadMembers();

  // Detectar si el usuario actual es admin/owner
  const me = members.value.find((m) => m.uid === user.value?.uid);
  isAdmin.value = !!me && ["owner", "admin"].includes(me.role);
  if (!isAdmin.value) {
    isAdmin.value = activeWorkspace.value?.ownerId === user.value?.uid;
  }
});

onUnmounted(() => stopTasks());

function goToPending() {
  const firstChannel = publicChannels.value[0];
  if (firstChannel) {
    navigateTo(`/chat/${workspaceId}/${firstChannel.id}?view=pending`);
  }
}

async function loadMembers() {
  loadingMembers.value = true;
  try {
    const token = await getIdToken();
    members.value = await $fetch<Member[]>(
      `/api/protected/workspaces/${workspaceId}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (e) {
    console.error("[Members] Error loading:", e);
  } finally {
    loadingMembers.value = false;
  }
}

async function generateInvite() {
  generatingCode.value = true;
  try {
    const token = await getIdToken();
    const result = await $fetch<{ code: string; expiresAt: string }>(
      `/api/protected/workspaces/${workspaceId}/invite`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    inviteCode.value = result.code;
    inviteExpires.value = result.expiresAt;
  } catch (e) {
    console.error("[Invite] Error:", e);
  } finally {
    generatingCode.value = false;
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Fallback: seleccionar el input
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(role: MemberRole): string {
  const map: Record<string, string> = {
    owner: "Propietario",
    admin: "Admin",
    member: "Miembro",
    guest: "Invitado",
  };
  return map[role] ?? role;
}

function roleBadgeClasses(role: MemberRole): string {
  const map: Record<string, string> = {
    owner: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    admin: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    member: "bg-white/5 text-white/50 border-white/10",
    guest: "bg-white/5 text-white/30 border-white/5",
  };
  return map[role] ?? "bg-white/5 text-white/30 border-white/5";
}

function toggleMemberPerms(uid: string) {
  expandedMember.value = expandedMember.value === uid ? null : uid;
  permError.value = "";
}

function getMemberPerm(member: Member, key: keyof MemberPermissions): boolean {
  // Individual override → global fallback
  const individual = member.permissions?.[key];
  if (individual !== undefined) return individual;
  return activeWorkspace.value?.settings?.memberPermissions?.[key] ?? false;
}

async function setMemberPerm(memberId: string, key: keyof MemberPermissions, value: boolean) {
  permError.value = "";
  try {
    const token = await getIdToken();
    await $fetch(`/api/protected/workspaces/${workspaceId}/members/${memberId}/permissions`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { [key]: value },
    });
    // Actualizar localmente
    const member = members.value.find((m) => m.uid === memberId);
    if (member) {
      if (!member.permissions) member.permissions = {};
      member.permissions[key] = value;
    }
  } catch (e: unknown) {
    permError.value = (e as { message?: string }).message ?? "Error al actualizar permisos";
  }
}
</script>
