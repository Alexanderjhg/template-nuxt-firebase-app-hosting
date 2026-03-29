<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Editar agente</h3>
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
          <textarea v-model="form.description" rows="3" placeholder="Describe qué hace este agente para que el observador IA pueda sugerirlo automáticamente"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none resize-none" />
          <p class="text-xs text-white/25 mt-1">
            Esta descripción ayuda al observador IA a saber cuándo sugerir este agente.
          </p>
        </div>

        <!-- Webhook URL -->
        <div>
          <label class="text-xs text-white/50 mb-1 block">Webhook URL *</label>
          <input v-model="form.webhookUrl" type="url" placeholder="https://mi-agente.com/webhook"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
        </div>

        <!-- Nota de seguridad -->
        <div class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
          <p class="text-xs font-medium text-amber-300">⚠️ Campos no editables por seguridad:</p>
          <ul class="text-xs text-amber-200/60 list-disc list-inside space-y-0.5">
            <li>PIN del agente</li>
            <li>Permisos (lectura, escritura, ejecución)</li>
            <li>Canales de acceso</li>
            <li>Token de autenticación</li>
          </ul>
          <p class="text-xs text-amber-200/60 mt-2">
            Para cambiarlos, elimina y recrea el agente.
          </p>
        </div>

        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
        <p v-if="success" class="text-xs text-green-400">Agente actualizado correctamente</p>

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
            {{ loading ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Agent } from "~/types/chat";

const props = defineProps<{
  workspaceId: string;
  agent: Agent;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
}>();

const { updateAgent } = useAgents();

const form = reactive({
  name: props.agent.name,
  description: props.agent.description ?? "",
  webhookUrl: props.agent.webhookUrl,
});

const loading = ref(false);
const error = ref("");
const success = ref(false);

const canSubmit = computed(() =>
  form.name.trim() && form.webhookUrl.trim()
);

async function submit() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = "";
  success.value = false;

  try {
    // Solo se pueden editar: name, description, webhookUrl, isActive
    // Permisos, canales, PIN y token no se pueden cambiar por seguridad
    await updateAgent(props.workspaceId, props.agent.id, {
      name: form.name,
      description: form.description,
      webhookUrl: form.webhookUrl,
    });
    success.value = true;
    setTimeout(() => emit("updated"), 800);
  } catch (e: unknown) {
    error.value = (e as { message?: string }).message ?? "Error al actualizar el agente";
  } finally {
    loading.value = false;
  }
}
</script>
