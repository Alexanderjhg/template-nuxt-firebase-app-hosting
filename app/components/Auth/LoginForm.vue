<template>
  <!--
    components/Auth/LoginForm.vue
    Componente de login con Google. Diseño glassmorphism + animaciones.
    Usa el composable useAuth para manejar el estado de autenticación.
  -->
  <div class="login-card">
    <!-- Logo / Marca -->
    <div class="login-brand">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 class="brand-name">SaaS Template</h1>
      <p class="brand-tagline">Inicia sesión para continuar</p>
    </div>

    <!-- Error de autenticación -->
    <Transition name="slide-down">
      <div v-if="authError" class="auth-error" role="alert">
        <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        {{ authError }}
      </div>
    </Transition>

    <!-- Botón de Google -->
    <button
      id="btn-login-google"
      class="btn-google"
      :class="{ 'btn-loading': isLoading }"
      :disabled="isLoading"
      @click="handleGoogleLogin"
    >
      <!-- Spinner -->
      <span v-if="isLoading" class="spinner" aria-hidden="true" />

      <!-- Ícono de Google -->
      <svg v-else class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>

      <span>{{ isLoading ? 'Iniciando sesión...' : 'Continuar con Google' }}</span>
    </button>

    <!-- Separador -->
    <div class="divider">
      <span>o</span>
    </div>

    <!-- Info de privacidad -->
    <p class="privacy-text">
      Al iniciar sesión, aceptas nuestros
      <a href="/terms" class="privacy-link">Términos de Servicio</a>
      y
      <a href="/privacy" class="privacy-link">Política de Privacidad</a>.
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * LoginForm.vue
 * Emite el evento 'success' cuando el login es exitoso.
 * El padre decide si redirige o cierra un modal.
 */

const emit = defineEmits<{
  success: [uid: string];
}>();

const { loginWithGoogle, isLoading, authError, user } = useAuth();

async function handleGoogleLogin() {
  await loginWithGoogle();

  // Si el login fue exitoso, emitir evento
  if (user.value) {
    emit("success", user.value.uid);
    // Redirigir al dashboard por defecto
    await navigateTo("/dashboard");
  }
}
</script>

<style scoped>
/* ── Card ─────────────────────────────────────────────────────────────────── */
.login-card {
  @apply flex flex-col items-center gap-6 w-full max-w-sm mx-auto;
  @apply bg-white/5 backdrop-blur-xl border border-white/10;
  @apply rounded-2xl p-8 shadow-2xl;
}

/* ── Marca ────────────────────────────────────────────────────────────────── */
.login-brand {
  @apply flex flex-col items-center gap-2 text-center;
}

.brand-icon {
  @apply w-14 h-14 rounded-2xl flex items-center justify-center;
  @apply bg-gradient-to-br from-violet-500 to-indigo-600 text-white;
  @apply shadow-lg shadow-violet-500/30;
}

.brand-icon svg {
  @apply w-7 h-7;
}

.brand-name {
  @apply text-2xl font-bold text-white tracking-tight;
}

.brand-tagline {
  @apply text-sm text-white/50;
}

/* ── Error ────────────────────────────────────────────────────────────────── */
.auth-error {
  @apply flex items-center gap-2 w-full;
  @apply bg-red-500/10 border border-red-500/30 text-red-400;
  @apply rounded-xl px-4 py-3 text-sm;
}

.error-icon {
  @apply w-4 h-4 flex-shrink-0;
}

/* ── Botón Google ─────────────────────────────────────────────────────────── */
.btn-google {
  @apply flex items-center justify-center gap-3 w-full;
  @apply bg-white text-gray-700 font-medium text-sm;
  @apply rounded-xl px-5 py-3.5 border border-gray-200;
  @apply shadow-sm hover:shadow-md;
  @apply transition-all duration-200 ease-out;
  @apply hover:-translate-y-0.5 active:translate-y-0;
  @apply disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0;
}

.btn-google:not(:disabled):hover {
  @apply bg-gray-50;
}

.google-icon {
  @apply w-5 h-5 flex-shrink-0;
}

.btn-loading {
  @apply bg-gray-100;
}

/* ── Spinner ──────────────────────────────────────────────────────────────── */
.spinner {
  @apply inline-block w-5 h-5;
  @apply border-2 border-gray-300 border-t-violet-600;
  @apply rounded-full animate-spin;
}

/* ── Separador ────────────────────────────────────────────────────────────── */
.divider {
  @apply flex items-center gap-3 w-full;
}

.divider::before,
.divider::after {
  content: '';
  @apply flex-1 border-t border-white/10;
}

.divider span {
  @apply text-xs text-white/30 uppercase tracking-widest;
}

/* ── Privacidad ───────────────────────────────────────────────────────────── */
.privacy-text {
  @apply text-xs text-white/30 text-center leading-relaxed;
}

.privacy-link {
  @apply text-violet-400 hover:text-violet-300 transition-colors underline-offset-2 hover:underline;
}

/* ── Animaciones ──────────────────────────────────────────────────────────── */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
