---
name: epayco-integration
description: Implementación completa y probada de ePayco en aplicaciones Nuxt/Firebase. Usa esta skill SIEMPRE que necesites integrar pagos únicos (checkout modal), suscripciones recurrentes con tarjeta, cancelación de suscripciones, o webhooks de confirmación con ePayco. Incluye los gotchas reales descubiertos en producción, los formatos exactos de cada API call, y los response structures reales del SDK. Actívala también si el usuario menciona epayco-sdk-node, planes de suscripción, tokens de tarjeta, o errores como "Error validando datos" o "The id plan doesn't exist".
---

# ePayco Integration (Nuxt 4 + Firebase)

Guía probada en producción. Incluye todos los errores comunes y sus soluciones.

## Regla más importante

**NUNCA uses el SDK de ePayco del navegador (`window.ePayco`) para suscripciones.**
`window.ePayco.API` no es un constructor. `window.ePayco.setPrivateKey` no existe.
Todo el flujo de suscripción va en el **servidor** con `epayco-sdk-node`.

---

## Variables de Entorno

```env
EPAYCO_PUBLIC_KEY=tu_llave_publica
EPAYCO_PRIVATE_KEY=tu_llave_privada
EPAYCO_SECRET_KEY=tu_llave_secreta       # para validar webhooks
EPAYCO_IS_TEST="true"
```

### En nuxt.config.ts — CRÍTICO

```ts
runtimeConfig: {
  epaycoPrivateKey: process.env.EPAYCO_PRIVATE_KEY,
  epaycoSecretKey:  process.env.EPAYCO_SECRET_KEY,
  epaycoIsTest:     process.env.EPAYCO_IS_TEST ?? "true",
  public: {
    epaycoPublicKey: process.env.EPAYCO_PUBLIC_KEY,  // ← DEBE estar bajo public
  }
}
```

**GOTCHA:** En el servidor, la public key es `config.public.epaycoPublicKey`.
Usar `config.epaycoPublicKey` devuelve `undefined` y el SDK falla con un `TypeError` genérico.

---

## Arquitectura

```
server/utils/paymentGateway.ts          ← Interfaz genérica + Factory
server/utils/providers/epaycoProvider.ts ← Implementación ePayco
server/api/protected/payments/
  checkout.post.ts                      ← Pago único
  subscribe.post.ts                     ← Suscripción recurrente
  cancel-subscription.post.ts           ← Cancelar suscripción
app/composables/usePayment.ts           ← Composable de UI
```

El frontend NUNCA importa nada de ePayco directamente. Solo llama a los endpoints.

---

## Flujo de Suscripciones (3 pasos, 100% servidor)

### Paso 1 — Tokenizar la tarjeta

```ts
const tokenResponse = await epayco.token.create({
  "card[number]":    cardNumber.replace(/\s/g, ""),
  "card[exp_year]":  year.length === 2 ? `20${year}` : year, // YYYY obligatorio
  "card[exp_month]": month,   // string: "12"
  "card[cvc]":       cvc,
  "hasCvv":          true,    // obligatorio, sin esto falla
});
const tokenId = tokenResponse?.id;  // campo .id, no .token_id ni .token
```

Errores: `"Error validando datos"` → año en 2 dígitos o sin `hasCvv: true`.

### Paso 2 — Crear cliente

```ts
const nameParts = (fullName || "Usuario").trim().split(/\s+/);
const firstName  = nameParts[0];
const lastName   = nameParts.slice(1).join(" ") || firstName; // nunca vacío

const customerPayload: Record<string, unknown> = {
  token_card: tokenId,
  name:       firstName,
  last_name:  lastName,   // requerido, NUNCA enviar string vacío
  email:      email,
  default:    true,
};
// Solo incluir phone si no está vacío — string vacío → "Error validando datos"
if (phone) { customerPayload.phone = phone; customerPayload.cell_phone = phone; }

const customerResponse = await epayco.customers.create(customerPayload);
const customerId = customerResponse?.data?.customerId;
```

### Paso 3 — Crear suscripción

```ts
const subPayload: Record<string, unknown> = {
  id_plan:    planId,      // el campo "id_plan" del plan, NO el _id de MongoDB
  customer:   customerId,
  token_card: tokenId,
  doc_type:   "CC",
  doc_number: document || "1234567890",
};
// NO incluir url_confirmation con localhost
if (returnUrl && !returnUrl.includes("localhost")) {
  subPayload.url_confirmation    = returnUrl;
  subPayload.method_confirmation = "POST";
}

const subResponse = await epayco.subscriptions.create(subPayload);
const subscriptionId = subResponse?.id ?? subResponse?.data?.id;
```

**GOTCHA CRÍTICO — id_plan:**
El `id_plan` es el identificador textual del plan (ej: `"plan_pro_01"`).
NO es el `_id` de MongoDB que aparece en la URL de la landing:
`https://subscription-landing.epayco.co/plan/9b20a855...` ← ese NO es el id_plan.

Para ver el `id_plan` correcto: `GET /api/list-plans` (ver código en `references/examples.md`).

---

## Tabla de Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `TypeError: auth['bearer_token']` | `config.epaycoPublicKey` es undefined | Usar `config.public.epaycoPublicKey` |
| `window.ePayco.API is not a constructor` | SDK del browser | Mover lógica al servidor con epayco-sdk-node |
| `window.ePayco.setPrivateKey is not a function` | Ese método no existe en browser | Usar epayco-sdk-node en el servidor |
| `"Error validando datos"` en token | Año en 2 dígitos (`25`) o sin `hasCvv: true` | Año YYYY, agregar `hasCvv: true` |
| `"Error validando datos"` en customer | `last_name: ""` o `phone: ""` vacíos | No enviar campos opcionales vacíos |
| `"The id plan doesn't exist."` | Se usó el `_id` MongoDB en vez del `id_plan` | Usar el campo `id_plan` (texto) |
| `"Error validando datos"` en subscription | `url_confirmation` apunta a localhost | Omitir `url_confirmation` en desarrollo |

---

## Tarjetas de Prueba (modo test)

| Número | Franquicia | Resultado |
|--------|-----------|-----------|
| `4575623182290326` | Visa | Aprobada |
| `4111111111111111` | Visa | Aprobada |
| `5170394490379434` | Mastercard | Aprobada |

Usar mes `12`, año `2025` (4 dígitos), CVC `123`.

---

Para el código completo de `epaycoProvider.ts`, `subscribe.post.ts`, `cancel-subscription.post.ts`,
`usePayment.ts`, y el formulario Vue — ver `references/examples.md`.
