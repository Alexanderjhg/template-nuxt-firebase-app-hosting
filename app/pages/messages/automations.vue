<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <MessagesSidebar active="automations" />

    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div class="w-8 h-8 rounded-full bg-amber-600/30 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">Automatizaciones</h2>
          <p class="text-xs text-white/40">Tareas programadas creadas desde tus conversaciones</p>
        </div>
        <button
          class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white transition-colors"
          @click="showCreate = true"
        >
          + Nueva
        </button>
      </div>

      <!-- Filtros -->
      <div class="flex gap-1 px-4 py-2 border-b border-white/5">
        <button
          v-for="f in filters"
          :key="f.value"
          class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          :class="activeFilter === f.value ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:text-white/70'"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Lista -->
      <div class="flex-1 overflow-y-auto py-4 px-4 space-y-2">
        <div
          v-for="auto in filteredAutomations"
          :key="auto.id"
          class="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2 hover:bg-white/[0.04] transition-colors"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-medium text-white truncate">{{ auto.title }}</h3>
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                  :class="statusClass(auto.status)"
                >{{ statusLabel(auto.status) }}</span>
              </div>
              <p class="text-xs text-white/40 mt-0.5 line-clamp-2">{{ auto.description }}</p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button
                class="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                :title="auto.status === 'active' ? 'Pausar' : 'Reanudar'"
                @click="toggleStatus(auto)"
              >
                <svg v-if="auto.status === 'active'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                class="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                title="Eliminar"
                @click="deleteAutomation(auto)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 text-xs text-white/30">
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ freqLabel(auto.schedule?.frequency) }}
              <template v-if="auto.schedule?.time"> a las {{ auto.schedule.time }}</template>
            </span>
            <span v-if="auto.schedule?.nextRunAt" class="flex items-center gap-1">
              Proxima: {{ formatDateTime(auto.schedule.nextRunAt) }}
            </span>
            <span v-if="auto.runCount > 0">
              Ejecutada {{ auto.runCount }}x
            </span>
            <span v-if="auto.lastRunAt">
              Ultima: {{ formatDateTime(auto.lastRunAt) }}
            </span>
          </div>

          <div v-if="auto.lastRunResult" class="text-xs px-2 py-1 rounded bg-white/5 text-white/40">
            {{ auto.lastRunResult }}
          </div>
        </div>

        <div v-if="filteredAutomations.length === 0" class="flex-1 flex items-center justify-center py-20">
          <div class="text-center text-white/20 space-y-3">
            <svg class="w-10 h-10 mx-auto text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p class="text-sm">No hay automatizaciones {{ activeFilter !== 'all' ? 'con este filtro' : '' }}</p>
            <p class="text-xs text-white/15">Cuando la IA detecte tareas recurrentes en tus chats, podras programarlas aqui</p>
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
              <input v-model="form.title" type="text" placeholder="Ej: Reporte diario de ventas" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label class="block text-xs text-white/40 mb-1">Descripción</label>
              <textarea v-model="form.description" rows="2" placeholder="¿Qué debe hacer esta automatización?" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500 resize-none" />
            </div>
            <div>
              <label class="block text-xs text-white/40 mb-1">Frecuencia</label>
              <select v-model="form.frequency" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="once">Una vez</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <div v-if="form.frequency === 'once'">
              <label class="block text-xs text-white/40 mb-1">Fecha</label>
              <input v-model="form.date" type="date" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div v-if="form.frequency === 'weekly'">
              <label class="block text-xs text-white/40 mb-1">Día de la semana</label>
              <select v-model="form.dayOfWeek" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500">
                <option :value="1">Lunes</option>
                <option :value="2">Martes</option>
                <option :value="3">Miércoles</option>
                <option :value="4">Jueves</option>
                <option :value="5">Viernes</option>
                <option :value="6">Sábado</option>
                <option :value="0">Domingo</option>
              </select>
            </div>
            <div v-if="form.frequency === 'monthly'">
              <label class="block text-xs text-white/40 mb-1">Día del mes</label>
              <input v-model.number="form.dayOfMonth" type="number" min="1" max="31" placeholder="15" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label class="block text-xs text-white/40 mb-1">Hora</label>
              <input v-model="form.time" type="time" class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button class="px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white/70 transition-colors" @click="showCreate = false">
              Cancelar
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white transition-colors disabled:opacity-40"
              :disabled="!form.description || creating"
              @click="doCreate"
            >
              {{ creating ? 'Creando...' : 'Crear' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const { getIdToken } = useAuth();

type AutoItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  schedule?: { frequency?: string; time?: string; nextRunAt?: string };
  runCount: number;
  lastRunAt?: string;
  lastRunResult?: string;
  createdAt?: string;
};

const automations = ref<AutoItem[]>([]);
const activeFilter = ref("all");
const showCreate = ref(false);
const creating = ref(false);
const form = reactive({
  title: "",
  description: "",
  frequency: "daily" as "once" | "daily" | "weekly" | "monthly",
  time: "09:00",
  date: "",
  dayOfWeek: 1,
  dayOfMonth: 1,
});

const filters = [
  { label: "Todas", value: "all" },
  { label: "Activas", value: "active" },
  { label: "Pausadas", value: "paused" },
  { label: "Completadas", value: "completed" },
];

const filteredAutomations = computed(() =>
  activeFilter.value === "all"
    ? automations.value
    : automations.value.filter((a) => a.status === activeFilter.value)
);

onMounted(() => loadAutomations());

async function loadAutomations() {
  try {
    const token = await getIdToken();
    const result = await $fetch<{ automations: AutoItem[] }>("/api/protected/automations/personal", {
      headers: { Authorization: `Bearer ${token}` },
    });
    automations.value = result.automations ?? [];
  } catch { /* endpoint might not exist yet */ }
}

function statusClass(s: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-blue-500/20 text-blue-400",
    failed: "bg-red-500/20 text-red-400",
  };
  return map[s] ?? "bg-white/10 text-white/40";
}

function statusLabel(s: string) {
  const map: Record<string, string> = { active: "Activa", paused: "Pausada", completed: "Completada", failed: "Fallida" };
  return map[s] ?? s;
}

function freqLabel(f?: string) {
  const map: Record<string, string> = { once: "Una vez", daily: "Diario", weekly: "Semanal", monthly: "Mensual" };
  return map[f ?? ""] ?? f ?? "—";
}

function formatDateTime(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

async function toggleStatus(auto: AutoItem) {
  const newStatus = auto.status === "active" ? "paused" : "active";
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/automations/update", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { automationId: auto.id, status: newStatus },
    });
    auto.status = newStatus;
  } catch (err: any) {
    console.error("[automations] Toggle failed:", err?.data ?? err);
  }
}

async function doCreate() {
  if (!form.description || creating.value) return;
  creating.value = true;
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/automations/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: form.title || form.description.slice(0, 60),
        description: form.description,
        frequency: form.frequency,
        time: form.time || "09:00",
        date: form.frequency === "once" ? form.date : undefined,
        dayOfWeek: form.frequency === "weekly" ? form.dayOfWeek : undefined,
        dayOfMonth: form.frequency === "monthly" ? form.dayOfMonth : undefined,
        sourceType: "personal",
      },
    });
    showCreate.value = false;
    form.title = "";
    form.description = "";
    form.frequency = "daily";
    form.time = "09:00";
    form.date = "";
    form.dayOfWeek = 1;
    form.dayOfMonth = 1;
    await loadAutomations();
  } catch (err: any) {
    console.error("[automations] Create failed:", err?.data ?? err);
  } finally {
    creating.value = false;
  }
}

async function deleteAutomation(auto: AutoItem) {
  if (!confirm("¿Eliminar esta automatización?")) return;
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/automations/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { automationId: auto.id },
    });
    automations.value = automations.value.filter((a) => a.id !== auto.id);
  } catch (err: any) {
    console.error("[automations] Delete failed:", err?.data ?? err);
  }
}
</script>
