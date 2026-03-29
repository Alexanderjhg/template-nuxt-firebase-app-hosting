// server/api/protected/workspaces/create.post.ts
// Crea un nuevo workspace y registra al creador como owner.
// También crea el canal #general por defecto y el DM con el Asistente IA.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { name } = await readBody<{ name: string }>(event);
  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: "El nombre del workspace es requerido" });
  }

  const db = getAdminFirestore();
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const now = FieldValue.serverTimestamp();

  // ── Crear workspace ──────────────────────────────────────────────────────
  const wsRef = db.collection("workspaces").doc();
  const workspaceId = wsRef.id;

  // ── Crear canal #general ─────────────────────────────────────────────────
  const generalRef = db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("channels")
    .doc();

  // ── Crear DM con Asistente IA ────────────────────────────────────────────
  const aiDMRef = db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("dms")
    .doc();

  const batch = db.batch();

  // Workspace
  batch.set(wsRef, {
    name: name.trim(),
    slug,
    ownerId: user.uid,
    plan: "free",
    createdAt: now,
    settings: {
      allowGuestLinks: false,
      aiObserverEnabled: true,
      defaultChannelId: generalRef.id,
    },
  });

  // Miembro owner
  batch.set(
    db.collection("workspaces").doc(workspaceId).collection("members").doc(user.uid),
    {
      uid: user.uid,
      role: "owner",
      displayName: user.name ?? user.email ?? "Usuario",
      photoURL: user.picture ?? "",
      email: user.email ?? "",
      joinedAt: now,
      presence: { status: "offline", lastSeen: now },
    }
  );

  // Canal #general
  batch.set(generalRef, {
    name: "general",
    description: "Canal principal del workspace",
    type: "public",
    isPrivate: false,
    createdBy: user.uid,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: "",
  });

  // DM con Asistente IA
  batch.set(aiDMRef, {
    participantIds: [user.uid, "ai-assistant"],
    participantMap: {
      [user.uid]: {
        displayName: user.name ?? "Usuario",
        photoURL: user.picture ?? "",
      },
      "ai-assistant": {
        displayName: "Asistente IA",
        photoURL: "",
      },
    },
    isAiDM: true,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: "Hola, ¿en qué puedo ayudarte?",
  });

  // Índice invertido del usuario
  batch.set(
    db.collection("userWorkspaces").doc(user.uid),
    { workspaceIds: FieldValue.arrayUnion(workspaceId) },
    { merge: true }
  );

  await batch.commit();

  return { workspaceId, defaultChannelId: generalRef.id };
});
