// composables/useAuth.ts
// Estado global de autenticación usando useState de Nuxt (sin Pinia).
// CORRECCIÓN: useNuxtApp() se captura UNA SOLA VEZ al inicio del composable,
// de forma síncrona, antes de cualquier await. Esto es requerido en Nuxt 4.

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** Token JWT de Firebase — se usa para autenticar llamadas al backend */
  idToken: string | null;
}

/** Traduce códigos de error de Firebase Auth a mensajes legibles */
function mapAuthError(code?: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada.";
    case "auth/user-not-found":
      return "No existe una cuenta con este correo.";
    case "auth/wrong-password":
      return "La contraseña es incorrecta.";
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con este correo.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intenta de nuevo más tarde.";
    default:
      return "Error al autenticar. Intenta de nuevo.";
  }
}

export const useAuth = () => {
  // ── Estado global compartido (SSR-safe con useState) ──────────────────────
  const user = useState<AuthUser | null>("auth:user", () => null);
  const isLoading = useState<boolean>("auth:loading", () => false);
  const authError = useState<string | null>("auth:error", () => null);

  // ── CORRECCIÓN CLAVE: capturar nuxtApp de forma SÍNCRONA ─────────────────
  // En Nuxt 4 el contexto se pierde después de un await.
  // Por eso accedemos a $firebaseAuth aquí, antes de cualquier función async.
  const nuxtApp = useNuxtApp();

  // Helper: obtiene la instancia de Auth del plugin de Firebase
  function getAuth(): Auth | null {
    if (import.meta.server) return null;
    return nuxtApp.$firebaseAuth as Auth ?? null;
  }

  // ── Helpers internos ────────────────────────────────────────────────────────

  /** Serializa un User de Firebase a nuestro tipo AuthUser */
  async function serializeUser(firebaseUser: User): Promise<AuthUser> {
    const idToken = await firebaseUser.getIdToken();
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      idToken,
    };
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const isLoggedIn = computed(() => !!user.value);

  // ── Métodos ─────────────────────────────────────────────────────────────────

  /**
   * Inicia sesión con Google usando un popup.
   * Solo disponible en el cliente.
   */
  async function loginWithGoogle(): Promise<void> {
    if (import.meta.server) return;

    const auth = getAuth();
    if (!auth) {
      authError.value = "Firebase Auth no está inicializado.";
      return;
    }

    isLoading.value = true;
    authError.value = null;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      user.value = await serializeUser(result.user);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/popup-closed-by-user") return;
      authError.value = error.message ?? "Error al iniciar sesión";
      console.error("[useAuth] loginWithGoogle error:", error);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Inicia sesión con email y contraseña.
   */
  async function loginWithEmail(email: string, password: string): Promise<void> {
    if (import.meta.server) return;

    const auth = getAuth();
    if (!auth) {
      authError.value = "Firebase Auth no está inicializado.";
      return;
    }

    isLoading.value = true;
    authError.value = null;

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      user.value = await serializeUser(result.user);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      authError.value = mapAuthError(error.code);
      console.error("[useAuth] loginWithEmail error:", error);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Registra un nuevo usuario con email y contraseña.
   */
  async function registerWithEmail(email: string, password: string): Promise<void> {
    if (import.meta.server) return;

    const auth = getAuth();
    if (!auth) {
      authError.value = "Firebase Auth no está inicializado.";
      return;
    }

    isLoading.value = true;
    authError.value = null;

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      user.value = await serializeUser(result.user);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      authError.value = mapAuthError(error.code);
      console.error("[useAuth] registerWithEmail error:", error);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Envía un correo de restablecimiento de contraseña.
   */
  async function resetPassword(email: string): Promise<boolean> {
    if (import.meta.server) return false;

    const auth = getAuth();
    if (!auth) {
      authError.value = "Firebase Auth no está inicializado.";
      return false;
    }

    isLoading.value = true;
    authError.value = null;

    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      authError.value = mapAuthError(error.code);
      console.error("[useAuth] resetPassword error:", error);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Cierra la sesión del usuario actual.
   */
  async function logout(): Promise<void> {
    if (import.meta.server) return;

    const auth = getAuth();
    if (!auth) return;

    try {
      await signOut(auth);
      user.value = null;
      await navigateTo("/login");
    } catch (err) {
      console.error("[useAuth] logout error:", err);
    }
  }

  /**
   * Obtiene el idToken actualizado del usuario.
   * Firebase renueva tokens cada hora — usar antes de llamadas al backend.
   */
  async function getIdToken(): Promise<string | null> {
    if (import.meta.server || !user.value) return null;

    const auth = getAuth();
    if (!auth?.currentUser) return null;

    try {
      const token = await auth.currentUser.getIdToken(false);
      user.value = { ...user.value, idToken: token };
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Inicializa el listener de cambios de autenticación.
   * Llamar UNA sola vez en app.vue.
   * Retorna la función unsubscribe para limpiar en onUnmounted.
   */
  function initAuthListener(): () => void {
    if (import.meta.server) return () => {};

    const auth = getAuth();
    if (!auth) return () => {};

    isLoading.value = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        user.value = await serializeUser(firebaseUser);
      } else {
        user.value = null;
      }
      isLoading.value = false;
    });

    return unsubscribe;
  }

  return {
    // Estado
    user: readonly(user),
    isLoading: readonly(isLoading),
    authError: readonly(authError),
    isLoggedIn,
    // Métodos
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout,
    getIdToken,
    initAuthListener,
  };
};
