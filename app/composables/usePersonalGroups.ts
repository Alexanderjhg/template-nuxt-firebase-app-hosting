// app/composables/usePersonalGroups.ts
// Grupos personales informales (fuera de workspace).
// Colección: personalGroups/{groupId}

import {
  collection, query, where, orderBy, onSnapshot,
  limit, type Unsubscribe,
} from "firebase/firestore";
// NOTA: listenPersonalGroups no usa orderBy para evitar requerir índice compuesto.
import type { PersonalGroup, Message } from "~/types/chat";

const personalGroups = useState<PersonalGroup[]>("personalGroups", () => []);
const groupMessages = useState<Record<string, Message[]>>("groupMessages", () => ({}));

export function usePersonalGroups() {
  const { $firestore } = useNuxtApp();
  const { user, getIdToken } = useAuth();

  let groupsUnsub: Unsubscribe | null = null;
  const msgUnsubs: Record<string, Unsubscribe> = {};

  function listenPersonalGroups(): Unsubscribe {
    if (!user.value?.uid) return () => {};
    groupsUnsub?.();

    const q = query(
      collection($firestore, "personalGroups"),
      where("memberIds", "array-contains", user.value.uid),
    );

    groupsUnsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PersonalGroup));
      all.sort((a, b) => {
        const aTime = (a.lastMessageAt as any)?.seconds ?? 0;
        const bTime = (b.lastMessageAt as any)?.seconds ?? 0;
        return bTime - aTime;
      });
      personalGroups.value = all;
    }, (err) => console.error("[usePersonalGroups] error:", err));

    return groupsUnsub;
  }

  function listenGroupMessages(groupId: string): Unsubscribe {
    msgUnsubs[groupId]?.();

    const q = query(
      collection($firestore, "personalGroups", groupId, "messages"),
      orderBy("createdAt", "desc"),
      limit(30),
    );

    msgUnsubs[groupId] = onSnapshot(q, (snap) => {
      groupMessages.value = {
        ...groupMessages.value,
        [groupId]: [...snap.docs].reverse().map((d) => ({ id: d.id, ...d.data() } as Message)),
      };
    });

    return msgUnsubs[groupId]!;
  }

  function getGroupMessages(groupId: string): Message[] {
    return groupMessages.value[groupId] ?? [];
  }

  function stopListening() {
    groupsUnsub?.();
    groupsUnsub = null;
    Object.values(msgUnsubs).forEach((u) => u());
    personalGroups.value = [];
  }

  async function createGroup(name: string, memberIds: string[]): Promise<{ groupId: string }> {
    const token = await getIdToken();
    return $fetch<{ groupId: string }>("/api/protected/personal-groups/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { name, memberIds },
    });
  }

  async function sendGroupMessage(groupId: string, content: string): Promise<void> {
    const token = await getIdToken();
    await $fetch("/api/protected/personal-groups/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { groupId, content },
    });
  }

  return {
    personalGroups: readonly(personalGroups),
    listenPersonalGroups,
    listenGroupMessages,
    getGroupMessages,
    stopListening,
    createGroup,
    sendGroupMessage,
  };
}
