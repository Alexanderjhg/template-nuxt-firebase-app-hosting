// nuxt.config.ts
// Configuración principal del SaaS Boilerplate (Nuxt 4 + Firebase App Hosting)
// Las variables sensibles se leen desde Cloud Secret Manager vía apphosting.yaml

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  // srcDir: "app/",
  // serverDir: "server/",

  // ── Nuxt 4 Compatibility ───────────────────────────────────────────────────
  future: {
    compatibilityVersion: 4,
  },

  // ── Fix para errores de rutas en Windows ───────────────────────────────────
  experimental: {
    payloadExtraction: false,
  },

  // ── Componentes ────────────────────────────────────────────────────────────
  components: [
    { path: "~/components", pathPrefix: true },
    { path: "~/components/UI", prefix: "UI" }
  ],

  // ── Dev Server ─────────────────────────────────────────────────────────────
  devServer: {
    port: 3000
  },

  // ── CSS Global ─────────────────────────────────────────────────────────────
  css: ["~/assets/css/main.css"],

  // ── Módulos ────────────────────────────────────────────────────────────────
  modules: ["@nuxtjs/tailwindcss"],

  // ── SSR: activado globalmente; login desactivado en cliente ────────────────
  ssr: true,

  // @ts-expect-error: routeRules exists at runtime but causes ts errors in Nuxt 4 configs sometimes
  routeRules: {
    // Las páginas de autenticación se renderizan en el cliente
    "/login": { ssr: false },
    // Todas las rutas del dashboard requieren cliente (estado Auth)
    "/dashboard/**": { ssr: false },
  },

  // ── Variables de entorno ───────────────────────────────────────────────────
  // Regla: solo las vars que empiezan con NUXT_PUBLIC_ son expuestas al cliente.
  // El resto son secretos que viven ÚNICAMENTE en el servidor (Cloud Secret Manager).
  runtimeConfig: {
    // ── Servidor (privadas) ──────────────────────────────────────────────────
    // Firebase Admin SDK
    firebaseAdminProjectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    firebaseAdminClientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    firebaseAdminPrivateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,

    // Google Gemini
    geminiApiKey: process.env.GEMINI_API_KEY,

    // ePayco (nunca exponer al cliente)
    epaycoPublicKey: process.env.EPAYCO_PUBLIC_KEY,
    epaycoPrivateKey: process.env.EPAYCO_PRIVATE_KEY,
    epaycoSecretKey: process.env.EPAYCO_SECRET_KEY,
    epaycoIsTest: process.env.EPAYCO_IS_TEST ?? "true",

    // ── Cliente (públicas: NUXT_PUBLIC_*) ────────────────────────────────────
    public: {
      // Firebase Client SDK — estas claves son públicas por diseño de Firebase
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,

      // Entorno actual (útil para mostrar banners en dev)
      appEnv: process.env.NUXT_PUBLIC_APP_ENV ?? "development",
    },
  },

  // ── Metadatos globales de la app ──────────────────────────────────────────
  app: {
    head: {
      title: "SaaS Template",
      htmlAttrs: { lang: "es" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "SaaS Boilerplate con Nuxt 4, Firebase y ePayco",
        },
      ],
      link: [
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
        },
      ],
    },
  },
});
