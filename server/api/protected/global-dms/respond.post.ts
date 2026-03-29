// server/api/protected/global-dms/respond.post.ts
// Acepta o rechaza una solicitud de DM pendiente.
// Solo el destinatario (quien NO es requestedBy) puede responder.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { dmId, action } = await readBody<{ dmId: string; action: "accept" | "decline" }>(event);
  if (!dmId || !["accept", "decline"].includes(action)) {
    throw createError({ statusCode: 400, message: "dmId y action (accept|decline) son requeridos" });
  }

  const db = getAdminFirestore();
  const dmRef = db.collection("globalDMs").doc(dmId);
  const dmDoc = await dmRef.get();

  if (!dmDoc.exists) throw createError({ statusCode: 404, message: "DM no encontrado" });

  const dmData = dmDoc.data()!;

  // Verificar que el usuario es participante
  if (!dmData.participantIds?.includes(user.uid)) {
    throw createError({ statusCode: 403, message: "No eres participante de este DM" });
  }

  // Solo puede responder quien NO envió la solicitud
  if (dmData.requestedBy === user.uid) {
    throw createError({ statusCode: 403, message: "No puedes responder a tu propia solicitud" });
  }

  if (dmData.status !== "pending") {
    return { ok: true }; // ya fue procesado
  }

  if (action === "accept") {
    await dmRef.update({ status: "active", requestedBy: null });
    return { ok: true, status: "active" };
  }

  // decline: eliminar todos los mensajes y el DM
  const messagesSnap = await dmRef.collection("messages").get();
  const batch = db.batch();
  messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(dmRef);
  await batch.commit();

  return { ok: true, status: "declined" };
});
