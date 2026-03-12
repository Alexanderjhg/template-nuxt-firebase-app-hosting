<template>
  <div class="min-h-screen flex items-center justify-center bg-[#050510] text-white font-inter">
    <div class="text-center space-y-4">
      <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <h2 class="text-2xl font-bold">Redirigiendo a ePayco...</h2>
      <p class="text-slate-400">Por favor, espera un momento mientras preparamos tu pago seguro.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

useHead({
  title: 'Procesando Pago...',
  script: [
    { src: 'https://checkout.epayco.co/checkout.js' }
  ]
});

const route = useRoute();
const config = useRuntimeConfig();

onMounted(() => {
  const payloadStr = route.query.payload as string;
  if (!payloadStr) {
    console.error('No payload found for ePayco checkout');
    return;
  }

  try {
    const data = JSON.parse(atob(payloadStr));

    // Wait slightly to ensure checkout.js script has loaded
    setTimeout(() => {
      // @ts-expect-error: ePayco is globally defined by the script
      if (typeof ePayco === 'undefined') {
         console.error('El script de ePayco no se cargó correctamente');
         alert('Error al cargar pasarela de pagos. Por favor intenta de nuevo.');
         return;
      }
      
      // @ts-expect-error: ePayco global
      const handler = ePayco.checkout.configure({
        key: config.public.epaycoPublicKey || 'tu_llave_publica', // Usa public runtime config
        test: true
      });

      handler.open(data);
    }, 1000);
  } catch (error) {
    console.error('Failed to parse ePayco payload:', error);
  }
});
</script>
