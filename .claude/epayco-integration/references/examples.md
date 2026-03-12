# ePayco — Código Completo Probado en Producción

---

## 1. server/utils/providers/epaycoProvider.ts

```typescript
// @ts-expect-error: epayco-sdk-node no tiene tipos
import EpaycoModule from "epayco-sdk-node";
import {
  PaymentGateway,
  type CreateChargeParams,
  type CreateSubscriptionParams,
  type ChargeResponse,
  type SubscriptionResponse,
  type CardData,
} from "../paymentGateway";

function createEpaycoClient() {
  const config = useRuntimeConfig();
  const Epayco  = EpaycoModule.default || EpaycoModule;

  // CRÍTICO: epaycoPublicKey está bajo config.public, NO en el nivel raíz
  const apiKey     = config.public.epaycoPublicKey as string;
  const privateKey = config.epaycoPrivateKey as string;
  const isTest     = config.epaycoIsTest !== "false";

  if (!apiKey || !privateKey) {
    throw createError({ statusCode: 500,
      message: "[EpaycoProvider] Faltan EPAYCO_PUBLIC_KEY o EPAYCO_PRIVATE_KEY." });
  }
  try {
    return new (Epayco as any)({ apiKey, privateKey, lang: "ES", test: isTest });
  } catch {
    return (Epayco as any)({ apiKey, privateKey, lang: "ES", test: isTest });
  }
}

export class EpaycoProvider extends PaymentGateway {
  readonly providerName = "epayco";

  async createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
    const totalAmount = params.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity, 0
    );
    const secureUrl = (url: string) => url.replace("localhost", "127.0.0.1");
    const payload = {
      name:        params.items.map(i => i.name).join(", "),
      description: params.items.map(i => i.description ?? i.name).join(" | "),
      invoice:     params.orderId,
      currency:    params.currency.toLowerCase(),
      amount:      String(totalAmount),
      tax_base: "0", tax: "0",
      country: "co", lang: "es",
      external:     "false",
      response:     secureUrl(params.returnUrl),
      confirmation: secureUrl(params.returnUrl),
      name_billing:        params.customer.name,
      email_billing:       params.customer.email,
      type_doc_billing:    "cc",
      number_doc_billing:  params.customer.document ?? "0000000000",
      mobilephone_billing: params.customer.phone ?? "",
      extra1: params.orderId,
    };
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    return {
      chargeId:    params.orderId,
      redirectUrl: `/payment/epayco?payload=${encodeURIComponent(payloadBase64)}`,
      status:      "created",
    };
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResponse> {
    const epayco = createEpaycoClient();
    try {
      // ── Paso 1: Tokenizar tarjeta ─────────────────────────────────────────
      let tokenId: string = params.token ?? "";
      if (!tokenId && params.cardData) {
        const card: CardData = params.cardData;
        // Año DEBE ser 4 dígitos. hasCvv: true es obligatorio.
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
          throw createError({ statusCode: 502, message: `Error al tokenizar tarjeta: ${detail}` });
        }
        tokenId = tokenResponse.id;
        console.info("[EpaycoProvider] token creado:", tokenId);
      }
      if (!tokenId) throw createError({ statusCode: 400, message: "Se requiere token o datos de la tarjeta." });

      // ── Paso 2: Crear cliente ─────────────────────────────────────────────
      // No enviar strings vacíos — ePayco responde "Error validando datos"
      const nameParts = (params.customer.name || "Usuario").trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName  = nameParts.slice(1).join(" ") || firstName;
      const customerPayload: Record<string, unknown> = {
        token_card: tokenId,
        name:       firstName,
        last_name:  lastName,
        email:      params.customer.email,
        default:    true,
      };
      if (params.customer.phone) {
        customerPayload.phone      = params.customer.phone;
        customerPayload.cell_phone = params.customer.phone;
      }
      const customerResponse = await epayco.customers.create(customerPayload);
      const customerId: string =
        customerResponse?.data?.customerId ??
        customerResponse?.data?.id ??
        customerResponse?.customerId ?? "";
      if (!customerId) {
        throw createError({ statusCode: 502,
          message: `Error al crear cliente: ${customerResponse?.message ?? JSON.stringify(customerResponse)}` });
      }
      console.info("[EpaycoProvider] cliente creado:", customerId);

      // ── Paso 3: Crear suscripción ─────────────────────────────────────────
      // id_plan = el campo "id_plan" del plan (NO el _id de MongoDB de la URL)
      // url_confirmation NO puede apuntar a localhost
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
      const subResponse = await epayco.subscriptions.create(subPayload);
      if (subResponse?.status === false || subResponse?.error) {
        const errors = subResponse?.data?.errors;
        const detail = errors
          ? JSON.stringify(errors)
          : (subResponse?.message ?? JSON.stringify(subResponse));
        throw createError({ statusCode: 502, message: `Error al crear suscripción: ${detail}` });
      }
      // El id está en subResponse.id (no en subResponse.data.id)
      return {
        subscriptionId: subResponse?.id ?? subResponse?.data?.id ?? customerId,
        redirectUrl:    subResponse?.data?.routeCheckout ?? "",
        status:         "pending",
        raw:            subResponse,
      };
    } catch (err: any) {
      if (err.statusCode) throw err;
      console.error("[EpaycoProvider] createSubscription error:", err);
      throw createError({ statusCode: 502, message: "Error al crear la suscripción con ePayco" });
    }
  }

  async getTransactionStatus(transactionId: string) {
    const epayco = createEpaycoClient();
    const response = await epayco.charge.get(transactionId);
    const statusMap: Record<string, "pending"|"approved"|"rejected"|"failed"> = {
      aceptada: "approved", rechazada: "rejected", pendiente: "pending", fallida: "failed",
      accepted: "approved", rejected: "rejected",  pending:   "pending", failed:   "failed",
    };
    return {
      status: statusMap[(response.data?.status ?? "").toLowerCase()] ?? "pending",
      raw:    response.data,
    };
  }

  async cancelSubscription(subscriptionId: string) {
    const epayco = createEpaycoClient();
    // El SDK construye internamente: { id: subscriptionId, public_key: apiKey }
    const response = await epayco.subscriptions.cancel(subscriptionId);
    return {
      success: response.status === true || response.success === true,
      raw:     response,
    };
  }
}
```

---

## 2. server/utils/paymentGateway.ts — Interfaces relevantes

```typescript
export interface CardData {
  number:    string;
  exp_month: string;
  exp_year:  string;  // 4 dígitos: "2025"
  cvc:       string;
}

export interface CreateSubscriptionParams {
  planId:    string;
  customer:  PaymentCustomer;
  token?:    string;
  cardData?: CardData;
  trialDays?: number;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}
```

---

## 3. server/api/protected/payments/subscribe.post.ts

```typescript
import { getPaymentProvider } from "../../../utils/paymentGateway";
import type { CreateSubscriptionParams } from "../../../utils/paymentGateway";

function validate(body: Partial<CreateSubscriptionParams>): string | null {
  if (!body.planId?.trim())    return "planId es requerido";
  if (!body.customer?.name)    return "customer.name es requerido";
  if (!body.customer?.email)   return "customer.email es requerido";
  if (!body.returnUrl?.trim()) return "returnUrl es requerido";
  if (!body.cancelUrl?.trim()) return "cancelUrl es requerido";
  const hasToken    = !!body.token?.trim();
  const hasCardData = !!(body.cardData?.number && body.cardData.exp_month
                        && body.cardData.exp_year && body.cardData.cvc);
  if (!hasToken && !hasCardData)
    return "Se requiere token o datos completos de la tarjeta";
  return null;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<CreateSubscriptionParams>>(event);
  const err  = validate(body);
  if (err) throw createError({ statusCode: 400, message: err });

  const gateway      = await getPaymentProvider();
  const subscription = await gateway.createSubscription(body as CreateSubscriptionParams);
  return { success: true, subscriptionId: subscription.subscriptionId, status: subscription.status };
});
```

---

## 4. server/api/protected/payments/cancel-subscription.post.ts

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody<{ subscriptionId?: string }>(event);
  if (!body.subscriptionId?.trim())
    throw createError({ statusCode: 400, message: "subscriptionId es requerido" });

  const gateway = await getPaymentProvider();
  const result  = await gateway.cancelSubscription(body.subscriptionId);
  return { success: result.success, message: result.success ? "Suscripción cancelada" : "No se pudo cancelar" };
});
```

---

## 5. app/composables/usePayment.ts — createNativeSubscription

```typescript
async function createNativeSubscription(params: {
  planId:   string;
  cardData: { number: string; exp_month: string; exp_year: string; cvc: string };
  document?: string;
}) {
  if (!user.value) { paymentError.value = "Debes iniciar sesión."; return null; }
  isLoading.value   = true;
  paymentError.value = null;
  try {
    const idToken  = await getIdToken();
    const response = await $fetch<{ success: boolean; subscriptionId: string; status: string }>(
      "/api/protected/payments/subscribe",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: {
          planId:   params.planId,
          cardData: params.cardData,
          customer: {
            name:     user.value.displayName || "Usuario",
            email:    user.value.email || "",
            document: params.document ?? "1234567890",
          },
          returnUrl: `${window.location.origin}/dashboard`,
          cancelUrl: `${window.location.origin}/checkout`,
        },
      }
    );
    return response;
  } catch (err: any) {
    paymentError.value = err.data?.message || "Error al procesar la suscripción.";
    return null;
  } finally {
    isLoading.value = false;
  }
}
```

---

## 6. Frontend — Formulario de Suscripción (Vue)

```vue
<script setup lang="ts">
const { createNativeSubscription, isLoading, paymentError } = usePayment();
const cardData = reactive({ number: "", exp_month: "", exp_year: "", cvc: "" });

const handleSubscribe = async () => {
  // Sin window.ePayco — todo ocurre en el servidor
  const result = await createNativeSubscription({
    planId: "plan_pro_01",   // id_plan del plan en ePayco (NO el _id de MongoDB)
    cardData: {
      number:    cardData.number,
      exp_month: cardData.exp_month,
      exp_year:  cardData.exp_year,  // usuario ingresa YYYY (4 dígitos)
      cvc:       cardData.cvc,
    },
  });
  if (result?.success) {
    alert("¡Suscripción creada! ID: " + result.subscriptionId);
  }
};
</script>

<template>
  <div class="space-y-3">
    <input v-model="cardData.number"    placeholder="Número de Tarjeta" />
    <input v-model="cardData.exp_month" placeholder="Mes (MM)" />
    <input v-model="cardData.exp_year"  placeholder="Año (YYYY)" />
    <input v-model="cardData.cvc"       placeholder="CVC" type="password" />
    <div v-if="paymentError" class="text-red-400">{{ paymentError }}</div>
    <button :disabled="isLoading" @click="handleSubscribe">
      {{ isLoading ? "Procesando..." : "Suscribirse" }}
    </button>
  </div>
</template>
```

---

## 7. Endpoint temporal para listar planes (encontrar id_plan)

```typescript
// server/api/list-plans.get.ts  ← ELIMINAR en producción
import EpaycoModule from "epayco-sdk-node";
export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const Epayco = (EpaycoModule as any).default || EpaycoModule;
  const epayco = new (Epayco as any)({
    apiKey:     config.public.epaycoPublicKey,
    privateKey: config.epaycoPrivateKey,
    lang: "ES", test: config.epaycoIsTest !== "false",
  });
  return await epayco.plans.list();
  // En la respuesta buscar: data[].id_plan  ← este es el correcto
  //                         data[]._id      ← NO usar en subscriptions.create
});
```

Abrir en browser: `http://localhost:3000/api/list-plans`

---

## 8. Response Structures Reales

### token.create exitoso
```json
{ "id": "9b31bf4fb2f3d7f820db512", "status": true }
```

### customers.create exitoso
```json
{
  "status": true, "success": true, "type": "Create Customer",
  "data": {
    "customerId": "9b31c7b6227494eaa0772e1",
    "email": "usuario@ejemplo.com",
    "name": "Alexander"
  },
  "object": "customer"
}
```

### subscriptions.create exitoso
```json
{
  "status": true,
  "message": "Suscripción creada",
  "id": "9b31e54de548ebfe30ee392",
  "status_subscription": "inactive",
  "customer": { "_id": "9b31c7b6...", "name": "Alexander" },
  "object": "subscription"
}
```
> `status_subscription: "inactive"` es normal al crear. Se activa cuando ePayco procesa el primer cobro.

### subscriptions.create con error de plan
```json
{
  "status": false,
  "message": "Error validando datos",
  "data": { "errors": { "id_plan": ["The id plan doesn't exist."] } },
  "statusCode": 400
}
```

### plans.list — para encontrar el id_plan correcto
```json
{
  "status": true, "data": [{
    "_id": "9b20a855fd42df8fc07e2be",
    "id_plan": "plan_pro_01",
    "name": "plan_pro_01",
    "amount": 15, "currency": "USD",
    "interval": "month", "interval_count": 1,
    "status": "active"
  }]
}
```
