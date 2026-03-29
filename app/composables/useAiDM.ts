// app/composables/useAiDM.ts
// Maneja el envío de mensajes al DM del Asistente IA.
// El usuario envía una pregunta → el servidor responde escribiendo en el DM.

export function useAiDM() {
  const { getIdToken } = useAuth();
  const { sendMessage } = useMessages();

  const isThinking = ref(false);
  const aiError = ref("");

  /**
   * Envía una pregunta al Asistente IA.
   * 1. Escribe el mensaje del usuario en el DM (via useMessages).
   * 2. Llama al endpoint /api/protected/ai/chat que escribe la respuesta.
   */
  async function askAssistant(workspaceId: string, dmId: string, question: string): Promise<void> {
    if (!question.trim() || isThinking.value) return;

    isThinking.value = true;
    aiError.value = "";

    try {
      // 1. Guardar el mensaje del usuario
      await sendMessage(workspaceId, dmId, question, true);

      // 2. Llamar al endpoint — él escribe la respuesta directamente en Firestore
      const token = await getIdToken();
      await $fetch("/api/protected/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { workspaceId, dmId, question },
      });
    } catch (err: unknown) {
      console.error("[useAiDM] Error:", err);
      const msg = (err as { data?: { message?: string }; message?: string })?.data?.message
        ?? (err as { message?: string })?.message
        ?? "Error al conectar con el Asistente IA";
      aiError.value = msg;
    } finally {
      isThinking.value = false;
    }
  }

  return {
    isThinking: readonly(isThinking),
    aiError: readonly(aiError),
    askAssistant,
  };
}
