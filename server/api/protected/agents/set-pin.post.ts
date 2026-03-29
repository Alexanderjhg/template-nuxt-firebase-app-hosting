// server/api/protected/agents/set-pin.post.ts
// Configura o actualiza el PIN del usuario para confirmar acciones de agentes.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { createHash } from "crypto";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin + "clowpen-pin-salt").digest("hex");
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, pin } = await readBody<{ workspaceId: string; pin: string }>(event);

  if (!workspaceId || !pin) {
    throw createError({ statusCode: 400, message: "workspaceId y pin son requeridos" });
  }

  if (pin.length < 4 || pin.length > 12) {
    throw createError({ statusCode: 400, message: "El PIN debe tener entre 4 y 12 caracteres" });
  }

  const db = getAdminFirestore();
  await db
    .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid)
    .update({ pinHash: hashPin(pin) });

  return { ok: true };
});
