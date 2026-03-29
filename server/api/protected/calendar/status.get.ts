// server/api/protected/calendar/status.get.ts
// Verifica si el usuario tiene Google Calendar conectado.

import { defineEventHandler, createError } from "h3";
import { isCalendarConnected } from "~/server/utils/googleCalendar";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const connected = await isCalendarConnected(user.uid);

  return { connected };
});
