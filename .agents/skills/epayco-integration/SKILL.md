---
name: epayco-integration
description: Implementación completa y probada de ePayco en aplicaciones Nuxt/Firebase. Usa esta skill SIEMPRE que necesites integrar pagos únicos (checkout modal), suscripciones recurrentes con tarjeta, cancelación de suscripciones, o webhooks de confirmación con ePayco. Incluye los gotchas reales descubiertos en producción, los formatos exactos de cada API call, y los response structures reales del SDK. Actívala también si el usuario menciona epayco-sdk-node, planes de suscripción, tokens de tarjeta, o errores como "Error validando datos".
---

# ePayco Integration (Nuxt 4 + Firebase)

Guía probada en producción. Incluye todos los errores comunes y sus soluciones.

## Variables de Entorno Requeridas

```env
# .env
EPAYCO_PUBLIC_KEY=tu_llave_publica       # va bajo runtimeConfig.public
EPAYCO_PRIVATE_KEY=tu_llave_privada      # va bajo runtimeConfig (server-only)
EPAYCO_SECRET_KEY=tu_llave_secreta       # para validar webhooks
EPAYCO_IS_TEST="true"                    # "true" o "false"
```

### En nuxt.config.ts — CRÍTICO
```ts
runtimeConfig: {
  epaycoPrivateKey: process.env.EPAYCO_PRIVATE_KEY,
  epaycoSecretKey:  process.env.EPAYCO_SECRET_KEY,
  epaycoIsTest:     process.env.EPAYCO_IS_TEST ?? "true",
  public: {
    epaycoPublicKey: process.env.EPAYCO_PUBLIC_KEY,  // ← bajo public
  }
}
```

**⚠ GOTCHA CRÍTICO:** En el servidor, la public key es `config.public.epaycoPublicKey` (NO `config.epaycoPublicKey`). Usar `config.epaycoPublicKey` devuelve `undefined`, el SDK falla silenciosamente en la autenticación JWT y lanza un TypeError genérico → 500.

---

## Arquitectura: Patrón Adapter

```
server/utils/paymentGateway.ts          ← Interfaz genérica + Factory
server/utils/providers/epaycoProvider.ts ← Implementación ePayco
server/api/protected/payments/
  checkout.post.ts                      ← Pago único
  subscribe.post.ts                     ← Suscripción recurrente
  cancel-subscription.post.ts           ← Cancelar suscripción
app/composables/usePayment.ts           ← Composable de UI
```

El frontend NUNCA importa nada de ePayco directamente. Solo llama a los endpoints genéricos.

---

## SDK: Inicialización Correcta

```ts
// @ts-expect-error: epayco-sdk-node no tiene tipos
import EpaycoModule from "epayco-sdk-node";

function createEpaycoClient() {
  const config = useRuntimeConfig();
  const Epayco  = EpaycoModule.default || EpaycoModule;

  const apiKey     = config.public.epaycoPublicKey as string; // ← public!
  const privateKey = config.epaycoPrivateKey as string;
  const isTest     = config.epaycoIsTest !== "false";

  if (!apiKey || !privateKey) {
    throw createError({ statusCode: 500,
      message: "Faltan EPAYCO_PUBLIC_KEY o EPAYCO_PRIVATE_KEY" });
  }

  try {
    return new (Epayco as any)({ apiKey, privateKey, lang: "ES", test: isTest });
  } catch {
    return (Epayco as any)({ apiKey, privateKey, lang: "ES", test: isTest });
  }
}
```

---

## Flujo de Suscripciones Recurrentes (3 pasos, 100% servidor)

**NO usar el JS de ePayco en el navegador** para suscripciones. `window.ePayco.API` no es un constructor y `window.ePayco.setPrivateKey` no existe. Todo el flujo va en el servidor con `epayco-sdk-node`.

### Paso 1 — Tokenizar la tarjeta

```ts
const tokenResponse = await epayco.token.create({
  "card[number]":    cardNumber.replace(/\s/g, ""),  // sin espacios
  "card[exp_year]":  year.length === 2 ? `20${year}` : year, // YYYY, no YY
  "card[exp_month]": month,   // "12", no 12
  "card[cvc]":       cvc,
  "hasCvv":          true,    // requerido, sin esto falla
});
// Response exitoso: { id: "9b31bf4f...", ... }
// ⚠ El campo es .id (no .token_id ni .token)
const tokenId = tokenResponse?.id;
```

**Errores comunes del token:**
- `"Error validando datos"` → año en 2 dígitos (`25`) en lugar de 4 (`2025`), o falta `hasCvv: true`
- Sin `id` en la respuesta → credenciales incorrectas o tarjeta inválida

### Paso 2 — Crear cliente

```ts
// Dividir nombre completo en nombre/apellido
const nameParts = (fullName || "Usuario").trim().split(/\s+/);
const firstName  = nameParts[0];
const lastName   = nameParts.slice(1).join(" ") || firstName; // nunca vacío

const customerPayload: Record<string, unknown> = {
  token_card: tokenId,
  name:       firstName,
  last_name:  lastName,   // requerido, no enviar string vacío
  email:      email,
  default:    true,
};
// Solo incluir phone si tiene valor (string vacío → "Error validando datos")
if (phone) { customerPayload.phone = phone; customerPayload.cell_phone = phone; }

const customerResponse = await epayco.customers.create(customerPayload);
// Response exitoso:
// { status: true, data: { customerId: "9b31c7b6...", email, name }, object: "customer" }
const customerId = customerResponse?.data?.customerId;
```

**Errores comunes del cliente:**
- `"Error validando datos"` → `last_name: ""` o `phone: ""` (strings vacíos en campos opcionales)
- Mismo email → ePayco devuelve el customerId existente (comportamiento correcto)

### Paso 3 — Crear suscripción

```ts
const subPayload: Record<string, unknown> = {
  id_plan:    planId,      // el campo "id_plan" del plan, NO el _id de MongoDB
  customer:   customerId,
  token_card: tokenId,
  doc_type:   "CC",        // CC | CE | NIT | TI | PP
  doc_number: document || "1234567890",
};
// NO incluir url_confirmation con localhost → ePayco lo rechaza
if (returnUrl && !returnUrl.includes("localhost")) {
  subPayload.url_confirmation    = returnUrl;
  subPayload.method_confirmation = "POST";
}

const subResponse = await epayco.subscriptions.create(subPayload);
// Response exitoso:
// { status: true, message: "Suscripción creada", id: "9b31e54d...",
//   status_subscription: "inactive", customer: {...}, ... }
// ⚠ El id de la suscripción está en subResponse.id (no en subResponse.data.id)
const subscriptionId = subResponse?.id ?? subResponse?.data?.id;
```

**⚠ GOTCHA CRÍTICO — id_plan:**
El `id_plan` es el identificador textual que pusiste al crear el plan (ej: `"plan_pro_01"`).
NO es el `_id` de MongoDB que aparece en la URL de la landing page
(`https://subscription-landing.epayco.co/plan/9b20a855...` ← ese NO es el id_plan).

Para listar tus planes y ver el `id_plan` correcto:
```ts
const plans = await epayco.plans.list();
// plans.data[].id_plan  ← este es el que va en subscriptions.create
// plans.data[]._id      ← este es el MongoDB _id (NO usar en subscriptions.create)
```

**Errores comunes de suscripción:**
- `"The id plan doesn't exist."` → estás usando el `_id` de MongoDB en lugar del `id_plan`
- `"Error validando datos"` → url_confirmation con localhost, o doc_number inválido

---

## Response Structures Reales (de producción)

### token.create exitoso
```json
{ "id": "9b31bf4fb2f3d7f820db512", "status": true }
```

### customers.create exitoso
```json
{
  "status": true, "success": true, "type": "Create Customer",
  "data": {
    "status": "exitoso",
    "description": "El cliente fue creado exitosamente con el id: 9b31c7b6...",
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
  "status": true, "message": "Suscripción creada", "success": true,
  "id": "9b31e54de548ebfe30ee392",
  "created": "12-03-2026",
  "current_period_start": "03/12/2026",
  "current_period_end": "12-03-2026",
  "status_subscription": "inactive",
  "customer": { "_id": "9b31c7b6...", "name": "Alexander", "email": "...", ... },
  "type": "Create Subscription",
  "object": "subscription"
}
```
> `status_subscription: "inactive"` es normal al crear. Se activa cuando ePayco procesa el primer cobro.

### plans.list — para encontrar el id_plan correcto
```json
{
  "status": true, "data": [{
    "_id": "9b20a855fd42df8fc07e2be",    ← NO usar esto en subscriptions.create
    "id_plan": "plan_pro_01",             ← ESTE es el que usa la API
    "name": "plan_pro_01",
    "amount": 15, "currency": "USD",
    "interval": "month", "interval_count": 1,
    "status": "active"
  }]
}
```

---

## Cancelar Suscripción

```ts
// Solo requiere el id de la suscripción (el "id" del response de create)
const result = await epayco.subscriptions.cancel(subscriptionId);
// El SDK construye internamente: { id: subscriptionId, public_key: apiKey }
// Response: { status: true } o { status: false, message: "..." }
```

---

## Pago Único (Checkout Modal)

Para pagos únicos NO se usa el SDK de Node. Se usa la URL del checkout de ePayco.
Ver `references/examples.md` → sección "Checkout Modal" para el flujo completo.

---

## Endpoints del Servidor

```
POST /api/protected/payments/subscribe
  body: { planId, cardData: { number, exp_month, exp_year, cvc }, customer: { name, email, document? }, returnUrl, cancelUrl }
  response: { success, subscriptionId, status }

POST /api/protected/payments/cancel-subscription
  body: { subscriptionId }
  response: { success, message }

POST /api/protected/payments/checkout
  body: { orderId, currency, items[], customer, returnUrl, cancelUrl, metadata? }
  response: { success, redirectUrl, chargeId }
```

---

## Tarjetas de Prueba (modo test)

| Número | Franquicia | Resultado |
|--------|-----------|-----------|
| `4575623182290326` | Visa | Aprobada |
| `4111111111111111` | Visa | Aprobada |
| `5170394490379434` | Mastercard | Aprobada |

Usar mes `12`, año `2025` (4 dígitos), CVC `123`.

---

Para el código completo de `epaycoProvider.ts`, `subscribe.post.ts`, y `usePayment.ts` ver `references/examples.md`.
