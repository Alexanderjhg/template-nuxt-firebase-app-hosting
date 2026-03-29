<template>
  <!-- Barra lateral izquierda ultra-delgada con íconos de navegación principal -->
  <nav class="w-14 flex-shrink-0 flex flex-col items-center py-3 gap-1 border-r border-white/5 bg-[#08080e]">

    <!-- Logo -->
    <NuxtLink to="/" class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white font-black text-lg mb-3 hover:bg-violet-500 transition-colors">
      C
    </NuxtLink>

    <!-- Mensajes personales (con badge de solicitudes) -->
    <NavItem to="/messages" title="Mensajes personales" :active="isMessages">
      <div class="relative">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span
          v-if="pendingRequestCount > 0"
          class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-yellow-500 text-[9px] font-bold text-black flex items-center justify-center leading-none px-0.5"
        >{{ pendingRequestCount > 9 ? '9+' : pendingRequestCount }}</span>
      </div>
    </NavItem>

    <!-- Workspaces -->
    <NavItem to="/chat" title="Workspaces" :active="isChat">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </NavItem>

    <!-- Notificaciones -->
    <NavItem to="/messages/notifications" title="Notificaciones" :active="isNotifications">
      <div class="relative">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span
          v-if="unreadNotifCount > 0"
          class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-violet-500 text-[9px] font-bold text-white flex items-center justify-center leading-none px-0.5"
        >{{ unreadNotifCount > 9 ? '9+' : unreadNotifCount }}</span>
      </div>
    </NavItem>

    <!-- Contactos -->
    <NavItem to="/contacts" title="Contactos" :active="isContacts">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </NavItem>

    <div class="flex-1" />

    <!-- Configuración -->
    <NavItem to="/settings" title="Configuración" :active="isSettings">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </NavItem>

    <!-- Perfil -->
    <NavItem to="/profile" title="Mi perfil" :active="isProfile">
      <div class="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
        <img v-if="user?.photoURL" :src="user.photoURL" class="w-full h-full object-cover" alt="" />
        <span v-else>{{ user?.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
      </div>
    </NavItem>
  </nav>
</template>

<script setup lang="ts">
import { collection, query, where, onSnapshot } from "firebase/firestore";

const { user } = useAuth();
const { pendingRequestCount } = useGlobalDMs();
const { $firestore } = useNuxtApp();
const route = useRoute();

const unreadNotifCount = ref(0);
let unsubNotif: (() => void) | null = null;

onMounted(() => {
  if (user.value?.uid && $firestore) {
    const q = query(
      collection($firestore as any, "users", user.value.uid, "notifications"),
      where("read", "==", false),
    );
    unsubNotif = onSnapshot(q, (snap) => {
      unreadNotifCount.value = snap.size;
    });
  }
});

onUnmounted(() => {
  unsubNotif?.();
});
const isMessages = computed(() => route.path.startsWith("/messages") && !route.path.includes("/notifications"));
const isNotifications = computed(() => route.path.includes("/notifications"));
const isChat = computed(() => route.path.startsWith("/chat"));
const isContacts = computed(() => route.path.startsWith("/contacts"));
const isSettings = computed(() => route.path.startsWith("/settings"));
const isProfile = computed(() => route.path.startsWith("/profile"));
</script>
