<template>
  <div>
    <!-- Mostrar JSON de configuración completo -->
    <div v-if="config" class="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 space-y-3">
      <div class="flex items-start gap-2">
        <span class="text-amber-400 text-lg flex-shrink-0">⚠️</span>
        <div>
          <p class="text-sm font-semibold text-amber-300">Guarda esta configuración ahora</p>
          <p class="text-xs text-amber-400/70 mt-0.5">No se volverá a mostrar. Si la pierdes, deberás rotar el token.</p>
        </div>
      </div>

      <!-- Información destacada -->
      <div class="space-y-2 text-xs">
        <div class="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <span class="text-white/60">API Base URL:</span>
          <code class="text-amber-200 font-mono">{{ config.apiBaseUrl }}</code>
        </div>
        <div class="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <span class="text-white/60">Rate Limit:</span>
          <code class="text-amber-200 font-mono">{{ config.rateLimitPerMinute }} msg/min</code>
        </div>
      </div>

      <!-- Chats permitidos -->
      <div class="text-xs">
        <p class="text-white/60 mb-1">Acceso de escritura a:</p>
        <div class="flex flex-wrap gap-1">
          <span v-for="(id, idx) in config.writeableChatIds" :key="idx" class="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-[11px] font-mono truncate max-w-xs">
            {{ id }}
          </span>
        </div>
      </div>

      <!-- JSON completo -->
      <div class="text-xs">
        <p class="text-white/60 mb-1 font-medium">JSON de configuración:</p>
        <div class="rounded-lg border border-amber-500/20 bg-black/40 p-2 overflow-x-auto">
          <pre class="text-amber-200 font-mono text-[10px] whitespace-pre-wrap break-words">{{ JSON.stringify(config, null, 2) }}</pre>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="flex gap-2 pt-2">
        <button
          class="flex-1 px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          :title="jsonCopied ? 'Copiado!' : 'Copiar JSON'"
          @click="copyJson"
        >
          <svg v-if="!jsonCopied" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <svg v-else class="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ jsonCopied ? 'Copiado!' : 'Copiar JSON' }}
        </button>
        <button
          class="flex-1 px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          @click="downloadJson"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar
        </button>
      </div>
    </div>

    <!-- Token rotado (backward compatibility) -->
    <div v-else-if="token" class="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 space-y-3">
      <div class="flex items-start gap-2">
        <span class="text-amber-400 text-lg flex-shrink-0">⚠️</span>
        <div>
          <p class="text-sm font-semibold text-amber-300">Guarda este token ahora</p>
          <p class="text-xs text-amber-400/70 mt-0.5">No se volverá a mostrar. Si lo pierdes, deberás rotar el token.</p>
        </div>
      </div>

      <div class="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2">
        <code class="flex-1 text-xs text-amber-200 font-mono break-all select-all">{{ token }}</code>
        <button
          class="flex-shrink-0 p-1.5 rounded text-amber-400/60 hover:text-amber-300 transition-colors"
          :title="tokenCopied ? 'Copiado!' : 'Copiar'"
          @click="copyToken"
        >
          <svg v-if="!tokenCopied" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <svg v-else class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <div class="text-xs text-white/40 space-y-1">
        <p class="font-medium text-white/60">Cómo usarlo en tu agente:</p>
        <code class="block rounded bg-white/5 px-2 py-1.5 text-white/50">Authorization: Bearer &lt;token&gt;</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgentConfig } from "~/types/chat";

const props = defineProps<{
  config?: AgentConfig;
  token?: string;
}>();

const jsonCopied = ref(false);
const tokenCopied = ref(false);

async function copyJson() {
  if (!props.config) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.config, null, 2));
    jsonCopied.value = true;
    setTimeout(() => (jsonCopied.value = false), 2000);
  } catch {
    /* sin acceso al portapapeles */
  }
}

async function downloadJson() {
  if (!props.config) return;
  const json = JSON.stringify(props.config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agent-${props.config.agentName}.config.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyToken() {
  if (!props.token) return;
  try {
    await navigator.clipboard.writeText(props.token);
    tokenCopied.value = true;
    setTimeout(() => (tokenCopied.value = false), 2000);
  } catch {
    /* sin acceso al portapapeles */
  }
}
</script>
