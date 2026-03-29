// server/api/protected/global-agents/[agentId]/rotate-token.post.ts
// Rota el token de un agente global. El token anterior deja de funcionar inmediatamente.

import { defineEventHandler, createError, getRouterParam } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { generateAndEncryptToken } from "~/server/utils/encryption";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const agentId = getRouterParam(event, "agentId");
  if (!agentId) throw createError({ statusCode: 400, message: "agentId requerido" });

  const db = getAdminFirestore();
  const agentRef = db.collection("users").doc(user.uid).collection("globalAgents").doc(agentId);
  const agentDoc = await agentRef.get();

  if (!agentDoc.exists) {
    throw createError({ statusCode: 404, message: "Agente no encontrado" });
  }

  const { plainToken, encrypted } = generateAndEncryptToken();

  await agentRef.update({
    encryptedToken: encrypted.encryptedToken,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    tokenPrefix: encrypted.tokenPrefix,
  });

  console.info(`[global-agents/rotate-token] uid=${user.uid} agentId=${agentId}`);
  return { plainToken };
});
