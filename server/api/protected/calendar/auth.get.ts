// server/api/protected/calendar/auth.get.ts
// Genera la URL de autorización de Google Calendar OAuth2.
// El frontend llama con Bearer token y luego redirige manualmente.

import { defineEventHandler, getQuery, createError } from "h3";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const config = useRuntimeConfig();
  const clientId = config.googleClientId as string;
  if (!clientId) {
    throw createError({ statusCode: 503, message: "Google OAuth no configurado" });
  }

  const query = getQuery(event);
  const workspaceId = query.workspaceId as string;
  const returnTo = query.returnTo as string || "";

  const publicUrl = config.public.appUrl as string || "http://localhost:3000";
  const redirectUri = `${publicUrl}/api/protected/calendar/callback`;

  // Guardar estado para verificar en callback
  const state = Buffer.from(
    JSON.stringify({ uid: user.uid, workspaceId, returnTo })
  ).toString("base64url");

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ];

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return { url: authUrl.toString() };
});
