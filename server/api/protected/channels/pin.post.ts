// server/api/protected/channels/pin.post.ts
// Fija o desfija un mensaje en un canal (máximo 3 pins por canal).

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { workspaceId, channelId, messageId, content, senderName, action } = await readBody<{
    workspaceId: string;
    channelId: string;
    messageId: string;
    content?: string;
    senderName?: string;
    action: "pin" | "unpin";
  }>(event);

  if (!workspaceId || !channelId || !messageId || !action) {
    throw createError({ statusCode: 400, message: "workspaceId, channelId, messageId y action son requeridos" });
  }

  const db = getAdminFirestore();
  const channelRef = db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("channels")
    .doc(channelId);

  const channelSnap = await channelRef.get();
  if (!channelSnap.exists) {
    throw createError({ statusCode: 404, message: "Canal no encontrado" });
  }

  const channelData = channelSnap.data()!;
  const currentPins: Array<{ messageId: string; content: string; senderName: string; pinnedBy: string; pinnedAt: FirebaseFirestore.Timestamp }> =
    channelData.pinnedMessages ?? [];

  if (action === "pin") {
    if (currentPins.length >= 3) {
      throw createError({ statusCode: 400, message: "El canal ya tiene el máximo de 3 mensajes fijados" });
    }
    // Evitar duplicados
    if (currentPins.some((p) => p.messageId === messageId)) {
      return { ok: true, message: "El mensaje ya está fijado" };
    }

    const newPin = {
      messageId,
      content: (content ?? "").slice(0, 200),
      senderName: senderName ?? "Usuario",
      pinnedBy: user.uid,
      pinnedAt: Timestamp.now(),
    };

    // arrayUnion no acepta Timestamps dentro de objetos; usamos update manual
    await channelRef.update({
      pinnedMessages: [...currentPins, newPin],
    });
  } else {
    const updatedPins = currentPins.filter((p) => p.messageId !== messageId);
    await channelRef.update({ pinnedMessages: updatedPins });
  }

  return { ok: true };
});
