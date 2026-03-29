// app/composables/useProfile.ts
// CRUD del perfil global del usuario (colección users/{uid}).

import { doc, onSnapshot, getDoc, type Unsubscribe } from "firebase/firestore";
import type { UserProfile } from "~/types/chat";

const myProfile = useState<UserProfile | null>("myProfile", () => null);

export function useProfile() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  // ── Escuchar mi perfil en tiempo real ────────────────────────────────────

  function listenMyProfile(): Unsubscribe {
    if (!user.value?.uid) return () => {};

    unsubscribe?.();
    unsubscribe = onSnapshot(
      doc($firestore, "users", user.value.uid),
      (snap) => {
        if (snap.exists()) {
          myProfile.value = { uid: snap.id, ...snap.data() } as UserProfile;
        }
      },
      (err) => console.error("[useProfile] error:", err)
    );
    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
  }

  // ── Cargar perfil de otro usuario ────────────────────────────────────────

  async function fetchProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc($firestore, "users", uid));
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as UserProfile;
  }

  // ── Actualizar mi perfil ─────────────────────────────────────────────────

  async function updateProfile(data: {
    displayName?: string;
    photoURL?: string;
    username?: string;
    bio?: string;
    status?: string;
    statusMessage?: string;
    statusEmoji?: string;
  }): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/profile/update", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
  }

  // ── Verificar disponibilidad de username ─────────────────────────────────

  async function checkUsername(username: string): Promise<{ available: boolean; reason?: string }> {
    const token = await getIdToken();
    return $fetch<{ available: boolean; reason?: string }>("/api/protected/profile/username-check", {
      headers: { Authorization: `Bearer ${token}` },
      query: { username },
    });
  }

  // ── Asegurar que el perfil existe al iniciar sesión ──────────────────────

  async function ensureProfile(): Promise<void> {
    if (!user.value) return;
    const token = await getIdToken();

    const displayName = user.value.displayName ?? user.value.email?.split("@")[0] ?? "usuario";
    const body: Record<string, string> = {
      displayName,
      photoURL: user.value.photoURL ?? "",
    };

    // Solo generamos username inicial si el perfil aún no tiene uno
    if (!myProfile.value?.username) {
      body.username = slugifyUsername(displayName);
    }

    await $fetch("/api/protected/profile/update", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
  }

  function slugifyUsername(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20)
      .replace(/^_+|_+$/g, "") || "usuario";
  }

  return {
    myProfile: readonly(myProfile),
    listenMyProfile,
    stopListening,
    fetchProfile,
    updateProfile,
    checkUsername,
    ensureProfile,
  };
}
