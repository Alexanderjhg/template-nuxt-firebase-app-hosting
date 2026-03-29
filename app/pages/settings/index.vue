<template>
  <div class="flex-1 overflow-y-auto">
    <div class="max-w-2xl mx-auto px-6 py-8 space-y-8">

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-white">Configuración</h1>
          <button
            v-if="activeTab === 'agents'"
            class="px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            @click="showCreate = true"
          >
            + Conectar agente
          </button>
        </div>

        <div class="flex gap-4 border-b border-white/5 pb-2 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="text-sm font-medium pb-2 -mb-[9px] whitespace-nowrap transition-colors"
            :class="activeTab === tab.id
              ? 'border-b-2 border-violet-500 text-white'
              : 'text-white/40 hover:text-white'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Tab: Perfil -->
      <div v-if="activeTab === 'profile'" class="space-y-6">
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Mi perfil</h3>
            <p class="text-xs text-white/40 mt-1">Gestiona tu nombre, foto, estado y username.</p>
          </div>
          <NuxtLink
            to="/profile"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 text-sm text-white transition-colors"
          >
            Editar perfil
          </NuxtLink>
        </div>
      </div>

      <!-- Tab: Asistente IA -->
      <div v-if="activeTab === 'ai'" class="space-y-6">
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Asistente IA en mensajes personales</h3>
            <p class="text-xs text-white/40 mt-1">
              El asistente analiza tus conversaciones personales y sugiere acciones como buscar, agendar o contactar.
            </p>
          </div>

          <div class="space-y-2">
            <label
              v-for="option in aiModeOptions"
              :key="option.value"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="globalAiMode === option.value
                ? 'border-violet-500/40 bg-violet-500/5'
                : 'border-white/5 hover:border-white/10'"
            >
              <input
                type="radio"
                name="ai-mode"
                :value="option.value"
                :checked="globalAiMode === option.value"
                class="mt-0.5 accent-violet-500"
                @change="setAiMode(option.value)"
              />
              <div>
                <span class="text-sm font-medium text-white">{{ option.label }}</span>
                <p class="text-xs text-white/40 mt-0.5">{{ option.description }}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Tab: Google Calendar -->
      <div v-if="activeTab === 'calendar'" class="space-y-6">
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Google Calendar</h3>
            <p class="text-xs text-white/40 mt-1">
              Conecta tu Google Calendar para que los eventos se creen directamente en tu calendario personal.
              Esto aplica tanto para mensajes personales como para workspaces.
            </p>
          </div>

          <div v-if="calendarConnected" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500" />
              <span class="text-sm text-green-400">Conectado</span>
            </div>
            <button
              class="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40"
              :disabled="calendarLoading"
              @click="disconnectCalendar"
            >
              Desconectar
            </button>
          </div>

          <div v-else>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 text-sm text-white transition-colors"
              :disabled="calendarLoading"
              @click="connectCalendar"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8.25h15V19.5z"/>
              </svg>
              {{ calendarLoading ? 'Redirigiendo...' : 'Conectar Google Calendar' }}
            </button>
            <p class="text-xs text-white/20 mt-2">Sin conectar, los eventos se crean con un link para agregar manualmente.</p>
          </div>
        </div>
      </div>

      <!-- Tab: Agentes globales -->
      <div v-if="activeTab === 'agents'" class="space-y-6">
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Agentes conectados globalmente</h3>
            <p class="text-xs text-white/40 mt-1">
              Los agentes conectados aqui funcionan en tus mensajes personales.
              Para agentes de workspace, configuralos dentro de cada workspace.
            </p>
          </div>

          <!-- Lista de agentes -->
          <div v-if="globalAgentsLoading" class="text-xs text-white/30 italic py-4 text-center">
            Cargando agentes...
          </div>

          <div v-else-if="globalAgents.length === 0" class="text-xs text-white/30 italic py-4 text-center">
            No tienes agentes globales conectados aun.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="agent in globalAgents"
              :key="agent.id"
              class="p-3 rounded-lg border border-white/5 bg-white/[0.01] space-y-2"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-white font-medium">{{ agent.name }}</p>
                  <p v-if="agent.description" class="text-xs text-white/30">{{ agent.description }}</p>
                </div>
                <span
                  class="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  :class="agent.isActive ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'"
                >
                  {{ agent.isActive ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <!-- Permisos -->
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="perm in agent.scope?.permissions ?? []"
                  :key="perm"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/20 text-violet-300"
                >
                  {{ permissionLabels[perm] ?? perm }}
                </span>
              </div>

              <!-- Acciones -->
              <div class="flex gap-2 pt-1">
                <button
                  class="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                  @click="handleToggleActive(agent)"
                >
                  {{ agent.isActive ? 'Desactivar' : 'Activar' }}
                </button>
                <button
                  class="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                  @click="editingAgent = { ...agent, scope: { permissions: [...agent.scope.permissions] } }"
                >
                  Editar
                </button>
                <button
                  class="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                  @click="handleRotateToken(agent.id)"
                >
                  Rotar token
                </button>
                <button
                  class="text-xs px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors"
                  @click="handleDelete(agent.id)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Documentación de la API -->
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
          <h3 class="text-sm font-semibold text-white">API de agentes</h3>
          <p class="text-xs text-white/40">Tu agente puede usar estos endpoints:</p>
          <div class="space-y-2">
            <div v-for="ep in apiEndpoints" :key="ep.path" class="flex items-start gap-3">
              <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-300 flex-shrink-0">
                {{ ep.method }}
              </span>
              <div>
                <code class="text-xs text-white/60 font-mono">{{ ep.path }}</code>
                <p class="text-xs text-white/30 mt-0.5">{{ ep.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Privacidad -->
      <div v-if="activeTab === 'privacy'" class="space-y-6">
        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Solicitudes de mensaje</h3>
            <p class="text-xs text-white/40 mt-1">
              Cuando alguien que no es tu contacto te escribe, recibiras una solicitud que puedes aceptar o rechazar.
            </p>
          </div>

          <label class="flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer"
            :class="allowRequestsFromAnyone ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/5 hover:border-white/10'"
          >
            <div>
              <span class="text-sm text-white">Permitir solicitudes de cualquier persona</span>
              <p class="text-xs text-white/40 mt-0.5">Si desactivas esto, solo tus contactos podran escribirte.</p>
            </div>
            <button
              class="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
              :class="allowRequestsFromAnyone ? 'bg-violet-600' : 'bg-white/10'"
              @click="allowRequestsFromAnyone = !allowRequestsFromAnyone; savePrivacy()"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                :class="allowRequestsFromAnyone ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </label>
        </div>

        <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-white">Visibilidad de estado</h3>
            <p class="text-xs text-white/40 mt-1">Controla quien puede ver tu estado en linea.</p>
          </div>
          <div class="space-y-2">
            <label
              v-for="opt in presenceOptions"
              :key="opt.value"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="presenceVisibility === opt.value
                ? 'border-violet-500/40 bg-violet-500/5'
                : 'border-white/5 hover:border-white/10'"
            >
              <input type="radio" name="presence" :value="opt.value" :checked="presenceVisibility === opt.value" class="mt-0.5 accent-violet-500" @change="presenceVisibility = opt.value; savePrivacy()" />
              <div>
                <span class="text-sm font-medium text-white">{{ opt.label }}</span>
                <p class="text-xs text-white/40 mt-0.5">{{ opt.description }}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Modal crear agente global -->
  <Teleport to="body">
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Conectar agente global</h3>
          <button class="text-white/40 hover:text-white transition-colors" @click="showCreate = false">✕</button>
        </div>

        <div>
          <label class="text-xs text-white/50 mb-1 block">Nombre del agente *</label>
          <input v-model="createForm.name" type="text" placeholder="Mi Agente n8n"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <div>
          <label class="text-xs text-white/50 mb-1 block">Descripcion</label>
          <input v-model="createForm.description" type="text" placeholder="Para que sirve este agente"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <div>
          <label class="text-xs text-white/50 mb-1 block">Webhook URL *</label>
          <input v-model="createForm.webhookUrl" type="url" placeholder="https://mi-agente.com/webhook"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
          <p class="text-xs text-white/25 mt-1">Tu agente recibira eventos de Clowpen en esta URL con firma HMAC-SHA256.</p>
        </div>

        <div>
          <label class="text-xs text-white/50 mb-2 block">Permisos</label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="perm in permissionsOptions"
              :key="perm.value"
              class="flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors"
              :class="createForm.permissions.includes(perm.value)
                ? 'border-violet-500/40 bg-violet-900/15'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10'"
            >
              <input v-model="createForm.permissions" type="checkbox" :value="perm.value" class="mt-0.5 accent-violet-500" />
              <div>
                <p class="text-xs font-medium text-white">{{ perm.label }}</p>
                <p class="text-xs text-white/40 mt-0.5">{{ perm.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <p v-if="createError" class="text-xs text-red-400">{{ createError }}</p>

        <div class="flex gap-2 pt-1">
          <button
            class="flex-1 py-2 rounded-lg text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            @click="showCreate = false"
          >
            Cancelar
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="createLoading ? 'bg-violet-700 text-white/50 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'"
            :disabled="createLoading || !canSubmitCreate"
            @click="submitCreate"
          >
            {{ createLoading ? 'Conectando...' : 'Conectar agente' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal editar agente global -->
  <Teleport to="body">
    <div v-if="editingAgent" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Editar agente</h3>
          <button class="text-white/40 hover:text-white transition-colors" @click="editingAgent = null">✕</button>
        </div>

        <div>
          <label class="text-xs text-white/50 mb-1 block">Nombre</label>
          <input v-model="editForm.name" type="text"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <div>
          <label class="text-xs text-white/50 mb-1 block">Descripcion</label>
          <input v-model="editForm.description" type="text"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <div>
          <label class="text-xs text-white/50 mb-1 block">Webhook URL</label>
          <input v-model="editForm.webhookUrl" type="url"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <div>
          <label class="text-xs text-white/50 mb-2 block">Permisos</label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="perm in permissionsOptions"
              :key="perm.value"
              class="flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors"
              :class="editForm.permissions.includes(perm.value)
                ? 'border-violet-500/40 bg-violet-900/15'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10'"
            >
              <input v-model="editForm.permissions" type="checkbox" :value="perm.value" class="mt-0.5 accent-violet-500" />
              <div>
                <p class="text-xs font-medium text-white">{{ perm.label }}</p>
                <p class="text-xs text-white/40 mt-0.5">{{ perm.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <p v-if="editError" class="text-xs text-red-400">{{ editError }}</p>

        <div class="flex gap-2 pt-1">
          <button
            class="flex-1 py-2 rounded-lg text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            @click="editingAgent = null"
          >
            Cancelar
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            :disabled="editLoading"
            @click="submitEdit"
          >
            {{ editLoading ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal token nuevo -->
  <Teleport to="body">
    <div v-if="newToken" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Agente conectado: {{ newAgentName }}</h3>
        <div class="space-y-2">
          <p class="text-xs text-yellow-400">Este token solo se muestra una vez. Guardalo ahora.</p>
          <div class="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-white/10">
            <code class="text-xs text-white font-mono flex-1 break-all select-all">{{ newToken }}</code>
            <button
              class="text-xs text-violet-400 hover:text-violet-300 flex-shrink-0"
              @click="copyToken(newToken)"
            >
              {{ copied ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
          <p class="text-xs text-white/30">Header requerido: <code class="text-white/50">Authorization: Bearer &lt;token&gt;</code></p>
        </div>
        <button
          class="w-full py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          @click="newToken = ''; newAgentName = ''"
        >
          Ya guarde el token, cerrar
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Modal token rotado -->
  <Teleport to="body">
    <div v-if="rotatedToken" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Token rotado</h3>
        <p class="text-xs text-white/40">El token anterior ya no funciona. Actualiza tu agente con el nuevo.</p>
        <div class="space-y-2">
          <div class="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-white/10">
            <code class="text-xs text-white font-mono flex-1 break-all select-all">{{ rotatedToken }}</code>
            <button
              class="text-xs text-violet-400 hover:text-violet-300 flex-shrink-0"
              @click="copyToken(rotatedToken)"
            >
              {{ copied ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
        </div>
        <button
          class="w-full py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          @click="rotatedToken = ''"
        >
          Ya guarde el token, cerrar
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { GlobalAgent } from "~/composables/useGlobalAgents";

definePageMeta({ middleware: "auth", layout: "app" });

const { user, getIdToken } = useAuth();
const route = useRoute();
const {
  globalAgents,
  globalAgentsLoading,
  listenGlobalAgents,
  stopListening: stopAgents,
  createGlobalAgent,
  updateGlobalAgent,
  rotateGlobalToken,
  deleteGlobalAgent,
} = useGlobalAgents();

const activeTab = ref("ai");
const calendarConnected = ref(false);
const calendarLoading = ref(false);
const globalAiMode = ref<"auto" | "manual" | "off">("auto");
const allowRequestsFromAnyone = ref(true);
const presenceVisibility = ref<"everyone" | "contacts" | "nobody">("everyone");

// Agent CRUD state
const showCreate = ref(false);
const editingAgent = ref<GlobalAgent | null>(null);
const newToken = ref("");
const newAgentName = ref("");
const rotatedToken = ref("");
const copied = ref(false);
const createLoading = ref(false);
const createError = ref("");
const editLoading = ref(false);
const editError = ref("");

const createForm = reactive({
  name: "",
  description: "",
  webhookUrl: "",
  permissions: ["read", "notify"] as string[],
});

const editForm = reactive({
  name: "",
  description: "",
  webhookUrl: "",
  permissions: [] as string[],
});

const tabs = [
  { id: "profile", label: "Perfil" },
  { id: "ai", label: "Asistente IA" },
  { id: "calendar", label: "Calendario" },
  { id: "agents", label: "Agentes" },
  { id: "privacy", label: "Privacidad" },
];

const aiModeOptions = [
  { value: "auto" as const, label: "Automatico", description: "El asistente analiza automaticamente y muestra sugerencias cuando detecta una intencion." },
  { value: "manual" as const, label: "Manual", description: "El asistente no analiza automaticamente. Puedes analizar mensajes individuales desde el menu." },
  { value: "off" as const, label: "Desactivado", description: "El asistente esta completamente desactivado en tus mensajes personales." },
];

const presenceOptions = [
  { value: "everyone" as const, label: "Todos", description: "Cualquier usuario puede ver si estas en linea." },
  { value: "contacts" as const, label: "Solo contactos", description: "Solo tus contactos pueden ver tu estado." },
  { value: "nobody" as const, label: "Nadie", description: "Tu estado siempre aparece como desconectado para los demas." },
];

const permissionsOptions = [
  { value: "read", label: "Leer mensajes", desc: "Accede a mensajes de tus DMs" },
  { value: "notify", label: "Notificar", desc: "Envia mensajes a su DM dedicado" },
  { value: "suggest", label: "Sugerir", desc: "Envia sugerencias privadas" },
  { value: "act", label: "Ejecutar acciones", desc: "Requiere PIN para actuar" },
];

const permissionLabels: Record<string, string> = {
  read: "Leer",
  notify: "Notificar",
  suggest: "Sugerir",
  act: "Ejecutar",
};

const apiEndpoints = [
  { method: "GET", path: "/api/agents/messages?dmId=X", desc: "Leer mensajes del DM dedicado" },
  { method: "POST", path: "/api/agents/notify", desc: "Enviar notificacion al DM del agente" },
  { method: "POST", path: "/api/agents/suggest", desc: "Enviar sugerencia privada al usuario" },
];

const canSubmitCreate = computed(() =>
  createForm.name.trim() && createForm.webhookUrl.trim() && createForm.permissions.length > 0
);

// ── Watchers ──────────────────────────────────────────────────────────────

watch(editingAgent, (agent) => {
  if (agent) {
    editForm.name = agent.name;
    editForm.description = agent.description;
    editForm.webhookUrl = agent.webhookUrl;
    editForm.permissions = [...(agent.scope?.permissions ?? [])];
  }
});

// ── Lifecycle ─────────────────────────────────────────────────────────────

onMounted(async () => {
  listenGlobalAgents();

  try {
    const token = await getIdToken();
    const calStatus = await $fetch<{ connected: boolean }>("/api/protected/calendar/status", {
      headers: { Authorization: `Bearer ${token}` },
    });
    calendarConnected.value = calStatus.connected;
  } catch { /* ignorar */ }

  if (route.query.calendarConnected === "true") {
    calendarConnected.value = true;
  }
});

onUnmounted(() => {
  stopAgents();
});

// ── Agent CRUD handlers ───────────────────────────────────────────────────

async function submitCreate() {
  if (!canSubmitCreate.value) return;
  createLoading.value = true;
  createError.value = "";

  try {
    const result = await createGlobalAgent({
      name: createForm.name,
      description: createForm.description,
      webhookUrl: createForm.webhookUrl,
      scope: { permissions: createForm.permissions },
    });
    showCreate.value = false;
    newToken.value = result.plainToken;
    newAgentName.value = createForm.name;
    // Reset form
    createForm.name = "";
    createForm.description = "";
    createForm.webhookUrl = "";
    createForm.permissions = ["read", "notify"];
  } catch (e: unknown) {
    createError.value = (e as { message?: string }).message ?? "Error al crear el agente";
  } finally {
    createLoading.value = false;
  }
}

async function submitEdit() {
  if (!editingAgent.value) return;
  editLoading.value = true;
  editError.value = "";

  try {
    await updateGlobalAgent(editingAgent.value.id, {
      name: editForm.name,
      description: editForm.description,
      webhookUrl: editForm.webhookUrl,
      scope: { permissions: editForm.permissions },
    });
    editingAgent.value = null;
  } catch (e: unknown) {
    editError.value = (e as { message?: string }).message ?? "Error al actualizar";
  } finally {
    editLoading.value = false;
  }
}

async function handleToggleActive(agent: { id: string; name: string; isActive: boolean }) {
  const action = agent.isActive ? "desactivar" : "activar";
  if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} el agente "${agent.name}"?`)) return;
  try {
    await updateGlobalAgent(agent.id, { isActive: !agent.isActive });
  } catch (e: unknown) {
    console.error("[settings/agents] toggle failed:", e);
    alert(`Error al ${action} el agente`);
  }
}

async function handleRotateToken(agentId: string) {
  if (!confirm("Rotar el token? El token actual dejara de funcionar inmediatamente.")) return;
  try {
    const result = await rotateGlobalToken(agentId);
    rotatedToken.value = result.plainToken;
  } catch (e: unknown) {
    console.error("[settings/agents] rotate failed:", e);
    alert("Error al rotar el token");
  }
}

async function handleDelete(agentId: string) {
  if (!confirm("Eliminar este agente? Esta accion no se puede deshacer.")) return;
  try {
    await deleteGlobalAgent(agentId);
  } catch (e: unknown) {
    console.error("[settings/agents] delete failed:", e);
    alert("Error al eliminar el agente");
  }
}

function copyToken(token: string) {
  navigator.clipboard.writeText(token);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

// ── Calendar ──────────────────────────────────────────────────────────────

async function connectCalendar() {
  calendarLoading.value = true;
  try {
    const token = await getIdToken();
    const res = await $fetch<{ url: string }>("/api/protected/calendar/auth", {
      headers: { Authorization: `Bearer ${token}` },
      params: { returnTo: "/settings" },
    });
    window.location.href = res.url;
  } catch (e: unknown) {
    console.error("[Settings] Connect calendar error:", e);
    calendarLoading.value = false;
  }
}

async function disconnectCalendar() {
  calendarLoading.value = true;
  try {
    const token = await getIdToken();
    await $fetch("/api/protected/calendar/disconnect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    calendarConnected.value = false;
  } catch (e: unknown) {
    console.error("[Settings] Disconnect error:", e);
  } finally {
    calendarLoading.value = false;
  }
}

function setAiMode(mode: "auto" | "manual" | "off") {
  globalAiMode.value = mode;
  // TODO: Guardar en users/{uid}.settings.globalAiMode
}

function savePrivacy() {
  // TODO: Guardar en users/{uid}.settings.privacy
}
</script>
