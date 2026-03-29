// plugins/auth-state.client.ts
// Plugin ASÍNCRONO: espera la primera respuesta de Firebase Auth antes de
// que Nuxt ejecute cualquier middleware de ruta.
// Esto resuelve el problema de "redirige a /login aunque ya estés autenticado".

import { onAuthStateChanged } from "firebase/auth";
import type { Auth } from "firebase/auth";

export default defineNuxtPlugin({
  name: "auth-state",
  dependsOn: ["firebase"],
  async setup(nuxtApp) {
    const auth = nuxtApp.$firebaseAuth as Auth;
    const user = useState<import("~/composables/useAuth").AuthUser | null>("auth:user", () => null);
    const isLoading = useState<boolean>("auth:loading", () => false);

    isLoading.value = true;

    // Esperamos UNA VEZ la primera resolución del estado de auth de Firebase
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribe(); // solo necesitamos la primera emisión
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken();
          user.value = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            idToken,
          };
        } else {
          user.value = null;
        }
        isLoading.value = false;
        resolve();
      });
    });
  },
});
