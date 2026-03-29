<!--
  app/pages/login/index.vue
  Página de login. Renderizada sólo en el cliente (ssr: false en nuxt.config.ts).
  Si el usuario ya está logueado, redirige al dashboard.
-->
<template>
  <main class="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
    <!-- Fondo con gradiente animado -->
    <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="blob blob-1 absolute rounded-full opacity-20 blur-3xl w-96 h-96 -top-20 -left-20" />
      <div class="blob blob-2 absolute rounded-full opacity-20 blur-3xl w-80 h-80 top-1/2 -right-10" />
      <div class="blob blob-3 absolute rounded-full opacity-20 blur-3xl w-64 h-64 -bottom-10 left-1/3" />
    </div>

    <!-- Contenido central -->
    <div class="relative z-10 w-full px-4">
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
    navigateTo("/messages");
  }
});
</script>

<style scoped>
.blob {
  animation: float 8s ease-in-out infinite;
}

.blob-1 {
  background: radial-gradient(circle, #6d28d9, transparent);
  animation-delay: 0s;
}

.blob-2 {
  background: radial-gradient(circle, #4f46e5, transparent);
  animation-delay: -3s;
}

.blob-3 {
  background: radial-gradient(circle, #7c3aed, transparent);
  animation-delay: -6s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(20px, -20px) scale(1.05); }
  66%       { transform: translate(-10px, 15px) scale(0.95); }
}
</style>