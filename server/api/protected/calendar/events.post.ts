// server/api/protected/calendar/events.post.ts
// Crea un evento de calendario.
// Si el usuario tiene Google Calendar conectado → crea directo en su calendario.
// Si no → guarda en Firestore + genera link manual para agregar.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  getValidCalendarToken,
  createGoogleCalendarEvent,
} from "~/server/utils/googleCalendar";

interface CalendarEventBody {
  workspaceId?: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  duration?: number; // minutos, default 60
  attendees?: string[];
  channelId?: string;
  dmId?: string;
  globalDmId?: string; // DM personal (fuera de workspace)
  skipMessage?: boolean; // No enviar mensaje de confirmación al chat
}

function toGoogleCalendarDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildGoogleCalendarUrl(
  title: string,
  startUtc: Date,
  endUtc: Date,
  description?: string,
): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleCalendarDate(startUtc)}/${toGoogleCalendarDate(endUtc)}`,
  });
  if (description) params.set("details", description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const body = await readBody<CalendarEventBody>(event);
  const {
    workspaceId,
    title,
    description,
    date,
    time,
    duration = 60,
    attendees,
    channelId,
    dmId,
    globalDmId,
    skipMessage,
  } = body;

  const isGlobal = !!globalDmId || !workspaceId;

  if (!title?.trim() || !date) {
    throw createError({ statusCode: 400, message: "title y date son requeridos" });
  }

  if (!isGlobal && !workspaceId) {
    throw createError({ statusCode: 400, message: "workspaceId es requerido para eventos de workspace" });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: "Formato de date: YYYY-MM-DD" });
  }

  if (time && !/^\d{2}:\d{2}$/.test(time)) {
    throw createError({ statusCode: 400, message: "Formato de time: HH:mm" });
  }

  // Computar fechas
  const startDate = time
    ? new Date(`${date}T${time}:00`)
    : new Date(`${date}T09:00:00`);

  if (isNaN(startDate.getTime())) {
    throw createError({ statusCode: 400, message: "Fecha u hora no válida" });
  }

  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
  const startAt = Timestamp.fromDate(startDate);
  const endAt = Timestamp.fromDate(endDate);

  const db = getAdminFirestore();

  // ── Intentar crear en Google Calendar real ──────────────────────────────
  let googleEventId: string | null = null;
  let googleEventLink: string | null = null;
  let calendarUrl: string;
  let createdInGoogle = false;

  const accessToken = await getValidCalendarToken(user.uid);

  if (accessToken) {
    const result = await createGoogleCalendarEvent(accessToken, {
      summary: title.trim(),
      description: description?.trim(),
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      attendees,
    });

    if (result) {
      googleEventId = result.id;
      googleEventLink = result.htmlLink;
      calendarUrl = result.htmlLink;
      createdInGoogle = true;
      console.info(`[calendar] Evento creado en Google Calendar: ${result.id}`);
    } else {
      // Fallback al link manual si falla la API
      calendarUrl = buildGoogleCalendarUrl(title.trim(), startDate, endDate, description?.trim());
    }
  } else {
    // Sin Google Calendar conectado → link manual
    calendarUrl = buildGoogleCalendarUrl(title.trim(), startDate, endDate, description?.trim());
  }

  // ── Guardar en Firestore ───────────────────────────────────────────────
  const eventRef = isGlobal
    ? db.collection("users").doc(user.uid).collection("calendar_events").doc()
    : db.collection("workspaces").doc(workspaceId!).collection("calendar_events").doc();

  await eventRef.set({
    title: title.trim(),
    description: description?.trim() ?? "",
    date,
    time: time ?? null,
    duration,
    attendees: attendees ?? [],
    createdBy: user.uid,
    createdByName: user.name ?? "",
    status: "scheduled",
    startAt,
    endAt,
    calendarUrl,
    googleEventId: googleEventId ?? null,
    createdInGoogle,
    source: isGlobal ? "personal" : "workspace",
    createdAt: FieldValue.serverTimestamp(),
  });

  // ── Mensaje de confirmación (solo si no se solicitó skipMessage) ───────
  if (!skipMessage) {
    const displayTime = time ?? "Todo el día";
    const actionText = createdInGoogle
      ? "✅ Agregado a tu Google Calendar"
      : `[Agregar a Google Calendar](${calendarUrl})`;

    const messageContent = `📅 **${title.trim()}**\n${date} a las ${displayTime}\n\n${actionText}`;
    const now = FieldValue.serverTimestamp();
    const preview = `📅 ${title.trim()} — ${date} ${displayTime}`;

    if (isGlobal && globalDmId) {
      const dmRef = db.collection("globalDMs").doc(globalDmId);
      await dmRef.collection("messages").add({
        senderId: "ai-assistant",
        senderName: "📅 Calendario",
        senderPhoto: "",
        content: messageContent,
        type: "calendar_event",
        createdAt: now,
      });
      await dmRef.update({ lastMessageAt: now, lastMessagePreview: preview });
    } else if (!isGlobal) {
      const parentRef = channelId
        ? db.collection("workspaces").doc(workspaceId!).collection("channels").doc(channelId)
        : dmId
          ? db.collection("workspaces").doc(workspaceId!).collection("dms").doc(dmId)
          : null;

      if (parentRef) {
        await parentRef.collection("messages").add({
          senderId: "ai-assistant",
          senderName: "📅 Calendario",
          senderPhoto: "",
          content: messageContent,
          type: "calendar_event",
          createdAt: now,
        });
        await parentRef.update({ lastMessageAt: now, lastMessagePreview: preview });
      }
    }
  }

  return {
    ok: true,
    eventId: eventRef.id,
    calendarUrl,
    createdInGoogle,
    googleEventId,
    googleEventLink,
  };
});
