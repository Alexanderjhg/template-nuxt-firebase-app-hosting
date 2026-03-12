<template>
  <main class="min-h-screen flex flex-col bg-[#0a0a0f] font-['Inter',sans-serif]">
    <!-- Header del dashboard -->
    <header class="border-b border-white/5 backdrop-blur-sm sticky top-0 z-10 bg-[#0a0a0f]/85">
      <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-semibold text-white leading-tight">Test de IA — Gemini</h1>
            <p class="text-xs text-white/40">Conectado como <span class="text-violet-400">{{ user?.email }}</span></p>
          </div>
        </div>

        <button id="btn-logout"
          class="flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-150"
          @click="logout">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </header>

    <!-- Cuerpo -->
    <div class="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col gap-5">
      <!-- Panel de entrada -->
      <section class="flex flex-col gap-3 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
        <label for="prompt-input" class="text-sm font-medium text-white/70">
          Escribe tu prompt
        </label>

        <textarea id="prompt-input" v-model="prompt"
          class="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm resize-none placeholder-white/20 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-150 disabled:opacity-50"
          placeholder="Ej: Explícame qué es el streaming SSE en 3 puntos concisos..." rows="5" :disabled="isGenerating"
          maxlength="4000" />

        <div class="flex items-center gap-3">
          <span class="text-xs text-white/30 mr-auto" :class="{ 'text-amber-400': prompt.length > 3500 }">
            {{ prompt.length }}/4000
          </span>

          <!-- Selector de modelo -->
          <select id="model-select" v-model="selectedModel"
            class="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:border-violet-500/50 disabled:opacity-50"
            :disabled="isGenerating">
            <optgroup label="Gemini 3 (Preview)">
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview — más potente</option>
              <option value="gemini-3-flash-preview">Gemini 3 Flash Preview — equilibrado</option>
              <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite — económico</option>
            </optgroup>
            <optgroup label="Gemini 2.5 (Estable)">
              <option value="gemini-2.5-pro">Gemini 2.5 Pro — potente estable</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash — equilibrado estable</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite — más barato</option>
            </optgroup>
          </select>

          <button id="btn-generate"
            class="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-violet-500/30 hover:-translate-y-px active:translate-y-0"
            :disabled="!prompt.trim() || isGenerating" @click="generate">
            <span v-if="isGenerating"
              class="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ isGenerating ? 'Generando...' : 'Generar' }}
          </button>
        </div>
      </section>

      <!-- Error -->
      <Transition name="fade">
        <div v-if="error"
          class="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl"
          role="alert">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd" />
          </svg>
          {{ error }}
        </div>
      </Transition>

      <!-- Panel de respuesta -->
      <Transition name="fade">
        <section v-if="result" class="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div class="flex items-center gap-2 text-xs text-white/50">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-[pulse-dot_2s_ease-in-out_infinite]" />
              Respuesta de {{ result.model }}
            </div>
            <div class="flex items-center gap-3">
              <span v-if="result.tokensUsed" class="text-xs text-white/30">
                {{ result.tokensUsed.toLocaleString() }} tokens
              </span>
              <button id="btn-copy"
                class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-150"
                @click="copyResult">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {{ copied ? '¡Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>

          <div class="px-5 py-4">
            <p class="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{{ result.text }}</p>
          </div>
        </section>
      </Transition>

      <!-- Estado vacío -->
      <div v-if="!result && !isGenerating && !error"
        class="flex-1 flex flex-col items-center justify-center gap-2 py-16">
        <div class="text-4xl opacity-30" aria-hidden="true">✨</div>
        <p class="text-sm text-white/20">Tu respuesta aparecerá aquí</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
// ── SEO y meta ───────────────────────────────────────────────────────────────
useHead({
  title: "Test de IA — Dashboard | SaaS Template",
  meta: [{ name: "robots", content: "noindex" }],
});

const { user, isLoggedIn, logout, getIdToken } = useAuth();
watchEffect(() => {
  if (!isLoggedIn.value) navigateTo("/login");
});

const prompt = ref("");
const selectedModel = ref("gemini-3.1-pro-preview");
const isGenerating = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);
const result = ref<{
  text: string;
  model: string;
  tokensUsed: number | null;
} | null>(null);

async function generate() {
  if (!prompt.value.trim() || isGenerating.value) return;
  isGenerating.value = true;
  error.value = null;
  result.value = null;
  try {
    const idToken = await getIdToken();
    if (!idToken) {
      error.value = "No se pudo obtener el token de autenticación. Vuelve a iniciar sesión.";
      return;
    }
    const data = await $fetch<{
      success: boolean;
      text: string;
      model: string;
      tokensUsed: number | null;
    }>("/api/protected/ai/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: {
        prompt: prompt.value.trim(),
        model: selectedModel.value,
      },
    });
    result.value = {
      text: data.text,
      model: data.model,
      tokensUsed: data.tokensUsed,
    };
  } catch (err: any) {
    error.value = err.data?.message ?? "Ocurrió un error al comunicarse con la IA. Intenta de nuevo.";
  } finally {
    isGenerating.value = false;
  }
}

async function copyResult() {
  if (!result.value) return;
  await navigator.clipboard.writeText(result.value.text);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<style scoped>
@keyframes pulse-dot {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
