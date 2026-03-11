export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  modules: ["@nuxtjs/tailwindcss"],
  ssr: true,

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error: nitro is excluded from NuxtConfig type in Nuxt 4 but is still supported at runtime
  routeRules: {
    "/login": { ssr: false },
  },

  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
    },
  },

  app: {
    head: {
      title: "MuebleMio v4",
      htmlAttrs: { lang: "es" },
    },
  },
});
