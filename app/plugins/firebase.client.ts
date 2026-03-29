// plugins/firebase.client.ts
// Plugin de cliente: inicializa Firebase App, Auth y Firestore.
// Solo se ejecuta en el NAVEGADOR (sufijo .client.ts).
// El plugin expone las instancias via useNuxtApp() como $firebaseAuth y $firestore.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export default defineNuxtPlugin({
  name: "firebase",
  setup() {
    const config = useRuntimeConfig();

    // ── Configuración del Firebase Client SDK ─────────────────────────────────
    const firebaseConfig = {
      apiKey: config.public.firebaseApiKey,
      authDomain: config.public.firebaseAuthDomain,
      projectId: config.public.firebaseProjectId,
      storageBucket: config.public.firebaseStorageBucket,
      messagingSenderId: config.public.firebaseMessagingSenderId,
      appId: config.public.firebaseAppId,
    };

    // Evita re-inicializar Firebase en Hot Module Replacement (HMR)
    const app: FirebaseApp = getApps().length
      ? getApp()
      : initializeApp(firebaseConfig);

    // ── Servicios de Firebase ─────────────────────────────────────────────────
    const auth: Auth = getAuth(app);
    const firestore: Firestore = initializeFirestore(app, {}, "clow1");
    const storage: FirebaseStorage = getStorage(app);

    // ── Exponer instancias en el contexto de Nuxt ─────────────────────────────
    // Acceso: const { $firebaseAuth, $firestore, $firebaseStorage } = useNuxtApp()
    return {
      provide: {
        firebaseApp: app,
        firebaseAuth: auth,
        firestore: firestore,
        firebaseStorage: storage,
      },
    };
  },
});
