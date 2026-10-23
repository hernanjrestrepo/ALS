// Llena el formulario de muestreo desde CUALQUIER archivo de planilla (Hernan, 2026-10-23:
// "debe poder leer todo tipo de archivo... y preguntar cualquier duda"):
//  - fotos y PDF escaneados -> modelo de vision (GPU propia)
//  - Word, PDF con texto, Excel, CSV, texto -> se extrae el texto y el modelo de texto llena los campos
// Devuelve los valores, como se leyo cada archivo y las dudas (lo que no se encontro).
import path from 'path';
import { SheetField, readFieldSheet, readFieldsFromText, pdfPagesToImages } from './sheetReader';
import { readSheetText } from './sheetText';

export interface SheetFile { path: string; name: string }
export type SheetVia = 'VISION' | 'TEXTO' | 'NO_LEIDO';

export interface SheetFillResult {
    values: Record<string, string>;
    sources: Array<{ name: string; via: SheetVia; reason?: string }>;
    doubts: string[];
}

export interface SheetFillDeps {
    readText: (filePath: string, name: string) => ReturnType<typeof readSheetText>;
    renderPdf: (filePath: string) => Promise<string[]>;
    imageToBase64: (filePath: string) => string;
    vision: (images: string[], fields: SheetField[]) => Promise<Record<string, string>>;
    text: (text: string, fields: SheetField[]) => Promise<Record<string, string>>;
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_VISION_IMAGES = 6;
const MAX_FIELD_DOUBTS = 15;

const defaultDeps: SheetFillDeps = {
    readText: (p, n) => readSheetText(p, n),
    renderPdf: p => pdfPagesToImages(p),
    imageToBase64: p => require('fs').readFileSync(p).toString('base64'),
    vision: readFieldSheet,
    text: readFieldsFromText,
};

export async function readFieldsFromFiles(files: SheetFile[], fields: SheetField[], deps: SheetFillDeps = defaultDeps): Promise<SheetFillResult> {
    const sources: SheetFillResult['sources'] = [];
    const images: string[] = [];
    const texts: string[] = [];

    for (const f of files) {
        const ext = path.extname(f.name).toLowerCase();
        if (IMAGE_EXT.has(ext)) {
            images.push(deps.imageToBase64(f.path));
            sources.push({ name: f.name, via: 'VISION' });
            continue;
        }
        const read = await deps.readText(f.path, f.name);
        if (read.status === 'LEIDO') {
            texts.push(`=== ${f.name} ===\n${read.text}`);
            sources.push({ name: f.name, via: 'TEXTO' });
        } else if (read.status === 'ESCANEADO' && ext === '.pdf') {
            try {
                const pages = await deps.renderPdf(f.path);
                if (!pages.length) throw new Error('el PDF no tiene páginas');
                images.push(...pages);
                sources.push({ name: f.name, via: 'VISION' });
            } catch (error) {
                sources.push({ name: f.name, via: 'NO_LEIDO', reason: `No se pudo convertir el PDF escaneado: ${(error as Error).message}` });
            }
        } else {
            const reason = ext === '.doc'
                ? 'Word antiguo (.doc): guárdelo como .docx o PDF y vuelva a adjuntarlo.'
                : (read.reason || 'No se pudo leer.');
            sources.push({ name: f.name, via: 'NO_LEIDO', reason });
        }
    }

    // Primero el texto (el modelo de texto ya esta cargado); despues la vision, que lo
    // descarga de la GPU. Lo que trae la foto no pisa lo leido del documento.
    let values: Record<string, string> = {};
    if (texts.length) values = { ...(await deps.text(texts.join('\n\n'), fields)) };
    if (images.length) {
        const fromImages = await deps.vision(images.slice(0, MAX_VISION_IMAGES), fields);
        for (const [k, v] of Object.entries(fromImages)) if (!values[k]) values[k] = v;
    }

    const doubts: string[] = [];
    for (const s of sources) if (s.via === 'NO_LEIDO') doubts.push(`No se pudo leer «${s.name}»: ${s.reason}`);
    if (images.length > MAX_VISION_IMAGES) doubts.push(`Solo se leyeron las primeras ${MAX_VISION_IMAGES} páginas o fotos; adjunte el resto por separado.`);
    if (sources.some(s => s.via !== 'NO_LEIDO')) {
        const missing = fields.filter(f => !values[f.key]);
        for (const f of missing.slice(0, MAX_FIELD_DOUBTS)) doubts.push(`¿Cuál es el valor de «${f.label}»${f.unit ? ` (${f.unit})` : ''}? No aparece en la planilla.`);
        if (missing.length > MAX_FIELD_DOUBTS) doubts.push(`Y ${missing.length - MAX_FIELD_DOUBTS} campo(s) más sin dato en la planilla.`);
    }
    return { values, sources, doubts };
}
