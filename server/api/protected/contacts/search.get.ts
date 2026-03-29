// server/api/protected/contacts/search.get.ts
// Busca usuarios por username o displayName.

import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { q } = getQuery(event) as { q?: string };
  if (!q || q.trim().length < 2) {
    throw createError({ statusCode: 400, message: "Busca al menos 2 caracteres" });
  }

  const db = getAdminFirestore();
  const term = q.trim().toLowerCase();

  // Firestore no soporta LIKE, hacemos búsqueda por prefijo de username
  const snap = await db.collection("users")
    .where("username", ">=", term)
    .where("username", "<=", term + "\uf8ff")
    .limit(10)
    .get();

  const results = snap.docs
    .filter((d) => d.id !== user.uid)
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName ?? "",
        photoURL: data.photoURL ?? "",
        username: data.username ?? "",
        status: data.status ?? "offline",
        statusMessage: data.statusMessage ?? "",
      };
    });

  return { results };
});
