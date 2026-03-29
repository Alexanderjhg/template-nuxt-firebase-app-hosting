<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">

    <MessagesSidebar active="notifications" />

    <!-- Panel principal -->
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div class="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-lg flex-shrink-0">
          🔔
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">Notificaciones</h2>
          <p class="text-xs text-white/40">Ejecuciones de tareas, automatizaciones y agendamientos</p>
        </div>
        <button
          v-if="unreadCount > 0"
          class="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
          @click="markAllRead"
        >
          Marcar todo como leído
        </button>
      </div>

      <!-- Contenido -->
      <div class="flex-1 overflow-y-auto py-4 px-4 space-y-2">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="flex items-start gap-3 rounded-xl border p-3 transition-colors"
          :class="notif.read ? 'border-white/5 bg-white/[0.01]' : 'border-violet-500/20 bg-violet-900/10'"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
            :class="getIconBg(notif.type)"
          >
            {{ getIcon(notif.type) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white">{{ notif.title }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-white/30">{{ notif.description }}</span>
              <span class="text-xs text-white/20">{{ formatDate(notif.createdAt) }}</span>
            </div>
          </div>
          <button
            v-if="!notif.read"
            class="text-xs text-violet-400/60 hover:text-violet-400 transition-colors flex-shrink-0 mt-1"
            title="Marcar como leído"
            @click="markRead(notif.id)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <!-- Vacío -->
        <div v-if="notifications.length === 0 && !loading" class="flex-1 flex items-center justify-center py-20">
          <div class="text-center text-white/20 space-y-3">
            <div class="text-4xl">🔔</div>
            <p class="text-sm">No tienes notificaciones</p>
            <p class="text-xs text-white/15">Las ejecuciones de tareas, automatizaciones y agendamientos aparecerán aquí</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, query, orderBy, limit, onSnapshot, doc, writeBatch } from "firebase/firestore";

definePageMeta({ middleware: "auth", layout: "app" });

const { user } = useAuth();
const { $firestore } = useNuxtApp();

type ExecNotification = {
  id: string;
  type: string;
  title: string;
  description: string;
  source: string;
  toolName: string;
  read: boolean;
  createdAt: any;
};

const notifications = ref<ExecNotification[]>([]);
const loading = ref(true);
let unsub: (() => void) | null = null;

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

onMounted(() => {
  if (!user.value?.uid || !$firestore) return;
  const q = query(
    collection($firestore as any, "users", user.value.uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  unsub = onSnapshot(q, (snap) => {
    notifications.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExecNotification));
    loading.value = false;
  });
});

onUnmounted(() => {
  unsub?.();
});

function getIcon(type: string): string {
  switch (type) {
    case "automation_created": return "⚡";
    case "automation_executed": return "⚡";
    case "event_scheduled": return "📅";
    case "task_created": return "📋";
    case "agent_executed": return "🤖";
    default: return "🔔";
  }
}

function getIconBg(type: string): string {
  switch (type) {
    case "automation_created":
    case "automation_executed":
      return "bg-amber-600/30";
    case "event_scheduled":
      return "bg-blue-600/30";
    case "task_created":
      return "bg-emerald-600/30";
    case "agent_executed":
      return "bg-violet-600/30";
    default:
      return "bg-white/10";
  }
}

function formatDate(d: any) {
  if (!d) return "";
  const date = d.toDate?.() ?? new Date(d);
  return date.toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

async function markRead(notifId: string) {
  const notif = notifications.value.find((n) => n.id === notifId);
  if (notif) notif.read = true;
  try {
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc($firestore as any, "users", user.value!.uid, "notifications", notifId), { read: true });
  } catch (err) {
    console.error("[notifications] markRead failed:", err);
  }
}

async function markAllRead() {
  const unread = notifications.value.filter((n) => !n.read);
  unread.forEach((n) => (n.read = true));
  try {
    const batch = writeBatch($firestore as any);
    for (const n of unread) {
      batch.update(doc($firestore as any, "users", user.value!.uid, "notifications", n.id), { read: true });
    }
    await batch.commit();
  } catch (err) {
    console.error("[notifications] markAllRead failed:", err);
  }
}
</script>
