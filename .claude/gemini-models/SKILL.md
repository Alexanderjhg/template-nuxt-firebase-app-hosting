---
name: gemini-models
description: Referencia completa de modelos de Google Gemini disponibles en la API (generativelanguage.googleapis.com). Usa esta skill cuando necesites saber qué model ID usar en código, cuáles son los modelos gratuitos, cuáles están deprecados, comparar precio/rendimiento, o integrar Gemini con el SDK @google/generative-ai. Actívala también si el usuario pregunta "qué modelo de Gemini usar", menciona un error 404 de modelo, o quiere saber la diferencia entre Gemini 2.5 Pro, Gemini 3 Flash, etc.
---

# Google Gemini API — Modelos Actuales (Marzo 2026)

> Aplica a: `generativelanguage.googleapis.com` y SDK `@google/generative-ai`
> NO aplica a Vertex AI (tienen IDs distintos).

---

## TL;DR — ¿Qué modelo usar?

| Necesidad | Model ID |
|-----------|----------|
| Más potente (sin límite de costo) | `gemini-3.1-pro-preview` |
| Mejor relación calidad/precio | `gemini-2.5-flash` |
| Más barato / tier gratuito | `gemini-2.5-flash-lite` |
| Producción estable y potente | `gemini-2.5-pro` |
| Próxima generación económica | `gemini-3.1-flash-lite-preview` |

---

## Serie Gemini 3 (Preview — más nueva, sujeta a cambios)

| Modelo | Model ID | Tier gratuito |
|--------|----------|:---:|
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | No (solo pago) |
| Gemini 3 Flash Preview | `gemini-3-flash-preview` | Sí |
| Gemini 3.1 Flash Lite Preview | `gemini-3.1-flash-lite-preview` | Sí |

**⚠ Nota:** `gemini-3-pro-preview` fue dado de baja el 9 de marzo 2026. Usar `gemini-3.1-pro-preview`.

---

## Serie Gemini 2.5 (Estable — recomendada para producción)

| Modelo | Model ID | Contexto | Tier gratuito |
|--------|----------|----------|:---:|
| Gemini 2.5 Pro | `gemini-2.5-pro` | 1M tokens | No (solo pago) |
| Gemini 2.5 Flash | `gemini-2.5-flash` | 1M tokens | Sí |
| Gemini 2.5 Flash Lite | `gemini-2.5-flash-lite` | 1M tokens | Sí |

---

## Precios (por millón de tokens)

| Model ID | Input (≤200k) | Output (≤200k) |
|----------|:---:|:---:|
| `gemini-3.1-pro-preview` | $2.00 | $12.00 |
| `gemini-3-flash-preview` | $0.50 | $3.00 |
| `gemini-3.1-flash-lite-preview` | $0.25 | $1.50 |
| `gemini-2.5-pro` | $1.25 | $10.00 |
| `gemini-2.5-flash` | $0.30 | $2.50 |
| `gemini-2.5-flash-lite` | $0.10 | $0.40 |

**Descuento Batch API:** 50% sobre precio estándar en todos los modelos.

---

## Modelos Deprecados / No Disponibles

### Ya dados de baja (error 404 si se usan)
| Model ID | Reemplazar por |
|----------|----------------|
| `gemini-pro` | `gemini-2.5-pro` |
| `gemini-1.5-pro` | `gemini-2.5-pro` |
| `gemini-1.5-flash` | `gemini-2.5-flash` |
| `gemini-3-pro-preview` | `gemini-3.1-pro-preview` |
| `text-embedding-004` | `gemini-embedding-001` |

### Deprecados — se dan de baja el 1 de junio 2026
| Model ID | Reemplazar por |
|----------|----------------|
| `gemini-2.0-flash` | `gemini-2.5-flash` |
| `gemini-2.0-flash-001` | `gemini-2.5-flash` |
| `gemini-2.0-flash-lite` | `gemini-2.5-flash-lite` |
| `gemini-2.0-flash-lite-001` | `gemini-2.5-flash-lite` |

---

## Capacidades por modelo

Todos los modelos 2.5 y 3.x soportan:
- Entradas: texto, imagen, video, audio, PDF
- Function calling y structured output
- Modo de razonamiento/thinking (togglable)
- Ejecución de código
- Context caching
- Search grounding (Google Search)

---

## Uso en código (@google/generative-ai)

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Más potente:
const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

// Equilibrado (recomendado por defecto):
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Más barato / free tier:
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const result = await model.generateContent("Tu prompt aquí");
const text = result.response.text();
```

---

## Embeddings

| Model ID | Tipo | Tier gratuito |
|----------|------|:---:|
| `gemini-embedding-001` | Solo texto | Sí |
| `gemini-embedding-2-preview` | Texto, imagen, video, audio, PDF | No |

---

## Notas importantes

- Usar aliases sin versión (`gemini-2.5-flash` no `gemini-2.5-flash-preview-09-2025`) — siempre apuntan a la versión estable más reciente.
- `gemini-2.5-pro` y `gemini-3.1-pro-preview` **requieren cuenta de pago** — no tienen free tier.
- El error `404 — This model is no longer available to new users` significa que el model ID está deprecado; cambiar por el reemplazante de esta tabla.
- Todos los modelos 2.5+ tienen ventana de contexto de 1M tokens.
