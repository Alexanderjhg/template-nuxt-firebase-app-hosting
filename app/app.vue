<!--
  app/app.vue
  Raíz de la aplicación.
  - Inicializa el listener de Firebase Auth (onAuthStateChanged) UNA SOLA VEZ.
  - El listener se destruye automáticamente cuando el componente se desmonta.
-->
<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { initAuthListener } = useAuth();

// Solo en el cliente: escucha cambios de sesión de Firebase
// y mantiene el estado global `user` actualizado en toda la app.
onMounted(() => {
  const unsubscribe = initAuthListener();

  // Limpiar el listener cuando el componente raíz se desmonte
  onUnmounted(() => {
    unsubscribe();
  });
});
</script>
