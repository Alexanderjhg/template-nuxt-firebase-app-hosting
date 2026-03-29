// server/api/protected/profile/update.post.ts
// Actualiza el perfil público del usuario en users/{uid}.
// Crea el documento si no existe.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore, getAdminAuth } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const VALID_STATUSES = ["online", "away", "busy", "offline"];

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { displayName, photoURL, username, bio, status, statusMessage, statusEmoji } = await readBody<{
    displayName?: string;
    photoURL?: string;
    username?: string;
    bio?: string;
    status?: string;
    statusMessage?: string;
    statusEmoji?: string;
  }>(event);

  if (status && !VALID_STATUSES.includes(status)) {
    throw createError({ statusCode: 400, message: "Estado inválido" });
  }

  const db = getAdminFirestore();

  // Verificar que el username no esté tomado por otro usuario
  if (username) {
    const slug = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (slug.length < 3 || slug.length > 20) {
      throw createError({ statusCode: 400, message: "El username debe tener entre 3 y 20 caracteres" });
    }

    const existing = await db.collection("users")
      .where("username", "==", slug)
      .limit(1)
      .get();

    if (!existing.empty && existing.docs[0]!.id !== user.uid) {
      throw createError({ statusCode: 409, message: "Ese username ya está en uso" });
    }
  }

  const updates: Record<string, unknown> = { lastSeen: FieldValue.serverTimestamp() };
  if (displayName?.trim()) updates.displayName = displayName.trim();
  if (photoURL !== undefined) updates.photoURL = photoURL;
  if (username) updates.username = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (bio !== undefined) updates.bio = bio.slice(0, 200);
  if (status) updates.status = status;
  if (statusMessage !== undefined) updates.statusMessage = statusMessage.slice(0, 80);
  if (statusEmoji !== undefined) updates.statusEmoji = statusEmoji;

  await db.collection("users").doc(user.uid).set(
    {
      ...updates,
      uid: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      plan: "free",
    },
    { merge: true }
  );

  // Sincronizar displayName y photoURL en Firebase Auth si fueron cambiados
  const authUpdates: { displayName?: string; photoURL?: string } = {};
  if (displayName?.trim()) authUpdates.displayName = displayName.trim();
  if (photoURL !== undefined) authUpdates.photoURL = photoURL;
  if (Object.keys(authUpdates).length > 0) {
    await getAdminAuth().updateUser(user.uid, authUpdates);
  }

  return { ok: true };
});
