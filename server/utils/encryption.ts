// server/utils/encryption.ts
// Cifrado/descifrado AES-256-GCM para tokens de agentes.
// La clave vive en Cloud Secret Manager → NUXT_AGENT_TOKEN_ENCRYPTION_KEY
// Los tokens cifrados se guardan en Firestore; el texto plano nunca se persiste.

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const config = useRuntimeConfig();
  const raw = (config.agentTokenEncryptionKey as string)?.trim();

  if (!raw || raw.length < 32) {
    // En desarrollo local sin la variable, usar una clave de relleno (NO producción)
    if (process.env.NODE_ENV !== "production") {
      return Buffer.from("dev-key-do-not-use-in-prod-00000", "utf8");
    }
    throw new Error("AGENT_TOKEN_ENCRYPTION_KEY no configurada o muy corta");
  }

  // Usar exactamente los primeros 32 bytes (256 bits)
  return Buffer.from(raw.slice(0, 32), "utf8");
}

export interface EncryptedToken {
  encryptedToken: string; // hex
  iv: string;             // hex
  authTag: string;        // hex
  tokenPrefix: string;    // primeros 8 chars del token plano (para lookup)
}

/**
 * Genera un token aleatorio y lo cifra.
 * @returns plainToken (mostrar al usuario UNA VEZ) + datos cifrados para Firestore
 */
export function generateAndEncryptToken(): { plainToken: string; encrypted: EncryptedToken } {
  const plainToken = randomBytes(32).toString("hex"); // 64 chars hex
  const encrypted = encryptToken(plainToken);
  return { plainToken, encrypted };
}

/**
 * Cifra un token con AES-256-GCM.
 */
export function encryptToken(plainToken: string): EncryptedToken {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainToken, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedToken: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    tokenPrefix: plainToken.slice(0, 8),
  };
}

/**
 * Descifra un token almacenado en Firestore.
 */
export function decryptToken(encrypted: EncryptedToken): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "hex");
  const authTag = Buffer.from(encrypted.authTag, "hex");
  const encryptedBuf = Buffer.from(encrypted.encryptedToken, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Compara dos strings en tiempo constante para prevenir timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
