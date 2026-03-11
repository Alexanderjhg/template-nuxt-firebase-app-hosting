# ePayco Code Examples (Full Examples)

## 1. COMPONENTE - Pago con tarjeta de crédito
// pages/checkout-epayco.vue
<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8">Checkout con ePayco</h1>
    <!-- ... Resto del componente ... -->
  </div>
</template>
<script setup lang="ts">
import { useCartStore } from '~/stores/cart.store'
const cartStore = useCartStore()
const handlePaymentSuccess = async (result: any) => {
  // Lógica de éxito
  await router.push(`/order-confirmation/${result.transactionId}`)
}
</script>

## 2. COMPOSABLE - useEpayco Avanzado (PSE, Cash, Daviplata)
```typescript
import { ref } from 'vue'
export const useEpaycoAdvanced = () => {
  const loading = ref(false)
  const bankList = ref<any[]>([])

  const loadBanks = async () => { /* ... */ }
  const processPSEPayment = async (pseInfo: any) => { /* ... */ }
  const processCashPayment = async (cashType: string, cashInfo: any) => { /* ... */ }

  return { loading, bankList, loadBanks, processPSEPayment, processCashPayment }
}
```

## 3. SERVIDOR - Endpoint de Pago PSE
// server/api/payments/epayco/pse.post.ts
```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  // Crear pago PSE con epaycoMethods
  return { success: true, redirectUrl: '...' }
})
```

## 4. VERIFICAR ESTADO - useEpaycoStatus.ts
```typescript
export const useEpaycoStatus = () => {
  const checkPaymentStatus = async (transactionId: string) => {
    const charge = await epaycoMethods.getCharge(transactionId)
    return charge
  }
  return { checkPaymentStatus }
}
```

## 5. PÁGINA DE CONFIRMACIÓN
// pages/order-confirmation/[transactionId].vue
```vue
<template>
  <div v-if="paymentStatus === 'approved'">
     ✓ Pago Exitoso
  </div>
</template>
```
