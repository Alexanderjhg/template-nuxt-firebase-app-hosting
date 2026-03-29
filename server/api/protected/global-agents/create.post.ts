// server/api/protected/global-agents/create.post.ts
// Crea un agente global del usuario (personal, no workspace).
// El token plano se devuelve UNA SOLA VEZ.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { generateAndEncryptToken } from "~/server/utils/encryption";
import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import * as bcryptjs from "bcryptjs";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const { name, description, webhookUrl, scope, agentPin } = await readBody<{
    name: string;
    description?: string;
    webhookUrl: string;
    scope?: {
      writeGroups?: string[];
      permissions: ("read" | "notify" | "suggest" | "act")[];
    };
    agentPin?: string;
  }>(event);

  if (!name?.trim() || !webhookUrl?.trim()) {
    throw createError({ statusCode: 400, message: "name y webhookUrl son requeridos" });
  }

  const db = getAdminFirestore();
  const { plainToken, encrypted } = generateAndEncryptToken();
  const webhookSecret = randomBytes(32).toString("hex");
  const now = FieldValue.serverTimestamp();

  // Hashear PIN del agente si se proporciona
  let pinHash: string | undefined;
  if (agentPin?.trim()) {
    pinHash = await bcryptjs.hash(agentPin.trim(), 10);
  }

  // Validar que los writeGroups existen y el usuario es miembro
  const requestedWriteGroups = scope?.writeGroups ?? [];
  const validatedWriteGroups: string[] = [];
  for (const gId of requestedWriteGroups) {
    const gDoc = await db.collection("personalGroups").doc(gId).get();
    if (gDoc.exists) {
      const memberIds: string[] = gDoc.data()?.memberIds ?? [];
      if (memberIds.includes(user.uid)) {
        validatedWriteGroups.push(gId);
      }
    }
  }

  const agentRef = db.collection("users").doc(user.uid).collection("globalAgents").doc();
  const agentId = agentRef.id;

  // Crear DM global dedicado para el agente
  const dmRef = db.collection("globalDMs").doc();

  const batch = db.batch();

  batch.set(agentRef, {
    name: name.trim(),
    description: description?.trim() ?? "",
    createdBy: user.uid,
    createdAt: now,
    webhookUrl: webhookUrl.trim(),
    webhookSecret,
    scope: {
      writeGroups: validatedWriteGroups,
      writeChannels: [],
      permissions: scope?.permissions ?? ["read", "notify"],
    },
    isActive: true,
    dedicatedDmId: dmRef.id,
    isGlobal: true,
    rateLimit: {
      maxPerMinute: 4,
      plan: "free",
    },
    pinHash,
    // Token cifrado
    encryptedToken: encrypted.encryptedToken,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    tokenPrefix: encrypted.tokenPrefix,
  });

  // DM dedicado del agente (globalDMs)
  batch.set(dmRef, {
    participantIds: [user.uid],
    isAgentDM: true,
    agentId,
    participantMap: {
      [user.uid]: {
        displayName: user.name ?? "Usuario",
        photoURL: user.picture ?? "",
      },
      [`agent_${agentId}`]: {
        displayName: `🤖 ${name.trim()}`,
        photoURL: "",
      },
    },
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: `Agente ${name.trim()} conectado`,
  });

  await batch.commit();

  console.info(`[global-agents/create] uid=${user.uid} agentId=${agentId}`);

  const { public: publicConfig } = useRuntimeConfig();
  const apiBaseUrl = `${publicConfig.appUrl}/api/agents`;

  // writeableChatIds: DM dedicado + grupos personales permitidos
  const writeableChatIds = [dmRef.id, ...validatedWriteGroups];

  return {
    agentId,
    config: {
      agentId,
      agentName: name.trim(),
      token: plainToken,
      apiBaseUrl,
      dedicatedChatId: dmRef.id,
      writeableChatIds,
      rateLimitPerMinute: 4,
      endpoints: {
        notify: `${apiBaseUrl}/notify`,
        suggest: `${apiBaseUrl}/suggest`,
        messages: `${apiBaseUrl}/messages`,
      },
    },
  };
});
