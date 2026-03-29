// server/utils/firebaseAdmin.ts
// Utilitario de servidor: inicializa Firebase Admin SDK usando credenciales
// seguras inyectadas por Cloud Secret Manager vía apphosting.yaml.
//
// USO en cualquier API route o middleware:
//   import { getAdminAuth, getAdminFirestore } from '~/server/utils/firebaseAdmin'

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// ── Singleton: evita re-inicializar en el ciclo de vida de la instancia ───────
let adminApp: App;

/**
 * Devuelve (o inicializa) la instancia de Firebase Admin App.
 * Las credenciales se leen SIEMPRE desde el runtimeConfig del servidor,
 * que a su vez las obtiene de las variables de entorno / Cloud Secret Manager.
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const config = useRuntimeConfig();

  // La clave privada viene como string con \n literales escapados.
  // Cloud Secret Manager los preserva; aquí los convertimos correctamente.
  const privateKey = (config.firebaseAdminPrivateKey as string)?.replace(
    /\\n/g,
    "\n"
  );

  adminApp = initializeApp({
    credential: cert({
      projectId: config.firebaseAdminProjectId as string,
      clientEmail: config.firebaseAdminClientEmail as string,
      privateKey,
    }),
  });

  return adminApp;
}

/**
 * Instancia de Firebase Admin Auth.
 * Usar para verificar tokens de usuario en el servidor.
 *
 * @example
 * const decodedToken = await getAdminAuth().verifyIdToken(token)
 */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Instancia de Firebase Admin Firestore.
 * Usar para lecturas/escrituras privilegiadas en el servidor.
 *
 * @example
 * const db = getAdminFirestore()
 * const doc = await db.collection('users').doc(uid).get()
 */
export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp(), "clow1");
}
