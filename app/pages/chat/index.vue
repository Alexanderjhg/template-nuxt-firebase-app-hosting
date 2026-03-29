<template>
  <div class="h-full overflow-y-auto bg-[#0a0a0f] text-white">

    <!-- Header -->
    <div class="border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-base font-semibold text-white">Workspaces</h1>
        <p class="text-xs text-white/30 mt-0.5">Espacios de trabajo de tu equipo</p>
      </div>
      <button
        class="text-sm bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-xl font-medium"
        @click="showCreate = true"
      >
        + Nuevo workspace
      </button>
    </div>

    <div class="max-w-5xl mx-auto px-6 py-8 space-y-12">

      <!-- Workspaces -->
      <section>
        <div v-if="loading" class="flex items-center gap-2 text-white/30 text-sm py-8">
          <div class="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Cargando workspaces...
        </div>

        <div v-else-if="userWorkspaceIds.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            v-for="wsId in userWorkspaceIds"
            :key="wsId"
            class="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.05] hover:border-violet-500/20 transition-all text-left group"
            @click="enterWorkspace(wsId)"
          >
            <div class="w-12 h-12 rounded-xl bg-violet-700 flex items-center justify-center text-lg font-bold text-white flex-shrink-0 group-hover:bg-violet-600 transition-colors">
              {{ workspacesMap[wsId]?.name?.[0]?.toUpperCase() ?? 'W' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ workspacesMap[wsId]?.name ?? 'Workspace' }}</p>
              <p class="text-xs text-white/30 capitalize mt-0.5">Plan {{ workspacesMap[wsId]?.plan ?? 'free' }}</p>
            </div>
            <svg class="w-4 h-4 text-white/20 group-hover:text-violet-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <!-- Crear nuevo -->
          <button
            class="flex items-center gap-4 rounded-2xl border border-dashed border-white/10 p-5 hover:border-violet-500/30 hover:bg-white/[0.02] transition-all text-left"
            @click="showCreate = true"
          >
            <div class="w-12 h-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-white/30 text-xl flex-shrink-0">
              +
            </div>
            <div>
              <p class="text-sm text-white/50">Crear workspace</p>
              <p class="text-xs text-white/20 mt-0.5">Para tu equipo o proyecto</p>
            </div>
          </button>
        </div>

        <!-- Sin workspaces -->
        <div v-else class="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto text-2xl">🏢</div>
          <div>
            <h3 class="text-base font-semibold text-white">Crea tu primer workspace</h3>
            <p class="text-sm text-white/40 mt-1">Un espacio para tu equipo con chat en tiempo real, IA observadora y agentes externos.</p>
          </div>
          <button
            class="mx-auto px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors"
            @click="showCreate = true"
          >
            Crear workspace
          </button>
        </div>
      </section>

      <!-- Qué puedes hacer -->
      <section>
        <h2 class="text-sm font-semibold text-white/50 uppercase tracking-wider mb-5">Funciones del workspace</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-2">
            <div class="text-2xl">💬</div>
            <h3 class="text-sm font-semibold text-white">Canales y DMs</h3>
            <p class="text-xs text-white/40 leading-relaxed">Organiza la comunicación de tu equipo en canales temáticos. Envía mensajes directos a compañeros.</p>
          </div>
          <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-2">
            <div class="text-2xl">🧠</div>
            <h3 class="text-sm font-semibold text-white">IA observadora</h3>
            <p class="text-xs text-white/40 leading-relaxed">Gemini lee los mensajes de tus canales y te envía sugerencias privadas: tareas pendientes, reuniones, respuestas.</p>
          </div>
          <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-2">
            <div class="text-2xl">⚡</div>
            <h3 class="text-sm font-semibold text-white">Agentes externos</h3>
            <p class="text-xs text-white/40 leading-relaxed">Conecta n8n, Make o tu propio servidor. Los agentes envían notificaciones con action cards y reciben webhooks firmados.</p>
          </div>
        </div>
      </section>

      <!-- Documentación de agentes -->
      <section>
        <h2 class="text-sm font-semibold text-white/50 uppercase tracking-wider mb-5">Integrar agentes externos</h2>
        <div class="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">

          <!-- Cómo conectar -->
          <div class="p-6 border-b border-white/5">
            <h3 class="text-sm font-semibold text-white mb-3">¿Cómo funciona?</h3>
            <ol class="space-y-2 text-sm text-white/50">
              <li class="flex gap-3"><span class="text-violet-400 font-bold flex-shrink-0">1.</span> Ve a Ajustes del workspace → Agentes → Conectar agente</li>
              <li class="flex gap-3"><span class="text-violet-400 font-bold flex-shrink-0">2.</span> Ingresa la URL de tu webhook y los permisos del agente</li>
              <li class="flex gap-3"><span class="text-violet-400 font-bold flex-shrink-0">3.</span> Clowpen genera un <strong class="text-white">token secreto</strong> (cópialo, solo se muestra una vez)</li>
              <li class="flex gap-3"><span class="text-violet-400 font-bold flex-shrink-0">4.</span> Se crea un canal dedicado al agente en el sidebar</li>
              <li class="flex gap-3"><span class="text-violet-400 font-bold flex-shrink-0">5.</span> Desde tu servidor usa la API de Clowpen con ese token</li>
            </ol>
          </div>

          <!-- API endpoints -->
          <div class="p-6 border-b border-white/5">
            <h3 class="text-sm font-semibold text-white mb-4">API para tu agente</h3>
            <p class="text-xs text-white/40 mb-4">Todas las llamadas requieren el header: <code class="bg-white/5 px-2 py-0.5 rounded text-violet-300">Authorization: Bearer &lt;token&gt;</code></p>
            <div class="space-y-3">
              <div
                v-for="ep in endpoints"
                :key="ep.method + ep.path"
                class="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <span
                  class="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
                  :class="ep.method === 'GET' ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400'"
                >{{ ep.method }}</span>
                <div class="min-w-0">
                  <code class="text-xs text-violet-300 break-all">{{ ep.path }}</code>
                  <p class="text-xs text-white/40 mt-0.5">{{ ep.desc }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Action cards example -->
          <div class="p-6 border-b border-white/5">
            <h3 class="text-sm font-semibold text-white mb-3">Ejemplo: enviar notificación con action card</h3>
            <pre class="text-xs text-white/60 bg-black/30 border border-white/5 rounded-xl p-4 overflow-x-auto leading-relaxed"><code>POST /api/agents/notify
Authorization: Bearer &lt;tu_token&gt;

{
  "message": "Tienes una nueva venta 💰",
  "cardTitle": "Orden #1234",
  "actions": [
    {
      "label": "Ver orden",
      "actionType": "custom",
      "payload": { "url": "https://..." },
      "style": "primary"
    },
    {
      "label": "Descartar",
      "actionType": "dismiss",
      "style": "secondary"
    }
  ]
}</code></pre>
          </div>

          <!-- Webhook recibido -->
          <div class="p-6 border-b border-white/5">
            <h3 class="text-sm font-semibold text-white mb-3">Webhook que recibirá tu servidor</h3>
            <p class="text-xs text-white/40 mb-3">Cuando alguien escribe en el canal del agente, Clowpen llama a tu webhookUrl con firma HMAC-SHA256:</p>
            <pre class="text-xs text-white/60 bg-black/30 border border-white/5 rounded-xl p-4 overflow-x-auto leading-relaxed"><code>POST &lt;tu_webhookUrl&gt;
X-Clowpen-Signature: sha256=&lt;hmac_hex&gt;
X-Clowpen-Event: message.created

{
  "event": "message.created",
  "workspaceId": "...",
  "agentId": "...",
  "data": {
    "messageId": "...",
    "channelId": "...",
    "senderId": "...",
    "senderName": "Juan",
    "content": "Necesito el reporte del mes",
    "createdAt": "2026-03-24T18:42:00Z"
  }
}</code></pre>
          </div>

          <!-- Verificar firma -->
          <div class="p-6">
            <h3 class="text-sm font-semibold text-white mb-3">Verificar la firma (Node.js)</h3>
            <pre class="text-xs text-white/60 bg-black/30 border border-white/5 rounded-xl p-4 overflow-x-auto leading-relaxed"><code>const crypto = require('crypto');

function verifySignature(rawBody, signature, secret) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}</code></pre>
          </div>
        </div>
      </section>

      <!-- Permisos de agentes -->
      <section>
        <h2 class="text-sm font-semibold text-white/50 uppercase tracking-wider mb-5">Permisos disponibles para agentes</h2>
        <div class="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-white/5">
                <th class="text-left text-xs text-white/40 font-medium px-5 py-3">Permiso</th>
                <th class="text-left text-xs text-white/40 font-medium px-5 py-3">Qué puede hacer</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in permissions" :key="p.name" class="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td class="px-5 py-3">
                  <code class="text-xs bg-violet-900/30 text-violet-300 px-2 py-0.5 rounded">{{ p.name }}</code>
                </td>
                <td class="px-5 py-3 text-xs text-white/50">{{ p.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>

    <!-- Modal crear workspace -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Nuevo workspace</h3>
        <div>
          <label class="text-xs text-white/50 mb-1 block">Nombre del workspace</label>
          <input
            v-model="newWorkspaceName"
            type="text"
            placeholder="Mi empresa"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
            @keydown.enter="createWorkspace"
          />
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white transition-colors"
            @click="showCreate = false"
          >
            Cancelar
          </button>
          <button
            :disabled="creating || !newWorkspaceName.trim()"
            class="px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
            @click="createWorkspace"
          >
            {{ creating ? 'Creando...' : 'Crear' }}
          </button>
        </div>
        <p v-if="createError" class="text-xs text-red-400">{{ createError }}</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "app" });

const { userWorkspaceIds, workspacesMap, workspaceLoading, loadUserWorkspaces, createWorkspace: doCreate } = useWorkspace();
const router = useRouter();

const loading = computed(() => workspaceLoading.value);
const showCreate = ref(false);
const newWorkspaceName = ref("");
const creating = ref(false);
const createError = ref("");

const endpoints = [
  { method: "GET", path: "/api/agents/messages?channelId=X", desc: "Leer los mensajes de un canal asignado" },
  { method: "POST", path: "/api/agents/notify", desc: "Enviar notificación con action cards al canal del agente" },
  { method: "POST", path: "/api/agents/suggest", desc: "Enviar sugerencia privada a un usuario específico" },
];

const permissions = [
  { name: "read", desc: "Leer mensajes de los canales asignados al agente" },
  { name: "notify", desc: "Enviar notificaciones y action cards a su canal dedicado" },
  { name: "suggest", desc: "Enviar sugerencias privadas a usuarios asignados" },
  { name: "act", desc: "Ejecutar acciones en nombre del usuario (requiere PIN de confirmación)" },
];

onMounted(async () => {
  await loadUserWorkspaces();
});

async function enterWorkspace(wsId: string) {
  const ws = workspacesMap.value[wsId];
  const defaultChannelId = ws?.settings?.defaultChannelId;
  if (defaultChannelId) {
    await router.push(`/chat/${wsId}/${defaultChannelId}`);
  } else {
    await router.push(`/chat/${wsId}`);
  }
}

async function createWorkspace() {
  if (!newWorkspaceName.value.trim()) return;
  creating.value = true;
  createError.value = "";
  try {
    const { workspaceId, defaultChannelId } = await doCreate(newWorkspaceName.value);
    showCreate.value = false;
    await router.push(`/chat/${workspaceId}/${defaultChannelId}`);
  } catch (e: unknown) {
    createError.value = (e as Error).message ?? "Error al crear el workspace";
  } finally {
    creating.value = false;
  }
}
</script>
