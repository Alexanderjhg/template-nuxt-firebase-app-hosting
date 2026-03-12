<!-- app/pages/checkout/test.vue -->
<template>
  <div class="min-h-screen relative bg-[#050510] text-slate-100 overflow-hidden font-inter">
    <!-- Background dynamic elements -->
    <div class="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/20 blur-[150px] rounded-full"></div>
    <div class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/15 blur-[120px] rounded-full"></div>
    
    <div class="container relative z-10 mx-auto px-4 py-16">
      <div class="max-w-4xl mx-auto">
        <!-- Header Section -->
        <header class="mb-12 text-center animate-fade-in">
          <h1 class="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
            Confirmación de Pago
          </h1>
          <p class="text-slate-400 text-lg">Revisa tu pedido antes de proceder al pago seguro con ePayco.</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <!-- Main Content (Items) -->
          <div class="lg:col-span-3 space-y-6">
            <h2 class="text-xl font-bold px-2 flex items-center gap-2">
              <span class="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">1</span>
              Tus artículos
            </h2>
            
            <UICard v-for="item in cartItems" :key="item.id">
              <div class="flex items-center gap-5">
                <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center text-3xl shadow-inner">
                  {{ item.icon }}
                </div>
                <div class="flex-grow">
                  <h3 class="text-xl font-bold">{{ item.name }}</h3>
                  <p class="text-slate-400 text-sm mb-2">{{ item.description }}</p>
                  <div class="flex items-center justify-between">
                    <span class="text-slate-500 text-sm">Cantidad: {{ item.quantity }}</span>
                    <span class="font-bold text-lg text-blue-400">{{ formatCurrency(item.unitPrice) }}</span>
                  </div>
                </div>
              </div>
            </UICard>
            
            <!-- Auth Warning -->
            <div v-if="!user" class="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl animate-pulse">
              <div class="flex gap-4">
                <span class="text-2xl text-amber-500">⚠️</span>
                <p class="text-amber-200/80">Debes <NuxtLink to="/login" class="underline font-bold hover:text-amber-400">iniciar sesión</NuxtLink> para continuar con el pago.</p>
              </div>
            </div>
          </div>

          <!-- Checkout Sidebar -->
          <div class="lg:col-span-2 space-y-6">
            <h2 class="text-xl font-bold px-2 flex items-center gap-2">
              <span class="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">2</span>
              Resumen
            </h2>
            
            <UICard>
              <div class="space-y-4">
                <div class="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{{ formatCurrency(totalAmount) }}</span>
                </div>
                <div class="flex justify-between text-slate-400">
                  <span>Impuestos (0%)</span>
                  <span>$0</span>
                </div>
                <div class="h-px bg-white/10 my-4"></div>
                <div class="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span class="text-blue-500">{{ formatCurrency(totalAmount) }}</span>
                </div>

                <div v-if="paymentError" class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm mt-4 animate-shake">
                  {{ paymentError }}
                </div>

                <div class="mt-6 flex flex-col gap-3">
                  <!-- Toggle / Tabs para tipo de pago -->
                  <div class="flex p-1 bg-white/5 rounded-xl flex-wrap justify-between">
                    <button 
                      class="flex-1 min-w-[30%] py-2 text-xs font-medium rounded-lg transition-colors"
                      :class="paymentType === 'one-time' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
                      @click="paymentType = 'one-time'"
                    >
                      Pago Único
                    </button>
                    <button 
                      class="flex-1 min-w-[30%] py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      :class="paymentType === 'subscription' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
                      @click="paymentType = 'subscription'"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Suscribirse
                    </button>
                    <button 
                      class="flex-1 min-w-[30%] py-2 text-xs font-medium rounded-lg transition-colors"
                      :class="paymentType === 'cancel' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
                      @click="paymentType = 'cancel'"
                    >
                      Dar de Baja
                    </button>
                  </div>

                  <!-- Botón Principal Condicional -->
                  <UIButton 
                    v-if="paymentType === 'one-time'"
                    class="w-full py-4 text-xl" 
                    :loading="isLoading" 
                    :disabled="!user"
                    @click="handleCheckout"
                  >
                    Pagar Ahora ($170)
                  </UIButton>

                  <div v-else-if="paymentType === 'subscription'" class="space-y-4">
                    <p class="text-sm text-slate-400">Introduce los datos de la tarjeta para habilitar el débito automático de tu plan (Datos procesados directamente por ePayco).</p>
                    <div class="space-y-3">
                      <input v-model="cardData.name" type="text" placeholder="Nombre en la Tarjeta" class="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                      <input v-model="cardData.email" type="email" placeholder="Correo electrónico" class="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                      <input v-model="cardData.number" type="text" placeholder="Número de la Tarjeta (Ej. 4111...)" class="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                      <div class="flex gap-3">
                        <input v-model="cardData.exp_month" type="text" placeholder="Mes (MM)" class="w-1/3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                        <input v-model="cardData.exp_year" type="text" placeholder="Año (YYYY)" class="w-1/3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                        <input v-model="cardData.cvc" type="password" placeholder="CVC" class="w-1/3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    
                    <UIButton 
                      class="w-full py-4 text-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 border-none mt-2" 
                      :loading="isLoading" 
                      :disabled="!user || !cardData.number"
                      @click="handleSubscribe"
                    >
                      Suscribirse Mensual ($50/mes)
                    </UIButton>
                  </div>

                  <!-- Panel de Cancelación (Demo) -->
                  <div v-else-if="paymentType === 'cancel'" class="space-y-4">
                     <p class="text-sm text-slate-400">Pega el ID de tu suscripción para cancelarla de forma segura desde nuestro Backend.</p>
                     <input 
                       v-model="subIdToCancel"
                       type="text" 
                       placeholder="Ejemplo: Ld9hG..." 
                       class="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
                     />
                      <UIButton 
                      class="w-full py-3 bg-red-600 hover:bg-red-500 border-none mt-2" 
                      :loading="isLoading" 
                      :disabled="!user || subIdToCancel.length < 3"
                      @click="handleCancelSubscription"
                    >
                      Cancelar Suscripción Definitiva
                    </UIButton>
                  </div>
                </div>
                
                <div class="flex items-center justify-center gap-4 mt-6 opacity-40 hover:opacity-100 transition-opacity">
                   <span class="text-xs uppercase tracking-widest text-slate-500">Pagos Seguros por</span>
                   <img src="https://multimedia.epayco.co/epayco-landing/v2/img/logo-epayco.png" alt="ePayco" class="h-6 filter grayscale brightness-200">
                </div>
              </div>
            </UICard>
            
            <p class="text-xs text-center text-slate-500 mt-4 italic">
              Al hacer clic en "Pagar Ahora", serás redirigido a la pasarela segura de ePayco para completar tu transacción. Ningún dato de tarjeta se almacena en nuestros servidores.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth();
const { startCheckout, cancelSubscription, createNativeSubscription, isLoading, paymentError } = usePayment();

const paymentType = ref<'one-time' | 'subscription' | 'cancel'>('one-time');
const subIdToCancel = ref('');

const cardData = reactive({
  number: '',
  exp_month: '',
  exp_year: '',
  cvc: '',
  name: '',
  email: ''
});

// Ítems de prueba premium
const cartItems = [
  {
    id: 'prod_991',
    name: 'SaaS Starter Pack',
    description: 'Acceso completo a nuestro sistema por 12 meses.',
    quantity: 1,
    unitPrice: 50,
    icon: '⚡'
  },
  {
    id: 'prod_992',
    name: 'Consultoría Premium AI',
    description: 'Sesión 1:1 de 60 minutos con nuestros expertos.',
    quantity: 1,
    unitPrice: 120,
    icon: '🤖'
  }
];

const totalAmount = computed(() => {
  if (paymentType.value === 'subscription') {
    return 50; // Solo cobramos el Starter Pack recurrente en la demo
  }
  return cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(val);
};

const handleCheckout = async () => {
  const params = {
    orderId: `ORDER-${Date.now()}`,
    currency: 'USD',
    items: cartItems.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    })),
    returnUrl: `${window.location.origin}/dashboard`,
    cancelUrl: `${window.location.origin}/checkout/test`,
    metadata: {
      promoCode: 'ANTIGRAVITY_SKILL'
    }
  };

  await startCheckout(params);
};

const handleSubscribe = async () => {
  // El backend hace el flujo completo: tokenizar → crear cliente → crear suscripción
  const result = await createNativeSubscription({
    planId: 'plan_pro_01',
    cardData: {
      number:    cardData.number,
      exp_month: cardData.exp_month,
      exp_year:  cardData.exp_year,
      cvc:       cardData.cvc,
    },
  });

  if (result?.success) {
    alert("¡Suscripción creada con éxito! ID: " + result.subscriptionId);
    paymentType.value = 'one-time';
  }
};

const handleCancelSubscription = async () => {
  if (!subIdToCancel.value) return;

  const success = await cancelSubscription(subIdToCancel.value);

  if (success) {
    alert("¡Éxito! La suscripción ha sido cancelada.");
    subIdToCancel.value = '';
    paymentType.value = 'one-time';
  }
};

useHead({
  title: 'Checkout Seguro | SaaS Template',
  meta: [
    { name: 'description', content: 'Finaliza tu compra o suscripción con nuestra pasarela segura.' }
  ],
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 1s ease-out forwards;
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>
