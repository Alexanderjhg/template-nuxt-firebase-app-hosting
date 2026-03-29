<template>
  <div class="w-64 flex-shrink-0 border-r border-white/5 flex flex-col">
    <!-- Header -->
    <div class="px-4 py-4 border-b border-white/5 flex items-center gap-2">
      <NuxtLink to="/messages" class="text-white/40 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </NuxtLink>
      <h2 class="text-sm font-semibold text-white">Mensajes</h2>
    </div>

    <!-- Secciones -->
    <div class="py-2 space-y-0.5">
      <NuxtLink
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        class="flex items-center gap-3 px-3 py-2.5 transition-colors"
        :class="active === s.id ? 'bg-violet-600/20 text-white' : 'hover:bg-white/5 text-white/60'"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          :class="s.iconBg"
        >
          <component :is="s.icon" class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium">{{ s.label }}</p>
        </div>
        <span
          v-if="s.badge && s.badge > 0"
          class="min-w-[18px] h-4.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none px-1"
          :class="s.badgeClass"
        >{{ s.badge > 9 ? '9+' : s.badge }}</span>
      </NuxtLink>
    </div>

    <div class="border-t border-white/5 my-1" />

    <!-- DMs activos -->
    <div class="flex-1 overflow-y-auto py-2">
      <p class="px-3 py-1 text-xs font-semibold text-white/30 uppercase tracking-wider">Conversaciones</p>
      <button
        v-for="dm in activeDMs"
        :key="dm.id"
        class="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left text-white/60"
        @click="navigateTo(`/messages/dm/${dm.id}`)"
      >
        <div class="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
          <img v-if="getOther(dm).photoURL" :src="getOther(dm).photoURL" class="w-full h-full object-cover" alt="" />
          <span v-else>{{ getOther(dm).displayName?.[0]?.toUpperCase() ?? '?' }}</span>
        </div>
        <p class="text-xs truncate">{{ getOther(dm).displayName }}</p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from "vue";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const props = defineProps<{
  active: string;
}>();

const { globalDMs, listenGlobalDMs, getOtherParticipant } = useGlobalDMs();
const { user } = useAuth();
const { $firestore } = useNuxtApp();

const activeDMs = computed(() => globalDMs.value.filter((d) => (d.status ?? "active") !== "pending"));
function getOther(dm: any) { return getOtherParticipant(dm); }

const pendingTaskCount = ref(0);
const unreadNotifCount = ref(0);
let unsubTasks: (() => void) | null = null;
let unsubNotifs: (() => void) | null = null;

onMounted(() => {
  listenGlobalDMs();
  if (user.value?.uid && $firestore) {
    // Listener de tareas pendientes
    const tasksQuery = query(
      collection($firestore as any, "users", user.value.uid, "pending_tasks"),
      where("status", "==", "pending"),
    );
    unsubTasks = onSnapshot(tasksQuery, (snap) => {
      pendingTaskCount.value = snap.size;
    });
    // Listener de notificaciones no leídas (ejecuciones)
    const notifsQuery = query(
      collection($firestore as any, "users", user.value.uid, "notifications"),
      where("read", "==", false),
    );
    unsubNotifs = onSnapshot(notifsQuery, (snap) => {
      unreadNotifCount.value = snap.size;
    });
  }
});

onUnmounted(() => {
  unsubTasks?.();
  unsubNotifs?.();
});

// Iconos como render functions simples
const IconBell = { render: () => h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "w-4 h-4" }, [h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" })]) };
const IconClipboard = { render: () => h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "w-4 h-4" }, [h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" })]) };
const IconBolt = { render: () => h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "w-4 h-4" }, [h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M13 10V3L4 14h7v7l9-11h-7z" })]) };
const IconBot = { render: () => h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "w-4 h-4" }, [h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" })]) };
const IconBrain = { render: () => h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "w-4 h-4" }, [h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" })]) };

const sections = computed(() => [
  {
    id: "notifications",
    to: "/messages/notifications",
    label: "Notificaciones",
    icon: IconBell,
    iconBg: "bg-violet-600/30",
    badge: unreadNotifCount.value,
    badgeClass: "bg-violet-500 text-white",
  },
  {
    id: "tasks",
    to: "/messages/tasks",
    label: "Tareas pendientes",
    icon: IconClipboard,
    iconBg: "bg-emerald-600/30",
    badge: pendingTaskCount.value,
    badgeClass: "bg-emerald-500 text-white",
  },
  {
    id: "automations",
    to: "/messages/automations",
    label: "Automatizaciones",
    icon: IconBolt,
    iconBg: "bg-amber-600/30",
    badge: 0,
    badgeClass: "",
  },
  {
    id: "agents",
    to: "/messages/agents",
    label: "Agentes externos",
    icon: IconBot,
    iconBg: "bg-violet-600/30",
    badge: 0,
    badgeClass: "",
  },
  {
    id: "assistant",
    to: "/messages/assistant",
    label: "Asistente IA",
    icon: IconBrain,
    iconBg: "bg-blue-600/30",
    badge: 0,
    badgeClass: "",
  },
]);
</script>
