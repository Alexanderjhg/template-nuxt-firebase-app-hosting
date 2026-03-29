// server/utils/webhookDispatch.ts
// Envía webhooks salientes firmados (HMAC-SHA256) a agentes externos.
// Header: X-Clowpen-Signature: sha256=<hex>
// El receptor verifica la firma con su webhookSecret almacenado en Firestore.

import { createHmac } from "crypto";

export interface WebhookPayload {
  event: string;
  workspaceId: string;
  agentId: string;
  data: Record<string, unknown>;
}

/**
 * Firma el payload con HMAC-SHA256 usando el webhookSecret del agente.
 */
function signPayload(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Envía un webhook firmado al agente. Fire-and-forget: nunca lanza.
 * Timeout de 8 segundos para no bloquear la respuesta al usuario.
 */
export async function dispatchWebhook(
  webhookUrl: string,
  webhookSecret: string,
  payload: WebhookPayload
): Promise<void> {
  if (!webhookUrl) return;

  const body = JSON.stringify(payload);
  const signature = signPayload(body, webhookSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    console.info(
      `[webhookDispatch] Firing ${payload.event} → ${webhookUrl} (agent=${payload.agentId})`
    );
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Clowpen-Signature": signature,
        "X-Clowpen-Event": payload.event,
        "User-Agent": "Clowpen-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });
    console.info(
      `[webhookDispatch] Response: ${res.status} ${res.statusText} (agent=${payload.agentId})`
    );
  } catch (err: any) {
    console.error(
      `[webhookDispatch] FAILED ${payload.event} → ${webhookUrl} (agent=${payload.agentId}):`,
      err?.message ?? err
    );
  } finally {
    clearTimeout(timeout);
  }
}
