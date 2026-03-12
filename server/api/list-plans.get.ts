// Endpoint temporal para listar los planes existentes en ePayco.
// Útil para encontrar el id_plan correcto. Eliminar en producción.
import EpaycoModule from "epayco-sdk-node";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const Epayco  = (EpaycoModule as any).default || EpaycoModule;

  const epayco = new (Epayco as any)({
    apiKey:     config.public.epaycoPublicKey,
    privateKey: config.epaycoPrivateKey,
    lang:       "ES",
    test:       config.epaycoIsTest !== "false",
  });

  const response = await epayco.plans.list();
  return response;
});
