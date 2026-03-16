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
    { path: "~/components/UI", prefix: "UI" },
  ],

  // ── Dev Server ─────────────────────────────────────────────────────────────
  devServer: {
    port: 3000,
  },

  // ── CSS Global ─────────────────────────────────────────────────────────────
  css: ["~/assets/css/main.css"],

  // ── Módulos ────────────────────────────────────────────────────────────────
  modules: ["@nuxtjs/tailwindcss"],

  // ── SSR: activado globalmente; login desactivado en cliente ────────────────
  ssr: true,

  // @ts-expect-error: routeRules exists at runtime but causes ts errors in Nuxt 4 configs sometimes
  routeRules: {
    // Headers globales de seguridad para permitir popups de Firebase Auth
    "/**": {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
    },
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
    // Nuxt mapea automáticamente NUXT_<SCREAMING_SNAKE_CASE> → camelCase
    // Firebase Admin SDK  →  NUXT_FIREBASE_ADMIN_*
    firebaseAdminProjectId: "",
    firebaseAdminClientEmail: "",
    firebaseAdminPrivateKey: "",

    // Google Gemini  →  NUXT_GEMINI_API_KEY
    geminiApiKey: "",

    // ePayco (nunca exponer claves privadas al cliente)
    // →  NUXT_EPAYCO_PRIVATE_KEY / NUXT_EPAYCO_SECRET_KEY / NUXT_EPAYCO_IS_TEST
    epaycoPrivateKey: "",
    epaycoSecretKey: "",
    epaycoIsTest: "true",

    // ── Cliente (públicas: NUXT_PUBLIC_*) ────────────────────────────────────
    public: {
      // →  NUXT_PUBLIC_EPAYCO_PUBLIC_KEY
      epaycoPublicKey: "",
      // Firebase Client SDK  →  NUXT_PUBLIC_FIREBASE_*
      firebaseApiKey: "",
      firebaseAuthDomain: "",
      firebaseProjectId: "",
      firebaseStorageBucket: "",
      firebaseMessagingSenderId: "",
      firebaseAppId: "",
      // →  NUXT_PUBLIC_APP_ENV
      appEnv: "development",
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
