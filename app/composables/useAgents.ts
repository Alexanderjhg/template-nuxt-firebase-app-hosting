// app/composables/useAgents.ts
// CRUD de agentes del workspace. Solo disponible para owners/admins.

import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { Agent, AgentConfig } from "~/types/chat";

const agents = useState<Agent[]>("agents", () => []);
const agentsLoading = useState<boolean>("agentsLoading", () => false);

export function useAgents() {
  const { $firestore } = useNuxtApp();
  const { getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  // ── Escuchar agentes del workspace ───────────────────────────────────────

  function listenAgents(workspaceId: string): Unsubscribe {
    agentsLoading.value = true;
    unsubscribe?.();

    unsubscribe = onSnapshot(
      collection($firestore, "workspaces", workspaceId, "agents"),
      (snap) => {
        // Nunca exponer encryptedToken, iv, authTag, webhookSecret
        agents.value = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              description: data.description,
              createdBy: data.createdBy,
              createdAt: data.createdAt,
              webhookUrl: data.webhookUrl,
              scope: data.scope,
              isActive: data.isActive,
              lastUsedAt: data.lastUsedAt,
              dedicatedChannelId: data.dedicatedChannelId,
              rateLimit: data.rateLimit ?? { maxPerMinute: 4, plan: "free" },
              pinHash: data.pinHash,
            } as Agent;
          })
          ; // Mostrar todos los agentes (activos e inactivos)
        agentsLoading.value = false;
      },
      (err) => {
        console.error("[useAgents] error:", err);
        agentsLoading.value = false;
      }
    );

    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    agents.value = [];
  }

  // ── Crear agente ─────────────────────────────────────────────────────────

  async function createAgent(payload: {
    workspaceId: string;
    name: string;
    description?: string;
    webhookUrl: string;
    scope: Agent["scope"];
    agentPin?: string;
  }): Promise<{ agentId: string; config: AgentConfig }> {
    const token = await getIdToken();
    return $fetch("/api/protected/agents/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    });
  }

  // ── Actualizar agente ────────────────────────────────────────────────────

  async function updateAgent(
    workspaceId: string,
    agentId: string,
    data: {
      name?: string;
      description?: string;
      webhookUrl?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    const token = await getIdToken();
    await $fetch(`/api/protected/agents/${agentId}/update`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, ...data },
    });
  }

  // ── Rotar token ──────────────────────────────────────────────────────────

  async function rotateToken(workspaceId: string, agentId: string): Promise<{ plainToken: string }> {
    const token = await getIdToken();
    return $fetch(`/api/protected/agents/${agentId}/rotate-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId },
    });
  }

  // ── Eliminar agente ──────────────────────────────────────────────────────

  async function deleteAgent(workspaceId: string, agentId: string): Promise<void> {
    const token = await getIdToken();
    await $fetch(`/api/protected/agents/${agentId}/delete`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId },
    });
  }

  // ── Configurar PIN ───────────────────────────────────────────────────────

  async function setPin(workspaceId: string, pin: string): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/agents/set-pin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId, pin },
    });
  }

  // ── Confirmar acción de agente ───────────────────────────────────────────

  async function confirmAgentAction(payload: {
    workspaceId: string;
    agentId: string;
    pendingActionId: string;
    pin: string;
  }): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/agents/confirm-action", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    });
  }

  return {
    agents: readonly(agents),
    agentsLoading: readonly(agentsLoading),
    listenAgents,
    stopListening,
    createAgent,
    updateAgent,
    rotateToken,
    deleteAgent,
    setPin,
    confirmAgentAction,
  };
}
