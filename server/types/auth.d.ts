// server/types/auth.d.ts
// Declaración de tipos para extender el contexto de H3 (Nuxt server).
// Permite que TypeScript reconozca `event.context.user` en las API routes.

declare module "h3" {
  interface H3EventContext {
    /** Usuario autenticado inyectado por el middleware server/middleware/auth.ts */
    user?: {
      uid: string;
      email: string | null;
      name: string | null;
      picture: string | null;
    };
  }
}

export {};
