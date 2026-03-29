// functions/src/test-seed.ts
// Función HTTP para crear datos de prueba de automatización.
// Solo para desarrollo — eliminar en producción.

import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";

export const seedTestAutomation = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const db = getFirestore("clow1");

    const workspaceId = req.query.workspaceId as string;
    const channelId = req.query.channelId as string;

    if (!workspaceId) {
      res.status(400).json({ error: "Necesitas ?workspaceId=xxx" });
      return;
    }

    // Crear automatización con nextRunAt en el pasado (se ejecutará inmediatamente)
    const autoRef = db
      .collection("workspaces").doc(workspaceId)
      .collection("automations").doc();

    const pastDate = new Date(Date.now() - 60_000); // 1 minuto atrás

    await autoRef.set({
      workspaceId,
      createdBy: "test-user",
      createdByName: "Test",
      title: "Recordatorio de prueba",
      description: "Este es un recordatorio de prueba para verificar que el scheduler funciona correctamente.",
      schedule: {
        frequency: "once",
        time: "09:00",
        dayOfWeek: null,
        dayOfMonth: null,
        customCron: null,
        timezone: "America/Bogota",
        nextRunAt: Timestamp.fromDate(pastDate),
        endsAt: null,
      },
      source: {
        type: channelId ? "channel" : "global",
        channelId: channelId ?? null,
        channelName: channelId ? "Canal de prueba" : null,
        dmId: null,
      },
      status: "active",
      lastRunAt: null,
      lastRunResult: null,
      runCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.info(`[test-seed] Creada automatización de prueba: ${autoRef.id} en workspace ${workspaceId}`);

    res.json({
      ok: true,
      automationId: autoRef.id,
      message: "Automatización de prueba creada. Llama /runAutomationsNow para ejecutarla.",
    });
  },
);
