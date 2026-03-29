<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-500/20 flex items-center justify-center">
            🔐
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">Confirmar acción del agente</h3>
            <p class="text-xs text-white/40 mt-0.5">{{ agentName }} quiere ejecutar una acción</p>
          </div>
        </div>

        <!-- Descripción de la acción -->
        <div class="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <p class="text-xs text-white/60">{{ actionDescription }}</p>
        </div>

        <!-- PIN input -->
        <div>
          <label class="text-xs text-white/50 mb-1.5 block">Ingresa tu PIN para confirmar</label>
          <input
            ref="pinInput"
            v-model="pin"
            type="password"
            inputmode="numeric"
            placeholder="••••"
            maxlength="12"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-center text-lg tracking-widest text-white placeholder-white/20 focus:border-violet-500/50 focus:outline-none"
            @keydown.enter="confirm"
          />
          <p v-if="error" class="text-xs text-red-400 mt-1.5">{{ error }}</p>
        </div>

        <!-- Botones -->
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            @click="$emit('cancel')"
          >
            Cancelar
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="loading ? 'bg-violet-700 text-white/50 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'"
            :disabled="loading || pin.length < 4"
            @click="confirm"
          >
            {{ loading ? 'Verificando...' : 'Confirmar' }}
          </button>
        </div>

        <p class="text-xs text-white/25 text-center">
          Si no tienes PIN configurado, ve a ajustes del workspace
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  agentName: string;
  actionDescription: string;
  workspaceId: string;
  agentId: string;
  pendingActionId: string;
}>();

const emit = defineEmits<{
  confirmed: [];
  cancel: [];
}>();

const { confirmAgentAction } = useAgents();

const pinInput = ref<HTMLInputElement | null>(null);
const pin = ref("");
const loading = ref(false);
const error = ref("");

onMounted(() => nextTick(() => pinInput.value?.focus()));

async function confirm() {
  if (pin.value.length < 4) return;
  loading.value = true;
  error.value = "";

  try {
    await confirmAgentAction({
      workspaceId: props.workspaceId,
      agentId: props.agentId,
      pendingActionId: props.pendingActionId,
      pin: pin.value,
    });
    emit("confirmed");
  } catch (e: unknown) {
    error.value = (e as { message?: string }).message ?? "Error al confirmar";
    pin.value = "";
    pinInput.value?.focus();
  } finally {
    loading.value = false;
  }
}
</script>
