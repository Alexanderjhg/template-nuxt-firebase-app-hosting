import type { CreateChargeParams, ChargeResponse } from '../../server/utils/paymentGateway';

export const usePayment = () => {
  const isLoading = useState<boolean>('payment:loading', () => false);
  const paymentError = useState<string | null>('payment:error', () => null);
  const lastCharge = useState<ChargeResponse | null>('payment:lastCharge', () => null);

  const { user, getIdToken } = useAuth();

  /**
   * Inicia el proceso de checkout.
   * Envía los datos de la orden al backend y redirige al usuario a la pasarela.
   */
  async function startCheckout(params: Omit<CreateChargeParams, 'customer'>) {
    if (!user.value) {
      paymentError.value = 'Debes iniciar sesión para realizar un pago.';
      return null;
    }

    isLoading.value = true;
    paymentError.value = null;

    try {
      const idToken = await getIdToken();
      
      const response = await $fetch<{ success: boolean; redirectUrl: string; chargeId: string }>(
        '/api/protected/payments/checkout',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: {
            ...params,
            customer: {
              name: user.value.displayName || 'Usuario',
              email: user.value.email || '',
              // Otros datos como phone o document se podrían pedir en un form previo
            },
          },
        }
      );

      if (response.redirectUrl) {
        // Redirigir a la pasarela de pagos (ePayco, Stripe, etc.)
        window.location.href = response.redirectUrl;
      }

      return response;
    } catch (err: any) {
      console.error('[usePayment] checkout error:', err);
      paymentError.value = err.data?.message || 'Error al procesar el pago.';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Cancela una suscripción enviando la petición al backend.
   */
  async function cancelSubscription(subscriptionId: string) {
    if (!user.value) {
      paymentError.value = 'Debes iniciar sesión para realizar esta acción.';
      return false;
    }

    isLoading.value = true;
    paymentError.value = null;

    try {
      const idToken = await getIdToken();
      
      const response = await $fetch<{ success: boolean; message: string }>(
        '/api/protected/payments/cancel-subscription',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: {
            subscriptionId,
          },
        }
      );

      return response.success;
    } catch (err: any) {
      console.error('[usePayment] error al cancelar sub:', err);
      paymentError.value = err.data?.message || 'Error al intentar cancelar la suscripción.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Crea una suscripción recurrente.
   * Envía los datos de la tarjeta al backend, que realiza el flujo completo:
   * tokenización → creación de cliente → creación de suscripción (todo vía epayco-sdk-node).
   */
  async function createNativeSubscription(params: {
    planId: string;
    cardData: { number: string; exp_month: string; exp_year: string; cvc: string };
    document?: string;
  }) {
    if (!user.value) {
      paymentError.value = 'Debes iniciar sesión para suscribirte.';
      return null;
    }

    isLoading.value = true;
    paymentError.value = null;

    try {
      const idToken = await getIdToken();

      const response = await $fetch<{ success: boolean; subscriptionId: string; status: string }>(
        '/api/protected/payments/subscribe',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
          body: {
            planId:   params.planId,
            cardData: params.cardData,
            customer: {
              name:     user.value.displayName || 'Usuario',
              email:    user.value.email || '',
              document: params.document ?? '0000000000',
            },
            returnUrl: `${window.location.origin}/dashboard`,
            cancelUrl: `${window.location.origin}/checkout/test`,
          },
        }
      );

      return response;
    } catch (err: any) {
      console.error('[usePayment] subscription error:', err);
      paymentError.value = err.data?.message || 'Error al procesar la suscripción.';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading: readonly(isLoading),
    paymentError: readonly(paymentError),
    lastCharge: readonly(lastCharge),
    startCheckout,
    cancelSubscription,
    createNativeSubscription,
  };
};
