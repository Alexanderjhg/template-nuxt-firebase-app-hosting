// server/api/protected/calendar/disconnect.post.ts
// Desconecta Google Calendar del usuario (borra tokens).

import { defineEventHandler, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const db = getAdminFirestore();
  await db.collection("users").doc(user.uid).update({
    googleCalendar: FieldValue.delete(),
  });

  return { ok: true };
});
