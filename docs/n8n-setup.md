# Configurar Agente de Automatizaciones en n8n

## Requisitos previos

1. n8n corriendo (local o cloud)
2. Un agente creado en Clowpen con permisos: `read`, `notify`, `act`
3. El token del agente (se muestra una sola vez al crearlo)

## Paso 1: Variables de entorno en n8n

En n8n, ve a **Settings > Variables** y agrega:

| Variable | Valor |
|----------|-------|
| `CLOWPEN_BASE_URL` | `https://tu-dominio.com` (o `http://localhost:3000` en local) |

## Paso 2: Credencial HTTP Header

1. Ve a **Credentials > Add Credential > Header Auth**
2. Nombre: `Clowpen Agent Token`
3. Name: `Authorization`
4. Value: `Bearer TU_TOKEN_DEL_AGENTE`

## Paso 3: Importar el workflow

1. Ve a **Workflows > Import from File**
2. Selecciona `docs/n8n-automation-agent.json`
3. En cada nodo HTTP, selecciona la credencial `Clowpen Agent Token`

## Paso 4: Configurar el webhook del agente en Clowpen

1. Ve a **Configuracion > Agentes IA > Editar** tu agente
2. En **Webhook URL**, pon la URL del webhook de n8n:
   - Local: `http://localhost:5678/webhook/clowpen-agent-webhook`
   - Produccion: `https://tu-n8n.com/webhook/clowpen-agent-webhook`

## Arquitectura del workflow

```
FLUJO 1: Polling de automatizaciones (cada 5 min)
─────────────────────────────────────────────────
[Cron 5min] → [GET /pending] → [Hay pendientes?]
                                    ├─ SI → [Separar] → [Unica?]
                                    │                      ├─ SI → [Ejecutar Unica] → [POST /complete]
                                    │                      └─ NO → [Ejecutar Recurrente] → [POST /complete]
                                    └─ NO → (nada)

FLUJO 2: Mensajes directos del usuario al agente
─────────────────────────────────────────────────
[Webhook POST] → [Procesar mensaje] → [POST /notify] (responde en el canal)
```

## Personalizar la logica

Los nodos **"Ejecutar Tarea Unica"** y **"Ejecutar Tarea Recurrente"** contienen codigo JavaScript
de ejemplo. Modifica estos nodos para conectar con tus APIs reales:

### Ejemplos de personalizacion

**Noticias reales (con API):**
```javascript
// En el nodo "Ejecutar Tarea Recurrente"
const response = await fetch('https://newsapi.org/v2/top-headlines?country=co&apiKey=TU_KEY');
const news = await response.json();
const headlines = news.articles.slice(0, 5).map(a => `• ${a.title}`).join('\n');
result = `Noticias del dia:\n\n${headlines}`;
```

**Enviar email:**
```javascript
// Agrega un nodo "Send Email" despues del nodo Code
// y usa el resultado para componer el correo
```

**Consultar base de datos:**
```javascript
// Agrega un nodo "Postgres" o "MySQL" antes del nodo Code
// para obtener datos reales de tu sistema
```

## Endpoints disponibles para el agente

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| `GET` | `/api/agents/automations/pending` | Automatizaciones cuyo `nextRunAt` ya paso |
| `POST` | `/api/agents/automations/complete` | Reportar resultado (envia mensaje al canal origen) |
| `POST` | `/api/agents/notify` | Enviar mensaje al canal dedicado del agente |
| `GET` | `/api/agents/messages?channelId=X` | Leer mensajes de un canal |

## Body de /complete

```json
{
  "automationId": "abc123",
  "status": "success",
  "result": "Texto que el usuario vera como mensaje en su canal",
  "logs": {
    "executedAt": "2026-03-26T08:00:00Z",
    "details": "cualquier dato extra"
  }
}
```

El resultado se envia automaticamente como mensaje `agent_notification` al canal o DM
donde el usuario creo la automatizacion originalmente.
