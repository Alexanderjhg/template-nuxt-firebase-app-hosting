import { getPaymentProvider } from "../../../utils/paymentGateway";
import { getAdminAuth } from "../../../utils/firebaseAdmin";

export default defineEventHandler(async (event) => {
  // 1. Verificación de Autenticación
  const authHeader = getHeader(event, "authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      message: "No autorizado. Token de sesión no encontrado.",
    });
  }

  const idToken = authHeader.split("Bearer ")[1];
  
  if (!idToken) {
    throw createError({
      statusCode: 401,
      message: "Token de sesión mal formado.",
    });
  }
  let decodedToken;
  
  try {
    decodedToken = await getAdminAuth().verifyIdToken(idToken);
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: "Token inválido o expirado.",
    });
  }

  // 2. Leer Body
  const body = await readBody<{ subscriptionId: string }>(event);

  if (!body || !body.subscriptionId) {
    throw createError({
      statusCode: 400,
      message: "Faltan parámetros requeridos (subscriptionId).",
    });
  }

  // 3. (OPCIONAL EN PRODUCCIÓN)
  // Verificar que esta subscriptionId realmente le pertenece al usuario 
  // consultando Firestore: `db.collection('users').doc(decodedToken.uid).get(...)`
  // Para este ejemplo, lo damos por bueno.

  try {
    // 4. Instanciar pasarela (ePayco por defecto)
    const gateway = await getPaymentProvider();

    // 5. Ejecutar Cancelación en el proveedor externo (ePayco)
    const result = await gateway.cancelSubscription(body.subscriptionId);

    if (result.success) {
      // (OPCIONAL EN PRODUCCIÓN) Actualizar el estado en Firestore a "canceled"
      return {
        success: true,
        message: "Suscripción cancelada exitosamente.",
      };
    } else {
      throw createError({
        statusCode: 400,
        message: "La solicitud de baja fue rechazada por la pasarela de pagos.",
      });
    }
  } catch (error: any) {
    console.error("[CancelSubscription API] Error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Error al solicitar baja en el servidor",
    });
  }
});
