// server/api/protected/tasks/list.get.ts
// Lista las tareas pendientes del usuario (globales, almacenadas en users/{uid}/pending_tasks).

import { defineEventHandler, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const db = getAdminFirestore();
  const snap = await db
    .collection("users")
    .doc(user.uid)
    .collection("pending_tasks")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const tasks = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: d.id,
    ...d.data(),
  }));

  return { tasks };
});
