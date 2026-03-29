// app/composables/usePendingTasks.ts
// Gestión de tareas pendientes detectadas por la IA o agregadas manualmente.

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { PendingTask, TaskStatus } from "~/types/chat";

const pendingTasks = useState<PendingTask[]>("pendingTasks", () => []);

export function usePendingTasks() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  // ── Escuchar tareas del usuario ──────────────────────────────────────────

  function listenTasks(workspaceId: string): Unsubscribe {
    if (!user.value?.uid) return () => {};
    unsubscribe?.();

    const q = query(
      collection($firestore, "workspaces", workspaceId, "pending_tasks"),
      where("userId", "==", user.value.uid)
      // orderBy omitido intencionalmente para evitar error requires_index
    );

    unsubscribe = onSnapshot(q, (snap) => {
      const allTasks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingTask));
      pendingTasks.value = allTasks.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return timeB - timeA;
      });
    }, (error) => {
      console.error("[usePendingTasks] Snapshot Error:", error);
    });

    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    pendingTasks.value = [];
  }

  // ── Agregar tarea (via servidor después de aceptar sugerencia) ───────────

  async function addTask(
    workspaceId: string,
    payload: {
      title: string;
      assignedByName?: string;
      sourceChannelId?: string;
      sourceMessageId?: string;
    }
  ): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/tasks/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, ...payload },
    });
  }

  // ── Actualizar estado ────────────────────────────────────────────────────

  async function updateStatus(workspaceId: string, taskId: string, status: TaskStatus): Promise<void> {
    await updateDoc(
      doc($firestore, "workspaces", workspaceId, "pending_tasks", taskId),
      { status }
    );
  }

  // ── Eliminar tarea ───────────────────────────────────────────────────────

  async function removeTask(workspaceId: string, taskId: string): Promise<void> {
    await deleteDoc(doc($firestore, "workspaces", workspaceId, "pending_tasks", taskId));
  }

  // ── Contadores ───────────────────────────────────────────────────────────

  const pendingCount = computed(() =>
    pendingTasks.value.filter((t) => t.status === "pending").length
  );

  const inProgressCount = computed(() =>
    pendingTasks.value.filter((t) => t.status === "in_progress").length
  );

  return {
    pendingTasks: readonly(pendingTasks),
    pendingCount,
    inProgressCount,
    listenTasks,
    stopListening,
    addTask,
    updateStatus,
    removeTask,
  };
}
