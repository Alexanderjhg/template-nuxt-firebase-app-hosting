// nuxt.config.ts
// Configuración principal del SaaS Boilerplate (Nuxt 4 + Firebase App Hosting)
// Las variables sensibles se leen desde Cloud Secret Manager vía apphosting.yaml

import { resolve } from "path";

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

  // ── Alias Nitro: resuelve ~/server/* en archivos del servidor ───────────────
  // En Nuxt 4, ~ apunta a app/ (srcDir), pero server/ está en la raíz.
  // @ts-expect-error: nitro existe en runtime pero el tipo generado puede no incluirlo
  nitro: {
    alias: {
      "~/server": resolve(__dirname, "server"),
    },
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

  routeRules: {
    // Headers globales de seguridad para permitir popups de Firebase Auth
    "/**": {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
    },
    // Las páginas de autenticación se renderizan en el cliente
    "/login": { ssr: false },
    // Todas las rutas de mensajes requieren cliente (estado Auth)
    "/messages/**": { ssr: false },
    // Chat: siempre cliente (Firestore onSnapshot, presencia, tiempo real)
    "/chat/**": { ssr: false },
    // Mensajes personales, contactos y perfil
    "/messages/**": { ssr: false },
    "/contacts/**": { ssr: false },
    "/profile/**": { ssr: false },
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

    // Google OAuth2 (Calendar API)
    // →  NUXT_GOOGLE_CLIENT_ID / NUXT_GOOGLE_CLIENT_SECRET
    googleClientId: "",
    googleClientSecret: "",

    // Agentes: cifrado de tokens y firma de webhooks
    // →  NUXT_AGENT_TOKEN_ENCRYPTION_KEY / NUXT_WEBHOOK_SIGNING_KEY
    agentTokenEncryptionKey: "",
    webhookSigningKey: "",

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
      // →  NUXT_PUBLIC_APP_URL
      appUrl: "http://localhost:3000",
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
