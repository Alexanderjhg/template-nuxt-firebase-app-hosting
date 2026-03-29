<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <ChatLayoutSidebar
      :workspace-name="activeWorkspace?.name"
      :pending-count="0"
      @select-channel="navigateTo(`/chat/${workspaceId}/${$event}`)"
      @select-d-m="navigateTo(`/chat/${workspaceId}/dm/${$event}`)"
      @select-pending="navigateTo(`/chat/${workspaceId}?view=pending`)"
      @open-create-channel="() => {}"
      @open-new-d-m="() => {}"
      @open-settings="() => {}"
    />

    <div class="flex-1 overflow-y-auto">
      <div class="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <div class="space-y-6">
          <h1 class="text-xl font-bold text-white">Configuración</h1>

          <div class="flex gap-6 border-b border-white/5 pb-2 overflow-x-auto">
            <NuxtLink :to="`/chat/${workspaceId}/settings/general`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
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
            <NuxtLink :to="`/chat/${workspaceId}/settings/profile`" class="text-sm font-medium border-b-2 border-violet-500 text-white pb-2 -mb-[9px] whitespace-nowrap">
              Mi perfil
            </NuxtLink>
          </div>

          <p class="text-sm text-white/40">Tu información pública dentro de este workspace</p>
        </div>

        <!-- Estado -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Estado</h3>
            <p class="text-xs text-white/40 mt-0.5">Visible para todos los miembros del workspace</p>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              class="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors"
              :class="form.workspaceStatus === opt.value
                ? 'border-violet-500/50 bg-violet-500/10 text-white'
                : 'border-white/5 bg-white/[0.02] text-white/50 hover:border-white/15 hover:text-white/80'"
              @click="form.workspaceStatus = opt.value"
            >
              <span class="text-base">{{ opt.icon }}</span>
              <span class="truncate">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Rol en el workspace -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
          <div>
            <h3 class="text-sm font-semibold text-white">Rol en el workspace</h3>
            <p class="text-xs text-white/40 mt-0.5">Describe tu posición o función. Ej: CEO, Desarrollador, Diseñador</p>
          </div>
          <input
            v-model="form.workspaceRole"
            type="text"
            maxlength="80"
            placeholder="Ej: Co-fundador, Desarrollador Backend, Diseñador UX..."
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        <!-- Información de contacto -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Contacto</h3>
            <p class="text-xs text-white/40 mt-0.5">Visible para los demás miembros del workspace</p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs text-white/40 mb-1 block">Número de teléfono</label>
              <input
                v-model="form.contactPhone"
                type="tel"
                maxlength="30"
                placeholder="+57 300 000 0000"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

            <div>
              <label class="text-xs text-white/40 mb-1 block">Email de contacto</label>
              <input
                v-model="form.contactEmail"
                type="email"
                maxlength="120"
                placeholder="correo@empresa.com"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        <!-- Botón guardar -->
        <div class="flex items-center justify-between">
          <p v-if="savedMsg" class="text-sm text-emerald-400">{{ savedMsg }}</p>
          <p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>
          <div v-if="!savedMsg && !errorMsg" />
          <button
            :disabled="saving"
            class="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm text-white font-medium transition-colors"
            @click="save"
          >
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WorkspaceStatus } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const workspaceId = route.params.workspaceId as string;

const { getIdToken } = useAuth();
const { activeWorkspace, loadUserWorkspaces, listenWorkspace, setActiveWorkspace, workspacesMap } = useWorkspace();

const saving = ref(false);
const savedMsg = ref("");
const errorMsg = ref("");

const form = reactive({
  workspaceStatus: "" as WorkspaceStatus | "",
  workspaceRole: "",
  contactPhone: "",
  contactEmail: "",
});

const statusOptions: { value: WorkspaceStatus; label: string; icon: string }[] = [
  { value: "available",       label: "Disponible",          icon: "🟢" },
  { value: "in_meeting",      label: "En reunión",           icon: "🔴" },
  { value: "busy",            label: "Ocupado",              icon: "🟡" },
  { value: "available_in_1h", label: "Disponible en 1h",    icon: "⏰" },
  { value: "available_in_2h", label: "Disponible en 2h",    icon: "⏰" },
  { value: "available_in_3h", label: "Disponible en 3h",    icon: "⏰" },
];

onMounted(async () => {
  await loadUserWorkspaces();
  const ws = workspacesMap.value[workspaceId];
  if (ws) setActiveWorkspace(ws);
  listenWorkspace(workspaceId);

  // Cargar datos actuales del miembro
  try {
    const token = await getIdToken();
    const members = await $fetch<Array<{ uid: string; workspaceStatus?: string; workspaceRole?: string; contactPhone?: string; contactEmail?: string }>>(
      `/api/protected/workspaces/${workspaceId}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { user } = useAuth();
    const me = members.find((m) => m.uid === user.value?.uid);
    if (me) {
      form.workspaceStatus = (me.workspaceStatus as WorkspaceStatus) ?? "";
      form.workspaceRole = me.workspaceRole ?? "";
      form.contactPhone = me.contactPhone ?? "";
      form.contactEmail = me.contactEmail ?? "";
    }
  } catch { /* ignorar */ }
});

async function save() {
  saving.value = true;
  savedMsg.value = "";
  errorMsg.value = "";

  try {
    const token = await getIdToken();
    await $fetch(`/api/protected/workspaces/${workspaceId}/my-profile`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceStatus: form.workspaceStatus || null,
        workspaceRole: form.workspaceRole || null,
        contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
      },
    });
    savedMsg.value = "Cambios guardados";
    setTimeout(() => { savedMsg.value = ""; }, 3000);
  } catch (err: any) {
    errorMsg.value = err?.data?.message ?? "Error al guardar";
  } finally {
    saving.value = false;
  }
}
</script>
