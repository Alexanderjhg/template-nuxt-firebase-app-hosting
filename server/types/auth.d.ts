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
    /** Agente autenticado inyectado por server/middleware/agentAuth.ts */
    agent?: {
      agentId: string;
      workspaceId?: string;     // solo para agentes de workspace
      ownerUid?: string;        // solo para agentes globales
      dedicatedDmId?: string;   // solo para agentes globales
      name: string;
      isGlobal: boolean;
      scope: {
        readChannels?: string[];
        writeChannels?: string[];
        writeGroups?: string[];
        writeToUsers?: string[];  // DEPRECADO
        permissions: string[];
      };
      rateLimit?: {
        maxPerMinute: number;
      };
      pinHash?: string;         // hash bcryptjs del PIN del agente (opcional)
    };
  }
}

export {};
