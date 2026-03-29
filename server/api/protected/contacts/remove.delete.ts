// server/api/protected/contacts/remove.delete.ts
// Elimina un contacto (solo del lado del usuario que lo solicita).

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { contactUid } = await readBody<{ contactUid: string }>(event);
  if (!contactUid) throw createError({ statusCode: 400, message: "contactUid requerido" });

  const db = getAdminFirestore();
  await db.collection("users").doc(user.uid).collection("contacts").doc(contactUid).delete();

  return { ok: true };
});
