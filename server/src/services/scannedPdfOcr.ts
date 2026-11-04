/**
 * Normas escaneadas (4-nov-2026): la "Resolucion 631 de 2015" estaba cargada como un PDF de 62 paginas que son
 * solo imagenes, asi que su texto quedo vacio (124 caracteres) y la revision de cotizaciones decia "el articulo 13
 * no esta cargado" aunque la norma completa si lo estaba. Un PDF sin texto se lee ahora con Claude Sonnet 5.5 en
 * Bedrock, pagina por pagina; en una prueba con la tabla del articulo 13 acerto todos los valores.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { bedrockEnabled, bedrockPost } from './bedrock';

const run = promisify(execFile);

const PROMPT = `Transcribe fielmente TODO el texto de esta página de una norma colombiana (escaneada). Reglas:
- Respeta el texto tal como está, sin resumir, corregir ni comentar.
- Cada encabezado de artículo en su propia línea, con el formato "ARTÍCULO N." seguido del título.
- Las tablas: un renglón por fila, columnas separadas por tabulador; conserva unidades, comas decimales, signos como "≤" y las celdas vacías como "-".
- Si la página no tiene texto legible, responde solo: [PÁGINA SIN TEXTO]
- Responde solo con la transcripción.`;

// Un PDF con menos de ~40 caracteres por pagina es un escaneo.
export const looksScanned = (text: string | undefined | null, pages: number) => (text || '').trim().length < Math.max(200, pages * 40);

export async function pdfPageCount(file: string): Promise<number> {
    try {
        const { stdout } = await run('pdfinfo', [file]);
        return Number(/Pages:\s+(\d+)/.exec(stdout)?.[1] || 0);
    } catch { return 0; }
}

export const ocrAvailable = () => bedrockEnabled();

/** Lee un PDF escaneado y devuelve su texto (una seccion "=== Página N ===" por hoja). */
export async function ocrScannedPdf(file: string, onProgress?: (done: number, total: number) => void): Promise<string> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-'));
    try {
        await run('pdftoppm', ['-r', '200', '-gray', '-png', file, path.join(dir, 'p')], { maxBuffer: 1 << 26 });
        const pages = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
        const results: string[] = new Array(pages.length);
        let next = 0, done = 0;
        const worker = async () => {
            for (;;) {
                const i = next++;
                if (i >= pages.length) return;
                const image = fs.readFileSync(path.join(dir, pages[i])).toString('base64');
                for (let attempt = 1; attempt <= 4; attempt++) {
                    try {
                        const r = await bedrockPost('/api/chat', { messages: [{ role: 'user', content: PROMPT, images: [image] }], options: { num_predict: 8000 } }, { timeout: 180000 });
                        results[i] = String(r.data?.message?.content || '').trim();
                        break;
                    } catch (e) {
                        if (attempt === 4) results[i] = `[ERROR página ${i + 1}: ${(e as Error).message}]`;
                        else await new Promise(r => setTimeout(r, 3000 * attempt));
                    }
                }
                onProgress?.(++done, pages.length);
            }
        };
        await Promise.all([worker(), worker(), worker(), worker()]);
        return results.map((t, i) => `\n\n=== Página ${i + 1} ===\n${t}`).join('');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}
