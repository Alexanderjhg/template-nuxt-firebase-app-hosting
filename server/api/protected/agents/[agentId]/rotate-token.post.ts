// server/api/protected/agents/[agentId]/rotate-token.post.ts
// Rota el token de un agente. Invalida el anterior inmediatamente.

import { defineEventHandler, readBody, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { generateAndEncryptToken } from "~/server/utils/encryption";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const agentId = getRouterParam(event, "agentId");
  const { workspaceId } = await readBody<{ workspaceId: string }>(event);

  if (!agentId || !workspaceId) {
    throw createError({ statusCode: 400, message: "agentId y workspaceId son requeridos" });
  }

  const db = getAdminFirestore();

  // Verificar admin
  const memberDoc = await db
    .collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).get();
  if (!memberDoc.exists || !["owner", "admin"].includes(memberDoc.data()!.role)) {
    throw createError({ statusCode: 403, message: "Solo admins pueden rotar tokens" });
  }

  const agentRef = db.collection("workspaces").doc(workspaceId).collection("agents").doc(agentId);
  const agentDoc = await agentRef.get();
  if (!agentDoc.exists) throw createError({ statusCode: 404, message: "Agente no encontrado" });

  const { plainToken, encrypted } = generateAndEncryptToken();

  await agentRef.update({
    encryptedToken: encrypted.encryptedToken,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    tokenPrefix: encrypted.tokenPrefix,
    tokenRotatedAt: new Date(),
  });

  return { plainToken }; // mostrar al usuario UNA VEZ
});
