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

  return {
    isLoading: readonly(isLoading),
    paymentError: readonly(paymentError),
    lastCharge: readonly(lastCharge),
    startCheckout,
  };
};
