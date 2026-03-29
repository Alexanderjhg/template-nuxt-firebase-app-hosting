<template>
  <TransitionGroup
    v-if="suggestions.length > 0"
    name="suggestion"
    tag="div"
    class="px-4 pb-2 space-y-2"
  >
    <AISuggestionCard
      v-for="s in suggestions"
      :key="s.id"
      :suggestion="s"
      @action="handleAction(s, $event)"
      @dismiss="handleDismiss(s.id)"
    />
  </TransitionGroup>
</template>

<script setup lang="ts">
import type { AiSuggestion, ActionButton } from "~/types/chat";

const props = defineProps<{
  workspaceId: string;
  channelId: string;
}>();

const emit = defineEmits<{
  openDM: [recipientName: string];
  addTask: [description: string];
}>();

const { getSuggestionsForChannel, dismissSuggestion, acceptSuggestion } = useSuggestions();
const { addTask } = usePendingTasks();
const { openDM } = useDMs();
const { user } = useAuth();
const router = useRouter();

const suggestions = computed(() => getSuggestionsForChannel(props.channelId));

async function handleDismiss(suggestionId: string) {
  await dismissSuggestion(props.workspaceId, suggestionId);
}

async function handleAction(suggestion: AiSuggestion, button: ActionButton) {
  // Marcar como aceptada primero
  const result = await acceptSuggestion(props.workspaceId, suggestion.id);

  switch (button.actionType) {
    case "task_add": {
      const description = (button.payload.description as string) ?? suggestion.card.description;
      await addTask(props.workspaceId, {
        title: description,
        sourceChannelId: props.channelId,
      });
      break;
    }

    case "dm_send": {
      // El usuario quiere enviar un mensaje a alguien
      const recipientName = (button.payload.recipientName as string) ?? "";
      emit("openDM", recipientName);
      break;
    }

    case "calendar_create": {
      // Fase 2 avanzada: integración Google Calendar
      // Por ahora abre el DM con el asistente para que ayude
      console.log("[SuggestionTray] calendar_create — próximamente");
      break;
    }

    case "search": {
      // Abrir DM con asistente con query pre-cargada
      console.log("[SuggestionTray] search — próximamente");
      break;
    }

    case "agent_forward": {
      console.log("[SuggestionTray] agent_forward — próximamente");
      break;
    }

    default:
      break;
  }
}
</script>

<style scoped>
.suggestion-enter-active {
  transition: all 0.3s ease-out;
}
.suggestion-leave-active {
  transition: all 0.2s ease-in;
}
.suggestion-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.suggestion-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
