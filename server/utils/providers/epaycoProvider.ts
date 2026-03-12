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
  type CardData,
} from "../paymentGateway";

// @ts-expect-error: la librería epayco-sdk-node no incluye declaraciones de tipos
import EpaycoModule from "epayco-sdk-node";

// ── Inicialización del SDK de ePayco ─────────────────────────────────────────
// El SDK se instancia con las claves del servidor (nunca expuestas al cliente).

function createEpaycoClient() {
  const config = useRuntimeConfig();

  // Dependiendo del bundler, los módulos CJS se exponen directamente o en la propiedad default
  const Epayco = EpaycoModule.default || EpaycoModule;

  // IMPORTANTE: epaycoPublicKey está bajo config.public (accesible en cliente y servidor).
  // epaycoPrivateKey está en el nivel raíz (solo servidor).
  const apiKey     = config.public.epaycoPublicKey as string;
  const privateKey = config.epaycoPrivateKey as string;
  const isTest     = config.epaycoIsTest !== "false"; // default: true (test mode)

  if (!apiKey || !privateKey) {
    throw createError({
      statusCode: 500,
      message: "[EpaycoProvider] Faltan las variables de entorno EPAYCO_PUBLIC_KEY o EPAYCO_PRIVATE_KEY.",
    });
  }

  const epaycoOptions = {
    apiKey,
    privateKey,
    lang: "ES",
    test: isTest,
  };

  try {
    return new (Epayco as any)(epaycoOptions);
  } catch (error) {
    return (Epayco as any)(epaycoOptions);
  }
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
    // Calcular total
    const totalAmount = params.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Utilidad para parchar 'localhost' a '127.0.0.1' por validaciones estrictas de ePayco (IsValidUrlValidator)
    const secureUrl = (url: string) => url.replace('localhost', '127.0.0.1');

    // Mapeamos los datos al formato que espera checkout.js
    const payload = {
      name: params.items.map((i) => i.name).join(", "),
      description: params.items.map((i) => i.description ?? i.name).join(" | "),
      invoice: params.orderId,
      currency: params.currency.toLowerCase(),
      amount: String(totalAmount),
      tax_base: "0",
      tax: "0",
      country: "co",
      lang: "es",

      // URLs
      external: "false", // 'false' abre el modal en la misma página, 'true' redirige
      response: secureUrl(params.returnUrl),
      confirmation: secureUrl(params.returnUrl), // Idealmente enviar a webhook POST endpoint del server

      // Cliente
      name_billing: params.customer.name,
      email_billing: params.customer.email,
      type_doc_billing: "cc",
      number_doc_billing: params.customer.document ?? "0000000000",
      mobilephone_billing: params.customer.phone ?? "",
      
      // Metadata (ePayco permite extra1, extra2...)
      extra1: params.orderId
    };

    // Serializar a Base64 y codificar para la URL
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const safePayload = encodeURIComponent(payloadBase64);

    // Devolvemos el ID y la URL a nuestra propia ruta Nuxt de redirección
    return {
      chargeId: params.orderId,
      redirectUrl: `/payment/epayco?payload=${safePayload}`,
      status: "created",
    };
  }

  /**
   * Crea una suscripción recurrente con ePayco.
   * Flujo de 3 pasos según la documentación oficial del SDK (epayco-node):
   *   1. Tokenizar la tarjeta  → epayco.token.create()
   *   2. Crear cliente         → epayco.customers.create()
   *   3. Crear suscripción     → epayco.subscriptions.create()
   *
   * Documentación: https://github.com/epayco/epayco-node
   */
  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<SubscriptionResponse> {
    const epayco = createEpaycoClient();

    try {
      // ── Paso 1: Tokenizar la tarjeta ────────────────────────────────────────
      // Se acepta un token pre-generado o los datos crudos de la tarjeta.
      let tokenId: string = params.token ?? "";

      if (!tokenId && params.cardData) {
        const card: CardData = params.cardData;

        // ePayco requiere el año en 4 dígitos (ej. "2025"). Normalizar si viene como "25".
        const expYear = card.exp_year.length === 2 ? `20${card.exp_year}` : card.exp_year;

        const tokenResponse = await epayco.token.create({
          "card[number]":    card.number.replace(/\s/g, ""),
          "card[exp_year]":  expYear,
          "card[exp_month]": card.exp_month,
          "card[cvc]":       card.cvc,
          "hasCvv":          true,
        });

        if (!tokenResponse?.id) {
          const detail = tokenResponse?.message || tokenResponse?.error || JSON.stringify(tokenResponse);
          console.error("[EpaycoProvider] token.create falló:", detail);
          throw createError({ statusCode: 502, message: `Error al tokenizar tarjeta: ${detail}` });
        }

        tokenId = tokenResponse.id;
        console.info("[EpaycoProvider] token creado:", tokenId);
      }

      if (!tokenId) {
        throw createError({ statusCode: 400, message: "Se requiere token o datos de la tarjeta para crear la suscripción." });
      }

      // ── Paso 2: Crear cliente ───────────────────────────────────────────────
      // Dividir el displayName en nombre/apellido. ePayco rechaza strings vacíos.
      const nameParts  = (params.customer.name || "Usuario").trim().split(/\s+/);
      const firstName  = nameParts[0];
      const lastName   = nameParts.slice(1).join(" ") || firstName; // fallback al mismo nombre

      const customerPayload: Record<string, unknown> = {
        token_card: tokenId,
        name:       firstName,
        last_name:  lastName,
        email:      params.customer.email,
        default:    true,
      };
      // Solo incluir phone si tiene valor (ePayco rechaza el campo vacío)
      if (params.customer.phone) {
        customerPayload.phone      = params.customer.phone;
        customerPayload.cell_phone = params.customer.phone;
      }

      console.info("[EpaycoProvider] customers.create payload:", JSON.stringify(customerPayload));
      const customerResponse = await epayco.customers.create(customerPayload);
      console.info("[EpaycoProvider] customers.create response:", JSON.stringify(customerResponse));

      const customerId: string =
        customerResponse?.data?.customerId ??
        customerResponse?.data?.id ??
        customerResponse?.customerId ??
        "";

      if (!customerId) {
        const detail = JSON.stringify(customerResponse);
        console.error("[EpaycoProvider] customers.create falló - full response:", detail);
        throw createError({ statusCode: 502, message: `Error al crear cliente en ePayco: ${customerResponse?.message ?? detail}` });
      }

      console.info("[EpaycoProvider] cliente creado:", customerId);

      // ── Paso 3: Crear la suscripción ────────────────────────────────────────
      // Nota: url_confirmation debe ser una URL pública (no localhost).
      // Solo la incluimos si no apunta a localhost para evitar rechazo de ePayco.
      const subPayload: Record<string, unknown> = {
        id_plan:    params.planId,
        customer:   customerId,
        token_card: tokenId,
        doc_type:   "CC",
        doc_number: params.customer.document ?? "1234567890",
      };
      if (params.returnUrl && !params.returnUrl.includes("localhost")) {
        subPayload.url_confirmation    = params.returnUrl;
        subPayload.method_confirmation = "POST";
      }

      console.info("[EpaycoProvider] subscriptions.create payload:", JSON.stringify(subPayload));
      const subscriptionResponse = await epayco.subscriptions.create(subPayload);
      console.info("[EpaycoProvider] subscriptions.create response:", JSON.stringify(subscriptionResponse));

      // Verificar que la suscripción se creó correctamente
      if (subscriptionResponse?.status === false || subscriptionResponse?.error) {
        const detail = JSON.stringify(subscriptionResponse);
        console.error("[EpaycoProvider] subscriptions.create falló - full response:", detail);
        throw createError({ statusCode: 502, message: `Error al crear suscripción en ePayco: ${subscriptionResponse?.message ?? detail}` });
      }

      console.info("[EpaycoProvider] suscripción creada:", subscriptionResponse?.data);

      return {
        subscriptionId: subscriptionResponse?.data?.id ?? subscriptionResponse?.data?.subcription_id ?? customerId,
        redirectUrl:    subscriptionResponse?.data?.routeCheckout ?? "",
        status:         "pending",
        raw:            subscriptionResponse?.data,
      };
    } catch (err: any) {
      // Re-lanzar errores ya formateados con createError
      if (err.statusCode) throw err;

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

  /**
   * Petición para dar de baja la suscripción en ePayco.
   * Cancela cobros futuros, el usuario no vuelve a ser facturado.
   */
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; raw?: Record<string, unknown> }> {
    const epayco = createEpaycoClient();
    try {
      // ePayco SDK usa el id de la suscripción armada con su token
      const response = await epayco.subscriptions.cancel(subscriptionId);
      
      return {
        success: response.status === true || response.success === true,
        raw: response,
      };
    } catch (error) {
      console.error("[EpaycoProvider] cancelSubscription error:", error);
      throw createError({
        statusCode: 502,
        message: "Error al intentar dar de baja la suscripción en ePayco",
      });
    }
  }
}
