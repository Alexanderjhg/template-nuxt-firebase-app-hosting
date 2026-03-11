// server/utils/providers/epaycoProvider.ts
// Implementación del Adapter de ePayco.
// Solo este archivo conoce los detalles de epayco-sdk-node.
// El resto del sistema trabaja con la interfaz genérica PaymentGateway.

import {
  PaymentGateway,
  type CreateChargeParams,
  type CreateSubscriptionParams,
  type ChargeResponse,
  type SubscriptionResponse,
} from "../paymentGateway";

// ── Inicialización del SDK de ePayco ─────────────────────────────────────────
// El SDK se instancia con las claves del servidor (nunca expuestas al cliente).

function createEpaycoClient() {
  const config = useRuntimeConfig();

  // epayco-sdk-node usa require() internamente — compatible con el build de Nuxt
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Epayco = require("epayco-sdk-node");

  return new Epayco({
    apiKey: config.epaycoPublicKey as string,
    privateKey: config.epaycoPrivateKey as string,
    lang: "ES",
    test: config.epaycoIsTest === "true",
  });
}

// ── Proveedor ePayco ──────────────────────────────────────────────────────────

export class EpaycoProvider extends PaymentGateway {
  readonly providerName = "epayco";

  /**
   * Crea un cobro con ePayco usando el método de pago con token.
   * El flujo devuelve una URL de checkout alojada en ePayco.
   *
   * Documentación: https://epayco.com/docs/api/
   */
  async createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
    const epayco = createEpaycoClient();

    // Calcular total desde los ítems
    const totalAmount = params.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Mapear parámetros genéricos a la estructura de ePayco
    const epaycoParams = {
      // ── Info del cobro ────────────────────────────────────────────────────
      name: params.items.map((i) => i.name).join(", "),
      description: params.items.map((i) => i.description ?? i.name).join(" | "),
      invoice: params.orderId,
      currency: params.currency.toLowerCase(), // ePayco acepta "cop", "usd"
      amount: String(totalAmount),
      tax_base: "0",
      tax: "0",
      country: "CO",
      lang: "es",

      // ── URLs de retorno ───────────────────────────────────────────────────
      // ePayco redirige a estas URLs después del pago
      extra1: params.returnUrl,  // URL de confirmación (éxito)
      extra2: params.cancelUrl,  // URL de cancelación
      extra3: params.orderId,    // Referencia propia para reconciliación

      // ── Datos del cliente ─────────────────────────────────────────────────
      name_billing: params.customer.name,
      address_billing: "N/A",
      type_doc_billing: "cc",
      mobilephone_billing: params.customer.phone ?? "",
      number_doc_billing: params.customer.document ?? "0000000000",

      // ── Metadata adicional ────────────────────────────────────────────────
      ...(params.metadata ?? {}),
    };

    try {
      const response = await epayco.charge.create(epaycoParams);

      if (!response || !response.data) {
        throw new Error("ePayco no retornó una respuesta válida");
      }

      return {
        chargeId: response.data.transactionID ?? params.orderId,
        redirectUrl: response.data.routeCheckout ?? response.data.urlPayment ?? "",
        token: response.data.token,
        status: "created",
        raw: response.data,
      };
    } catch (err) {
      console.error("[EpaycoProvider] createCharge error:", err);
      throw createError({
        statusCode: 502,
        message: "Error al procesar el cobro con ePayco",
      });
    }
  }

  /**
   * Crea una suscripción recurrente con ePayco.
   * Documentación: https://epayco.com/docs/api/#subscriptions
   */
  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<SubscriptionResponse> {
    const epayco = createEpaycoClient();

    const subscriptionParams = {
      id_plan: params.planId,
      customer: params.customer.email,
      token_card: "", // Se obtiene tras la tokenización en el cliente
      doc_type: "CC",
      doc_number: params.customer.document ?? "0000000000",
      extra1: params.returnUrl,
      extra2: params.cancelUrl,
    };

    try {
      const response = await epayco.subscriptions.create(subscriptionParams);

      return {
        subscriptionId: response.data?.id ?? params.planId,
        redirectUrl: response.data?.routeCheckout ?? "",
        status: "pending",
        raw: response.data,
      };
    } catch (err) {
      console.error("[EpaycoProvider] createSubscription error:", err);
      throw createError({
        statusCode: 502,
        message: "Error al crear la suscripción con ePayco",
      });
    }
  }

  /**
   * Consulta el estado de una transacción ePayco por su ID.
   */
  async getTransactionStatus(transactionId: string): Promise<{
    status: "pending" | "approved" | "rejected" | "failed";
    raw?: Record<string, unknown>;
  }> {
    const epayco = createEpaycoClient();

    try {
      const response = await epayco.charge.get(transactionId);
      const epaycoStatus = (response.data?.status ?? "").toLowerCase();

      // Mapear estados de ePayco a estados genéricos
      const statusMap: Record<string, "pending" | "approved" | "rejected" | "failed"> = {
        aceptada: "approved",
        rechazada: "rejected",
        pendiente: "pending",
        fallida: "failed",
        accepted: "approved",
        rejected: "rejected",
        pending: "pending",
        failed: "failed",
      };

      return {
        status: statusMap[epaycoStatus] ?? "pending",
        raw: response.data,
      };
    } catch (err) {
      console.error("[EpaycoProvider] getTransactionStatus error:", err);
      throw createError({
        statusCode: 502,
        message: "Error al consultar el estado de la transacción",
      });
    }
  }
}
