<template>
  <div class="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
    <!-- Redirección automática si ya están logueados -->
    
    <!-- Background dynamic elements -->
    <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
    <div class="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" style="animation-delay: 2s"></div>

    <div class="relative z-10 w-full max-w-5xl">
      <div class="text-center mb-16 space-y-4">
        <h1 class="text-6xl md:text-8xl font-black tracking-tighter text-gradient leading-tight">
          SaaS Template <br /> <span class="text-white">Nuxt 4 + Firebase</span>
        </h1>
        <p class="text-xl text-slate-400 max-w-2xl mx-auto font-light">
          La base ultra-rápida y modular para tu próxima gran idea. 
          Incluye Auth, Pagos con ePayco e IA con Gemini.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <UICard class="group">
          <div class="text-4xl mb-4 transform group-hover:scale-110 transition-transform">🔐</div>
          <h3 class="text-xl font-bold mb-2">Auth Seguro</h3>
          <p class="text-slate-400 text-sm">Firebase Auth listo con Google Login y gestión de tokens SSR-safe.</p>
        </UICard>

        <UICard class="group" style="transition-delay: 100ms">
          <div class="text-4xl mb-4 transform group-hover:scale-110 transition-transform">💳</div>
          <h3 class="text-xl font-bold mb-2">Pagos ePayco</h3>
          <p class="text-slate-400 text-sm">Integración modular vía Patrón Adapter para PSE, Tarjetas y Efectivo.</p>
        </UICard>

        <UICard class="group" style="transition-delay: 200ms">
          <div class="text-4xl mb-4 transform group-hover:scale-110 transition-transform">🤖</div>
          <h3 class="text-xl font-bold mb-2">IA con Gemini</h3>
          <p class="text-slate-400 text-sm">Endpoints protegidos para generar contenido inteligente bajo demanda.</p>
        </UICard>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-center gap-6">
        <NuxtLink v-if="!user" to="/login">
          <UIButton class="px-12 py-4 text-xl">
            Comenzar Ahora
          </UIButton>
        </NuxtLink>
        <NuxtLink v-else to="/dashboard">
          <UIButton class="px-12 py-4 text-xl">
            Ir al Dashboard
          </UIButton>
        </NuxtLink>
        
        <NuxtLink to="/checkout/test">
          <button class="px-10 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium">
            Ver Demo de Pago
          </button>
        </NuxtLink>
      </div>
    </div>

    <!-- Footer decoration -->
    <div class="absolute bottom-8 text-slate-500 text-sm tracking-widest uppercase">
      Desarrollado con ❤️ y Antigravity
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth();

useHead({
  title: 'Bienvenido | SaaS Template Premium',
  meta: [
    { name: 'description', content: 'El template definitivo para construir aplicaciones SaaS modernas.' }
  ]
});
</script>

<style scoped>
.text-gradient {
  background: linear-gradient(to right, #60a5fa, #818cf8, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>