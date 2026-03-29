// server/utils/googleCalendar.ts
// Helpers para Google Calendar API.

import { getAdminFirestore } from "~/server/utils/firebaseAdmin";

interface CalendarTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

/**
 * Obtiene un access token válido para Google Calendar.
 * Si el token expiró y hay refresh_token, lo renueva automáticamente.
 * Retorna null si el usuario no ha conectado Google Calendar.
 */
export async function getValidCalendarToken(uid: string): Promise<string | null> {
  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) return null;

  const cal = userDoc.data()?.googleCalendar as CalendarTokens | undefined;
  if (!cal?.accessToken) return null;

  // Verificar si el token sigue válido (con 5 min de margen)
  const expiresAt = new Date(cal.expiresAt).getTime();
  const now = Date.now();

  if (now < expiresAt - 5 * 60 * 1000) {
    return cal.accessToken;
  }

  // Token expirado — intentar renovar
  if (!cal.refreshToken) return null;

  const config = useRuntimeConfig();
  const clientId = config.googleClientId as string;
  const clientSecret = config.googleClientSecret as string;

  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: cal.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("[googleCalendar] Token refresh failed:", await response.text());
      return null;
    }

    const tokens = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    // Actualizar en Firestore
    await db.collection("users").doc(uid).update({
      "googleCalendar.accessToken": tokens.access_token,
      "googleCalendar.expiresAt": new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });

    return tokens.access_token;
  } catch (err) {
    console.error("[googleCalendar] Token refresh error:", err);
    return null;
  }
}

/**
 * Crea un evento en Google Calendar del usuario.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    startDateTime: string; // ISO 8601
    endDateTime: string;   // ISO 8601
    timeZone?: string;
    attendees?: string[];  // emails
  }
): Promise<{ id: string; htmlLink: string } | null> {
  const calendarEvent: Record<string, unknown> = {
    summary: event.summary,
    description: event.description ?? "",
    start: {
      dateTime: event.startDateTime,
      timeZone: event.timeZone ?? "America/Bogota",
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: event.timeZone ?? "America/Bogota",
    },
  };

  if (event.attendees?.length) {
    calendarEvent.attendees = event.attendees.map((email) => ({ email }));
  }

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[googleCalendar] Create event failed:", err);
      return null;
    }

    const result = await response.json() as { id: string; htmlLink: string };
    return { id: result.id, htmlLink: result.htmlLink };
  } catch (err) {
    console.error("[googleCalendar] Create event error:", err);
    return null;
  }
}

/**
 * Verifica si el usuario tiene Google Calendar conectado.
 */
export async function isCalendarConnected(uid: string): Promise<boolean> {
  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  return !!userDoc.data()?.googleCalendar?.refreshToken;
}
