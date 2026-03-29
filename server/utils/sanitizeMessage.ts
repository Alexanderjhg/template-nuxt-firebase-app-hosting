// server/utils/sanitizeMessage.ts
// Sanitiza mensajes antes de enviarlos a la IA o guardarlos.
// Previene prompt injection y XSS básico.

// Patrones de prompt injection más comunes
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /you\s+are\s+now/gi,
  /act\s+as\s+(a\s+)?/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /human\s*:/gi,
  /###\s*(instruction|system|prompt)/gi,
  /disregard\s+(all\s+)?previous/gi,
  /forget\s+(all\s+)?previous/gi,
  /new\s+instructions?\s*:/gi,
];

/**
 * Limpia un mensaje de usuario para enviarlo a la IA.
 * - Remueve patrones de prompt injection
 * - Escapa caracteres HTML básicos
 * - Trunca a maxLength
 */
export function sanitizeMessage(content: string, maxLength = 4000): string {
  let cleaned = content;

  // Remover patrones de injection
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[FILTRADO]");
  }

  // Escapar HTML básico (< > & ")
  cleaned = cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // Truncar
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + "...";
  }

  return cleaned.trim();
}

/**
 * Envuelve mensajes para el contexto de IA con numeración y autor.
 * Formato: "Mensaje N de <nombre>: <contenido>"
 */
export function formatMessagesForAI(
  messages: Array<{ senderName: string; content: string }>
): string {
  return messages
    .map((m, i) => `Mensaje ${i + 1} de ${m.senderName}: ${sanitizeMessage(m.content, 200)}`)
    .join("\n");
}
