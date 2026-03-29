// app/types/chat.ts
// Interfaces centrales del sistema de chat.
// Colecciones de workspace: workspaces/{workspaceId}/...
// Colecciones globales: users/, globalDMs/, personalGroups/

import type { Timestamp } from "firebase/firestore";

// ── Workspace ─────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: "free" | "pro" | "enterprise";
  logoUrl?: string;
  createdAt: Timestamp;
  settings: {
    allowGuestLinks: boolean;
    aiObserverEnabled?: boolean; // legacy, migrar a aiObserverMode
    aiObserverMode: "auto" | "manual" | "off";
    defaultChannelId: string;
    /** Permisos que el admin puede otorgar a miembros regulares */
    memberPermissions?: {
      canCreateChannels: boolean;
      canInviteMembers: boolean;
      canManageAgents: boolean;
      canEditObserver: boolean;
    };
  };
}

export type WorkspacePlan = Workspace["plan"];

// ── Member ────────────────────────────────────────────────────────────────────

export type MemberRole = "owner" | "admin" | "member" | "guest";
export type PresenceStatus = "online" | "away" | "offline";
export type WorkspaceStatus = "available" | "in_meeting" | "busy" | "available_in_1h" | "available_in_2h" | "available_in_3h";

export interface MemberPresence {
  status: PresenceStatus;
  lastSeen: Timestamp;
  isTypingIn?: string; // channelId o dmId
}

export interface MemberPermissions {
  canCreateChannels?: boolean;
  canInviteMembers?: boolean;
  canManageAgents?: boolean;
  canEditObserver?: boolean;
}

export interface Member {
  uid: string;
  role: MemberRole;
  displayName: string;
  photoURL: string;
  email: string;
  joinedAt: Timestamp;
  presence: MemberPresence;
  pinHash?: string;
  /** Permisos individuales — sobreescriben los globales de memberPermissions */
  permissions?: MemberPermissions;
  /** Info pública del miembro en este workspace */
  workspaceStatus?: WorkspaceStatus;
  workspaceRole?: string;
  contactPhone?: string;
  contactEmail?: string;
}

// ── Channel ───────────────────────────────────────────────────────────────────

export type ChannelType = "public" | "private" | "agent";

export interface PinnedMessage {
  messageId: string;
  content: string;
  senderName: string;
  pinnedBy: string;
  pinnedAt: Timestamp;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  isPrivate: boolean;
  createdBy: string;
  createdAt: Timestamp;
  memberIds?: string[]; // solo para canales privados y de agente
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  pinnedMessages?: PinnedMessage[]; // máximo 3
  // Para canales de agente (type === 'agent')
  agentId?: string;
  isArchived?: boolean;
}

// ── Message ───────────────────────────────────────────────────────────────────

export type MessageType = "text" | "file" | "system" | "ai_suggestion" | "agent_notification";

export interface MessageAttachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface ActionButton {
  label: string;
  actionType: "calendar_create" | "calendar_pick_time" | "task_add" | "dm_send" | "agent_forward" | "search" | "schedule_create" | "dismiss" | "custom";
  payload: Record<string, unknown>;
  style?: "primary" | "secondary" | "danger";
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  content: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  reactions?: Record<string, string[]>; // emoji → [userId]
  threadCount?: number;
  replyToId?: string;
  replyToPreview?: string;
  replyToSenderName?: string;
  editedAt?: Timestamp;
  deletedAt?: Timestamp; // soft delete
  createdAt: Timestamp;
  // Para mensajes de tipo agent_notification o ai_suggestion
  actionButtons?: ActionButton[];
  actionCardTitle?: string;
  targetUserId?: string; // Solo este usuario puede ejecutar las acciones del agente
  // Link preview
  linkPreview?: {
    url: string;
    title: string;
    description?: string;
    imageUrl?: string;
  };
}

// ── DM (Mensaje Directo) ──────────────────────────────────────────────────────

export interface DMParticipant {
  displayName: string;
  photoURL: string;
}

export interface DM {
  id: string;
  participantIds: string[]; // siempre ordenados alfabéticamente para deduplicar
  participantMap: Record<string, DMParticipant>;
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  // Para el DM especial con el Asistente IA
  isAiDM?: boolean;
  // Para el DM de notificaciones personales (automatizaciones)
  isNotificationsDM?: boolean;
}

// ── AI Suggestion (privada por recipientId) ───────────────────────────────────

export type AiIntent =
  | "calendar"
  | "task_assigned"
  | "outbound_message"
  | "search"
  | "agent_forward"
  | "schedule"
  | "none";

export type SuggestionStatus = "pending" | "accepted" | "dismissed" | "forwarded";

export interface AiSuggestion {
  id: string;
  recipientId: string;
  channelId: string;
  triggeredByMessageId: string;
  intent: AiIntent;
  confidence: number;
  card: {
    title: string;
    description: string;
    actions: ActionButton[];
  };
  status: SuggestionStatus;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  /** Respuesta del observador tras ejecutar la acción (se muestra como "Ver respuesta") */
  response?: string;
  respondedAt?: Timestamp;
}

// ── Pending Task (tareas asignadas detectadas por IA) ─────────────────────────

export type TaskStatus = "pending" | "in_progress" | "done";

export interface PendingTask {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  assignedBy?: string;
  assignedByName?: string;
  sourceChannelId?: string;
  sourceMessageId?: string;
  status: TaskStatus;
  createdAt: Timestamp;
  dueAt?: Timestamp;
}

// ── Agent ─────────────────────────────────────────────────────────────────────

export type AgentPermission = "read" | "notify" | "suggest" | "act";

export interface AgentScope {
  readChannels: string[]; // channelId[] o ['*'] para todos
  writeChannels: string[]; // channelId[] donde puede escribir (WF)
  writeGroups: string[]; // personalGroupId[] donde puede escribir (DM/global)
  writeToUsers: string[]; // DEPRECADO — mantener para compatibilidad
  permissions: AgentPermission[];
}

export interface AgentRateLimit {
  maxPerMinute: number; // default 4
  plan: "free" | "pro";
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  webhookUrl: string;
  scope: AgentScope;
  isActive: boolean;
  lastUsedAt?: Timestamp;
  dedicatedChannelId?: string; // canal propio del agente en el sidebar
  rateLimit: AgentRateLimit;
  pinHash?: string; // bcryptjs hash del PIN del agente (opcional)
  // encryptedToken e iv: solo en el servidor, nunca en el cliente
}

/** JSON de configuración que se entrega al usuario al crear el agente */
export interface AgentConfig {
  agentId: string;
  agentName: string;
  token: string;
  apiBaseUrl: string;
  dedicatedChatId: string;
  writeableChatIds: string[];
  rateLimitPerMinute: number;
  endpoints: {
    notify: string;
    suggest: string;
    messages: string;
  };
}

// ── Audit Entry ───────────────────────────────────────────────────────────────

export type AgentAction = "read_channel" | "send_notification" | "send_suggestion" | "execute_action";

export interface AgentAuditEntry {
  id: string;
  agentId: string;
  action: AgentAction;
  targetId: string;
  payload: Record<string, unknown>;
  confirmedBy?: string;
  timestamp: Timestamp;
}

// ── User Profile (global, colección users/{uid}) ──────────────────────────────

export type UserStatus = "online" | "away" | "busy" | "offline";
export type UserPlan = "free" | "pro";

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  username: string;          // único, ej: @juan
  bio?: string;
  status: UserStatus;
  statusMessage?: string;    // "En reunión", "Disponible"
  statusEmoji?: string;      // "🎯"
  plan: UserPlan;
  lastSeen?: Timestamp;
  createdAt: Timestamp;
}

// ── Contact (users/{uid}/contacts/{contactUid}) ───────────────────────────────

export interface Contact {
  uid: string;               // uid del contacto
  displayName: string;
  photoURL: string;
  username: string;
  status: UserStatus;
  nickname?: string;         // apodo personalizado
  addedAt: Timestamp;
}

// ── Global DM (globalDMs/{dmId}) — chat personal entre dos usuarios ───────────

export interface GlobalDM {
  id: string;
  participantIds: string[];  // ordenados alfabéticamente
  participantMap: Record<string, { displayName: string; photoURL: string; username: string }>;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  createdAt: Timestamp;
  status: "active" | "pending";  // pending = solicitud esperando aceptación
  requestedBy?: string;          // uid de quien inició la solicitud
}

// ── Personal Group (personalGroups/{groupId}) — grupo informal ────────────────

export interface PersonalGroup {
  id: string;
  name: string;
  photoURL?: string;
  memberIds: string[];
  adminIds: string[];
  createdBy: string;
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
}

// ── Automation (workspaces/{wsId}/automations/{autoId}) ──────────────────────

export type AutomationStatus = "active" | "paused" | "completed" | "failed";
export type AutomationSourceType = "channel" | "dm" | "agent" | "global" | "personal";
export type AutomationFrequency = "once" | "daily" | "weekly" | "monthly" | "custom";

export interface AutomationSchedule {
  frequency: AutomationFrequency;
  time?: string;              // "08:00" (HH:mm)
  dayOfWeek?: number;         // 0=domingo, 1=lunes, ...
  dayOfMonth?: number;        // 1-31
  customCron?: string;        // expresión cron para "custom"
  timezone?: string;          // ej: "America/Bogota"
  nextRunAt: Timestamp;       // próxima ejecución calculada
  endsAt?: Timestamp;         // fecha final (opcional)
}

export interface AutomationSource {
  type: AutomationSourceType;
  channelId?: string;
  channelName?: string;
  dmId?: string;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  status: "success" | "failed" | "skipped";
  result?: string;
  logs?: Record<string, unknown>;
  executedAt: Timestamp;
}

export interface Automation {
  id: string;
  workspaceId: string;
  createdBy: string;
  createdByName: string;
  title: string;                // título corto
  description: string;          // qué hacer
  schedule: AutomationSchedule;
  source: AutomationSource;     // de dónde vino la solicitud
  status: AutomationStatus;
  lastRunAt?: Timestamp;
  lastRunResult?: string;
  runCount: number;
  createdAt: Timestamp;
}
