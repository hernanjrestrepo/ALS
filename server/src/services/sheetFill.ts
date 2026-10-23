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
// Imagenes por llamada al modelo de vision y paginas maximas por lectura.
const MAX_VISION_IMAGES = 6;
export const MAX_PDF_PAGES = 24;
const MAX_FIELD_DOUBTS = 15;

const defaultDeps: SheetFillDeps = {
    readText: (p, n) => readSheetText(p, n),
    renderPdf: p => pdfPagesToImages(p, MAX_PDF_PAGES),
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
        } else if ((read.status === 'ESCANEADO' || read.status === 'ERROR') && ext === '.pdf') {
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
    // Todas las paginas, en tandas (la PM 2223 de la reunion del 23-oct tiene 12 paginas;
    // antes solo se leian las primeras).
    for (let i = 0; i < images.length; i += MAX_VISION_IMAGES) {
        const fromImages = await deps.vision(images.slice(i, i + MAX_VISION_IMAGES), fields);
        for (const [k, v] of Object.entries(fromImages)) if (!values[k]) values[k] = v;
    }

    const doubts: string[] = [];
    for (const s of sources) if (s.via === 'NO_LEIDO') doubts.push(`No se pudo leer «${s.name}»: ${s.reason}`);
    if (images.length >= MAX_PDF_PAGES) doubts.push(`Se leyeron ${MAX_PDF_PAGES} páginas o fotos; si hay más, adjunte el resto por separado.`);
    if (sources.some(s => s.via !== 'NO_LEIDO')) {
        const missing = fields.filter(f => !values[f.key]);
        for (const f of missing.slice(0, MAX_FIELD_DOUBTS)) doubts.push(`¿Cuál es el valor de «${f.label}»${f.unit ? ` (${f.unit})` : ''}? No aparece en la planilla.`);
        if (missing.length > MAX_FIELD_DOUBTS) doubts.push(`Y ${missing.length - MAX_FIELD_DOUBTS} campo(s) más sin dato en la planilla.`);
    }
    return { values, sources, doubts };
}
