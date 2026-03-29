// server/api/protected/calendar/events.get.ts
// Lista los eventos de calendario del usuario en un workspace.

import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const query = getQuery(event);
  const workspaceId = query.workspaceId as string | undefined;
  const status = (query.status as string) || "scheduled";

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      message: "workspaceId es requerido",
    });
  }

  const db = getAdminFirestore();

  const snapshot = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("calendar_events")
    .where("createdBy", "==", user.uid)
    .where("status", "==", status)
    .orderBy("startAt", "asc")
    .get();

  const events = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      date: data.date,
      time: data.time,
      duration: data.duration,
      startAt: data.startAt?.toDate?.() ?? data.startAt,
      endAt: data.endAt?.toDate?.() ?? data.endAt,
      status: data.status,
      calendarUrl: data.calendarUrl,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    };
  });

  return { events };
});
