// server/api/protected/personal-groups/create.post.ts
// Crea un grupo personal (no empresarial) en personalGroups/{groupId}.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { name, memberIds } = await readBody<{ name: string; memberIds: string[] }>(event);
  if (!name?.trim()) throw createError({ statusCode: 400, message: "El nombre del grupo es requerido" });

  const allMemberIds = [...new Set([user.uid, ...(memberIds ?? [])])];
  if (allMemberIds.length < 2) {
    throw createError({ statusCode: 400, message: "Un grupo necesita al menos 2 miembros" });
  }

  const db = getAdminFirestore();
  const myDoc = await db.collection("users").doc(user.uid).get();
  const myData = myDoc.data() ?? {};

  const groupRef = db.collection("personalGroups").doc();

  await groupRef.set({
    name: name.trim(),
    memberIds: allMemberIds,
    adminIds: [user.uid],
    createdBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessagePreview: `${myData.displayName ?? "Alguien"} creó el grupo`,
    photoURL: "",
  });

  return { groupId: groupRef.id };
});
