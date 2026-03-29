// server/api/protected/profile/username-check.get.ts
// Verifica si un username está disponible.

import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { username } = getQuery(event) as { username?: string };
  if (!username) throw createError({ statusCode: 400, message: "username es requerido" });

  const slug = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (slug.length < 3) return { available: false, reason: "Muy corto (mínimo 3 caracteres)" };
  if (slug.length > 20) return { available: false, reason: "Muy largo (máximo 20 caracteres)" };

  const db = getAdminFirestore();
  const snap = await db.collection("users").where("username", "==", slug).limit(1).get();

  if (snap.empty) return { available: true, username: slug };

  const takenByMe = snap.docs[0]!.id === user.uid;
  return { available: takenByMe, username: slug, reason: takenByMe ? undefined : "Ya está en uso" };
});
