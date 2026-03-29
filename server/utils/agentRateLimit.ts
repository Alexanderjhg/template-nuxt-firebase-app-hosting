// server/utils/agentRateLimit.ts
// Rate limiting por agente usando Firestore Admin SDK.
// Ventana deslizante de 1 minuto. Solo escribe en el servidor.

import { getAdminFirestore } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const DEFAULT_MAX_PER_MINUTE = 4;

export interface AgentRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkAgentRateLimit(
  agentId: string,
  maxPerMinute: number = DEFAULT_MAX_PER_MINUTE,
): Promise<AgentRateLimitResult> {
  const db = getAdminFirestore();
  const ref = db.collection("agentRateLimits").doc(agentId);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto

  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      callsThisMinute: 1,
      windowStart: FieldValue.serverTimestamp(),
    });
    return { allowed: true, remaining: maxPerMinute - 1, resetAt: new Date(now + windowMs) };
  }

  const data = doc.data()!;
  const windowStart: number = data.windowStart?.toMillis?.() ?? now;
  const elapsed = now - windowStart;

  if (elapsed > windowMs) {
    await ref.set({
      callsThisMinute: 1,
      windowStart: FieldValue.serverTimestamp(),
    });
    return { allowed: true, remaining: maxPerMinute - 1, resetAt: new Date(now + windowMs) };
  }

  if (data.callsThisMinute >= maxPerMinute) {
    const resetAt = new Date(windowStart + windowMs);
    return { allowed: false, remaining: 0, resetAt };
  }

  await ref.update({ callsThisMinute: FieldValue.increment(1) });
  return {
    allowed: true,
    remaining: maxPerMinute - data.callsThisMinute - 1,
    resetAt: new Date(windowStart + windowMs),
  };
}
