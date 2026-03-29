<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <MessagesSidebar active="assistant" />

    <div class="flex flex-1 flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div class="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">Asistente IA</h2>
          <p class="text-xs text-white/40">Pregunta cualquier cosa sobre tus conversaciones</p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/messages/tasks"
            class="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-xs text-emerald-400 transition-colors"
          >
            Pendientes
          </NuxtLink>
          <NuxtLink
            to="/messages/automations"
            class="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-xs text-amber-400 transition-colors"
          >
            Automatizaciones
          </NuxtLink>
          <div v-if="isThinking" class="flex items-center gap-1.5 text-xs text-blue-400/70 ml-1">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
            Pensando...
          </div>
        </div>
      </div>

      <!-- Mensajes -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto py-4 px-4 space-y-3">
        <!-- Mensaje de bienvenida -->
        <div v-if="chatHistory.length === 0" class="flex-1 flex items-center justify-center py-16">
          <div class="text-center text-white/20 space-y-4 max-w-sm">
            <div class="text-4xl">🧠</div>
            <p class="text-sm text-white/40">Soy tu asistente personal. Puedo ayudarte a:</p>
            <div class="text-left space-y-2 text-xs text-white/30">
              <p>🔍 Buscar en tu historial de mensajes</p>
              <p>📋 Resumir conversaciones</p>
              <p>📅 Revisar eventos y tareas pendientes</p>
              <p>💡 Sugerir acciones basadas en tus chats</p>
            </div>
            <div class="flex flex-wrap gap-2 justify-center pt-2">
              <button
                v-for="q in quickQuestions"
                :key="q"
                class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white transition-colors"
                @click="inputText = q; send()"
              >
                {{ q }}
              </button>
            </div>
          </div>
        </div>

        <!-- Historial -->
        <div
          v-for="(msg, i) in chatHistory"
          :key="i"
          class="flex gap-3"
          :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            :class="msg.role === 'user' ? 'bg-violet-700 text-white' : 'bg-blue-600/30 text-blue-300'"
          >
            {{ msg.role === 'user' ? 'Tu' : 'IA' }}
          </div>
          <div
            class="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
            :class="msg.role === 'user' ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-[#1e1e2d] text-white/80 border border-white/5 rounded-bl-sm'"
          >
            <p class="whitespace-pre-wrap">{{ msg.content }}</p>
          </div>
        </div>

        <!-- Indicador de pensando -->
        <div v-if="isThinking" class="flex gap-3">
          <div class="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-xs text-blue-300 flex-shrink-0">IA</div>
          <div class="bg-[#1e1e2d] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style="animation-delay: 150ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style="animation-delay: 300ms"></span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="aiError" class="flex gap-3">
          <div class="w-7 h-7 rounded-full bg-red-600/30 flex items-center justify-center text-xs text-red-300 flex-shrink-0">!</div>
          <div class="bg-red-900/10 border border-red-500/20 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-red-400">
            {{ aiError }}
          </div>
        </div>

        <div ref="bottomAnchor" />
      </div>

      <!-- Input -->
      <div class="px-4 py-3 border-t border-white/5">
        <form class="flex items-center gap-3" @submit.prevent="send">
          <input
            v-model="inputText"
            type="text"
            placeholder="Pregunta algo a tu asistente..."
            class="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none"
            :disabled="isThinking"
          />
          <button
            type="submit"
            :disabled="!inputText.trim() || isThinking"
            class="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const { getIdToken } = useAuth();

const inputText = ref("");
const isThinking = ref(false);
const aiError = ref("");
const scrollContainer = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);

const chatHistory = ref<Array<{ role: "user" | "assistant"; content: string }>>([]);

const quickQuestions = [
  "¿Que tengo pendiente hoy?",
  "Resume mis ultimos mensajes",
  "¿Que tareas tengo?",
];

function scrollToBottom() {
  nextTick(() => bottomAnchor.value?.scrollIntoView({ behavior: "smooth" }));
}

async function send() {
  const text = inputText.value.trim();
  if (!text || isThinking.value) return;
  inputText.value = "";

  chatHistory.value.push({ role: "user", content: text });
  scrollToBottom();

  isThinking.value = true;
  aiError.value = "";

  try {
    const token = await getIdToken();
    const result = await $fetch<{ response: string }>("/api/protected/ai/personal-chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { question: text },
    });

    chatHistory.value.push({ role: "assistant", content: result.response ?? "Sin respuesta" });
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.message ?? "Error al conectar con el asistente";
    aiError.value = msg;
  } finally {
    isThinking.value = false;
    scrollToBottom();
  }
}
</script>
