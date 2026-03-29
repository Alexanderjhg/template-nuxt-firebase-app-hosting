# Integrar n8n como Agente en Clowpen

## Flujo completo

```
Usuario escribe en canal del agente
        ↓
Clowpen envía webhook firmado a n8n
        ↓
n8n recibe → extrae mensaje → llama Gemini
        ↓
Gemini detecta intención (tarea, recordatorio, buscar, etc.)
        ↓
n8n envía respuesta con action cards a Clowpen
        ↓
Usuario ve la respuesta con botones en el chat
```

---

## Paso 1: Configurar credenciales en n8n

### 1.1 Gemini API Key

1. Ve a https://aistudio.google.com/apikey
2. Crea una API key
3. En n8n: **Credentials** → **Add Credential** → **Query Auth**
   - Name: `Gemini API Key`
   - Name (param): `key`
   - Value: `tu_api_key_de_gemini`

### 1.2 Clowpen Agent Token

(Este token lo obtienes en el Paso 2)

En n8n: **Credentials** → **Add Credential** → **Header Auth**
- Name: `Clowpen Agent Token`
- Name (header): `Authorization`
- Value: `Bearer <tu_token_del_agente>`

---

## Paso 2: Crear el agente en Clowpen

1. Abre tu workspace → **Ajustes** → **Agentes** → **Conectar agente**
2. Llena el formulario:
   - **Nombre**: `Asistente n8n`
   - **Descripción**: `Agente con IA que detecta intenciones y ejecuta acciones`
   - **Webhook URL**: `http://localhost:5678/webhook/clowpen-agent`
     (Cambia el puerto si tu n8n usa otro)
   - **Permisos**: Marca `read`, `notify`, `suggest`
3. Haz clic en **Crear**
4. **COPIA EL TOKEN** — solo se muestra una vez
5. Ve a n8n y actualiza la credencial `Clowpen Agent Token` con el token

---

## Paso 3: Importar el workflow en n8n

1. Abre n8n → **Workflows** → **Import from File**
2. Selecciona el archivo: `docs/n8n-agent-workflow.json`
3. Actualiza las credenciales en cada nodo:
   - **Gemini - Analizar intención**: Selecciona tu credencial `Gemini API Key`
   - **Enviar respuesta a Clowpen**: Selecciona tu credencial `Clowpen Agent Token`
4. En el nodo **Enviar respuesta a Clowpen**, verifica que la URL sea:
   ```
   http://localhost:3000/api/agents/notify
   ```
   (Cambia `3000` por el puerto donde corre tu app)

---

## Paso 4: Activar y probar

1. En n8n, activa el workflow (botón "Active" arriba a la derecha)
2. En Clowpen, ve al canal del agente (`🤖 Asistente n8n`)
3. Escribe algo como:
   - `Crea una tarea para revisar el diseño mañana`
   - `Recuérdame la reunión de las 3pm`
   - `Busca los mensajes sobre el presupuesto`
   - `Hola, qué puedes hacer?`
4. En ~2 segundos deberías ver la respuesta del agente con action cards

---

## Estructura del webhook que recibe n8n

Cuando escribes en el canal del agente, Clowpen envía:

```json
POST http://localhost:5678/webhook/clowpen-agent

Headers:
  X-Clowpen-Signature: sha256=<hmac_hex>
  X-Clowpen-Event: message.created
  Content-Type: application/json

Body:
{
  "event": "message.created",
  "workspaceId": "abc123",
  "agentId": "agent_xyz",
  "data": {
    "messageId": "msg_001",
    "channelId": "ch_agent",
    "senderId": "user_uid",
    "senderName": "Juan",
    "content": "Crea una tarea para revisar el diseño",
    "createdAt": "2026-03-24T18:42:00.000Z"
  }
}
```

## Estructura de la respuesta que n8n envía

```json
POST http://localhost:3000/api/agents/notify

Headers:
  Authorization: Bearer <agent_token>

Body:
{
  "message": "¡Entendido! Voy a crear la tarea para revisar el diseño.",
  "cardTitle": "Nueva tarea",
  "actions": [
    {
      "label": "Crear tarea",
      "actionType": "custom",
      "payload": { "type": "task", "title": "Revisar diseño" },
      "style": "primary"
    },
    {
      "label": "Descartar",
      "actionType": "dismiss",
      "payload": {},
      "style": "secondary"
    }
  ]
}
```

---

## Nodos del workflow

| # | Nodo | Qué hace |
|---|------|----------|
| 1 | **Webhook Recibe Mensaje** | Escucha `POST /webhook/clowpen-agent` |
| 2 | **Es mensaje nuevo?** | Filtra solo eventos `message.created` |
| 3 | **Extraer datos** | Saca `userMessage`, `senderName`, `channelId` |
| 4 | **Gemini - Analizar intención** | Envía el mensaje a Gemini 2.0 Flash con prompt de intenciones |
| 5 | **Parsear respuesta Gemini** | Convierte la respuesta JSON de Gemini en payload para Clowpen |
| 6 | **Enviar respuesta a Clowpen** | `POST /api/agents/notify` con la action card |
| 7 | **Responder Webhook OK** | Responde 200 al webhook original |

---

## Intenciones que detecta Gemini

| Intent | Ejemplo | Action Card |
|--------|---------|-------------|
| `task` | "Crea una tarea para..." | Botón "Crear tarea" |
| `reminder` | "Recuérdame a las 3pm..." | Botón "Crear recordatorio" |
| `search` | "Busca mensajes sobre..." | Botón "Buscar" |
| `report` | "Dame el reporte de..." | Botón "Generar reporte" |
| `greeting` | "Hola, qué haces?" | Solo texto, sin botones |
| `unknown` | Cualquier otra cosa | Texto de ayuda |

---

## Verificar firma HMAC (opcional pero recomendado)

Para verificar que el webhook realmente viene de Clowpen, agrega un nodo **Code** antes del filtro:

```javascript
const crypto = require('crypto');

const signature = $input.first().json.headers['x-clowpen-signature'];
const rawBody = $input.first().json.rawBody;
const secret = 'TU_WEBHOOK_SECRET'; // Lo encuentras en Firestore: agents/{id}.webhookSecret

const expected = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

if (signature !== expected) {
  throw new Error('Firma inválida — webhook rechazado');
}

return $input.all();
```

---

## Troubleshooting

**n8n no recibe el webhook:**
- Verifica que n8n esté corriendo y el workflow activo
- La URL del webhook debe ser exacta: `http://localhost:5678/webhook/clowpen-agent`
- Si usas n8n con túnel, usa esa URL en vez de localhost

**Gemini no responde:**
- Verifica que la API key sea válida en https://aistudio.google.com/apikey
- El modelo `gemini-2.0-flash` requiere una key con acceso a la API v1beta

**Clowpen no muestra la respuesta:**
- Verifica que el token del agente sea correcto
- El agente debe tener permiso `notify`
- La URL debe apuntar a tu instancia de Clowpen (`localhost:3000`)
