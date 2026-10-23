import axios from 'axios';

// Lectura de la planilla de campo por foto (Hernan, 2026-10-23: "un boton para tomar
// una foto de planillas y cargar toda la data sin necesidad de estar diligenciando").
// Corre en la GPU propia del servidor (Hernan: "estamos pagando una GPU"), con un modelo
// de vision (SHEET_VISION_MODEL, hoy qwen2.5vl:3b): prueba del 23-oct con una planilla
// escrita a mano, 7 de 7 valores correctos en 17 s. La T4 no alcanza para tenerlo junto
// a gpt-oss: Ollama descarga gpt-oss para leer la foto, y al terminar se vuelve a cargar
// gpt-oss en segundo plano (~80 s) para que el resto de la IA no espere la primera vez.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const TEXT_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss';

export interface SheetField { key: string; label: string; unit?: string; hint?: string }

export const sheetReaderModel = () => (process.env.SHEET_VISION_MODEL || '').trim();
export const sheetReaderEnabled = () => !!sheetReaderModel();

export function buildSheetPrompt(fields: SheetField[]): string {
    const list = fields.map(f => `- "${f.key}": ${f.label}${f.unit ? ` (${f.unit})` : ''}${f.hint ? ` — ${f.hint}` : ''}`).join('\n');
    return `Eres un asistente de laboratorio ambiental. La imagen es una planilla de campo de muestreo (puede estar escrita a mano).
Lee la planilla y devuelve SOLO un objeto JSON con los valores que aparezcan escritos para estos campos:
${list}

REGLAS:
- Usa exactamente las claves de la lista. Omite el campo si no aparece o no se lee con claridad. NUNCA adivines ni inventes.
- Copia el valor como está escrito (números con su separador decimal, sin agregar unidades que no estén).
- Si un campo tiene varias lecturas, sepáralas con "; ".
- Responde solo el JSON, sin texto adicional.`;
}

// Deja solo claves pedidas y valores de texto cortos.
export function cleanSheetValues(raw: unknown, fields: SheetField[]): Record<string, string> {
    const allowed = new Set(fields.map(f => f.key));
    const out: Record<string, string> = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!allowed.has(k) || v === null || v === undefined) continue;
        const text = (Array.isArray(v) ? v.join('; ') : String(v)).trim();
        if (!text || /^(n\/?a|null|sin dato|no legible|-+)$/i.test(text)) continue;
        out[k] = text.slice(0, 200);
    }
    return out;
}

export function parseJsonObject(text: string): unknown {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
}

export async function readFieldSheet(imagesBase64: string[], fields: SheetField[]): Promise<Record<string, string>> {
    const model = sheetReaderModel();
    if (!model) throw Object.assign(new Error('La lectura de planillas por foto no está activada.'), { status: 503 });
    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model,
        stream: false,
        format: 'json',
        keep_alive: 0, // libera la GPU apenas termina
        options: { temperature: 0, num_ctx: 8192 },
        messages: [{ role: 'user', content: buildSheetPrompt(fields), images: imagesBase64 }],
    }, { timeout: 300_000 }).finally(() => rewarmTextModel());
    return cleanSheetValues(parseJsonObject(response.data?.message?.content || ''), fields);
}

// Vuelve a cargar el modelo de texto (mismo contexto que el resto: 16384) sin esperar.
function rewarmTextModel() {
    axios.post(`${OLLAMA_URL}/api/generate`, {
        model: TEXT_MODEL, prompt: 'ok', stream: false, keep_alive: -1, options: { num_ctx: 16384, num_predict: 1 },
    }, { timeout: 300_000 }).catch(err => console.warn('[Planilla] No se pudo recargar el modelo de texto:', err?.message));
}
