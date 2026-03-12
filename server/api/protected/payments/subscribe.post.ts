import { defineEventHandler, readBody, createError } from "h3";
import { getPaymentProvider } from "../../../utils/paymentGateway";
import type { CreateSubscriptionParams } from "../../../utils/paymentGateway";

function validateSubscriptionBody(body: Partial<CreateSubscriptionParams>): string | null {
  if (!body.planId?.trim()) return "planId es requerido";
  if (!body.customer?.name) return "customer.name es requerido";
  if (!body.customer?.email) return "customer.email es requerido";
  if (!body.returnUrl?.trim()) return "returnUrl es requerido";
  if (!body.cancelUrl?.trim()) return "cancelUrl es requerido";

  // Se requiere al menos token pre-generado O datos de la tarjeta
  const hasToken = !!body.token?.trim();
  const hasCardData = !!(body.cardData?.number && body.cardData?.exp_month && body.cardData?.exp_year && body.cardData?.cvc);
  if (!hasToken && !hasCardData) {
    return "Se requiere token o datos completos de la tarjeta (number, exp_month, exp_year, cvc)";
  }

  return null;
}

export default defineEventHandler(async (event) => {
  const authenticatedUser = event.context.user!;
  const body = await readBody<Partial<CreateSubscriptionParams>>(event);

  const validationError = validateSubscriptionBody(body);
  if (validationError) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: validationError,
    });
  }

  console.info(`[subscribe] uid=${authenticatedUser.uid} planId=${body.planId}`);

  const gateway = await getPaymentProvider();

  try {
    const subscription = await gateway.createSubscription(body as CreateSubscriptionParams);
    
    return {
      success: true,
      subscriptionId: subscription.subscriptionId,
      status: subscription.status,
      // Devuelve metadata adicional de ePayco si se necesita analizar (como el plan)
      providerName: gateway.providerName,
      raw: subscription.raw
    };
  } catch (error: any) {
    console.error("[Subscribe API] Error al crear la suscripción nativa:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "No se pudo procesar la suscripción automática."
    });
  }
});
