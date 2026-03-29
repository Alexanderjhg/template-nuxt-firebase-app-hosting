<!--
  app/app.vue
  Raíz de la aplicación.
  - Inicializa el listener de Firebase Auth (onAuthStateChanged) UNA SOLA VEZ.
  - El listener se destruye automáticamente cuando el componente se desmonta.
-->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { initAuthListener, user } = useAuth();
const { listenGlobalDMs, stopListening } = useGlobalDMs();

let dmUnsub: (() => void) | null = null;

onMounted(() => {
  const authUnsub = initAuthListener();

  // Listener global de DMs: corre en toda la app para que badges y
  // notificaciones funcionen independientemente de la página actual.
  const stopWatch = watch(user, (u) => {
    dmUnsub?.();
    if (u) {
      dmUnsub = listenGlobalDMs();
    } else {
      stopListening();
    }
  }, { immediate: true });

  onUnmounted(() => {
    authUnsub();
    stopWatch();
    dmUnsub?.();
  });
});
</script>
