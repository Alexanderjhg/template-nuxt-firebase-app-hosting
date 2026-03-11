<!--
  app/pages/login/index.vue
  Página de login. Renderizada sólo en el cliente (ssr: false en nuxt.config.ts).
  Si el usuario ya está logueado, redirige al dashboard.
-->
<template>
  <main class="login-page">
    <!-- Fondo con gradiente animado -->
    <div class="bg-gradient" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
    </div>

    <!-- Contenido central -->
    <div class="login-container">
      <AuthLoginForm />
    </div>
  </main>
</template>

<script setup lang="ts">
// ── SEO ───────────────────────────────────────────────────────────────────────
useHead({
  title: "Iniciar sesión — SaaS Template",
  meta: [
    { name: "description", content: "Inicia sesión en tu cuenta para acceder al dashboard." },
    { name: "robots", content: "noindex" }, // No indexar páginas de auth
  ],
});

// ── Redirección si ya está logueado ──────────────────────────────────────────
const { isLoggedIn } = useAuth();

// Redirección reactiva: si el estado cambia mientras el usuario está en /login
watchEffect(() => {
  if (isLoggedIn.value) {
    navigateTo("/dashboard");
  }
});
</script>

<style scoped>
.login-page {
  @apply relative min-h-screen flex items-center justify-center overflow-hidden;
  background: #0a0a0f;
}

/* ── Fondo con blobs ──────────────────────────────────────────────────────── */
.bg-gradient {
  @apply absolute inset-0 overflow-hidden;
}

.blob {
  @apply absolute rounded-full opacity-20 blur-3xl;
  animation: float 8s ease-in-out infinite;
}

.blob-1 {
  @apply w-96 h-96 -top-20 -left-20;
  background: radial-gradient(circle, #6d28d9, transparent);
  animation-delay: 0s;
}

.blob-2 {
  @apply w-80 h-80 top-1/2 -right-10;
  background: radial-gradient(circle, #4f46e5, transparent);
  animation-delay: -3s;
}

.blob-3 {
  @apply w-64 h-64 -bottom-10 left-1/3;
  background: radial-gradient(circle, #7c3aed, transparent);
  animation-delay: -6s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(20px, -20px) scale(1.05); }
  66%       { transform: translate(-10px, 15px) scale(0.95); }
}

/* ── Contenedor del formulario ───────────────────────────────────────────── */
.login-container {
  @apply relative z-10 w-full px-4;
}
</style>