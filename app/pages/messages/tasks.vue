<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <MessagesSidebar active="tasks" />

    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div class="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center text-lg flex-shrink-0">
          <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">Tareas pendientes</h2>
          <p class="text-xs text-white/40">Tareas detectadas por la IA o agregadas manualmente</p>
        </div>
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
          <span v-if="f.count > 0" class="ml-1 opacity-60">({{ f.count }})</span>
        </button>
      </div>

      <!-- Lista -->
      <div class="flex-1 overflow-y-auto py-4 px-4 space-y-2">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
        >
          <button
            class="mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
            :class="{
              'bg-emerald-600 border-emerald-600': task.status === 'done',
              'bg-yellow-600/30 border-yellow-600': task.status === 'in_progress',
              'border-white/20 hover:border-violet-500': task.status === 'pending',
            }"
            @click="cycleStatus(task)"
          >
            <svg v-if="task.status === 'done'" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else-if="task.status === 'in_progress'" class="w-2 h-2 rounded-full bg-yellow-400"></span>
          </button>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white" :class="task.status === 'done' ? 'line-through opacity-40' : ''">{{ task.title }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span v-if="task.assignedByName" class="text-xs text-white/30">Asignada por {{ task.assignedByName }}</span>
              <span class="text-xs text-white/20">{{ formatDate(task.createdAt) }}</span>
            </div>
          </div>
          <button
            class="text-xs text-red-400/40 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
            title="Eliminar"
            @click="removeTask(task.id)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div v-if="filteredTasks.length === 0" class="flex-1 flex items-center justify-center py-20">
          <div class="text-center text-white/20 space-y-3">
            <svg class="w-10 h-10 mx-auto text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-sm">No hay tareas {{ activeFilter !== 'all' ? 'con este filtro' : 'pendientes' }}</p>
            <p class="text-xs text-white/15">Las tareas detectadas por la IA en tus conversaciones aparecen aqui</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const { getIdToken } = useAuth();

type TaskItem = { id: string; title: string; status: string; assignedByName?: string; createdAt?: string };
const tasks = ref<TaskItem[]>([]);
const activeFilter = ref("all");
const loading = ref(true);

const pendingCount = computed(() => tasks.value.filter((t) => t.status === "pending").length);
const inProgressCount = computed(() => tasks.value.filter((t) => t.status === "in_progress").length);
const doneCount = computed(() => tasks.value.filter((t) => t.status === "done").length);

const filters = computed(() => [
  { label: "Todas", value: "all", count: tasks.value.length },
  { label: "Pendientes", value: "pending", count: pendingCount.value },
  { label: "En progreso", value: "in_progress", count: inProgressCount.value },
  { label: "Completadas", value: "done", count: doneCount.value },
]);

const filteredTasks = computed(() =>
  activeFilter.value === "all"
    ? tasks.value
    : tasks.value.filter((t) => t.status === activeFilter.value)
);

onMounted(() => loadTasks());

async function loadTasks() {
  loading.value = true;
  try {
    const token = await getIdToken();
    const result = await $fetch<{ tasks: TaskItem[] }>("/api/protected/tasks/list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    tasks.value = result.tasks ?? [];
  } catch { /* endpoint might not exist yet */ }
  loading.value = false;
}

function cycleStatus(task: TaskItem) {
  const next: Record<string, string> = { pending: "in_progress", in_progress: "done", done: "pending" };
  const newStatus = next[task.status] ?? "pending";
  task.status = newStatus;
  toggleTask(task.id, newStatus);
}

async function toggleTask(taskId: string, status: string) {
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/tasks/update", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { taskId, status },
    });
  } catch (err) {
    console.error("[tasks] Toggle failed:", err);
  }
}

async function removeTask(taskId: string) {
  tasks.value = tasks.value.filter((t) => t.id !== taskId);
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/tasks/remove", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { taskId },
    });
  } catch (err) {
    console.error("[tasks] Remove failed:", err);
  }
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es", { day: "numeric", month: "short" });
}
</script>
