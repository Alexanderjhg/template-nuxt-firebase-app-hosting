<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">

    <!-- Sidebar de mensajes personales -->
    <div class="w-64 flex-shrink-0 border-r border-white/5 flex flex-col">
      <!-- Header -->
      <div class="px-4 py-4 flex items-center justify-between border-b border-white/5">
        <h2 class="text-sm font-semibold text-white">Mensajes</h2>
        <div class="flex gap-1">
          <button
            class="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            title="Nuevo mensaje"
            @click="showNewDM = true"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            class="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            title="Nuevo grupo"
            @click="showNewGroup = true"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Buscador -->
      <div class="px-3 py-2">
        <input
          v-model="search"
          type="text"
          placeholder="Buscar..."
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
        />
      </div>

      <!-- Secciones de herramientas -->
      <div class="border-b border-white/5 py-1 space-y-0.5">
        <NuxtLink
          v-for="s in toolSections"
          :key="s.to"
          :to="s.to"
          class="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-white/60"
        >
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" :class="s.bg">
            <span v-html="s.icon"></span>
          </div>
          <p class="text-xs font-medium">{{ s.label }}</p>
        </NuxtLink>
      </div>

      <!-- Lista de conversaciones -->
      <div class="flex-1 overflow-y-auto py-2">

        <!-- Solicitudes pendientes (yo soy el destinatario) -->
        <div v-if="incomingRequests.length > 0" class="mb-2">
          <p class="px-3 py-1 text-xs font-semibold text-yellow-500/70 uppercase tracking-wider flex items-center gap-1">
            Solicitudes
            <span class="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 rounded-full">{{ incomingRequests.length }}</span>
          </p>
          <button
            v-for="dm in incomingRequests"
            :key="dm.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-yellow-500/5 transition-colors text-left"
            @click="navigateTo(`/messages/dm/${dm.id}`)"
          >
            <div class="relative w-9 h-9 flex-shrink-0">
              <div class="w-9 h-9 rounded-full bg-violet-700/50 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                <img v-if="getOther(dm).photoURL" :src="getOther(dm).photoURL" class="w-full h-full object-cover opacity-70" alt="" />
                <span v-else>{{ getOther(dm).displayName?.[0]?.toUpperCase() ?? '?' }}</span>
              </div>
              <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full border-2 border-[#0a0a0f]"></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white/80 truncate">{{ getOther(dm).displayName }}</p>
              <p class="text-xs text-yellow-500/60 truncate">Solicitud de mensaje</p>
            </div>
          </button>
        </div>

        <!-- DMs activos -->
        <div v-if="filteredDMs.length > 0" class="mb-2">
          <p class="px-3 py-1 text-xs font-semibold text-white/30 uppercase tracking-wider">Mensajes directos</p>
          <button
            v-for="dm in filteredDMs"
            :key="dm.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            @click="navigateTo(`/messages/dm/${dm.id}`)"
          >
            <div class="w-9 h-9 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
              <img v-if="getOther(dm).photoURL" :src="getOther(dm).photoURL" class="w-full h-full object-cover" alt="" />
              <span v-else>{{ getOther(dm).displayName?.[0]?.toUpperCase() ?? '?' }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ getOther(dm).displayName }}</p>
              <p class="text-xs text-white/30 truncate">{{ dm.lastMessagePreview || 'Sin mensajes aún' }}</p>
            </div>
          </button>
        </div>

        <!-- Grupos personales -->
        <div v-if="filteredGroups.length > 0">
          <p class="px-3 py-1 text-xs font-semibold text-white/30 uppercase tracking-wider">Grupos</p>
          <button
            v-for="group in filteredGroups"
            :key="group.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            @click="navigateTo(`/messages/group/${group.id}`)"
          >
            <div class="w-9 h-9 rounded-full bg-indigo-700/60 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {{ group.name?.[0]?.toUpperCase() ?? 'G' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ group.name }}</p>
              <p class="text-xs text-white/30 truncate">{{ group.lastMessagePreview || 'Sin mensajes aún' }}</p>
            </div>
          </button>
        </div>

        <!-- Vacío -->
        <div v-if="filteredDMs.length === 0 && filteredGroups.length === 0 && incomingRequests.length === 0" class="text-center py-12 text-white/20">
          <div class="text-3xl mb-2">💬</div>
          <p class="text-xs">No tienes conversaciones aún.<br/>Inicia un nuevo chat.</p>
        </div>
      </div>

      <!-- Footer usuario -->
      <div class="px-3 py-3 border-t border-white/5 flex items-center gap-2">
        <NuxtLink to="/profile" class="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
          <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
            <img v-if="user?.photoURL" :src="user.photoURL" class="w-full h-full object-cover" alt="" />
            <span v-else>{{ user?.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-white truncate">{{ user?.displayName ?? 'Usuario' }}</p>
            <p class="text-xs text-white/30 truncate">Mi perfil</p>
          </div>
        </NuxtLink>
        <NuxtLink to="/contacts" class="text-white/30 hover:text-white transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </NuxtLink>
      </div>
    </div>

    <!-- Área principal vacía -->
    <div class="flex-1 flex items-center justify-center text-white/20">
      <div class="text-center space-y-3">
        <div class="text-5xl">💬</div>
        <p class="text-sm">Selecciona una conversación</p>
      </div>
    </div>

    <!-- Modal: nuevo DM -->
    <div v-if="showNewDM" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Nuevo mensaje</h3>
        <p class="text-xs text-white/40">Si la persona no es tu contacto, recibirá una solicitud de mensaje que debe aceptar.</p>
        <input
          v-model="newDMSearch"
          type="text"
          placeholder="Buscar por @username..."
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
          @input="searchUsersDebounced"
        />
        <div v-if="searchResults.length > 0" class="space-y-1 max-h-48 overflow-y-auto">
          <button
            v-for="r in searchResults"
            :key="r.uid"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-colors"
            @click="startDM(r.uid)"
          >
            <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {{ r.displayName?.[0]?.toUpperCase() ?? '?' }}
            </div>
            <div>
              <p class="text-sm text-white">{{ r.displayName }}</p>
              <p class="text-xs text-white/40">@{{ r.username }}</p>
            </div>
          </button>
        </div>
        <p v-else-if="newDMSearch.length >= 2" class="text-xs text-white/30 text-center">Sin resultados</p>
        <div class="flex justify-end">
          <button class="text-sm text-white/40 hover:text-white" @click="showNewDM = false">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal: nuevo grupo -->
    <div v-if="showNewGroup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Nuevo grupo</h3>
        <input v-model="newGroupName" type="text" placeholder="Nombre del grupo"
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />

        <!-- Buscador de miembros -->
        <input
          v-model="groupMemberSearch"
          type="text"
          placeholder="Buscar personas por @username..."
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
          @input="searchGroupMembersDebounced"
        />

        <!-- Miembros seleccionados -->
        <div v-if="selectedGroupMembers.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="m in selectedGroupMembers"
            :key="m.uid"
            class="inline-flex items-center gap-1 bg-violet-600/20 text-violet-300 text-xs px-2 py-1 rounded-full"
          >
            {{ m.displayName }}
            <button class="hover:text-white" @click="removeGroupMember(m.uid)">&times;</button>
          </span>
        </div>

        <!-- Resultados de búsqueda -->
        <div v-if="groupSearchResults.length > 0" class="space-y-1 max-h-40 overflow-y-auto">
          <button
            v-for="r in groupSearchResults"
            :key="r.uid"
            class="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors"
            @click="addGroupMember(r)"
          >
            <div class="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {{ r.displayName?.[0]?.toUpperCase() ?? '?' }}
            </div>
            <div>
              <p class="text-sm text-white">{{ r.displayName }}</p>
              <p class="text-xs text-white/40">@{{ r.username }}</p>
            </div>
          </button>
        </div>

        <!-- Contactos existentes -->
        <div v-if="contacts.length > 0 && !groupMemberSearch" class="space-y-1 max-h-40 overflow-y-auto">
          <p class="text-xs text-white/40 mb-1">Tus contactos:</p>
          <label
            v-for="c in contacts"
            :key="c.uid"
            class="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <input type="checkbox" :value="c.uid" v-model="selectedMembers" class="accent-violet-500" />
            <span class="text-sm text-white">{{ c.displayName }}</span>
            <span class="text-xs text-white/30">@{{ c.username }}</span>
          </label>
        </div>

        <div class="flex gap-2 justify-end">
          <button class="text-sm text-white/40 hover:text-white" @click="closeGroupModal">Cancelar</button>
          <UIButton :loading="creatingGroup" @click="createGroup">Crear grupo</UIButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GlobalDM, Contact } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const { user } = useAuth();
const { globalDMs, listenGlobalDMs, stopListening: stopDMs, openGlobalDM, getOtherParticipant } = useGlobalDMs();
const { personalGroups, listenPersonalGroups, stopListening: stopGroups, createGroup: doCreate } = usePersonalGroups();
const { contacts, listenContacts, stopListening: stopContacts, searchUsers: doSearch } = useContacts();

const toolSections = [
  { to: "/messages/notifications", label: "Notificaciones", bg: "bg-violet-600/30", icon: "🔔" },
  { to: "/messages/tasks", label: "Tareas pendientes", bg: "bg-emerald-600/30", icon: "📋" },
  { to: "/messages/automations", label: "Automatizaciones", bg: "bg-amber-600/30", icon: "⚡" },
  { to: "/messages/agents", label: "Agentes externos", bg: "bg-violet-600/30", icon: "🤖" },
  { to: "/messages/assistant", label: "Asistente IA", bg: "bg-blue-600/30", icon: "🧠" },
];

const search = ref("");
const showNewDM = ref(false);
const showNewGroup = ref(false);
const newDMSearch = ref("");
const newGroupName = ref("");
const selectedMembers = ref<string[]>([]);
const creatingGroup = ref(false);
const searchResults = ref<Contact[]>([]);
const groupMemberSearch = ref("");
const groupSearchResults = ref<Contact[]>([]);
const selectedGroupMembers = ref<Contact[]>([]);

// Solicitudes donde yo soy el destinatario (no quien la envió)
const incomingRequests = computed(() =>
  globalDMs.value.filter(
    (dm) => dm.status === "pending" && dm.requestedBy !== user.value?.uid
  )
);

// DMs activos (incluye DMs legacy sin campo status)
const filteredDMs = computed(() =>
  globalDMs.value
    .filter((dm) => (dm.status ?? "active") !== "pending")
    .filter((dm) => {
      if (!search.value) return true;
      const other = getOtherParticipant(dm);
      return other.displayName.toLowerCase().includes(search.value.toLowerCase());
    })
);

const filteredGroups = computed(() =>
  personalGroups.value.filter((g) =>
    !search.value || g.name.toLowerCase().includes(search.value.toLowerCase())
  )
);

function getOther(dm: GlobalDM) {
  return getOtherParticipant(dm);
}

onMounted(() => {
  const stopWatch = watch(user, (u) => {
    if (u) {
      listenGlobalDMs();
      listenPersonalGroups();
      listenContacts();
    } else {
      stopDMs();
      stopGroups();
      stopContacts();
    }
  }, { immediate: true });

  onUnmounted(() => {
    stopWatch();
    stopDMs();
    stopGroups();
    stopContacts();
  });
});

let searchTimer: ReturnType<typeof setTimeout>;
function searchUsersDebounced() {
  clearTimeout(searchTimer);
  searchResults.value = [];
  if (newDMSearch.value.length < 2) return;
  searchTimer = setTimeout(async () => {
    searchResults.value = await doSearch(newDMSearch.value);
  }, 400);
}

async function startDM(recipientId: string) {
  showNewDM.value = false;
  const { dmId } = await openGlobalDM(recipientId);
  navigateTo(`/messages/dm/${dmId}`);
}

let groupSearchTimer: ReturnType<typeof setTimeout>;
function searchGroupMembersDebounced() {
  clearTimeout(groupSearchTimer);
  groupSearchResults.value = [];
  if (groupMemberSearch.value.length < 2) return;
  groupSearchTimer = setTimeout(async () => {
    const results = await doSearch(groupMemberSearch.value);
    // Filtrar los ya seleccionados y a mí mismo
    const selectedIds = new Set([
      ...selectedMembers.value,
      ...selectedGroupMembers.value.map((m) => m.uid),
      user.value?.uid,
    ]);
    groupSearchResults.value = results.filter((r) => !selectedIds.has(r.uid));
  }, 400);
}

function addGroupMember(member: Contact) {
  if (!selectedGroupMembers.value.some((m) => m.uid === member.uid)) {
    selectedGroupMembers.value.push(member);
  }
  groupMemberSearch.value = "";
  groupSearchResults.value = [];
}

function removeGroupMember(uid: string) {
  selectedGroupMembers.value = selectedGroupMembers.value.filter((m) => m.uid !== uid);
}

function closeGroupModal() {
  showNewGroup.value = false;
  newGroupName.value = "";
  selectedMembers.value = [];
  selectedGroupMembers.value = [];
  groupMemberSearch.value = "";
  groupSearchResults.value = [];
}

async function createGroup() {
  // Combinar miembros de contactos (checkboxes) + miembros buscados
  const allMemberIds = [
    ...new Set([...selectedMembers.value, ...selectedGroupMembers.value.map((m) => m.uid)]),
  ];
  if (!newGroupName.value.trim() || allMemberIds.length === 0) return;
  creatingGroup.value = true;
  try {
    const { groupId } = await doCreate(newGroupName.value, allMemberIds);
    closeGroupModal();
    navigateTo(`/messages/group/${groupId}`);
  } finally {
    creatingGroup.value = false;
  }
}
</script>
