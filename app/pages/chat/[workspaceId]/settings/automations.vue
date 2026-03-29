<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <ChatLayoutSidebar
      :workspace-name="activeWorkspace?.name"
      active-page="automations"
      :pending-count="pendingCount"
      @select-channel="navigateTo(`/chat/${workspaceId}/${$event}`)"
      @select-d-m="navigateTo(`/chat/${workspaceId}/dm/${$event}`)"
      @select-pending="goToPending"
      @open-create-channel="() => {}"
      @open-new-d-m="() => {}"
      @open-settings="() => {}"
    />

    <div class="flex-1 overflow-y-auto">
      <div class="max-w-3xl mx-auto px-6 py-8 space-y-8">

        <!-- Header con tabs de settings -->
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
            <NuxtLink :to="`/chat/${workspaceId}/settings/automations`" class="text-sm font-medium border-b-2 border-violet-500 text-white pb-2 -mb-[9px] whitespace-nowrap">
              Automatizaciones
            </NuxtLink>
            <NuxtLink :to="`/chat/${workspaceId}/settings/profile`" class="text-sm font-medium text-white/40 hover:text-white pb-2 -mb-[9px] transition-colors whitespace-nowrap">
              Mi perfil
            </NuxtLink>
          </div>

          <div class="flex items-center justify-between">
            <p class="text-sm text-white/40">
              Automatizaciones programadas por ti o tus agentes. Escribe algo como
              <span class="text-violet-400">"recuérdame cada día a las 8am"</span> en cualquier canal para crear una.
            </p>
            <button
              class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white transition-colors flex-shrink-0 ml-4"
              @click="showCreate = true"
            >
              + Nueva
            </button>
          </div>
        </div>

        <!-- Tabs de filtro -->
        <div class="flex gap-3">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            :class="activeTab === tab.key
              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
              : 'bg-white/5 text-white/40 border border-transparent hover:text-white/60'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="ml-1 opacity-60">({{ tab.count }})</span>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
          <div class="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <!-- Empty -->
        <div v-else-if="filteredAutomations.length === 0" class="text-center py-16 space-y-3">
          <p class="text-4xl">⚡</p>
          <p class="text-sm text-white/40">
            {{ activeTab === 'all' ? 'No tienes automatizaciones aún' : `No hay automatizaciones ${tabLabel}` }}
          </p>
        </div>

        <!-- Lista de automatizaciones -->
        <div v-else class="space-y-3">
          <div
            v-for="auto in filteredAutomations"
            :key="auto.id"
            class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3 hover:border-white/10 transition-colors"
          >
            <!-- Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm">{{ statusIcon(auto.status) }}</span>
                  <h3 class="text-sm font-semibold text-white truncate">{{ auto.title ?? auto.name ?? 'Automatización' }}</h3>
                </div>
                <p class="text-xs text-white/40 mt-1 line-clamp-2">{{ auto.description }}</p>
              </div>
              <span
                class="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                :class="statusClass(auto.status)"
              >
                {{ statusLabel(auto.status) }}
              </span>
            </div>

            <!-- Info -->
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30">
              <span v-if="auto.schedule?.frequency">📅 {{ frequencyLabel(auto.schedule.frequency) }}</span>
              <span v-if="auto.schedule?.time">🕐 {{ auto.schedule.time }}</span>
              <span v-if="auto.source?.channelName">📍 {{ auto.source.channelName }}</span>
              <span v-if="(auto.runCount ?? 0) > 0">🔄 {{ auto.runCount }} ejecuciones</span>
              <span v-if="auto.agentName">🤖 {{ auto.agentName }}</span>
            </div>

            <!-- Fechas -->
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span v-if="auto.schedule?.nextRunAt && auto.status === 'active'" class="text-violet-400">
                ⏭ Próxima: {{ formatDate(auto.schedule.nextRunAt) }}
              </span>
              <span v-if="auto.lastRunAt || auto.lastExecutedAt" class="text-white/30">
                🕐 Última: {{ formatDate(auto.lastRunAt ?? auto.lastExecutedAt) }}
              </span>
              <span v-if="auto.createdAt" class="text-white/20">
                📝 Creada: {{ formatDate(auto.createdAt) }}
              </span>
            </div>

            <!-- Último resultado -->
            <div
              v-if="auto.lastRunResult"
              class="text-xs text-white/40 bg-white/[0.03] rounded-lg p-3 border border-white/5"
            >
              <p class="text-white/20 mb-1 font-medium">Último resultado:</p>
              <p class="whitespace-pre-line line-clamp-4">{{ auto.lastRunResult }}</p>
            </div>

            <!-- Acciones -->
            <div class="flex items-center gap-3 pt-1">
              <button
                class="text-xs text-white/30 hover:text-white transition-colors"
                @click="viewExecutions(auto)"
              >
                📋 Ver ejecuciones
              </button>
              <button
                v-if="auto.status === 'active'"
                class="text-xs text-yellow-400/60 hover:text-yellow-400 transition-colors"
                @click="updateStatus(auto, 'paused')"
              >
                ⏸ Pausar
              </button>
              <button
                v-if="auto.status === 'paused'"
                class="text-xs text-green-400/60 hover:text-green-400 transition-colors"
                @click="updateStatus(auto, 'active')"
              >
                ▶ Reanudar
              </button>
              <button
                v-if="auto.status !== 'active'"
                class="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                @click="deleteAutomation(auto)"
              >
                🗑 Eliminar
              </button>
              <button
                v-if="auto.agentId"
                class="text-xs text-violet-400/60 hover:text-violet-400 transition-colors ml-auto"
                @click="askAgent(auto)"
              >
                🤖 Consultar agente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Crear Automatización -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showCreate = false">
        <div class="bg-[#12121a] rounded-2xl border border-white/10 w-full max-w-md mx-4 p-5 space-y-4">
          <h3 class="text-sm font-semibold text-white">Nueva automatización</h3>

          <div class="space-y-3">
            <div>
              <label class="block text-xs text-white/40 mb-1">Título</label>
              <input v-model="createForm.title" type="text" placeholder="Ej: Reporte diario de ventas" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label class="block text-xs text-white/40 mb-1">Descripción</label>
              <textarea v-model="createForm.description" rows="2" placeholder="¿Qué debe hacer esta automatización?" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500 resize-none" />
            </div>
            <div>
              <label class="block text-xs text-white/40 mb-1">Frecuencia</label>
              <select v-model="createForm.frequency" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="once">Una vez</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <div v-if="createForm.frequency === 'once'">
              <label class="block text-xs text-white/40 mb-1">Fecha</label>
              <input v-model="createForm.date" type="date" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div v-if="createForm.frequency === 'weekly'">
              <label class="block text-xs text-white/40 mb-1">Día de la semana</label>
              <select v-model="createForm.dayOfWeek" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500">
                <option :value="1">Lunes</option>
                <option :value="2">Martes</option>
                <option :value="3">Miércoles</option>
                <option :value="4">Jueves</option>
                <option :value="5">Viernes</option>
                <option :value="6">Sábado</option>
                <option :value="0">Domingo</option>
              </select>
            </div>
            <div v-if="createForm.frequency === 'monthly'">
              <label class="block text-xs text-white/40 mb-1">Día del mes</label>
              <input v-model.number="createForm.dayOfMonth" type="number" min="1" max="31" placeholder="15" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label class="block text-xs text-white/40 mb-1">Hora</label>
              <input v-model="createForm.time" type="time" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button class="px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white/70 transition-colors" @click="showCreate = false">
              Cancelar
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white transition-colors disabled:opacity-40"
              :disabled="!createForm.description || creating"
              @click="doCreate"
            >
              {{ creating ? 'Creando...' : 'Crear' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Panel lateral de ejecuciones -->
    <Teleport to="body">
      <div v-if="selectedAutomation" class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" @click.self="selectedAutomation = null">
        <div class="w-full max-w-md h-full bg-[#0a0a0f] border-l border-white/10 shadow-2xl flex flex-col">
          <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 class="text-white font-semibold text-sm">{{ selectedAutomation.title ?? selectedAutomation.name }}</h3>
              <p class="text-xs text-white/40 mt-0.5">Historial de ejecuciones</p>
            </div>
            <button class="text-white/40 hover:text-white text-lg" @click="selectedAutomation = null">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-3">
            <div v-if="loadingExecutions" class="flex items-center justify-center py-8">
              <div class="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div v-else-if="executions.length === 0" class="text-center text-sm text-white/40 py-8">
              Sin ejecuciones registradas
            </div>

            <div
              v-for="exec in executions"
              :key="exec.id"
              class="p-4 rounded-lg border border-white/5 bg-white/[0.02] space-y-2"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-semibold"
                  :class="exec.status === 'success' ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ exec.status === 'success' ? '✅ Éxito' : '❌ Error' }}
                </span>
                <span class="text-[10px] text-white/30">{{ formatDate(exec.executedAt) }}</span>
              </div>
              <p v-if="exec.result" class="text-xs text-white/50 whitespace-pre-line line-clamp-6">{{ exec.result }}</p>
              <pre
                v-if="exec.logs"
                class="text-[10px] text-white/40 bg-black/40 p-2 rounded overflow-x-auto max-h-24"
              >{{ typeof exec.logs === 'string' ? exec.logs : JSON.stringify(exec.logs, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

import { collection, query, orderBy, onSnapshot, getDocs, limit, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useNuxtApp } from "#app";

const route = useRoute();
const router = useRouter();
const workspaceId = route.params.workspaceId as string;

const { getIdToken } = useAuth();
const { activeWorkspace, loadUserWorkspaces, workspacesMap, setActiveWorkspace } = useWorkspace();
const { listenChannels, publicChannels } = useChannels();
const { listenDMs } = useDMs();
const { listenTasks, stopListening: stopTasks, pendingCount } = usePendingTasks();

const db = useNuxtApp().$firestore as any;

const automations = ref<any[]>([]);
const loading = ref(true);
const activeTab = ref("all");

const selectedAutomation = ref<any | null>(null);
const executions = ref<any[]>([]);
const loadingExecutions = ref(false);

const showCreate = ref(false);
const creating = ref(false);
const createForm = reactive({
  title: "",
  description: "",
  frequency: "daily" as "once" | "daily" | "weekly" | "monthly",
  time: "09:00",
  date: "",
  dayOfWeek: 1,
  dayOfMonth: 1,
});

let unsubAutomations: any;

// ── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = computed(() => [
  { key: "all", label: "Todas", count: automations.value.length },
  { key: "active", label: "Activas", count: automations.value.filter((a) => a.status === "active").length },
  { key: "paused", label: "Pausadas", count: automations.value.filter((a) => a.status === "paused").length },
  { key: "completed", label: "Completadas", count: automations.value.filter((a) => a.status === "completed").length },
  { key: "failed", label: "Fallidas", count: automations.value.filter((a) => a.status === "failed").length },
]);

const tabLabel = computed(() => tabs.value.find((t) => t.key === activeTab.value)?.label.toLowerCase() ?? "");

const filteredAutomations = computed(() => {
  if (activeTab.value === "all") return automations.value;
  return automations.value.filter((a) => a.status === activeTab.value);
});

// ── Helpers de display ───────────────────────────────────────────────────────

function statusIcon(status: string) {
  const icons: Record<string, string> = { active: "🟢", completed: "✅", failed: "❌", paused: "⏸️" };
  return icons[status] ?? "⚪";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { active: "Activa", completed: "Completada", failed: "Fallida", paused: "Pausada" };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return classes[status] ?? "bg-white/5 text-white/40 border-white/10";
}

function frequencyLabel(freq: string) {
  const labels: Record<string, string> = { once: "Una vez", daily: "Diaria", weekly: "Semanal", monthly: "Mensual", custom: "Personalizada" };
  return labels[freq] ?? freq;
}

function formatDate(timestamp: any) {
  if (!timestamp) return "";
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function goToPending() {
  const firstChannel = publicChannels.value[0];
  if (firstChannel) {
    navigateTo(`/chat/${workspaceId}/${firstChannel.id}?view=pending`);
  }
}

// ── Acciones ─────────────────────────────────────────────────────────────────

async function doCreate() {
  if (!createForm.description || creating.value) return;
  creating.value = true;
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/automations/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId,
        title: createForm.title || createForm.description.slice(0, 60),
        description: createForm.description,
        frequency: createForm.frequency,
        time: createForm.time || "09:00",
        date: createForm.frequency === "once" ? createForm.date : undefined,
        dayOfWeek: createForm.frequency === "weekly" ? createForm.dayOfWeek : undefined,
        dayOfMonth: createForm.frequency === "monthly" ? createForm.dayOfMonth : undefined,
        sourceType: "channel",
      },
    });
    showCreate.value = false;
    createForm.title = "";
    createForm.description = "";
    createForm.frequency = "daily";
    createForm.time = "09:00";
    createForm.date = "";
    createForm.dayOfWeek = 1;
    createForm.dayOfMonth = 1;
  } catch (err: any) {
    console.error("[automations] Create failed:", err?.data ?? err);
    alert("Error al crear la automatización");
  } finally {
    creating.value = false;
  }
}

async function updateStatus(auto: any, newStatus: string) {
  try {
    const ref = doc(db, "workspaces", workspaceId, "automations", auto.id);
    await updateDoc(ref, { status: newStatus });
  } catch (err: any) {
    console.error("[automations] Error updating status:", err);
    alert("Error al actualizar el estado");
  }
}

async function deleteAutomation(auto: any) {
  if (!confirm(`¿Eliminar "${auto.title ?? auto.name}"? Esta acción no se puede deshacer.`)) return;
  try {
    const ref = doc(db, "workspaces", workspaceId, "automations", auto.id);
    await deleteDoc(ref);
  } catch (err: any) {
    console.error("[automations] Error deleting:", err);
    alert("Error al eliminar");
  }
}

async function viewExecutions(auto: any) {
  selectedAutomation.value = auto;
  loadingExecutions.value = true;
  executions.value = [];
  try {
    const q = query(
      collection(db, "workspaces", workspaceId, "automations", auto.id, "executions"),
      orderBy("executedAt", "desc"),
      limit(50),
    );
    const snap = await getDocs(q);
    executions.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("[automations] Error loading executions:", err);
  } finally {
    loadingExecutions.value = false;
  }
}

async function askAgent(auto: any) {
  try {
    const agentsSnap = await getDocs(collection(db, "workspaces", workspaceId, "agents"));
    const agentDoc = agentsSnap.docs.find((d) => d.id === auto.agentId);
    if (agentDoc?.data().dedicatedChannelId) {
      router.push(`/chat/${workspaceId}/${agentDoc.data().dedicatedChannelId}`);
    } else {
      alert("El agente no tiene canal dedicado");
    }
  } catch (err) {
    console.error("[automations] Error navigating to agent:", err);
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadUserWorkspaces();
  const ws = workspacesMap.value[workspaceId];
  if (ws) setActiveWorkspace(ws);
  listenChannels(workspaceId);
  listenDMs(workspaceId);
  listenTasks(workspaceId);

  // Listener en tiempo real para automatizaciones
  const q = query(
    collection(db, "workspaces", workspaceId, "automations"),
    orderBy("createdAt", "desc"),
  );
  unsubAutomations = onSnapshot(q, (snap) => {
    automations.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    loading.value = false;
  }, (err) => {
    console.error("[automations] Listener error:", err);
    // Si hay error (ej: documentos sin createdAt), intentar sin orderBy
    if (err.message?.includes("createdAt")) {
      const qFallback = query(
        collection(db, "workspaces", workspaceId, "automations"),
      );
      unsubAutomations = onSnapshot(qFallback, (snap) => {
        automations.value = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
        loading.value = false;
      });
    }
  });
});

onUnmounted(() => {
  if (unsubAutomations) unsubAutomations();
  stopTasks();
});
</script>
