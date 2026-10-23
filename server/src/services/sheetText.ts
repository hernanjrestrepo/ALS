// Extrae el texto de una planilla de muestreo segun su formato. Lo que no se puede leer
// como texto se devuelve con su motivo, para que la OIT lo muestre en vez de analizar
// un archivo vacio en silencio (queja de Ana, 2026-10-23: "cargo el archivo pero no
// cargo la data").
import fs from 'fs';
import path from 'path';
import { pdfService } from './pdf.service';
import { sheetReaderEnabled, transcribeImages, pdfPagesToImages } from './sheetReader';

export type SheetReadStatus = 'LEIDO' | 'ESCANEADO' | 'IMAGEN' | 'NO_SOPORTADO' | 'ERROR';

export interface SheetText {
    filename: string;
    status: SheetReadStatus;
    text: string;
    reason?: string;
}

// Un PDF con menos texto que esto se considera escaneado (solo imagen).
const MIN_PDF_TEXT = 20;

export interface ReadSheetOptions {
    // Transcribe fotos y PDF escaneados con el modelo de vision (GPU propia).
    ocr?: boolean;
    // Inyectable para pruebas.
    transcribe?: (images: string[]) => Promise<string>;
    renderPdf?: (pdfPath: string) => Promise<string[]>;
}

export async function readSheetText(filePath: string, filename = path.basename(filePath), opts: ReadSheetOptions = {}): Promise<SheetText> {
    const plain = await readSheetTextPlain(filePath, filename);
    // Un PDF cuyo texto no se puede extraer (escaneado o mal formado) se intenta por vision.
    const isPdf = path.extname(filename).toLowerCase() === '.pdf';
    const needsOcr = plain.status === 'IMAGEN' || plain.status === 'ESCANEADO' || (plain.status === 'ERROR' && isPdf);
    if (!opts.ocr || !needsOcr) return plain;
    const transcribe = opts.transcribe || (sheetReaderEnabled() ? transcribeImages : null);
    if (!transcribe) return plain;
    try {
        const ext = path.extname(filename).toLowerCase();
        const images = ext === '.pdf'
            ? await (opts.renderPdf || (p => pdfPagesToImages(p, 24)))(filePath)
            : [fs.readFileSync(filePath).toString('base64')];
        // Todas las paginas, de a 6 por llamada.
        const parts: string[] = [];
        for (let i = 0; i < images.length; i += 6) parts.push((await transcribe(images.slice(i, i + 6))).trim());
        const text = parts.filter(Boolean).join('\n\n');
        if (!text) return { ...plain, reason: `${plain.reason} La IA de visión no encontró texto.` };
        return { filename, status: 'LEIDO', text, reason: 'Leído con IA de visión (revisar).' };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ...plain, reason: `${plain.reason} La IA de visión falló: ${message}` };
    }
}

async function readSheetTextPlain(filePath: string, filename: string): Promise<SheetText> {
    const ext = path.extname(filename).toLowerCase();
    try {
        if (ext === '.pdf') {
            const text = (await pdfService.extractText(filePath)) || '';
            if (text.trim().length < MIN_PDF_TEXT) {
                return { filename, status: 'ESCANEADO', text: '', reason: 'PDF sin texto (escaneado). Usar la lectura por foto para llenar los campos.' };
            }
            return { filename, status: 'LEIDO', text };
        }
        if (ext === '.docx') {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ path: filePath });
            const text: string = result.value || '';
            if (!text.trim()) {
                return { filename, status: 'ESCANEADO', text: '', reason: 'Word sin texto (solo imágenes o vacío).' };
            }
            return { filename, status: 'LEIDO', text };
        }
        if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filePath);
            let text = '';
            workbook.SheetNames.forEach((name: string) => {
                text += `\n--- HOJA: ${name} ---\n${xlsx.utils.sheet_to_csv(workbook.Sheets[name])}\n`;
            });
            return { filename, status: 'LEIDO', text };
        }
        if (ext === '.txt') {
            return { filename, status: 'LEIDO', text: fs.readFileSync(filePath, 'utf-8') };
        }
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            return { filename, status: 'IMAGEN', text: '', reason: 'Imagen: no se lee como texto. Usar la lectura por foto para llenar los campos.' };
        }
        return { filename, status: 'NO_SOPORTADO', text: '', reason: `Formato ${ext || 'sin extensión'} no soportado para leer.` };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { filename, status: 'ERROR', text: '', reason: `No se pudo leer: ${message}` };
    }
}

// Lo que se le pasa a la IA: el texto de lo leido y, aparte, lo que no se pudo leer.
export function combineSheetTexts(sheets: SheetText[]): { combined: string; unreadable: Array<{ filename: string; reason: string }> } {
    const unreadable = sheets.filter(s => s.status !== 'LEIDO').map(s => ({ filename: s.filename, reason: s.reason || s.status }));
    const combined = sheets
        .map(s => `\n\n=== ARCHIVO: ${s.filename} (${s.status}) ===\n${s.status === 'LEIDO' ? s.text : `[No se pudo leer como texto: ${s.reason}]`}`)
        .join('');
    return { combined, unreadable };
}
