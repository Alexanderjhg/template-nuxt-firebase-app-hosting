// app/composables/useWorkspace.ts
// Gestión de workspaces: crear, cargar, cambiar de workspace activo.
// El workspace activo se persiste en el estado global de Nuxt.

import {
  doc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { Workspace } from "~/types/chat";

// Estado global compartido entre componentes
const activeWorkspace = useState<Workspace | null>("activeWorkspace", () => null);
const userWorkspaceIds = useState<string[]>("userWorkspaceIds", () => []);
const workspacesMap = useState<Record<string, Workspace>>("workspacesMap", () => ({}));
const workspaceLoading = useState<boolean>("workspaceLoading", () => false);

export function useWorkspace() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  // ── Cargar lista de workspaces del usuario ───────────────────────────────

  async function loadUserWorkspaces(): Promise<void> {
    if (!user.value?.uid) return;

    workspaceLoading.value = true;
    try {
      const userWsDoc = await getDoc(
        doc($firestore, "userWorkspaces", user.value.uid)
      );
      if (userWsDoc.exists()) {
        const ids: string[] = userWsDoc.data().workspaceIds ?? [];
        userWorkspaceIds.value = ids;

        // Cargar datos de cada workspace
        await Promise.all(
          ids.map(async (wsId) => {
            const wsDoc = await getDoc(doc($firestore, "workspaces", wsId));
            if (wsDoc.exists()) {
              workspacesMap.value[wsId] = { id: wsDoc.id, ...wsDoc.data() } as Workspace;
            }
          })
        );
      }
    } finally {
      workspaceLoading.value = false;
    }
  }

  // ── Escuchar cambios del workspace activo en tiempo real ─────────────────

  function listenWorkspace(workspaceId: string): Unsubscribe {
    return onSnapshot(
      doc($firestore, "workspaces", workspaceId),
      (snap) => {
        if (snap.exists()) {
          const ws = { id: snap.id, ...snap.data() } as Workspace;
          workspacesMap.value[workspaceId] = ws;
          if (activeWorkspace.value?.id === workspaceId) {
            activeWorkspace.value = ws;
          }
        }
      },
      (err) => console.error("[useWorkspace] listenWorkspace error:", err)
    );
  }

  // ── Crear workspace ──────────────────────────────────────────────────────

  async function createWorkspace(name: string): Promise<{ workspaceId: string }> {
    const token = await getIdToken();
    const data = await $fetch<{ workspaceId: string }>("/api/protected/workspaces/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { name },
    });
    await loadUserWorkspaces();
    return data;
  }

  // ── Cambiar workspace activo ─────────────────────────────────────────────

  function setActiveWorkspace(workspace: Workspace) {
    activeWorkspace.value = workspace;
  }

  return {
    activeWorkspace: readonly(activeWorkspace),
    userWorkspaceIds: readonly(userWorkspaceIds),
    workspacesMap: readonly(workspacesMap),
    workspaceLoading: readonly(workspaceLoading),
    loadUserWorkspaces,
    listenWorkspace,
    createWorkspace,
    setActiveWorkspace,
  };
}
