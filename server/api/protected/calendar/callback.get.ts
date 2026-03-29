// server/api/protected/calendar/callback.get.ts
// Callback de OAuth2 de Google Calendar.
// Recibe el código de autorización, lo intercambia por tokens,
// y los guarda en Firestore para uso futuro.

import { defineEventHandler, getQuery, sendRedirect, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code as string;
  const stateRaw = query.state as string;
  const error = query.error as string;

  const config = useRuntimeConfig();
  const publicUrl = config.public.appUrl as string || "http://localhost:3000";

  if (error) {
    console.error("[calendar/callback] OAuth error:", error);
    return sendRedirect(event, `${publicUrl}/chat?calendarError=denied`);
  }

  if (!code || !stateRaw) {
    throw createError({ statusCode: 400, message: "Faltan parámetros" });
  }

  // Decodificar estado
  let state: { uid: string; workspaceId: string; returnTo?: string };
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
  } catch {
    throw createError({ statusCode: 400, message: "Estado inválido" });
  }

  const clientId = config.googleClientId as string;
  const clientSecret = config.googleClientSecret as string;
  const redirectUri = `${publicUrl}/api/protected/calendar/callback`;

  // Intercambiar código por tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error("[calendar/callback] Token exchange failed:", err);
    return sendRedirect(event, `${publicUrl}/chat?calendarError=token_failed`);
  }

  const tokens = await tokenResponse.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };

  // Guardar tokens en Firestore (encriptados idealmente, pero por ahora en plain)
  const db = getAdminFirestore();
  await db.collection("users").doc(state.uid).set(
    {
      googleCalendar: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        connectedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  console.info(`[calendar/callback] Calendar connected for uid=${state.uid}`);

  // Redirigir de vuelta a la app
  const returnTo = state.returnTo || `/chat/${state.workspaceId}`;
  return sendRedirect(event, `${publicUrl}${returnTo}?calendarConnected=true`);
});
