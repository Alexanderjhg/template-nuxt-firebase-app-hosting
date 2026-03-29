// server/utils/resolveDisplayName.ts
// Resuelve el nombre de usuario priorizando el perfil de Clowpen (users/{uid})
// sobre el nombre de Google Auth.

import type { Firestore } from "firebase-admin/firestore";

/**
 * Devuelve el displayName del perfil del usuario en Firestore.
 * Si no tiene perfil o no tiene displayName personalizado, usa el fallback.
 */
export async function resolveDisplayName(
  db: Firestore,
  uid: string,
  fallbackName?: string | null,
): Promise<string> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data()!;
      // Prioridad: username personalizado > displayName del perfil > fallback
      if (data.displayName) return data.displayName;
    }
  } catch (err) {
    console.warn("[resolveDisplayName] error fetching user profile:", err);
  }
  return fallbackName ?? "Usuario";
}

/**
 * Igual que resolveDisplayName pero también devuelve la photoURL del perfil.
 */
export async function resolveUserInfo(
  db: Firestore,
  uid: string,
  fallbackName?: string | null,
  fallbackPhoto?: string | null,
): Promise<{ displayName: string; photoURL: string }> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data()!;
      return {
        displayName: data.displayName || fallbackName || "Usuario",
        photoURL: data.photoURL || fallbackPhoto || "",
      };
    }
  } catch (err) {
    console.warn("[resolveUserInfo] error fetching user profile:", err);
  }
  return {
    displayName: fallbackName ?? "Usuario",
    photoURL: fallbackPhoto ?? "",
  };
}
