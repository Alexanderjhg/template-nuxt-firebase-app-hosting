// app/composables/useGlobalAgents.ts
// CRUD de agentes globales del usuario (personales, fuera de workspace).

import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { AgentConfig } from "~/types/chat";

export interface GlobalAgent {
  id: string;
  name: string;
  description: string;
  webhookUrl: string;
  isActive: boolean;
  scope: {
    writeGroups?: string[];
    writeChannels?: string[];
    permissions: string[];
  };
  dedicatedDmId?: string;
  rateLimit?: { maxPerMinute: number; plan: string };
  pinHash?: string;
  createdAt: unknown;
  lastUsedAt?: unknown;
}

const globalAgents = useState<GlobalAgent[]>("globalAgents", () => []);
const globalAgentsLoading = useState<boolean>("globalAgentsLoading", () => false);

export function useGlobalAgents() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  function listenGlobalAgents(): Unsubscribe {
    if (!user.value?.uid) return () => {};

    globalAgentsLoading.value = true;
    unsubscribe?.();

    unsubscribe = onSnapshot(
      collection($firestore, "users", user.value.uid, "globalAgents"),
      (snap) => {
        globalAgents.value = snap.docs
          .filter((d) => !d.data().deletedAt) // ocultar soft-deleted
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              description: data.description ?? "",
              webhookUrl: data.webhookUrl,
              isActive: data.isActive,
              scope: data.scope ?? { permissions: [] },
              dedicatedDmId: data.dedicatedDmId,
              rateLimit: data.rateLimit ?? { maxPerMinute: 4, plan: "free" },
              pinHash: data.pinHash,
              createdAt: data.createdAt,
              lastUsedAt: data.lastUsedAt,
            } as GlobalAgent;
          });
        globalAgentsLoading.value = false;
      },
      (err) => {
        console.error("[useGlobalAgents] error:", err);
        globalAgentsLoading.value = false;
      }
    );

    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
    globalAgents.value = [];
  }

  async function createGlobalAgent(payload: {
    name: string;
    description?: string;
    webhookUrl: string;
    scope?: { writeGroups?: string[]; permissions: string[] };
    agentPin?: string;
  }): Promise<{ agentId: string; config: AgentConfig }> {
    const token = await getIdToken();
    return $fetch("/api/protected/global-agents/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    });
  }

  async function updateGlobalAgent(
    agentId: string,
    data: {
      name?: string;
      description?: string;
      webhookUrl?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    const token = await getIdToken();
    await $fetch(`/api/protected/global-agents/${agentId}/update`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
  }

  async function rotateGlobalToken(agentId: string): Promise<{ plainToken: string }> {
    const token = await getIdToken();
    return $fetch(`/api/protected/global-agents/${agentId}/rotate-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function deleteGlobalAgent(agentId: string): Promise<void> {
    const token = await getIdToken();
    await $fetch(`/api/protected/global-agents/${agentId}/delete`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    globalAgents: readonly(globalAgents),
    globalAgentsLoading: readonly(globalAgentsLoading),
    listenGlobalAgents,
    stopListening,
    createGlobalAgent,
    updateGlobalAgent,
    rotateGlobalToken,
    deleteGlobalAgent,
  };
}
