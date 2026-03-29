<template>
  <div class="h-full overflow-y-auto bg-[#0a0a0f]">
    <div class="flex items-center gap-3 px-6 py-4 border-b border-white/5">
      <button class="text-white/40 hover:text-white transition-colors" @click="$router.back()">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <h1 class="text-base font-semibold text-white">Contactos</h1>
      <button
        class="ml-auto text-sm text-violet-400 hover:text-violet-300 transition-colors"
        @click="showAdd = true"
      >+ Agregar contacto</button>
    </div>

    <div class="max-w-lg mx-auto px-6 py-6 space-y-4">
      <!-- Buscador -->
      <input
        v-model="search"
        type="text"
        placeholder="Filtrar contactos..."
        class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
      />

      <!-- Lista -->
      <div v-if="filtered.length > 0" class="space-y-2">
        <div
          v-for="contact in filtered"
          :key="contact.uid"
          class="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 transition-colors"
        >
          <div class="w-10 h-10 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
            <img v-if="contact.photoURL" :src="contact.photoURL" class="w-full h-full object-cover" alt="" />
            <span v-else>{{ contact.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white">{{ contact.displayName }}</p>
            <p class="text-xs text-white/40">@{{ contact.username }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-900/20"
              @click="chat(contact.uid)"
            >Mensaje</button>
            <NuxtLink :to="`/profile/${contact.uid}`" class="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1">
              Ver perfil
            </NuxtLink>
            <button
              class="text-xs text-red-400/50 hover:text-red-400 transition-colors px-2 py-1"
              @click="remove(contact.uid)"
            >Quitar</button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-16 text-white/20">
        <div class="text-4xl mb-3">📇</div>
        <p class="text-sm">{{ search ? 'Sin resultados' : 'No tienes contactos aún' }}</p>
      </div>
    </div>

    <!-- Modal agregar contacto -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Agregar contacto</h3>
        <input
          v-model="addSearch"
          type="text"
          placeholder="Buscar por @username..."
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
          @input="doSearch"
        />
        <div v-if="addResults.length > 0" class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="r in addResults"
            :key="r.uid"
            class="flex items-center gap-3 px-2 py-2 rounded-lg"
          >
            <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {{ r.displayName?.[0]?.toUpperCase() ?? '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white">{{ r.displayName }}</p>
              <p class="text-xs text-white/40">@{{ r.username }}</p>
            </div>
            <button
              class="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded-lg transition-colors"
              @click="add(r.uid)"
            >Agregar</button>
          </div>
        </div>
        <p v-else-if="addSearch.length >= 2" class="text-xs text-white/30 text-center">Sin resultados</p>
        <div class="flex justify-end">
          <button class="text-sm text-white/40 hover:text-white" @click="showAdd = false">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Contact } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const { contacts, listenContacts, stopListening, searchUsers, addContact, removeContact } = useContacts();
const { openGlobalDM } = useGlobalDMs();

const search = ref("");
const showAdd = ref(false);
const addSearch = ref("");
const addResults = ref<Contact[]>([]);

const filtered = computed(() =>
  contacts.value.filter((c) =>
    !search.value ||
    c.displayName.toLowerCase().includes(search.value.toLowerCase()) ||
    c.username.toLowerCase().includes(search.value.toLowerCase())
  )
);

onMounted(() => listenContacts());
onUnmounted(() => stopListening());

let timer: ReturnType<typeof setTimeout>;
function doSearch() {
  clearTimeout(timer);
  addResults.value = [];
  if (addSearch.value.length < 2) return;
  timer = setTimeout(async () => {
    addResults.value = await searchUsers(addSearch.value);
  }, 400);
}

async function add(uid: string) {
  await addContact(uid);
}

async function remove(uid: string) {
  await removeContact(uid);
}

async function chat(uid: string) {
  const { dmId } = await openGlobalDM(uid);
  navigateTo(`/messages/dm/${dmId}`);
}
</script>
