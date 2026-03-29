// functions/src/index.ts
// Cloud Functions nativas de Clowpen.
// - processAutomations: corre cada 5 minutos, ejecuta automatizaciones pendientes.
// - runAutomationsNow: función HTTP para pruebas manuales.
// - seedTestAutomation: crea datos de prueba (solo dev).
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
// ── Inicializar Firebase Admin ──────────────────────────────────────────────
const app = initializeApp();
const db = getFirestore(app, "clow1");
const BATCH_LIMIT = 20;
// ── Helpers ─────────────────────────────────────────────────────────────────
/** Calcula la siguiente ejecución según la frecuencia */
function computeNextRun(schedule) {
    const freq = schedule.frequency;
    if (freq === "once")
        return null;
    const [hours, minutes] = (schedule.time ?? "09:00").split(":").map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    switch (freq) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly": {
            const target = schedule.dayOfWeek ?? 1;
            let daysUntil = target - next.getDay();
            if (daysUntil <= 0)
                daysUntil += 7;
            next.setDate(next.getDate() + daysUntil);
            break;
        }
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            if (schedule.dayOfMonth)
                next.setDate(schedule.dayOfMonth);
            break;
        default:
            next.setDate(next.getDate() + 1);
    }
    return next;
}
/** Genera el resultado de una automatización basado en su descripción */
function executeAutomation(autoData) {
    const description = (autoData.description ?? autoData.title ?? "").toLowerCase();
    const title = autoData.title ?? "Automatización";
    const runCount = (autoData.runCount ?? 0) + 1;
    let result = "";
    if (description.includes("noticias") || description.includes("news")) {
        result = `📰 **${title}** (ejecución #${runCount})\n\nResumen de noticias generado automáticamente.\n\n_(Para noticias reales, conecta una fuente externa vía agente)_`;
    }
    else if (description.includes("clima") || description.includes("weather")) {
        result = `🌤️ **${title}** (ejecución #${runCount})\n\nReporte del clima generado.\n\n_(Para clima real, conecta una API externa vía agente)_`;
    }
    else if (description.includes("recordatorio") || description.includes("recuerda") || description.includes("reminder")) {
        result = `🔔 **${title}**\n\n${autoData.description}\n\nNo olvides completar esta tarea.`;
    }
    else if (description.includes("reporte") || description.includes("informe") || description.includes("report")) {
        result = `📊 **${title}** (ejecución #${runCount})\n\nReporte automático generado.\n\n_(Para reportes con datos reales, conecta tu base de datos vía agente)_`;
    }
    else if (description.includes("correo") || description.includes("email")) {
        result = `📧 **${title}** (ejecución #${runCount})\n\nRevisión de correos programada.\n\n_(Para acceso real a correos, conecta tu API de email vía agente)_`;
    }
    else {
        result = `⚡ **${title}**\n\n${autoData.description ?? "Automatización ejecutada correctamente."}`;
    }
    return { status: "success", result };
}
/** Procesa una automatización pendiente: ejecuta, registra, notifica */
async function processAutomation(autoRef, autoData) {
    const schedule = autoData.schedule ?? {};
    const source = autoData.source ?? {};
    const now = FieldValue.serverTimestamp();
    // 1. Ejecutar
    const { status, result } = executeAutomation(autoData);
    // 2. Registrar ejecución en subcollection
    const execRef = autoRef.collection("executions").doc();
    const batch = db.batch();
    batch.set(execRef, {
        status,
        result,
        logs: { executedAt: new Date().toISOString(), type: schedule.frequency ?? "once", native: true },
        executedAt: now,
    });
    // 3. Actualizar automatización
    const nextRun = computeNextRun(schedule);
    const autoUpdates = {
        lastRunAt: now,
        lastRunResult: result,
        runCount: FieldValue.increment(1),
    };
    if (nextRun) {
        autoUpdates["schedule.nextRunAt"] = Timestamp.fromDate(nextRun);
    }
    else {
        autoUpdates.status = "completed";
    }
    if (status === "failed") {
        autoUpdates.status = "failed";
    }
    batch.update(autoRef, autoUpdates);
    // 4. Enviar mensaje al canal/DM de origen
    const messageContent = `⚡ **${autoData.title ?? "Automatización"}**\n${result}`;
    const workspaceId = autoData.workspaceId;
    let messagesCol = null;
    let parentRef = null;
    if (source.type === "personal" && !source.dmId && !source.channelId) {
        // Automatización personal sin canal/DM: guardar como notificación del usuario
        const createdBy = autoData.createdBy;
        if (createdBy) {
            try {
                await db.collection("users").doc(createdBy).collection("notifications").add({
                    type: "automation_result",
                    title: autoData.title ?? "Automatización",
                    content: messageContent,
                    automationId: autoRef.id,
                    read: false,
                    createdAt: now,
                });
            }
            catch (notifErr) {
                console.error(`[automations] Error enviando notificación:`, notifErr?.message ?? notifErr);
            }
        }
    }
    else if ((source.type === "personal" || source.type === "dm") && source.dmId) {
        parentRef = db.collection("workspaces").doc(workspaceId).collection("dms").doc(source.dmId);
        messagesCol = parentRef.collection("messages");
    }
    else if (source.channelId) {
        parentRef = db.collection("workspaces").doc(workspaceId).collection("channels").doc(source.channelId);
        messagesCol = parentRef.collection("messages");
    }
    await batch.commit();
    // Enviar mensaje al canal/DM (separado del batch principal para no fallar si el canal no existe)
    if (messagesCol && parentRef) {
        try {
            const parentDoc = await parentRef.get();
            if (parentDoc.exists) {
                const msgBatch = db.batch();
                const msgRef = messagesCol.doc();
                msgBatch.set(msgRef, {
                    senderId: "system:automations",
                    senderName: "⚡ Automatización",
                    senderPhoto: "",
                    content: messageContent,
                    type: "agent_notification",
                    actionCardTitle: autoData.title ?? "Resultado de automatización",
                    createdAt: now,
                });
                msgBatch.update(parentRef, {
                    lastMessageAt: now,
                    lastMessagePreview: messageContent.slice(0, 80),
                });
                await msgBatch.commit();
            }
            else {
                console.warn(`[automations] Canal/DM no encontrado: ${parentRef.path}`);
            }
        }
        catch (msgErr) {
            console.error(`[automations] Error enviando mensaje:`, msgErr?.message ?? msgErr);
        }
    }
    console.info(`[automations] ✅ autoId=${autoRef.id} status=${status} nextRun=${nextRun?.toISOString() ?? "completed"} sentTo=${source.type}:${source.channelId ?? source.dmId ?? "none"}`);
    return { automationId: autoRef.id, status, nextRun: nextRun?.toISOString() ?? null };
}
/** Lógica principal: busca y procesa automatizaciones pendientes */
async function pollAndExecute() {
    const now = Timestamp.now();
    // Collection group query: busca automations en TODOS los workspaces
    const snap = await db
        .collectionGroup("automations")
        .where("status", "==", "active")
        .where("schedule.nextRunAt", "<=", now)
        .limit(BATCH_LIMIT)
        .get();
    if (snap.empty) {
        console.info("[automations] Sin automatizaciones pendientes");
        return { processed: 0, results: [] };
    }
    console.info(`[automations] Encontradas ${snap.size} automatizaciones pendientes`);
    const results = [];
    for (const doc of snap.docs) {
        try {
            const r = await processAutomation(doc.ref, doc.data());
            results.push(r);
        }
        catch (err) {
            console.error(`[automations] Error en autoId=${doc.id}:`, err?.message ?? err);
            results.push({ automationId: doc.id, status: "error", error: err?.message });
        }
    }
    return { processed: results.length, results };
}
// ══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PROGRAMADA: corre cada 5 minutos automáticamente
// ══════════════════════════════════════════════════════════════════════════════
export const processAutomations = onSchedule({
    schedule: "every 5 minutes",
    timeZone: "America/Bogota",
    region: "us-central1",
    retryCount: 1,
    memory: "256MiB",
    timeoutSeconds: 120,
}, async () => {
    const { processed } = await pollAndExecute();
    console.info(`[processAutomations] Ciclo completado: ${processed} procesadas`);
});
// ══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN HTTP: para pruebas manuales (llama desde el navegador o curl)
// ══════════════════════════════════════════════════════════════════════════════
export const runAutomationsNow = onRequest({
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 120,
}, async (req, res) => {
    console.info("[runAutomationsNow] Ejecución manual iniciada");
    const { processed, results } = await pollAndExecute();
    res.json({ ok: true, processed, results });
});
// ══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN DE PRUEBA: crea datos para test (solo desarrollo)
// ══════════════════════════════════════════════════════════════════════════════
export { seedTestAutomation } from "./test-seed.js";
//# sourceMappingURL=index.js.map