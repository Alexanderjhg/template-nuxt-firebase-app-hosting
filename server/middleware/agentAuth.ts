// server/middleware/agentAuth.ts
// Middleware que autentica llamadas de agentes externos a /api/agents/**
// Los agentes usan: Authorization: Bearer <plainToken>
// El servidor busca por tokenPrefix, descifra y compara en tiempo constante.

import { defineEventHandler, getHeader, createError } from "h3";
import { getAdminFirestore } from "../utils/firebaseAdmin";
import { decryptToken, safeCompare } from "../utils/encryption";

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/agents")) return;

  const authHeader = getHeader(event, "authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw createError({ statusCode: 401, message: "Token de agente requerido" });
  }

  const plainToken = authHeader.slice(7).trim();
  if (!plainToken || plainToken.length < 8) {
    throw createError({ statusCode: 401, message: "Token inválido" });
  }

  const tokenPrefix = plainToken.slice(0, 8);
  const db = getAdminFirestore();

  // ── 1. Buscar en agentes de workspace ─────────────────────────────────────
  const workspacesSnap = await db.collection("workspaces").get();

  for (const wsDoc of workspacesSnap.docs) {
    const agentsSnap = await wsDoc.ref
      .collection("agents")
      .where("tokenPrefix", "==", tokenPrefix)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (agentsSnap.empty) continue;

    const agentDoc = agentsSnap.docs[0]!;
    const agentData = agentDoc.data();

    let decrypted: string;
    try {
      decrypted = decryptToken({
        encryptedToken: agentData.encryptedToken,
        iv: agentData.iv,
        authTag: agentData.authTag,
        tokenPrefix: agentData.tokenPrefix,
      });
    } catch {
      continue;
    }

    if (!safeCompare(plainToken, decrypted)) continue;

    event.context.agent = {
      agentId: agentDoc.id,
      workspaceId: wsDoc.id,
      name: agentData.name,
      scope: {
        readChannels: agentData.scope?.readChannels ?? [],
        writeChannels: agentData.scope?.writeChannels ?? [],
        writeGroups: agentData.scope?.writeGroups ?? [],
        writeToUsers: agentData.scope?.writeToUsers ?? [],
        permissions: agentData.scope?.permissions ?? [],
      },
      rateLimit: agentData.rateLimit ?? { maxPerMinute: 4 },
      pinHash: agentData.pinHash,
      isGlobal: false,
    };

    agentDoc.ref.update({ lastUsedAt: new Date() }).catch(() => {});
    return;
  }

  // ── 2. Buscar en agentes globales (users/{uid}/globalAgents) ────────────
  const usersSnap = await db.collectionGroup("globalAgents")
    .where("tokenPrefix", "==", tokenPrefix)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    const agentDoc = usersSnap.docs[0]!;
    const agentData = agentDoc.data();
    // El path es users/{uid}/globalAgents/{agentId}
    const ownerUid = agentDoc.ref.parent.parent?.id;

    let decrypted: string;
    try {
      decrypted = decryptToken({
        encryptedToken: agentData.encryptedToken,
        iv: agentData.iv,
        authTag: agentData.authTag,
        tokenPrefix: agentData.tokenPrefix,
      });
    } catch {
      throw createError({ statusCode: 401, message: "Token de agente inválido o inactivo" });
    }

    if (safeCompare(plainToken, decrypted)) {
      event.context.agent = {
        agentId: agentDoc.id,
        ownerUid,
        name: agentData.name,
        scope: {
          readChannels: agentData.scope?.readChannels ?? [],
          writeChannels: agentData.scope?.writeChannels ?? [],
          writeGroups: agentData.scope?.writeGroups ?? [],
          writeToUsers: agentData.scope?.writeToUsers ?? [],
          permissions: agentData.scope?.permissions ?? [],
        },
        rateLimit: agentData.rateLimit ?? { maxPerMinute: 4 },
        pinHash: agentData.pinHash,
        dedicatedDmId: agentData.dedicatedDmId,
        isGlobal: true,
      };

      agentDoc.ref.update({ lastUsedAt: new Date() }).catch(() => {});
      return;
    }
  }

  throw createError({ statusCode: 401, message: "Token de agente inválido o inactivo" });
});
