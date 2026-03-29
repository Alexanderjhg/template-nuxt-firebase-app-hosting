<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Conectar agente</h3>
          <button class="text-white/40 hover:text-white transition-colors" @click="$emit('close')">✕</button>
        </div>

        <!-- Nombre -->
        <div>
          <label class="text-xs text-white/50 mb-1 block">Nombre del agente *</label>
          <input v-model="form.name" type="text" placeholder="Mi Agente n8n"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <!-- Descripción -->
        <div>
          <label class="text-xs text-white/50 mb-1 block">Descripción</label>
          <input v-model="form.description" type="text" placeholder="Para qué sirve este agente"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <!-- Webhook URL -->
        <div>
          <label class="text-xs text-white/50 mb-1 block">Webhook URL *</label>
          <input v-model="form.webhookUrl" type="url" placeholder="https://mi-agente.com/webhook"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
          <p class="text-xs text-white/25 mt-1">
            Tu agente recibirá eventos de Clowpen en esta URL con firma HMAC-SHA256.
          </p>
        </div>

        <!-- Permisos -->
        <div>
          <label class="text-xs text-white/50 mb-2 block">Permisos</label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="perm in permissions"
              :key="perm.value"
              class="flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors"
              :class="[
                form.permissions.includes(perm.value)
                  ? 'border-violet-500/40 bg-violet-900/15'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              ]"
            >
              <input
                v-model="form.permissions"
                type="checkbox"
                :value="perm.value"
                class="mt-0.5 accent-violet-500"
              />
              <div>
                <p class="text-xs font-medium text-white">{{ perm.label }}</p>
                <p class="text-xs text-white/40 mt-0.5">{{ perm.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- PIN del agente (opcional) -->
        <div>
          <label class="text-xs text-white/50 mb-2 block">Seguridad</label>
          <label class="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3 cursor-pointer hover:border-white/10 transition-colors mb-2">
            <input
              v-model="form.setAgentPin"
              type="checkbox"
              class="mt-0.5 accent-violet-500"
            />
            <div>
              <p class="text-xs font-medium text-white">Proteger este agente con PIN</p>
              <p class="text-xs text-white/40 mt-0.5">
                El agente solo podrá ejecutar acciones si se proporciona el PIN correcto.
              </p>
            </div>
          </label>

          <!-- Campos de PIN si está habilitado -->
          <div v-if="form.setAgentPin" class="space-y-2">
            <input
              v-model="form.agentPin"
              type="password"
              placeholder="Ingresa un PIN para este agente"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
            />
            <input
              v-model="form.agentPinConfirm"
              type="password"
              placeholder="Confirma el PIN"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
            />
            <p v-if="form.agentPin && form.agentPin !== form.agentPinConfirm" class="text-xs text-red-400">
              Los PINs no coinciden
            </p>
          </div>
        </div>

        <!-- Canales de lectura -->
        <div>
          <label class="text-xs text-white/50 mb-1 block">Canales de lectura</label>
          <div class="flex items-center gap-2 mb-2">
            <input v-model="allChannels" type="checkbox" class="accent-violet-500" id="all-channels" />
            <label for="all-channels" class="text-xs text-white/60">Acceso a todos los canales</label>
          </div>
          <p v-if="!allChannels" class="text-xs text-white/30">
            Puedes configurar canales específicos desde ajustes del agente después de crearlo.
          </p>
        </div>

        <!-- Canales de escritura -->
        <div>
          <label class="text-xs text-white/50 mb-2 block">Canales de escritura</label>
          <p class="text-xs text-white/30 mb-2">
            El canal dedicado del agente siempre tendrá acceso. Selecciona canales adicionales:
          </p>
          <div v-if="availableChannels.length > 0" class="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-white/5 p-2">
            <label
              v-for="ch in availableChannels"
              :key="ch.id"
              class="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <input
                v-model="form.writeChannels"
                type="checkbox"
                :value="ch.id"
                class="accent-violet-500"
              />
              <span class="text-xs text-white/70">
                {{ ch.isPrivate ? '🔒' : '#' }} {{ ch.name }}
              </span>
            </label>
          </div>
          <p v-else class="text-xs text-white/25 italic">No hay canales disponibles</p>
        </div>

        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

        <div class="flex gap-2 pt-1">
          <button
            class="flex-1 py-2 rounded-lg text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            @click="$emit('close')"
          >
            Cancelar
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="loading ? 'bg-violet-700 text-white/50 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'"
            :disabled="loading || !canSubmit"
            @click="submit"
          >
            {{ loading ? 'Conectando...' : 'Conectar agente' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { AgentConfig } from "~/types/chat";

const props = defineProps<{ workspaceId: string }>();
const emit = defineEmits<{
  close: [];
  created: [result: { agentId: string; config: AgentConfig }];
}>();

const { createAgent } = useAgents();
const { publicChannels, privateChannels } = useChannels();

const form = reactive({
  name: "",
  description: "",
  webhookUrl: "",
  permissions: ["read", "notify"] as string[],
  writeChannels: [] as string[],
  setAgentPin: false,
  agentPin: "",
  agentPinConfirm: "",
});
const allChannels = ref(true);
const loading = ref(false);
const error = ref("");

const permissions = [
  { value: "read", label: "Leer mensajes", desc: "Accede a mensajes de canales asignados" },
  { value: "notify", label: "Escribir mensajes", desc: "Puede escribir mensajes en canales permitidos" },
  { value: "suggest", label: "Sugerir acciones", desc: "Envía sugerencias privadas a usuarios" },
  { value: "act", label: "Ejecutar acciones", desc: "Requiere PIN si el agente está protegido" },
];

// Canales disponibles para escritura (excluir canales de agente)
const availableChannels = computed(() => [
  ...publicChannels.value,
  ...privateChannels.value,
]);

const canSubmit = computed(() => form.name.trim() && form.webhookUrl.trim() && form.permissions.length > 0);

async function submit() {
  if (!canSubmit.value) return;

  // Validar PIN si está habilitado
  if (form.setAgentPin) {
    if (!form.agentPin?.trim()) {
      error.value = "Ingresa un PIN para el agente";
      return;
    }
    if (form.agentPin !== form.agentPinConfirm) {
      error.value = "Los PINs no coinciden";
      return;
    }
  }

  loading.value = true;
  error.value = "";

  try {
    const result = await createAgent({
      workspaceId: props.workspaceId,
      name: form.name,
      description: form.description,
      webhookUrl: form.webhookUrl,
      scope: {
        readChannels: allChannels.value ? ["*"] : [],
        writeChannels: form.writeChannels,
        writeGroups: [],
        writeToUsers: ["*"],
        permissions: form.permissions as ("read" | "notify" | "suggest" | "act")[],
      },
      agentPin: form.setAgentPin ? form.agentPin : undefined,
    });
    emit("created", result);
  } catch (e: unknown) {
    error.value = (e as { message?: string }).message ?? "Error al crear el agente";
  } finally {
    loading.value = false;
  }
}
</script>
