// server/utils/rateLimit.ts
// Rate limiting por usuario usando Firestore Admin SDK.
// Usa una ventana deslizante de 1 hora. Solo escribe en el servidor.

import { getAdminFirestore } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const AI_CALLS_PER_HOUR = 30;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkAiRateLimit(uid: string): Promise<RateLimitResult> {
  const db = getAdminFirestore();
  const ref = db.collection("aiRateLimits").doc(uid);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hora

  const doc = await ref.get();

  if (!doc.exists) {
    // Primera llamada: crear el documento
    await ref.set({
      callsThisHour: 1,
      windowStart: FieldValue.serverTimestamp(),
    });
    return { allowed: true, remaining: AI_CALLS_PER_HOUR - 1, resetAt: new Date(now + windowMs) };
  }

  const data = doc.data()!;
  const windowStart: number = data.windowStart?.toMillis?.() ?? now;
  const elapsed = now - windowStart;

  if (elapsed > windowMs) {
    // Ventana expirada: reiniciar contador
    await ref.set({
      callsThisHour: 1,
      windowStart: FieldValue.serverTimestamp(),
    });
    return { allowed: true, remaining: AI_CALLS_PER_HOUR - 1, resetAt: new Date(now + windowMs) };
  }

  if (data.callsThisHour >= AI_CALLS_PER_HOUR) {
    const resetAt = new Date(windowStart + windowMs);
    return { allowed: false, remaining: 0, resetAt };
  }

  // Incrementar contador atómicamente
  await ref.update({ callsThisHour: FieldValue.increment(1) });
  return {
    allowed: true,
    remaining: AI_CALLS_PER_HOUR - data.callsThisHour - 1,
    resetAt: new Date(windowStart + windowMs),
  };
}
