import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { readSheetText, combineSheetTexts } from '../src/services/sheetText';

// Archivos reales en una carpeta temporal (no se toca uploads ni produccion).
const DIR = path.join(__dirname, 'tmp-sheet-files');

beforeAll(async () => {
    fs.mkdirSync(DIR, { recursive: true });
    const doc = new Document({
        sections: [{ children: [new Paragraph({ children: [new TextRun('Planilla de campo: pH 7,2; temperatura 24 °C')] })] }],
    });
    fs.writeFileSync(path.join(DIR, 'planilla.docx'), await Packer.toBuffer(doc));
    fs.writeFileSync(path.join(DIR, 'notas.txt'), 'Oxigeno disuelto 6,1 mg/L');
    fs.writeFileSync(path.join(DIR, 'foto.jpg'), Buffer.from([0xff, 0xd8, 0xff]));
    fs.writeFileSync(path.join(DIR, 'raro.xyz'), 'x');
    const xlsx = require('xlsx');
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Parametro', 'Valor'], ['pH', 7.2]]), 'Campo');
    xlsx.writeFile(wb, path.join(DIR, 'campo.xlsx'));
});

afterAll(() => {
    fs.rmSync(DIR, { recursive: true, force: true });
});

describe('readSheetText', () => {
    it('lee el texto de un Word (antes salia "[Contenido no legible]")', async () => {
        const r = await readSheetText(path.join(DIR, 'planilla.docx'), 'planilla.docx');
        expect(r.status).toBe('LEIDO');
        expect(r.text).toContain('pH 7,2');
        expect(r.text).toContain('24 °C');
    }, 30_000); // primera carga de mammoth: lenta en frio

    it('lee Excel por hojas', async () => {
        const r = await readSheetText(path.join(DIR, 'campo.xlsx'), 'campo.xlsx');
        expect(r.status).toBe('LEIDO');
        expect(r.text).toContain('HOJA: Campo');
        expect(r.text).toContain('pH');
    });

    it('lee texto plano', async () => {
        const r = await readSheetText(path.join(DIR, 'notas.txt'), 'notas.txt');
        expect(r).toMatchObject({ status: 'LEIDO', text: 'Oxigeno disuelto 6,1 mg/L' });
    });

    it('una imagen no se lee como texto: se marca para la lectura por foto', async () => {
        const r = await readSheetText(path.join(DIR, 'foto.jpg'), 'foto.jpg');
        expect(r.status).toBe('IMAGEN');
        expect(r.reason).toContain('lectura por foto');
    });

    it('un formato no soportado se reporta con su extension', async () => {
        const r = await readSheetText(path.join(DIR, 'raro.xyz'), 'raro.xyz');
        expect(r.status).toBe('NO_SOPORTADO');
        expect(r.reason).toContain('.xyz');
    });

    it('un archivo que no existe o no se puede abrir se reporta, no revienta', async () => {
        const r = await readSheetText(path.join(DIR, 'no-existe.docx'), 'no-existe.docx');
        expect(r.status).toBe('ERROR');
        expect(r.reason).toContain('No se pudo leer');
    });
});

describe('combineSheetTexts', () => {
    it('la IA recibe el texto leido y, aparte, lo que no se pudo leer con su motivo', async () => {
        const sheets = [
            await readSheetText(path.join(DIR, 'planilla.docx'), 'planilla.docx'),
            await readSheetText(path.join(DIR, 'foto.jpg'), 'foto.jpg'),
        ];
        const { combined, unreadable } = combineSheetTexts(sheets);
        expect(combined).toContain('pH 7,2');
        expect(combined).toContain('[No se pudo leer como texto: Imagen');
        expect(unreadable).toEqual([{ filename: 'foto.jpg', reason: expect.stringContaining('lectura por foto') }]);
    });

    it('sin archivos ilegibles la lista de no leidos queda vacia', async () => {
        const { unreadable } = combineSheetTexts([await readSheetText(path.join(DIR, 'notas.txt'), 'notas.txt')]);
        expect(unreadable).toEqual([]);
    });
});
