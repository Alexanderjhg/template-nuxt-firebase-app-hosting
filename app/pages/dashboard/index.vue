<!--
  app/pages/dashboard/ai-test.vue
  Página de prueba de la integración con Gemini AI.
  - Requiere que el usuario esté logueado (middleware + redirección).
  - Envía el idToken de Firebase en el header Authorization.
  - Muestra el resultado en un panel estilizado con efecto typewriter.
-->
<template>
  <main class="ai-page">
    <!-- Header del dashboard -->
    <header class="ai-header">
      <div class="ai-header-inner">
        <div class="ai-brand">
          <div class="ai-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 class="ai-title">Test de IA — Gemini</h1>
            <p class="ai-subtitle">Conectado como <span class="user-email">{{ user?.email }}</span></p>
          </div>
        </div>

        <button id="btn-logout" class="btn-logout" @click="logout">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </header>

    <!-- Cuerpo -->
    <div class="ai-body">
      <!-- Panel de entrada -->
      <section class="prompt-panel">
        <label for="prompt-input" class="prompt-label">
          Escribe tu prompt
        </label>

        <textarea
          id="prompt-input"
          v-model="prompt"
          class="prompt-textarea"
          placeholder="Ej: Explícame qué es el streaming SSE en 3 puntos concisos..."
          rows="5"
          :disabled="isGenerating"
          maxlength="4000"
        />

        <div class="prompt-footer">
          <span class="char-count" :class="{ 'near-limit': prompt.length > 3500 }">
            {{ prompt.length }}/4000
          </span>

          <!-- Selector de modelo -->
          <select id="model-select" v-model="selectedModel" class="model-select" :disabled="isGenerating">
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>

          <button
            id="btn-generate"
            class="btn-generate"
            :disabled="!prompt.trim() || isGenerating"
            @click="generate"
          >
            <span v-if="isGenerating" class="spinner" />
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ isGenerating ? 'Generando...' : 'Generar' }}
          </button>
        </div>
      </section>

      <!-- Error -->
      <Transition name="fade">
        <div v-if="error" class="error-banner" role="alert">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          {{ error }}
        </div>
      </Transition>

      <!-- Panel de respuesta -->
      <Transition name="fade">
        <section v-if="result" class="result-panel">
          <div class="result-header">
            <div class="result-badge">
              <span class="badge-dot" />
              Respuesta de {{ result.model }}
            </div>
            <div class="result-meta">
              <span v-if="result.tokensUsed" class="tokens-used">
                {{ result.tokensUsed.toLocaleString() }} tokens
              </span>
              <button id="btn-copy" class="btn-copy" @click="copyResult">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                {{ copied ? '¡Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>

          <div class="result-content">
            <p class="result-text">{{ result.text }}</p>
          </div>
        </section>
      </Transition>

      <!-- Estado vacío -->
      <div v-if="!result && !isGenerating && !error" class="empty-state">
        <div class="empty-icon" aria-hidden="true">✨</div>
        <p class="empty-label">Tu respuesta aparecerá aquí</p>
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

// ── Auth guard ────────────────────────────────────────────────────────────────
const { user, isLoggedIn, logout, getIdToken } = useAuth();

// Redirigir si no hay sesión
watchEffect(() => {
  if (!isLoggedIn.value) navigateTo("/login");
});

// ── Estado local ──────────────────────────────────────────────────────────────
const prompt = ref("");
const selectedModel = ref("gemini-2.0-flash");
const isGenerating = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);
const result = ref<{
  text: string;
  model: string;
  tokensUsed: number | null;
} | null>(null);

// ── Generar con Gemini ────────────────────────────────────────────────────────
async function generate() {
  if (!prompt.value.trim() || isGenerating.value) return;

  isGenerating.value = true;
  error.value = null;
  result.value = null;

  try {
    // Obtener token actualizado antes de la llamada
    const idToken = await getIdToken();

    if (!idToken) {
      error.value = "No se pudo obtener el token de autenticación. Vuelve a iniciar sesión.";
      return;
    }

    // Llamada al backend — $fetch de Nuxt maneja automáticamente errores HTTP
    const data = await $fetch<{
      success: boolean;
      text: string;
      model: string;
      tokensUsed: number | null;
    }>("/api/protected/ai/generate", {
      method: "POST",
      // ── Token de Firebase en el header ─────────────────────────────────
      // El middleware server/middleware/auth.ts lo extrae y verifica
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
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
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string }; statusCode?: number };
    error.value =
      fetchError.data?.message ??
      "Ocurrió un error al comunicarse con la IA. Intenta de nuevo.";
  } finally {
    isGenerating.value = false;
  }
}

// ── Copiar resultado ──────────────────────────────────────────────────────────
async function copyResult() {
  if (!result.value) return;
  await navigator.clipboard.writeText(result.value.text);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<style scoped>
/* ── Layout ───────────────────────────────────────────────────────────────── */
.ai-page {
  @apply min-h-screen flex flex-col;
  background: #0a0a0f;
  font-family: 'Inter', sans-serif;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.ai-header {
  @apply border-b border-white/5 backdrop-blur-sm sticky top-0 z-10;
  background: rgba(10, 10, 15, 0.85);
}

.ai-header-inner {
  @apply max-w-4xl mx-auto px-6 py-4 flex items-center justify-between;
}

.ai-brand {
  @apply flex items-center gap-3;
}

.ai-icon {
  @apply w-10 h-10 rounded-xl flex items-center justify-center;
  @apply bg-gradient-to-br from-violet-500 to-indigo-600 text-white;
}

.ai-icon svg {
  @apply w-5 h-5;
}

.ai-title {
  @apply text-base font-semibold text-white leading-tight;
}

.ai-subtitle {
  @apply text-xs text-white/40;
}

.user-email {
  @apply text-violet-400;
}

.btn-logout {
  @apply flex items-center gap-2 px-3 py-1.5;
  @apply text-xs text-white/50 hover:text-white/80;
  @apply border border-white/10 hover:border-white/20;
  @apply rounded-lg transition-all duration-150;
}

/* ── Body ─────────────────────────────────────────────────────────────────── */
.ai-body {
  @apply flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col gap-5;
}

/* ── Prompt Panel ─────────────────────────────────────────────────────────── */
.prompt-panel {
  @apply flex flex-col gap-3;
  @apply bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5;
}

.prompt-label {
  @apply text-sm font-medium text-white/70;
}

.prompt-textarea {
  @apply w-full bg-white/5 border border-white/10 text-white;
  @apply rounded-xl px-4 py-3 text-sm resize-none;
  @apply placeholder-white/20 outline-none;
  @apply focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20;
  @apply transition-all duration-150 disabled:opacity-50;
}

.prompt-footer {
  @apply flex items-center gap-3;
}

.char-count {
  @apply text-xs text-white/30 mr-auto;
}

.char-count.near-limit {
  @apply text-amber-400;
}

.model-select {
  @apply bg-white/5 border border-white/10 text-white/70 text-xs;
  @apply rounded-lg px-3 py-1.5 outline-none cursor-pointer;
  @apply focus:border-violet-500/50 disabled:opacity-50;
}

.btn-generate {
  @apply flex items-center gap-2 px-5 py-2;
  @apply bg-gradient-to-r from-violet-600 to-indigo-600;
  @apply text-white text-sm font-medium rounded-xl;
  @apply hover:from-violet-500 hover:to-indigo-500;
  @apply transition-all duration-200 shadow-lg shadow-violet-500/20;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply hover:shadow-violet-500/30 hover:-translate-y-px active:translate-y-0;
}

/* ── Error ────────────────────────────────────────────────────────────────── */
.error-banner {
  @apply flex items-center gap-2 px-4 py-3;
  @apply bg-red-500/10 border border-red-500/20 text-red-400 text-sm;
  @apply rounded-xl;
}

/* ── Result Panel ─────────────────────────────────────────────────────────── */
.result-panel {
  @apply bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden;
}

.result-header {
  @apply flex items-center justify-between px-5 py-3;
  @apply border-b border-white/5;
}

.result-badge {
  @apply flex items-center gap-2 text-xs text-white/50;
}

.badge-dot {
  @apply w-2 h-2 rounded-full bg-emerald-400;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.result-meta {
  @apply flex items-center gap-3;
}

.tokens-used {
  @apply text-xs text-white/30;
}

.btn-copy {
  @apply flex items-center gap-1.5 px-2.5 py-1;
  @apply text-xs text-white/40 hover:text-white/70;
  @apply border border-white/10 hover:border-white/20;
  @apply rounded-lg transition-all duration-150;
}

.result-content {
  @apply px-5 py-4;
}

.result-text {
  @apply text-sm text-white/80 leading-relaxed whitespace-pre-wrap;
}

/* ── Empty State ──────────────────────────────────────────────────────────── */
.empty-state {
  @apply flex-1 flex flex-col items-center justify-center gap-2 py-16;
}

.empty-icon {
  @apply text-4xl opacity-30;
}

.empty-label {
  @apply text-sm text-white/20;
}

/* ── Spinner ──────────────────────────────────────────────────────────────── */
.spinner {
  @apply inline-block w-4 h-4;
  @apply border-2 border-white/20 border-t-white;
  @apply rounded-full animate-spin;
}

/* ── Transitions ──────────────────────────────────────────────────────────── */
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
