<template>
  <div class="min-h-screen bg-[#0a0a0f]">
    <div class="flex items-center gap-3 px-6 py-4 border-b border-white/5">
      <button class="text-white/40 hover:text-white transition-colors" @click="$router.back()">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <h1 class="text-base font-semibold text-white">Perfil</h1>
    </div>

    <div class="max-w-lg mx-auto px-6 py-10 space-y-6">
      <div v-if="loading" class="text-center text-white/30 py-16">
        <div class="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Cargando perfil...
      </div>

      <div v-else-if="!profile" class="text-center text-white/30 py-16">
        Usuario no encontrado
      </div>

      <template v-else>
        <!-- Avatar y nombre -->
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="w-24 h-24 rounded-full bg-violet-700 flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
            <img v-if="profile.photoURL" :src="profile.photoURL" class="w-full h-full object-cover" alt="" />
            <span v-else>{{ profile.displayName?.[0]?.toUpperCase() }}</span>
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">{{ profile.displayName }}</h2>
            <p v-if="profile.username" class="text-sm text-white/40">@{{ profile.username }}</p>
          </div>

          <!-- Estado -->
          <div class="flex items-center gap-2">
            <span :class="statusDot" class="w-2.5 h-2.5 rounded-full" />
            <span class="text-sm text-white/60">{{ statusLabel }}</span>
            <span v-if="profile.statusMessage" class="text-sm text-white/40">— {{ profile.statusMessage }}</span>
          </div>

          <!-- Bio -->
          <p v-if="profile.bio" class="text-sm text-white/50 max-w-xs">{{ profile.bio }}</p>
        </div>

        <!-- Acciones -->
        <div v-if="!isMe" class="flex gap-3 justify-center">
          <UIButton @click="startDM">💬 Enviar mensaje</UIButton>
          <button
            class="px-4 py-2 rounded-lg text-sm border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
            @click="addContact"
          >
            {{ isContact ? '✓ Contacto' : '+ Agregar contacto' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const uid = route.params.uid as string;
const { user } = useAuth();
const { fetchProfile } = useProfile();
const { openGlobalDM } = useGlobalDMs();
const { addContact: doAddContact, myContactIds } = useContacts();

const profile = ref<Awaited<ReturnType<typeof fetchProfile>>>(null);
const loading = ref(true);

const isMe = computed(() => user.value?.uid === uid);
const isContact = computed(() => myContactIds.value.includes(uid));

const statusDot = computed(() => ({
  online: "bg-green-400",
  away: "bg-yellow-400",
  busy: "bg-red-400",
  offline: "bg-white/30",
}[profile.value?.status ?? "offline"]));

const statusLabel = computed(() => ({
  online: "En línea",
  away: "Ausente",
  busy: "No molestar",
  offline: "Desconectado",
}[profile.value?.status ?? "offline"]));

onMounted(async () => {
  profile.value = await fetchProfile(uid);
  loading.value = false;
});

async function startDM() {
  const { dmId } = await openGlobalDM(uid);
  navigateTo(`/messages/dm/${dmId}`);
}

async function addContact() {
  if (!profile.value) return;
  await doAddContact(uid);
}
</script>
