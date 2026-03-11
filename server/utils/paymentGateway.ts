// server/utils/paymentGateway.ts
// Interfaz base del sistema de pagos — Patrón Adapter/Strategy.
//
// PRINCIPIO:
//   El frontend NUNCA sabe qué proveedor de pagos se usa.
//   Solo llama a /api/protected/payments/checkout y recibe una respuesta genérica.
//   El backend elige el proveedor según la configuración.
//
// PARA AGREGAR UN NUEVO PROVEEDOR (ej. Stripe):
//   1. Crea server/utils/providers/stripeProvider.ts
//   2. Implementa la clase extendiendo PaymentGateway
//   3. Cambia la factory getPaymentProvider() para instanciar Stripe

// ── Tipos genéricos ───────────────────────────────────────────────────────────

/** Datos del cliente pagador */
export interface PaymentCustomer {
  name: string;
  email: string;
  phone?: string;
  /** Documento de identidad (requerido por ePayco) */
  document?: string;
}

/** Ítem de la orden de compra */
export interface PaymentItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  /** Precio unitario en centavos (o la moneda base del proveedor) */
  unitPrice: number;
}

/** Parámetros para crear un cargo único */
export interface CreateChargeParams {
  orderId: string;
  currency: string; // "COP", "USD", etc.
  customer: PaymentCustomer;
  items: PaymentItem[];
  /** URL de retorno tras el pago (éxito) */
  returnUrl: string;
  /** URL de retorno tras cancelación */
  cancelUrl: string;
  /** Metadata adicional libre */
  metadata?: Record<string, string>;
}

/** Parámetros para crear una suscripción recurrente */
export interface CreateSubscriptionParams {
  planId: string;
  customer: PaymentCustomer;
  trialDays?: number;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/** Respuesta genérica de creación de cobro */
export interface ChargeResponse {
  /** Identificador del cobro en el proveedor */
  chargeId: string;
  /** URL a la que el frontend debe redirigir al usuario para pagar */
  redirectUrl: string;
  /** Token o referencia de la transacción (opcional, depende del proveedor) */
  token?: string;
  /** Estado inicial: pending | created */
  status: "pending" | "created";
  /** Datos adicionales del proveedor */
  raw?: Record<string, unknown>;
}

/** Respuesta genérica de creación de suscripción */
export interface SubscriptionResponse {
  subscriptionId: string;
  redirectUrl: string;
  status: "pending" | "active";
  raw?: Record<string, unknown>;
}

// ── Clase base abstracta (Adapter) ────────────────────────────────────────────

/**
 * Clase base que todos los proveedores de pago deben extender.
 * Garantiza que el resto del sistema siempre trabaje contra esta interfaz.
 */
export abstract class PaymentGateway {
  /**
   * Nombre identificador del proveedor (para logs y diagnóstico).
   */
  abstract readonly providerName: string;

  /**
   * Crea un cobro único y retorna la URL de pago.
   */
  abstract createCharge(params: CreateChargeParams): Promise<ChargeResponse>;

  /**
   * Crea una suscripción recurrente.
   */
  abstract createSubscription(
    params: CreateSubscriptionParams
  ): Promise<SubscriptionResponse>;

  /**
   * Verifica el estado de una transacción existente.
   */
  abstract getTransactionStatus(transactionId: string): Promise<{
    status: "pending" | "approved" | "rejected" | "failed";
    raw?: Record<string, unknown>;
  }>;
}

// ── Factory: selecciona el proveedor activo ───────────────────────────────────

/**
 * Retorna la instancia del proveedor de pagos configurado.
 * Lee la variable de entorno PAYMENT_PROVIDER para decidir.
 * Por defecto usa ePayco.
 *
 * @example
 * const gateway = getPaymentProvider()
 * const charge = await gateway.createCharge({ ... })
 */
export async function getPaymentProvider(): Promise<PaymentGateway> {
  const provider = process.env.PAYMENT_PROVIDER ?? "epayco";

  switch (provider.toLowerCase()) {
    case "epayco": {
      const { EpaycoProvider } = await import("./providers/epaycoProvider");
      return new EpaycoProvider();
    }
    // Ejemplo de cómo agregar Stripe en el futuro:
    // case "stripe": {
    //   const { StripeProvider } = await import('./providers/stripeProvider')
    //   return new StripeProvider()
    // }
    default:
      throw new Error(`[PaymentGateway] Proveedor desconocido: "${provider}"`);
  }
}
