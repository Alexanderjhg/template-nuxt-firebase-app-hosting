// app/middleware/auth.ts
// Middleware de ruta del lado del cliente.
// Redirige a /login si el usuario no está autenticado.

export default defineNuxtRouteMiddleware(() => {
  // Solo en cliente (las páginas de chat son SSR: false)
  if (import.meta.server) return;

  const { user, isLoading } = useAuth();

  // Si aún está cargando el estado de auth, esperar
  if (isLoading.value) return;

  if (!user.value) {
    return navigateTo("/login");
  }
});
