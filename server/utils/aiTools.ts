// server/utils/aiTools.ts
// Herramientas agénticas para el asistente IA (Function Calling de Gemini).
// Usadas por personal-chat.post.ts y chat.post.ts.

import { getAdminFirestore } from "~/server/utils/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getValidCalendarToken, createGoogleCalendarEvent } from "~/server/utils/googleCalendar";

// ── Declaraciones de funciones para Gemini ──────────────────────────────────

export const AI_TOOL_DECLARATIONS = [
  {
    name: "create_automation",
    description:
      "Crea una automatización/recordatorio programado. Úsalo cuando el usuario pida recordatorios, tareas recurrentes, o acciones programadas. Ejemplos: 'recuérdame cada lunes a las 8am', 'cada día envíame un resumen', 'en 2 horas recuérdame llamar'.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Título corto de la automatización" },
        description: { type: "STRING", description: "Descripción detallada de qué debe hacer" },
        frequency: {
          type: "STRING",
          enum: ["once", "daily", "weekly", "monthly"],
          description: "Frecuencia: once (una vez), daily (diario), weekly (semanal), monthly (mensual)",
        },
        time: { type: "STRING", description: "Hora en formato HH:mm (24h). Ej: '09:00', '14:30'" },
        date: { type: "STRING", description: "Fecha para eventos únicos en formato YYYY-MM-DD. Solo si frequency es 'once'" },
        dayOfWeek: {
          type: "NUMBER",
          description: "Día de la semana (0=domingo, 1=lunes, ... 6=sábado). Solo si frequency es 'weekly'",
        },
        dayOfMonth: {
          type: "NUMBER",
          description: "Día del mes (1-31). Solo si frequency es 'monthly'",
        },
      },
      required: ["title", "description", "frequency"],
    },
  },
  {
    name: "schedule_event",
    description:
      "Crea un evento de calendario. Úsalo cuando el usuario quiera agendar reuniones, citas, o eventos. Ejemplos: 'agenda una reunión mañana a las 3pm', 'pon una cita el viernes'.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Título del evento" },
        description: { type: "STRING", description: "Descripción o notas del evento" },
        date: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
        time: { type: "STRING", description: "Hora en formato HH:mm (24h)" },
        duration: { type: "NUMBER", description: "Duración en minutos (default: 60)" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "create_task",
    description:
      "Crea una tarea pendiente para el usuario. Úsalo cuando el usuario pida agregar algo a sus pendientes o to-do. Ejemplos: 'agrega a mis tareas revisar el informe', 'tengo pendiente llamar a Juan'.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Título/descripción de la tarea" },
      },
      required: ["title"],
    },
  },
  {
    name: "search_web",
    description:
      "Busca información en internet. Úsalo cuando el usuario pregunte algo que requiera datos actualizados, noticias, precios, clima, o información que no está en su historial. Ejemplos: 'busca el clima de Bogotá', 'cuál es el precio del dólar hoy', 'busca noticias sobre...'.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "La consulta de búsqueda" },
      },
      required: ["query"],
    },
  },
];

// ── Contexto para la ejecución de herramientas ─────────────────────────────

export interface ToolContext {
  uid: string;
  userName: string;
  /** Si es workspace, el workspaceId; si es personal, undefined */
  workspaceId?: string;
  /** DM ID donde escribir mensajes de confirmación */
  dmId?: string;
  /** Global DM ID (personal) */
  globalDmId?: string;
}

// ── Ejecutores de herramientas ─────────────────────────────────────────────

export async function executeAiTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<string> {
  switch (toolName) {
    case "create_automation":
      return executeCreateAutomation(args, ctx);
    case "schedule_event":
      return executeScheduleEvent(args, ctx);
    case "create_task":
      return executeCreateTask(args, ctx);
    case "search_web":
      return executeSearchWeb(args, ctx);
    default:
      return `Herramienta desconocida: ${toolName}`;
  }
}

// ── create_automation ──────────────────────────────────────────────────────

async function executeCreateAutomation(
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<string> {
  const db = getAdminFirestore();
  const isGlobal = !ctx.workspaceId;

  const freq = args.frequency ?? "once";
  const time = args.time ?? "09:00";
  const nextRunAt = computeNextRun(freq, time, args.date, args.dayOfWeek, args.dayOfMonth);

  const autoRef = isGlobal
    ? db.collection("users").doc(ctx.uid).collection("automations").doc()
    : db.collection("workspaces").doc(ctx.workspaceId!).collection("automations").doc();

  await autoRef.set({
    ...(isGlobal ? {} : { workspaceId: ctx.workspaceId }),
    createdBy: ctx.uid,
    createdByName: ctx.userName,
    title: (args.title ?? "").slice(0, 100),
    description: (args.description ?? "").slice(0, 500),
    schedule: {
      frequency: freq,
      time: time,
      dayOfWeek: args.dayOfWeek ?? null,
      dayOfMonth: args.dayOfMonth ?? null,
      customCron: null,
      timezone: "America/Bogota",
      nextRunAt: Timestamp.fromDate(nextRunAt),
      endsAt: null,
    },
    source: {
      type: isGlobal ? "personal" : "channel",
      channelId: null,
      channelName: null,
      dmId: ctx.dmId ?? null,
      globalDmId: ctx.globalDmId ?? null,
    },
    status: "active",
    lastRunAt: null,
    lastRunResult: null,
    runCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  const freqLabels: Record<string, string> = {
    once: "una vez",
    daily: "diario",
    weekly: "semanal",
    monthly: "mensual",
  };

  // Notificación de ejecución
  await writeExecutionNotification(db, ctx.uid, {
    type: "automation_created",
    title: `Automatización creada: ${args.title}`,
    description: `${freqLabels[freq] ?? freq}, a las ${time}`,
    source: ctx.workspaceId ? "workspace" : "personal",
    toolName: "create_automation",
  });

  return `Automatización creada exitosamente: "${args.title}" (${freqLabels[freq] ?? freq}, a las ${time}). Próxima ejecución: ${nextRunAt.toLocaleString("es-CO")}.`;
}

// ── schedule_event ─────────────────────────────────────────────────────────

async function executeScheduleEvent(
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<string> {
  const db = getAdminFirestore();
  const isGlobal = !ctx.workspaceId;

  const title = (args.title ?? "Evento").slice(0, 200);
  const description = (args.description ?? "").slice(0, 500);
  const date = args.date;
  const time = args.time ?? "09:00";
  const duration = args.duration ?? 60;
  const [hours, minutes] = time.split(":").map(Number);

  const startDate = new Date(date + "T00:00:00");
  startDate.setHours(hours, minutes, 0, 0);
  const endDate = new Date(startDate.getTime() + duration * 60_000);

  // ── Intentar crear en Google Calendar real ──────────────────────────────
  let googleEventId: string | null = null;
  let googleEventLink: string | null = null;
  let createdInGoogle = false;
  let calendarUrl: string;

  const accessToken = await getValidCalendarToken(ctx.uid);

  if (accessToken) {
    const result = await createGoogleCalendarEvent(accessToken, {
      summary: title,
      description,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
    });

    if (result) {
      googleEventId = result.id;
      googleEventLink = result.htmlLink;
      calendarUrl = result.htmlLink;
      createdInGoogle = true;
    } else {
      calendarUrl = buildManualCalendarUrl(title, startDate, endDate, description);
    }
  } else {
    calendarUrl = buildManualCalendarUrl(title, startDate, endDate, description);
  }

  // ── Guardar en Firestore ───────────────────────────────────────────────
  const evtRef = isGlobal
    ? db.collection("users").doc(ctx.uid).collection("calendar_events").doc()
    : db.collection("workspaces").doc(ctx.workspaceId!).collection("calendar_events").doc();

  await evtRef.set({
    ...(isGlobal ? {} : { workspaceId: ctx.workspaceId }),
    createdBy: ctx.uid,
    title,
    description,
    date,
    time,
    duration,
    startAt: Timestamp.fromDate(startDate),
    endAt: Timestamp.fromDate(endDate),
    calendarUrl,
    googleEventId,
    createdInGoogle,
    status: "scheduled",
    createdAt: FieldValue.serverTimestamp(),
  });

  // Notificación de ejecución
  await writeExecutionNotification(db, ctx.uid, {
    type: "event_scheduled",
    title: `Evento agendado: ${title}`,
    description: `${startDate.toLocaleDateString("es-CO")} a las ${time} (${duration} min)`,
    source: ctx.workspaceId ? "workspace" : "personal",
    toolName: "schedule_event",
  });

  if (createdInGoogle) {
    return `Evento creado en tu Google Calendar: "${title}" el ${startDate.toLocaleDateString("es-CO")} a las ${time} (${duration} min). Link: ${googleEventLink}`;
  }
  return `Evento guardado: "${title}" el ${startDate.toLocaleDateString("es-CO")} a las ${time} (${duration} min). No tienes Google Calendar conectado, usa este link para agregarlo manualmente: ${calendarUrl}`;
}

// ── create_task ────────────────────────────────────────────────────────────

async function executeCreateTask(
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<string> {
  const db = getAdminFirestore();
  const isGlobal = !ctx.workspaceId;

  const taskRef = isGlobal
    ? db.collection("users").doc(ctx.uid).collection("pending_tasks").doc()
    : db.collection("workspaces").doc(ctx.workspaceId!).collection("pending_tasks").doc();

  await taskRef.set({
    userId: ctx.uid,
    ...(isGlobal ? {} : { workspaceId: ctx.workspaceId }),
    title: (args.title ?? "").trim().slice(0, 200),
    assignedByName: "Asistente IA",
    sourceChannelId: null,
    sourceMessageId: null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });

  // Notificación de ejecución
  await writeExecutionNotification(db, ctx.uid, {
    type: "task_created",
    title: `Tarea creada: ${args.title}`,
    description: "Asistente IA",
    source: ctx.workspaceId ? "workspace" : "personal",
    toolName: "create_task",
  });

  return `Tarea creada: "${args.title}". Puedes verla en tus tareas pendientes.`;
}

// ── search_web ─────────────────────────────────────────────────────────────

async function executeSearchWeb(
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<string> {
  const config = useRuntimeConfig();
  const apiKey = (config.geminiApiKey as string)?.trim();
  if (!apiKey) return "No se pudo realizar la búsqueda: IA no configurada.";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const searchModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "Eres un asistente de búsqueda. Responde la consulta usando los resultados de búsqueda. Sé conciso e informativo. Cita fuentes cuando sea posible. Responde en español.",
      tools: [{ googleSearch: {} } as any],
    });

    const result = await searchModel.generateContent(args.query);
    const text = result.response.text().trim();

    // Extraer fuentes
    const candidates = result.response.candidates;
    const sources: string[] = [];
    if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of candidates[0].groundingMetadata.groundingChunks as any[]) {
        if (chunk.web?.uri) sources.push(chunk.web.uri);
      }
    }

    const sourcesText = sources.length > 0 ? `\n\nFuentes: ${sources.slice(0, 3).join(", ")}` : "";
    return text + sourcesText;
  } catch (err: any) {
    console.error("[aiTools/search_web] Error:", err?.message ?? err);
    return `Error al buscar "${args.query}": ${err?.message ?? "fallo de conexión"}`;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// ── Notificación de ejecución ──────────────────────────────────────────────

async function writeExecutionNotification(
  db: FirebaseFirestore.Firestore,
  uid: string,
  data: {
    type: string;
    title: string;
    description: string;
    source: "workspace" | "personal";
    toolName: string;
  },
) {
  try {
    await db.collection("users").doc(uid).collection("notifications").doc().set({
      ...data,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[aiTools] Error writing notification:", err);
  }
}

function buildManualCalendarUrl(title: string, start: Date, end: Date, description?: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (description) params.set("details", description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function computeNextRun(
  frequency: string,
  time: string,
  date?: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
): Date {
  const now = new Date();
  const [hours, minutes] = (time ?? "09:00").split(":").map(Number);

  if (frequency === "once" && date) {
    const d = new Date(date + "T00:00:00");
    d.setHours(hours, minutes, 0, 0);
    return d > now ? d : new Date(now.getTime() + 60_000);
  }

  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (frequency === "weekly" && dayOfWeek !== undefined) {
    const currentDay = next.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
    next.setDate(next.getDate() + daysUntil);
  } else if (frequency === "monthly" && dayOfMonth !== undefined) {
    next.setDate(dayOfMonth);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  } else {
    if (next <= now) next.setDate(next.getDate() + 1);
  }

  return next;
}
