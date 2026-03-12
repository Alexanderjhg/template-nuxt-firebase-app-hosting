// server/api/protected/ai/generate.post.ts
// Endpoint protegido de generación con Gemini AI.
// Protegido por server/middleware/auth.ts — requiere Bearer token válido.
//
// REQUEST body: { prompt: string, model?: string }
// RESPONSE:     { text: string, model: string, tokensUsed?: number }

import { defineEventHandler, readBody, createError } from "h3";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Constantes ────────────────────────────────────────────────────────────────
const DEFAULT_MODEL = "gemini-1.5-flash";
const MAX_PROMPT_LENGTH = 4000;

export default defineEventHandler(async (event) => {
  // El middleware ya validó el token — el usuario está disponible aquí
  const user = event.context.user!;

  // ── Leer y validar el body ───────────────────────────────────────────────
  const body = await readBody<{ prompt?: string; model?: string }>(event);

  if (!body.prompt?.trim()) {
    throw createError({
      statusCode: 400,
      message: "El campo 'prompt' es requerido y no puede estar vacío.",
    });
  }

  if (body.prompt.length > MAX_PROMPT_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `El prompt no puede superar ${MAX_PROMPT_LENGTH} caracteres.`,
    });
  }

  // ── Inicializar cliente de Gemini ─────────────────────────────────────────
  const config = useRuntimeConfig();
  const apiKey = (config.geminiApiKey as string)?.trim();
  // const apiKey = "AIzaSyAsZbDk6F3Sl4X8Wx9XPmW8YtJqeMj0954";

  if (!apiKey) {
    console.error(
      "[ai/generate] Error: GEMINI_API_KEY no encontrada en runtimeConfig.",
    );
    throw createError({
      statusCode: 503,
      message:
        "El servicio de IA no está configurado correctamente (Falta API Key).",
    });
  }

  // Debug (Enmascarado)
  console.log(
    `[ai/generate] Usando API Key: ${apiKey.substring(0, 7)}... (Longitud: ${apiKey.length})`,
    // `${apiKey}`,
  );

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = body.model ?? DEFAULT_MODEL;
  const model = genAI.getGenerativeModel({ model: modelName });

  // ── Log de auditoría ──────────────────────────────────────────────────────
  console.info(
    `[ai/generate] uid=${user.uid} model=${modelName} promptLength=${body.prompt.length}`,
  );

  // ── Generar contenido ─────────────────────────────────────────────────────
  try {
    const result = await model.generateContent(body.prompt.trim());
    const response = result.response;
    const text = response.text();

    // Tokens usados (si el modelo los reporta)
    const tokensUsed = response.usageMetadata?.totalTokenCount;

    return {
      success: true,
      text,
      model: modelName,
      tokensUsed: tokensUsed ?? null,
    };
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    console.error("[ai/generate] Error de Gemini:", error.message);

    // Errores de cuota o autenticación de la API de Google
    if (error.message?.includes("API_KEY_INVALID")) {
      throw createError({
        statusCode: 503,
        message: "API Key de Gemini inválida.",
      });
    }
    if (error.message?.includes("RESOURCE_EXHAUSTED")) {
      throw createError({
        statusCode: 429,
        message: "Cuota de Gemini agotada. Intenta más tarde.",
      });
    }

    throw createError({
      statusCode: 500,
      message: "Error al generar contenido con IA.",
    });
  }
});
