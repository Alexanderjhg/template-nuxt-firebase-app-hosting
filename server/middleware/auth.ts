// server/middleware/auth.ts
// Middleware de servidor que protege todas las rutas bajo /api/protected/**.
// Extrae el Bearer token del header Authorization y lo verifica con Firebase Admin.
// Si el token es inválido o falta, responde con 401.
//
// El usuario decodificado se inyecta en event.context.user para uso
// en las API routes protegidas.

import { defineEventHandler, getHeader, createError } from "h3";
import { getAdminAuth } from "../utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  // Solo proteger rutas que empiecen con /api/protected
  if (!event.path.startsWith("/api/protected")) return;

  // Excluir callback de OAuth (Google redirige sin Bearer token)
  if (event.path.startsWith("/api/protected/calendar/callback")) return;

  // ── Extraer token del header ───────────────────────────────────────────────
  const authorizationHeader = getHeader(event, "authorization");

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "No autorizado",
      message: "Se requiere un token de autenticación válido (Bearer token).",
    });
  }

  const idToken = authorizationHeader.slice(7); // Remover "Bearer "

  // ── Validación de formato básica ───────────────────────────────────────────
  // Rate-limiting simple: el token JWT siempre tiene 3 partes separadas por "."
  if (!idToken || idToken.split(".").length !== 3) {
    throw createError({
      statusCode: 401,
      statusMessage: "Token malformado",
      message: "El token proporcionado tiene un formato inválido.",
    });
  }

  // ── Verificar con Firebase Admin ──────────────────────────────────────────
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken, true);

    // Inyectar en el contexto para que las API routes lo usen
    // Acceso: event.context.user.uid, event.context.user.email, etc.
    event.context.user = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      name: decodedToken.name ?? null,
      picture: decodedToken.picture ?? null,
    };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("[auth middleware] Token inválido:", error.code, error.message);

    // Mensaje genérico para no revelar detalles al cliente
    throw createError({
      statusCode: 401,
      statusMessage: "No autorizado",
      message: "El token de autenticación es inválido o ha expirado.",
    });
  }
});
