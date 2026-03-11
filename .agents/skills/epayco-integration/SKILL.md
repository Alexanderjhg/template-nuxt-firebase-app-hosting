---
name: epayco-integration
description: Implementación y gestión de pagos con ePayco en aplicaciones Nuxt/Firebase. Usa esta skill cuando necesites crear flujos de pago (Checkout), integrar diferentes métodos (Tarjeta, PSE, Efectivo, Daviplata), manejar webhooks de confirmación, o consultar estados de transacciones. También es útil para implementar el patrón Adapter/Strategy para que el sistema de pagos sea modular y fácil de cambiar por otro proveedor en el futuro.
---

# ePayco Integration

Esta skill proporciona pautas y fragmentos de código para integrar de manera segura y modular la pasarela de pagos ePayco en un stack Nuxt (v3/v4) con Firebase.

## Principios de Diseño
- **Modularidad**: El sistema debe usar el patrón de diseño "Adapter". El frontend nunca debe saber que se usa ePayco, solo debe llamar a una API genérica.
- **Seguridad**: Las llaves privadas y el procesamiento sensible ocurren exclusivamente en el servidor (Nitro).
- **Consistencia**: Todas las respuestas al frontend deben ser normalizadas (success, chargeId, status, redirectUrl).

## Estructura de Archivos Recomendada
```text
server/
├── utils/
│   ├── paymentGateway.ts       # Base class y Factory
│   └── providers/
│       └── epaycoProvider.ts   # Adaptador de ePayco
├── api/
│   └── protected/
│       └── payments/
│           └── checkout.post.ts # Endpoint genérico
app/
├── composables/
│   └── usePayment.ts           # Hook para manejar UI de pagos
└── components/
    └── Payment/
        └── EpaycoForm.vue      # UI específica (opcional si usas checkout)
```

## Ejemplos de Implementación

### 1. Servidor: Adaptador Modular (Pattern Adapter)
```typescript
// server/utils/providers/epaycoProvider.ts
import { PaymentGateway } from "../paymentGateway";
// Importar SDK de ePayco

export class EpaycoProvider extends PaymentGateway {
  async createCharge(params: any) {
    // Lógica para mapear params genéricos a la API de ePayco
    // Retornar objeto normalizado
    return {
      chargeId: '...',
      status: 'pending',
      redirectUrl: '...'
    };
  }
}
```

### 2. Frontend: Manejo de Respuesta y Redirección
Para pagos con PSE o que requieren interacción externa, siempre manejar la redirección o el iframe de forma segura.

### 3. Estados de Transacción Normalizados
| Estado ePayco | Estado Sistema | Acción Recomendada |
|---------------|----------------|--------------------|
| Aceptada      | approved       | Entregar producto  |
| Pendiente     | pending        | Mostrar mensaje de espera |
| Rechazada     | rejected       | Pedir otro medio   |
| Fallida       | failed         | Mostrar error      |

## Pasos para Integrar un nuevo Método de Pago
1. Definir el schema de datos en el `paymentGateway`.
2. Implementar el método específico (PSE, Card, etc) en el provider.
3. Configurar las variables de entorno `EPAYCO_PUBLIC_KEY` y `EPAYCO_PRIVATE_KEY` en `apphosting.yaml`.

## Webhooks y Confirmación
- Siempre validar la firma enviada por ePayco en el webhook antes de actualizar el estado en Firestore.
- Responder con un `200 OK` rápido para evitar reintentos innecesarios del servidor de ePayco.
