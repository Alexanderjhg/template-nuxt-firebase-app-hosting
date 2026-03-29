// server/api/protected/ai/resolve-contact.post.ts
// Resuelve un nombre de contacto a usuarios reales del workspace o contactos.
// Usado por los intents "outbound_msg" / "dm_send".
//
// REQUEST body: { workspaceId: string, recipientName: string }
// RESPONSE: { matches: Array<{ uid, displayName, photoURL, username?, source, email? }> }

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

interface CandidateUser {
  uid: string;
  displayName: string;
  photoURL: string;
  username?: string;
  email?: string;
  source: "member" | "contact";
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, recipientName } = await readBody<{
    workspaceId?: string;
    recipientName: string;
  }>(event);

  if (!recipientName) {
    throw createError({
      statusCode: 400,
      message: "recipientName es requerido",
    });
  }

  const db = getAdminFirestore();
  const searchTerm = recipientName.trim().toLowerCase();

  // 1. Get workspace members (solo si hay workspaceId)
  let memberUids: string[] = [];
  if (workspaceId) {
    const membersSnap = await db
      .collection(`workspaces/${workspaceId}/members`)
      .get();
    memberUids = membersSnap.docs.map((d) => d.id);
  }

  // 2. Get user's contacts
  const contactsSnap = await db
    .collection(`users/${user.uid}/contacts`)
    .get();

  const contactUids = contactsSnap.docs.map((d) => d.id);

  // Deduplicate and exclude current user
  const allUids = [...new Set([...memberUids, ...contactUids])].filter(
    (uid) => uid !== user.uid
  );

  if (allUids.length === 0) {
    return { matches: [] };
  }

  // Track which source each uid comes from
  const memberSet = new Set(memberUids);
  const contactSet = new Set(contactUids);

  // Fetch user profiles in batches of 10 (Firestore "in" query limit)
  const candidates: CandidateUser[] = [];

  for (let i = 0; i < allUids.length; i += 10) {
    const batch = allUids.slice(i, i + 10);
    const usersSnap = await db
      .collection("users")
      .where("__name__", "in", batch)
      .get();

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      candidates.push({
        uid: doc.id,
        displayName: data.displayName ?? "",
        photoURL: data.photoURL ?? "",
        username: data.username ?? undefined,
        email: data.email ?? undefined,
        source: memberSet.has(doc.id) ? "member" : "contact",
      });
    }
  }

  // 3. Filter candidates by partial match on displayName, email, or username
  const matches = candidates.filter((c) => {
    const dn = (c.displayName ?? "").toLowerCase();
    const em = (c.email ?? "").toLowerCase();
    const un = (c.username ?? "").toLowerCase();
    return (
      dn.includes(searchTerm) ||
      em.includes(searchTerm) ||
      un.includes(searchTerm)
    );
  });

  // 4. Sort by relevance: exact match > starts-with > contains
  matches.sort((a, b) => {
    return relevanceScore(a, searchTerm) - relevanceScore(b, searchTerm);
  });

  return { matches };
});

/** Lower score = higher relevance */
function relevanceScore(c: CandidateUser, term: string): number {
  const fields = [
    (c.displayName ?? "").toLowerCase(),
    (c.username ?? "").toLowerCase(),
    (c.email ?? "").toLowerCase(),
  ];

  // Exact match on any field
  if (fields.some((f) => f === term)) return 0;

  // Starts-with on any field
  if (fields.some((f) => f.startsWith(term))) return 1;

  // Contains
  return 2;
}
