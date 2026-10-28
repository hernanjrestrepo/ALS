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

// --- Transcripcion y lectura de cualquier archivo (Hernan, 23-oct: "debe poder leer todo
// tipo de archivo... no esta transcribiendo la informacion del archivo") ------------------

// Texto completo de una planilla fotografiada o escaneada, para el analisis de la OIT.
export async function transcribeImages(imagesBase64: string[]): Promise<string> {
    const model = sheetReaderModel();
    if (!model) throw Object.assign(new Error('La lectura de planillas por foto no está activada.'), { status: 503 });
    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model,
        stream: false,
        keep_alive: 0,
        options: { temperature: 0, num_ctx: 8192 },
        messages: [{
            role: 'user',
            content: 'Transcribe todo el texto de esta planilla de muestreo ambiental, tal como está escrito (puede ser a mano). Escribe cada dato como "campo: valor", una línea por dato, y las tablas fila por fila. No inventes nada; si algo no se lee escribe [ilegible].',
            images: imagesBase64,
        }],
    }, { timeout: 300_000 }).finally(() => rewarmTextModel());
    return String(response.data?.message?.content || '').trim();
}

export function buildTextSheetPrompt(text: string, fields: SheetField[]): string {
    const list = fields.map(f => `- "${f.key}": ${f.label}${f.unit ? ` (${f.unit})` : ''}${f.hint ? ` — ${f.hint}` : ''}`).join('\n');
    return `Eres un asistente de laboratorio ambiental. Abajo está el TEXTO de una planilla de campo de muestreo (sacado de un Word, PDF o Excel).
Devuelve SOLO un objeto JSON con los valores que aparezcan en el texto para estos campos:
${list}

REGLAS:
- Usa exactamente las claves de la lista. Omite el campo si no aparece en el texto. NUNCA adivines ni inventes.
- Copia el valor como está escrito (números con su separador decimal, sin agregar unidades que no estén).
- Si un campo tiene varias lecturas, sepáralas con "; ".
- Responde solo el JSON, sin texto adicional.

TEXTO DE LA PLANILLA:
${text.substring(0, CHUNK_CHARS + 1000)}`;
}

const fold = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CHUNK_CHARS = 9000;
const MAX_CHUNKS = 6;

// Parte el texto en tandas por lineas.
export function splitIntoChunks(text: string, size = CHUNK_CHARS): string[] {
    const chunks: string[] = [];
    let cur = '';
    for (const line of text.split('\n')) {
        if (cur.length + line.length + 1 > size && cur) { chunks.push(cur); cur = ''; }
        cur += line + '\n';
    }
    if (cur.trim()) chunks.push(cur);
    return chunks;
}

// Cuantas veces aparecen en la tanda las palabras de los campos pedidos (pH, oxigeno,
// temperatura...): se leen primero las tandas que hablan de lo que se busca.
export function scoreChunk(chunk: string, fields: SheetField[]): number {
    const body = fold(chunk);
    const words = new Set(fields.flatMap(f => fold(`${f.label} ${f.hint || ''}`).split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !['de', 'del', 'la', 'el', 'en', 'se', 'y', 'o', 'por', 'in'].includes(w))));
    let score = 0;
    for (const w of words) score += body.split(w).length - 1;
    return score;
}

// Llena campos desde el texto de un documento con el modelo de texto (ya cargado en la GPU).
// Un documento largo (la PDF de la OT 15030 trae 20 paginas: lista de chequeo, acta, plan,
// planilla de campo, controles de calidad = 90 000 caracteres) se lee por tandas, las mas
// relevantes primero. Antes solo se enviaban los primeros 12 000 caracteres (la lista de
// chequeo) y no se leia ningun dato (28-oct: "no me esta reconociendo pH, temperatura ni oxigeno").
export async function readFieldsFromText(text: string, fields: SheetField[]): Promise<Record<string, string>> {
    const ranked = splitIntoChunks(text)
        .map((chunk, i) => ({ chunk, i, score: scoreChunk(chunk, fields) }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .slice(0, MAX_CHUNKS);
    const values: Record<string, string> = {};
    for (const { chunk } of ranked.length ? ranked : [{ chunk: text.substring(0, CHUNK_CHARS) }]) {
        const remaining = fields.filter(f => !values[f.key]);
        if (!remaining.length) break;
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: TEXT_MODEL,
            prompt: buildTextSheetPrompt(chunk, remaining),
            stream: false,
            // Extraer datos no necesita razonar mucho: gpt-oss en nivel alto tardo 225 s en una cotizacion.
            think: 'low',
            options: { num_ctx: 16384, temperature: 0, seed: 42 },
        }, { timeout: 300_000 });
        const found = cleanSheetValues(parseJsonObject(response.data?.response || ''), remaining);
        for (const [k, v] of Object.entries(found)) if (!values[k]) values[k] = v;
    }
    return values;
}

// Paginas de un PDF escaneado como imagenes PNG (poppler-utils: pdftoppm). Sin maxPages
// se convierten todas (Hernan 2026-10-24: "24 o las que sean").
export async function pdfPagesToImages(pdfPath: string, maxPages?: number): Promise<string[]> {
    const { execFile } = require('child_process');
    const os = require('os');
    const fsMod = require('fs');
    const pathMod = require('path');
    const dir = fsMod.mkdtempSync(pathMod.join(os.tmpdir(), 'planilla-'));
    try {
        await new Promise<void>((resolve, reject) => {
            const limit = maxPages ? ['-l', String(maxPages)] : [];
            execFile('pdftoppm', ['-png', '-r', '150', ...limit, pdfPath, pathMod.join(dir, 'p')], { timeout: 600_000 },
                (err: Error | null) => (err ? reject(err) : resolve()));
        });
        return fsMod.readdirSync(dir).filter((f: string) => f.endsWith('.png')).sort()
            .map((f: string) => fsMod.readFileSync(pathMod.join(dir, f)).toString('base64'));
    } finally {
        fsMod.rmSync(dir, { recursive: true, force: true });
    }
}
