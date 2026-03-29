// server/api/protected/agents/create.post.ts
// Crea un agente nuevo con token cifrado y canal dedicado en el sidebar.
// El token plano se devuelve UNA SOLA VEZ — jamás se vuelve a mostrar.

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { generateAndEncryptToken } from "~/server/utils/encryption";
import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import * as bcryptjs from "bcryptjs";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError({ statusCode: 401, message: "No autorizado" });

  const {
    workspaceId,
    name,
    description,
    webhookUrl,
    scope,
    agentPin,
  } = await readBody<{
    workspaceId: string;
    name: string;
    description?: string;
    webhookUrl: string;
    scope: {
      readChannels: string[];
      writeChannels?: string[];
      writeToUsers?: string[];
      permissions: ("read" | "notify" | "suggest" | "act")[];
    };
    agentPin?: string;
  }>(event);

  if (!workspaceId || !name?.trim() || !webhookUrl?.trim()) {
    throw createError({ statusCode: 400, message: "workspaceId, name y webhookUrl son requeridos" });
  }

  const db = getAdminFirestore();

  // Verificar permiso: admin/owner → individual → global
  const { authorized, memberExists } = await checkMemberPermission(user.uid, workspaceId, "canManageAgents");

  // Auto-reparar member doc si es owner pero no tiene doc
  if (!memberExists && authorized) {
    await db.collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).set({
      uid: user.uid,
      role: "owner",
      displayName: user.name ?? user.email ?? "Usuario",
      photoURL: user.picture ?? "",
      email: user.email ?? "",
      joinedAt: FieldValue.serverTimestamp(),
      presence: { status: "offline", lastSeen: FieldValue.serverTimestamp() },
    });
    console.info(`[agents/create] Auto-repaired missing member doc for owner uid=${user.uid} workspace=${workspaceId}`);
  }

  if (!authorized) {
    throw createError({ statusCode: 403, message: "No tienes permiso para crear agentes" });
  }

  const { plainToken, encrypted } = generateAndEncryptToken();
  // Secret para firmar webhooks salientes
  const webhookSecret = randomBytes(32).toString("hex");
  const now = FieldValue.serverTimestamp();

  // Hashear PIN del agente si se proporciona
  let pinHash: string | undefined;
  if (agentPin?.trim()) {
    pinHash = await bcryptjs.hash(agentPin.trim(), 10);
  }

  // Validar que los writeChannels existen en el workspace
  const requestedWriteChannels = scope?.writeChannels ?? [];
  const validatedWriteChannels: string[] = [];
  for (const chId of requestedWriteChannels) {
    const chDoc = await db.collection("workspaces").doc(workspaceId).collection("channels").doc(chId).get();
    if (chDoc.exists) {
      validatedWriteChannels.push(chId);
    }
  }

  const agentRef = db.collection("workspaces").doc(workspaceId).collection("agents").doc();
  const agentId = agentRef.id;

  // Canal dedicado del agente (type: 'agent')
  const channelRef = db.collection("workspaces").doc(workspaceId).collection("channels").doc();

  // writeChannels final: dedicado + seleccionados (sin duplicados)
  const allWriteChannels = [channelRef.id, ...validatedWriteChannels.filter((id) => id !== channelRef.id)];

  const batch = db.batch();

  // Agente (encryptedToken nunca regresa al cliente)
  batch.set(agentRef, {
    name: name.trim(),
    description: description?.trim() ?? "",
    createdBy: user.uid,
    createdAt: now,
    webhookUrl: webhookUrl.trim(),
    webhookSecret,
    scope: {
      readChannels: scope?.readChannels ?? [],
      writeChannels: allWriteChannels,
      writeGroups: [],
      writeToUsers: scope?.writeToUsers ?? [],
      permissions: scope?.permissions ?? ["read", "notify"],
    },
    isActive: true,
    dedicatedChannelId: channelRef.id,
    rateLimit: {
      maxPerMinute: 4,
      plan: "free",
    },
    pinHash,
    // Datos del token (cifrados)
    encryptedToken: encrypted.encryptedToken,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    tokenPrefix: encrypted.tokenPrefix,
  });

  // Canal dedicado del agente
  batch.set(channelRef, {
    name: `🤖 ${name.trim()}`,
    description: description?.trim() ?? `Canal del agente ${name.trim()}`,
    type: "agent",
    isPrivate: true,
    memberIds: [user.uid],
    createdBy: "system",
    createdAt: now,
    agentId,
    lastMessageAt: now,
    lastMessagePreview: `Agente ${name.trim()} conectado`,
  });

  await batch.commit();

  console.info(`[agents/create] uid=${user.uid} agentId=${agentId} workspace=${workspaceId}`);

  const { public: publicConfig } = useRuntimeConfig();
  const apiBaseUrl = `${publicConfig.appUrl}/api/agents`;

  // NO incluir encryptedToken, iv, authTag, webhookSecret en la respuesta
  return {
    agentId,
    config: {
      agentId,
      agentName: name.trim(),
      token: plainToken,
      apiBaseUrl,
      dedicatedChatId: channelRef.id,
      writeableChatIds: allWriteChannels,
      rateLimitPerMinute: 4,
      endpoints: {
        notify: `${apiBaseUrl}/notify`,
        suggest: `${apiBaseUrl}/suggest`,
        messages: `${apiBaseUrl}/messages`,
      },
    },
  };
});
