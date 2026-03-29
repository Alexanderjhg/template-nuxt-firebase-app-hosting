// app/composables/useContacts.ts
// Gestión de contactos personales del usuario.

import { collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { Contact } from "~/types/chat";

const contacts = useState<Contact[]>("contacts", () => []);

export function useContacts() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let unsubscribe: Unsubscribe | null = null;

  // ── Escuchar mis contactos ────────────────────────────────────────────────

  function listenContacts(): Unsubscribe {
    if (!user.value?.uid) return () => {};
    unsubscribe?.();

    unsubscribe = onSnapshot(
      collection($firestore, "users", user.value.uid, "contacts"),
      (snap) => {
        contacts.value = snap.docs.map((d) => ({ ...d.data() } as Contact));
      },
      (err) => console.error("[useContacts] error:", err)
    );

    return unsubscribe;
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
  }

  // ── Buscar usuarios ──────────────────────────────────────────────────────

  async function searchUsers(q: string): Promise<Contact[]> {
    if (q.trim().length < 2) return [];
    const token = await getIdToken();
    const { results } = await $fetch<{ results: Contact[] }>("/api/protected/contacts/search", {
      headers: { Authorization: `Bearer ${token}` },
      query: { q },
    });
    return results;
  }

  // ── Agregar contacto ─────────────────────────────────────────────────────

  async function addContact(contactUid: string): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/contacts/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { contactUid },
    });
  }

  // ── Quitar contacto ──────────────────────────────────────────────────────

  async function removeContact(contactUid: string): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/contacts/remove", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      body: { contactUid },
    });
  }

  const myContactIds = computed(() => contacts.value.map((c) => c.uid));

  return {
    contacts: readonly(contacts),
    myContactIds,
    listenContacts,
    stopListening,
    searchUsers,
    addContact,
    removeContact,
  };
}
