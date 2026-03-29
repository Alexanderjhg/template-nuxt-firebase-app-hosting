<template>
  <div class="h-full bg-[#0a0a0f] flex flex-col">
    <!-- Header -->
    <div class="flex items-center gap-3 px-6 py-4 border-b border-white/5">
      <button class="text-white/40 hover:text-white transition-colors" @click="$router.back()">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <h1 class="text-base font-semibold text-white">Mi perfil</h1>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="max-w-lg mx-auto px-6 py-8 space-y-8">

        <!-- Avatar -->
        <div class="flex flex-col items-center gap-3">
          <div class="w-24 h-24 rounded-full bg-violet-700 flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
            <img v-if="form.photoURL" :src="form.photoURL" class="w-full h-full object-cover" alt="" />
            <span v-else>{{ initial }}</span>
          </div>
          <p class="text-xs text-white/30">La foto se toma de tu cuenta de Google</p>
        </div>

        <!-- Nombre y username -->
        <div class="space-y-4">
          <div>
            <label class="text-xs text-white/50 mb-1.5 block">Nombre</label>
            <input v-model="form.displayName" type="text" maxlength="60"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
              placeholder="Tu nombre" />
          </div>

          <div>
            <label class="text-xs text-white/50 mb-1.5 block">Username</label>
            <div class="flex items-center gap-2">
              <span class="text-white/30 text-sm">@</span>
              <input v-model="form.username" type="text" maxlength="20"
                class="flex-1 rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
                :class="usernameStatus === 'available' ? 'border-green-500/50' : usernameStatus === 'taken' ? 'border-red-500/50' : 'border-white/10 focus:border-violet-500/50'"
                placeholder="tuusername"
                @input="debouncedCheckUsername" />
            </div>
            <p v-if="usernameStatus === 'available'" class="text-xs text-green-400 mt-1">✓ Disponible</p>
            <p v-else-if="usernameStatus === 'taken'" class="text-xs text-red-400 mt-1">✗ Ya está en uso</p>
            <p v-else class="text-xs text-white/20 mt-1">Solo letras, números y guiones bajos (3–20 caracteres)</p>
          </div>

          <div>
            <label class="text-xs text-white/50 mb-1.5 block">Bio</label>
            <textarea v-model="form.bio" maxlength="200" rows="2"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none resize-none"
              placeholder="Cuéntanos algo de ti..." />
            <p class="text-xs text-white/20 text-right mt-0.5">{{ form.bio?.length ?? 0 }}/200</p>
          </div>
        </div>

        <!-- Estado -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-white">Estado</h3>
          <ProfileStatusPicker v-model="form.status" />
          <input v-model="form.statusMessage" type="text" maxlength="80"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
            placeholder='Mensaje de estado (ej: "En reunión hasta las 3pm")' />
        </div>

        <!-- Guardar -->
        <div class="flex items-center justify-between pt-2">
          <p v-if="saved" class="text-xs text-green-400">✓ Perfil guardado</p>
          <p v-else-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
          <span v-else />
          <UIButton :loading="saving" @click="save">Guardar cambios</UIButton>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserStatus } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const { myProfile, listenMyProfile, stopListening, updateProfile, checkUsername } = useProfile();
const { user } = useAuth();

const form = reactive({
  displayName: "",
  photoURL: "",
  username: "",
  bio: "",
  status: "online" as UserStatus,
  statusMessage: "",
});

const saving = ref(false);
const saved = ref(false);
const saveError = ref("");
const usernameStatus = ref<"idle" | "available" | "taken">("idle");

const initial = computed(() => form.displayName?.[0]?.toUpperCase() ?? user.value?.email?.[0]?.toUpperCase() ?? "?");

onMounted(() => {
  listenMyProfile();
});

onUnmounted(() => stopListening());

watch(myProfile, (p) => {
  if (!p) return;
  form.displayName = p.displayName ?? "";
  form.photoURL = p.photoURL ?? "";
  form.username = p.username ?? "";
  form.bio = p.bio ?? "";
  form.status = p.status ?? "online";
  form.statusMessage = p.statusMessage ?? "";
}, { immediate: true });

let usernameTimer: ReturnType<typeof setTimeout>;
function debouncedCheckUsername() {
  usernameStatus.value = "idle";
  clearTimeout(usernameTimer);
  if (!form.username || form.username.length < 3) return;
  usernameTimer = setTimeout(async () => {
    const { available } = await checkUsername(form.username);
    usernameStatus.value = available ? "available" : "taken";
  }, 600);
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  saved.value = false;
  saveError.value = "";
  try {
    await updateProfile({
      displayName: form.displayName,
      username: form.username,
      bio: form.bio,
      status: form.status,
      statusMessage: form.statusMessage,
    });
    saved.value = true;
    setTimeout(() => (saved.value = false), 3000);
  } catch (e: unknown) {
    saveError.value = (e as { data?: { message?: string } })?.data?.message ?? "Error al guardar";
  } finally {
    saving.value = false;
  }
}
</script>
