<template>
  <!-- Layout principal con navegación lateral global -->
  <div class="flex h-screen bg-[#0a0a0f] overflow-hidden">
    <AppNav />
    <div class="flex-1 h-full overflow-hidden">
      <slot />
    </div>
  </div>
</template>
