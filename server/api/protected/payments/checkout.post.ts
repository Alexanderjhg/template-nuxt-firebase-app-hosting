// server/api/protected/payments/checkout.post.ts
// Endpoint de checkout — protegido por server/middleware/auth.ts.
// El frontend llama a esta ruta sin saber qué proveedor de pagos se usa.
//
// REQUEST body:
//   { orderId, currency, customer, items, returnUrl, cancelUrl, metadata? }
//
// RESPONSE:
//   { chargeId, redirectUrl, token?, status, providerName }

import { defineEventHandler, readBody, createError } from "h3";
import { getPaymentProvider } from "../../../utils/paymentGateway";
import type { CreateChargeParams } from "../../../utils/paymentGateway";

// ── Esquema de validación manual (sin dependencias extra) ────────────────────

function validateBody(body: Partial<CreateChargeParams>): string | null {
  if (!body.orderId?.trim()) return "orderId es requerido";
  if (!body.currency?.trim()) return "currency es requerido";
  if (!body.customer?.name) return "customer.name es requerido";
  if (!body.customer?.email) return "customer.email es requerido";
  if (!Array.isArray(body.items) || body.items.length === 0)
    return "items debe ser un array no vacío";
  if (!body.returnUrl?.trim()) return "returnUrl es requerido";
  if (!body.cancelUrl?.trim()) return "cancelUrl es requerido";

  for (const item of body.items) {
    if (!item.id || !item.name || item.quantity < 1 || item.unitPrice < 0)
      return `Item inválido: ${JSON.stringify(item)}`;
  }

  return null; // Sin errores
}

export default defineEventHandler(async (event) => {
  // ── El middleware auth.ts ya validó el token y puso el usuario en context ──
  const authenticatedUser = event.context.user!;

  // ── Leer y validar el body ───────────────────────────────────────────────
  const body = await readBody<Partial<CreateChargeParams>>(event);

  const validationError = validateBody(body);
  if (validationError) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: validationError,
    });
  }

  // ── Logging de la transacción (sin datos sensibles) ──────────────────────
  console.info(
    `[checkout] uid=${authenticatedUser.uid} orderId=${body.orderId} currency=${body.currency} amount=${
      body.items!.reduce((sum: number, i: any) => sum + i.unitPrice * i.quantity, 0)
    }`
  );

  // ── Obtener el proveedor de pagos activo (Factory) ───────────────────────
  // La variable PAYMENT_PROVIDER determina qué proveedor usa la factory.
  // Si no está definida, usa ePayco por defecto.
  const gateway = await getPaymentProvider();

  // ── Crear el cobro ────────────────────────────────────────────────────────
  const charge = await gateway.createCharge(body as CreateChargeParams);

  // ── Respuesta genérica al frontend ───────────────────────────────────────
  // El cliente solo ve datos neutrales — nunca el nombre "ePayco"
  return {
    success: true,
    chargeId: charge.chargeId,
    redirectUrl: charge.redirectUrl,
    token: charge.token ?? null,
    status: charge.status,
    /** Nombre del proveedor — útil para debugging en desarrollo */
    providerName: process.env.NODE_ENV !== "production"
      ? gateway.providerName
      : undefined,
  };
});
