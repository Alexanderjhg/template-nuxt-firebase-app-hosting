<template>
  <div class="p-6 max-w-2xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">📋 Tareas pendientes</h2>
        <p class="text-xs text-white/40 mt-0.5">Detectadas por IA en tus conversaciones</p>
      </div>
      <button class="text-white/40 hover:text-white transition-colors text-xl" @click="$emit('close')">✕</button>
    </div>

    <!-- Filtros de estado -->
    <div class="flex gap-2 mb-4">
      <button
        v-for="f in filters"
        :key="f.value"
        class="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
        :class="[
          activeFilter === f.value
            ? 'bg-violet-600 text-white'
            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
        ]"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
        <span v-if="getCount(f.value) > 0" class="ml-1 opacity-70">({{ getCount(f.value) }})</span>
      </button>
    </div>

    <!-- Lista de tareas -->
    <div v-if="filteredTasks.length > 0" class="space-y-2">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="group flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 hover:border-white/10 transition-colors"
      >
        <!-- Checkbox de estado -->
        <button
          class="mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-all"
          :class="[
            task.status === 'done'
              ? 'bg-green-600 border-green-600 text-white'
              : task.status === 'in_progress'
                ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                : 'border-white/20 text-transparent hover:border-violet-500'
          ]"
          @click="cycleStatus(task)"
        >
          <svg v-if="task.status === 'done'" class="w-3 h-3 m-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else-if="task.status === 'in_progress'" class="block w-2 h-2 rounded-sm bg-violet-400 m-auto" />
        </button>

        <div class="flex-1 min-w-0">
          <p
            class="text-sm text-white"
            :class="{ 'line-through text-white/40': task.status === 'done' }"
          >
            {{ task.title }}
          </p>
          <div class="flex items-center gap-2 mt-1 text-xs text-white/30">
            <span v-if="task.assignedByName">Asignado por {{ task.assignedByName }}</span>
            <span v-if="task.sourceChannelId">· desde canal</span>
            <span>· {{ formatDate(task.createdAt) }}</span>
          </div>
        </div>

        <!-- Eliminar -->
        <button
          class="hidden group-hover:block p-1 text-white/20 hover:text-red-400 transition-colors"
          @click="removeTask(props.workspaceId, task.id)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else class="text-center py-16 text-white/30">
      <div class="text-4xl mb-3">✅</div>
      <p class="text-sm">Sin tareas {{ activeFilter !== 'all' ? 'en este estado' : 'pendientes' }}</p>
      <p class="text-xs mt-1 text-white/20">La IA detecta cuando alguien te asigna una tarea en el chat</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PendingTask, TaskStatus } from "~/types/chat";
import type { Timestamp } from "firebase/firestore";

const props = defineProps<{ workspaceId: string }>();
defineEmits<{ close: [] }>();

const { pendingTasks, listenTasks, stopListening, updateStatus, removeTask } = usePendingTasks();

const activeFilter = ref<"all" | TaskStatus>("all");
const filters = [
  { label: "Todas", value: "all" as const },
  { label: "Pendientes", value: "pending" as TaskStatus },
  { label: "En progreso", value: "in_progress" as TaskStatus },
  { label: "Completadas", value: "done" as TaskStatus },
];

const filteredTasks = computed(() => {
  if (activeFilter.value === "all") return pendingTasks.value;
  return pendingTasks.value.filter((t) => t.status === activeFilter.value);
});

function getCount(filter: "all" | TaskStatus): number {
  if (filter === "all") return pendingTasks.value.length;
  return pendingTasks.value.filter((t) => t.status === filter).length;
}

function cycleStatus(task: PendingTask) {
  const next: Record<TaskStatus, TaskStatus> = {
    pending: "in_progress",
    in_progress: "done",
    done: "pending",
  };
  updateStatus(props.workspaceId, task.id, next[task.status]);
}

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return "";
  const date = ts.toDate?.() ?? new Date(ts as unknown as number);
  return date.toLocaleDateString("es", { day: "numeric", month: "short" });
}

onMounted(() => listenTasks(props.workspaceId));
onUnmounted(() => stopListening());
</script>
