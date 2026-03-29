<template>
  <div class="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0f] text-white">

    <!-- Background ambient -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-1/4 left-1/4 w-[600px] h-[600px] bg-violet-700/15 blur-[180px] rounded-full"></div>
      <div class="absolute top-1/2 -right-1/4 w-[500px] h-[500px] bg-indigo-700/10 blur-[180px] rounded-full"></div>
      <div class="absolute -bottom-1/4 left-1/3 w-[400px] h-[400px] bg-fuchsia-700/10 blur-[160px] rounded-full"></div>
    </div>

    <!-- Nav -->
    <nav class="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
      <span class="text-lg font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
        Clowpen
      </span>
      <div class="flex items-center gap-3">
        <NuxtLink v-if="!user" to="/login" class="text-sm text-white/50 hover:text-white transition-colors px-4 py-2">
          Iniciar sesión
        </NuxtLink>
        <NuxtLink v-if="!user" to="/login">
          <button class="text-sm bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-xl font-medium">
            Empezar gratis
          </button>
        </NuxtLink>
        <template v-else>
          <NuxtLink to="/messages" class="text-sm text-white/60 hover:text-white transition-colors px-3 py-2">
            Mensajes
          </NuxtLink>
          <NuxtLink to="/chat">
            <button class="text-sm bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-xl font-medium">
              Ir a la app →
            </button>
          </NuxtLink>
        </template>
      </div>
    </nav>

    <!-- Hero -->
    <section class="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8 tracking-wide">
        <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
        Chat · IA · Agentes · Personal · Empresarial
      </div>

      <h1 class="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 max-w-5xl">
        Conecta con
        <span class="block bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400">
          tu gente,
        </span>
        con tu trabajo,
        <span class="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
          con el futuro.
        </span>
      </h1>

      <p class="text-lg md:text-xl text-white/40 max-w-2xl mx-auto font-light leading-relaxed mb-12">
        Una sola app para hablar con amigos, coordinar tu equipo y dejar que la IA y tus agentes hagan el trabajo pesado.
      </p>

      <div class="flex flex-col sm:flex-row items-center gap-4">
        <NuxtLink :to="user ? '/messages' : '/login'">
          <button class="px-8 py-3.5 text-base font-semibold bg-violet-600 hover:bg-violet-500 rounded-2xl transition-all hover:shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] active:scale-95">
            {{ user ? 'Ir a mis mensajes' : 'Crear cuenta gratis' }}
          </button>
        </NuxtLink>
        <NuxtLink v-if="user" to="/chat">
          <button class="px-8 py-3.5 text-base font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl transition-all">
            Mis workspaces →
          </button>
        </NuxtLink>
        <a v-else href="#features" class="px-8 py-3.5 text-base font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl transition-all">
          Ver funciones
        </a>
      </div>

      <!-- Social proof -->
      <p class="mt-10 text-xs text-white/20 tracking-wide">Sin tarjeta de crédito · Plan gratis para siempre · Configuración en 2 min</p>
    </section>

    <!-- Preview mockup -->
    <section class="relative z-10 px-6 pb-16 flex justify-center">
      <div class="w-full max-w-4xl rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-[0_0_100px_-20px_rgba(139,92,246,0.2)]">
        <!-- mock top bar -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div class="w-3 h-3 rounded-full bg-red-500/40"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500/40"></div>
          <div class="w-3 h-3 rounded-full bg-green-500/40"></div>
          <span class="ml-4 text-xs text-white/20">clowpen.app</span>
        </div>
        <!-- mock content -->
        <div class="flex h-56 md:h-72">
          <!-- sidebar -->
          <div class="w-10 flex flex-col items-center py-4 gap-4 border-r border-white/5 bg-white/[0.01]">
            <div class="w-7 h-7 rounded-lg bg-violet-600/40"></div>
            <div class="w-7 h-7 rounded-lg bg-white/5"></div>
            <div class="w-7 h-7 rounded-lg bg-white/5"></div>
            <div class="w-7 h-7 rounded-lg bg-white/5"></div>
          </div>
          <!-- channel list -->
          <div class="w-40 border-r border-white/5 p-3 space-y-1 hidden md:block">
            <div class="text-[10px] text-white/20 uppercase tracking-wider mb-2 px-1">Canales</div>
            <div class="px-2 py-1.5 rounded-lg bg-violet-600/20 text-xs text-violet-300"># general</div>
            <div class="px-2 py-1.5 text-xs text-white/30"># diseño</div>
            <div class="px-2 py-1.5 text-xs text-white/30"># dev</div>
            <div class="text-[10px] text-white/20 uppercase tracking-wider mt-3 mb-2 px-1">IA</div>
            <div class="px-2 py-1.5 text-xs text-white/30">🤖 Asistente</div>
          </div>
          <!-- chat -->
          <div class="flex-1 flex flex-col p-4 gap-3">
            <div class="flex gap-2 items-start">
              <div class="w-6 h-6 rounded-full bg-violet-600 flex-shrink-0 mt-0.5"></div>
              <div class="bg-white/5 rounded-xl px-3 py-2 text-xs text-white/50 max-w-[70%]">¿Alguien vio el reporte de ayer?</div>
            </div>
            <div class="flex gap-2 items-start">
              <div class="w-6 h-6 rounded-full bg-indigo-600 flex-shrink-0 mt-0.5"></div>
              <div class="bg-white/5 rounded-xl px-3 py-2 text-xs text-white/50 max-w-[70%]">Sí, estaba revisándolo ahora mismo</div>
            </div>
            <div class="flex gap-2 items-start">
              <div class="w-6 h-6 rounded-full bg-fuchsia-700 flex-shrink-0 mt-0.5 flex items-center justify-center text-[8px] text-white">IA</div>
              <div class="bg-violet-900/30 border border-violet-500/20 rounded-xl px-3 py-2 text-xs text-violet-300 max-w-[75%]">
                💡 Sugerencia: hay 3 tareas pendientes del reporte. ¿Quieres que cree las tareas en el canal de dev?
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="relative z-10 px-6 py-24 max-w-6xl mx-auto w-full">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-5xl font-black tracking-tighter mb-4">Todo lo que necesitas</h2>
        <p class="text-white/40 max-w-xl mx-auto">Una plataforma. Dos mundos. Conexiones sin límite.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3 hover:border-violet-500/20 transition-all group">
          <div class="text-3xl">💬</div>
          <h3 class="text-base font-bold text-white">Chat personal</h3>
          <p class="text-sm text-white/40 leading-relaxed">DMs y grupos como WhatsApp. Habla con amigos, comparte fotos, crea grupos sin necesidad de un workspace.</p>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3 hover:border-violet-500/20 transition-all group">
          <div class="text-3xl">🏢</div>
          <h3 class="text-base font-bold text-white">Workspaces de equipo</h3>
          <p class="text-sm text-white/40 leading-relaxed">Canales, DMs internos y organización empresarial. Como Slack, pero sin el precio de Slack.</p>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3 hover:border-violet-500/20 transition-all group">
          <div class="text-3xl">🧠</div>
          <h3 class="text-base font-bold text-white">IA que te observa</h3>
          <p class="text-sm text-white/40 leading-relaxed">Gemini lee tus canales y te susurra sugerencias privadas: reuniones a agendar, tareas detectadas, respuestas redactadas.</p>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3 hover:border-violet-500/20 transition-all group">
          <div class="text-3xl">⚡</div>
          <h3 class="text-base font-bold text-white">Agentes externos</h3>
          <p class="text-sm text-white/40 leading-relaxed">Conecta n8n, Make o tu propio servidor. Cada agente tiene su canal dedicado, action cards y webhooks firmados.</p>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3 hover:border-violet-500/20 transition-all group">
          <div class="text-3xl">👤</div>
          <h3 class="text-base font-bold text-white">Perfiles y estados</h3>
          <p class="text-sm text-white/40 leading-relaxed">Username único, foto, bio y estado personalizable. La gente te encuentra por @username.</p>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-3 hover:border-violet-500/20 transition-all group">
          <div class="text-3xl">🔐</div>
          <h3 class="text-base font-bold text-white">Seguro por diseño</h3>
          <p class="text-sm text-white/40 leading-relaxed">Auth con Google, reglas de Firestore estrictas, tokens de agentes cifrados con AES-256 y webhooks firmados con HMAC.</p>
        </div>

      </div>
    </section>

    <!-- Pricing preview -->
    <section class="relative z-10 px-6 py-24 max-w-4xl mx-auto w-full">
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-black tracking-tighter mb-4">Precios simples</h2>
        <p class="text-white/40">Empieza gratis. Crece cuando lo necesites.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Free -->
        <div class="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
          <div>
            <p class="text-sm text-white/50 font-medium">Free</p>
            <p class="text-3xl font-black mt-1">$0<span class="text-base font-normal text-white/40">/mes</span></p>
          </div>
          <ul class="space-y-2 text-sm text-white/50">
            <li>✓ DMs y grupos personales</li>
            <li>✓ 1 workspace (5 miembros)</li>
            <li>✓ Historial 30 días</li>
            <li class="text-white/20">✗ Sin IA</li>
          </ul>
          <NuxtLink :to="user ? '/messages' : '/login'">
            <button class="w-full py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors mt-2">
              Empezar gratis
            </button>
          </NuxtLink>
        </div>

        <!-- Pro -->
        <div class="rounded-2xl border border-violet-500/30 bg-violet-600/5 p-6 space-y-4 relative overflow-hidden">
          <div class="absolute top-0 right-0 text-[10px] bg-violet-600 text-white px-3 py-1 rounded-bl-xl font-medium">Popular</div>
          <div>
            <p class="text-sm text-violet-300 font-medium">Pro</p>
            <p class="text-3xl font-black mt-1">$6<span class="text-base font-normal text-white/40">/usuario/mes</span></p>
          </div>
          <ul class="space-y-2 text-sm text-white/50">
            <li>✓ Todo lo de Free</li>
            <li>✓ IA observadora completa</li>
            <li>✓ Historial ilimitado</li>
            <li>✓ 3 workspaces (20 miembros)</li>
          </ul>
          <NuxtLink :to="user ? '/chat' : '/login'">
            <button class="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors mt-2">
              Probar 14 días gratis
            </button>
          </NuxtLink>
        </div>

        <!-- Business -->
        <div class="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
          <div>
            <p class="text-sm text-white/50 font-medium">Business</p>
            <p class="text-3xl font-black mt-1">$15<span class="text-base font-normal text-white/40">/workspace/mes</span></p>
          </div>
          <ul class="space-y-2 text-sm text-white/50">
            <li>✓ Todo lo de Pro</li>
            <li>✓ Agentes externos ilimitados</li>
            <li>✓ 100 miembros por workspace</li>
            <li>✓ Soporte prioritario</li>
          </ul>
          <button class="w-full py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors mt-2">
            Contactar ventas
          </button>
        </div>
      </div>
    </section>

    <!-- CTA final -->
    <section class="relative z-10 px-6 py-24 text-center">
      <h2 class="text-4xl md:text-6xl font-black tracking-tighter mb-6">
        Empieza hoy,<br>
        <span class="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">es gratis.</span>
      </h2>
      <p class="text-white/40 max-w-lg mx-auto mb-10 text-lg">
        No necesitas tarjeta de crédito. Solo entra con Google y en 2 minutos estás chateando.
      </p>
      <NuxtLink :to="user ? '/messages' : '/login'">
        <button class="px-12 py-4 text-lg font-bold bg-violet-600 hover:bg-violet-500 rounded-2xl transition-all hover:shadow-[0_0_60px_-10px_rgba(139,92,246,0.6)] active:scale-95">
          {{ user ? 'Ir a Clowpen →' : 'Crear cuenta con Google' }}
        </button>
      </NuxtLink>
    </section>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-white/5 px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <span class="font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">Clowpen</span>
      <p class="text-xs text-white/20">Conecta con tu gente, con tu trabajo, con el futuro.</p>
      <div class="flex gap-4 text-xs text-white/30">
        <NuxtLink to="/chat" class="hover:text-white/60 transition-colors">App</NuxtLink>
        <NuxtLink to="/login" class="hover:text-white/60 transition-colors">Login</NuxtLink>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
const { user } = useAuth();

useHead({
  title: "Clowpen — Conecta con tu gente, tu trabajo y el futuro",
  meta: [
    { name: "description", content: "Chat personal y empresarial con IA observadora y agentes externos. Gratis para siempre." },
  ],
});
</script>
