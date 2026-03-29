// server/api/protected/contacts/add.post.ts
// Agrega un contacto (relación bidireccional en users/{uid}/contacts/).

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { contactUid } = await readBody<{ contactUid: string }>(event);
  if (!contactUid || contactUid === user.uid) {
    throw createError({ statusCode: 400, message: "contactUid inválido" });
  }

  const db = getAdminFirestore();

  // Verificar que el contacto existe
  const contactDoc = await db.collection("users").doc(contactUid).get();
  if (!contactDoc.exists) {
    throw createError({ statusCode: 404, message: "Usuario no encontrado" });
  }

  const myDoc = await db.collection("users").doc(user.uid).get();
  const myData = myDoc.data() ?? {};
  const contactData = contactDoc.data()!;
  const now = FieldValue.serverTimestamp();

  const batch = db.batch();

  // Yo agrego al otro
  batch.set(
    db.collection("users").doc(user.uid).collection("contacts").doc(contactUid),
    {
      uid: contactUid,
      displayName: contactData.displayName ?? "",
      photoURL: contactData.photoURL ?? "",
      username: contactData.username ?? "",
      status: contactData.status ?? "offline",
      addedAt: now,
    }
  );

  // El otro me tiene a mí (bidireccional)
  batch.set(
    db.collection("users").doc(contactUid).collection("contacts").doc(user.uid),
    {
      uid: user.uid,
      displayName: myData.displayName ?? user.name ?? "",
      photoURL: myData.photoURL ?? user.picture ?? "",
      username: myData.username ?? "",
      status: myData.status ?? "offline",
      addedAt: now,
    }
  );

  await batch.commit();
  return { ok: true };
});
