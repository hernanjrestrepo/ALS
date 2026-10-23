import { describe, it, expect, vi } from 'vitest';
import { readFieldsFromFiles, SheetFillDeps } from '../src/services/sheetFill';
import { buildTextSheetPrompt } from '../src/services/sheetReader';
import { readSheetText } from '../src/services/sheetText';
import fs from 'fs';
import path from 'path';
import os from 'os';

const fields = [
    { key: '3.ph', label: 'Parámetros in situ — pH', unit: 'U pH' },
    { key: '3.temp', label: 'Parámetros in situ — Temperatura', unit: '°C' },
    { key: '5', label: 'Observaciones' },
];

const deps = (over: Partial<SheetFillDeps> = {}): SheetFillDeps => ({
    readText: vi.fn(async (_p: string, name: string) => {
        if (name.endsWith('.docx')) return { filename: name, status: 'LEIDO', text: 'pH 7,2 temperatura 24' } as any;
        if (name.endsWith('.pdf') && name.includes('escaneado')) return { filename: name, status: 'ESCANEADO', text: '', reason: 'PDF sin texto' } as any;
        if (name.endsWith('.pdf')) return { filename: name, status: 'LEIDO', text: 'Observaciones: sin novedad' } as any;
        return { filename: name, status: 'NO_SOPORTADO', text: '', reason: 'no soportado' } as any;
    }),
    renderPdf: vi.fn(async () => ['PAGINA1', 'PAGINA2']),
    imageToBase64: vi.fn(() => 'FOTO'),
    vision: vi.fn(async () => ({ '3.ph': '7,0', '3.temp': '25' })),
    text: vi.fn(async () => ({ '3.ph': '7,2' })),
    ...over,
});

describe('readFieldsFromFiles: cualquier archivo llena el formulario', () => {
    it('foto -> vision', async () => {
        const d = deps();
        const r = await readFieldsFromFiles([{ path: '/x/foto.jpg', name: 'foto.jpg' }], fields, d);
        expect(d.vision).toHaveBeenCalledWith(['FOTO'], fields);
        expect(d.text).not.toHaveBeenCalled();
        expect(r.values).toEqual({ '3.ph': '7,0', '3.temp': '25' });
        expect(r.sources).toEqual([{ name: 'foto.jpg', via: 'VISION' }]);
    });

    it('Word -> texto con el modelo de texto', async () => {
        const d = deps();
        const r = await readFieldsFromFiles([{ path: '/x/planilla.docx', name: 'planilla.docx' }], fields, d);
        expect(d.text).toHaveBeenCalledWith(expect.stringContaining('pH 7,2'), fields);
        expect(d.vision).not.toHaveBeenCalled();
        expect(r.values['3.ph']).toBe('7,2');
        expect(r.sources[0].via).toBe('TEXTO');
    });

    it('PDF escaneado -> se convierte a imagenes y va por vision', async () => {
        const d = deps();
        const r = await readFieldsFromFiles([{ path: '/x/escaneado.pdf', name: 'escaneado.pdf' }], fields, d);
        expect(d.renderPdf).toHaveBeenCalledWith('/x/escaneado.pdf');
        expect(d.vision).toHaveBeenCalledWith(['PAGINA1', 'PAGINA2'], fields);
        expect(r.sources[0].via).toBe('VISION');
    });

    it('si el PDF escaneado no se puede convertir, queda como no leido con el motivo', async () => {
        const d = deps({ renderPdf: vi.fn(async () => { throw new Error('pdftoppm no instalado'); }) });
        const r = await readFieldsFromFiles([{ path: '/x/escaneado.pdf', name: 'escaneado.pdf' }], fields, d);
        expect(r.sources[0]).toMatchObject({ via: 'NO_LEIDO', reason: expect.stringContaining('pdftoppm no instalado') });
        expect(r.doubts[0]).toContain('No se pudo leer «escaneado.pdf»');
    });

    it('lo del documento no lo pisa la foto; la foto completa lo que falta', async () => {
        const r = await readFieldsFromFiles([
            { path: '/x/planilla.docx', name: 'planilla.docx' },
            { path: '/x/foto.jpg', name: 'foto.jpg' },
        ], fields, deps());
        expect(r.values['3.ph']).toBe('7,2');
        expect(r.values['3.temp']).toBe('25');
    });

    it('Word antiguo .doc: se pide guardarlo como .docx', async () => {
        const r = await readFieldsFromFiles([{ path: '/x/viejo.doc', name: 'viejo.doc' }], fields, deps());
        expect(r.sources[0]).toMatchObject({ via: 'NO_LEIDO', reason: expect.stringContaining('.docx') });
        expect(r.values).toEqual({});
    });

    it('las dudas preguntan por cada campo que no aparece en la planilla', async () => {
        const r = await readFieldsFromFiles([{ path: '/x/foto.jpg', name: 'foto.jpg' }], fields, deps());
        expect(r.doubts).toEqual(['¿Cuál es el valor de «Observaciones»? No aparece en la planilla.']);
    });

    it('con muchos campos sin dato, las dudas se resumen', async () => {
        const many = Array.from({ length: 30 }, (_, i) => ({ key: `k${i}`, label: `Campo ${i}` }));
        const r = await readFieldsFromFiles([{ path: '/x/foto.jpg', name: 'foto.jpg' }], many, deps({ vision: vi.fn(async () => ({})) }));
        expect(r.doubts).toHaveLength(16);
        expect(r.doubts[15]).toContain('15 campo(s) más');
    });

    it('solo se mandan hasta 6 imagenes a la vision y se avisa', async () => {
        const d = deps({ renderPdf: vi.fn(async () => Array.from({ length: 8 }, (_, i) => `P${i}`)) });
        const r = await readFieldsFromFiles([{ path: '/x/escaneado.pdf', name: 'escaneado.pdf' }], fields, d);
        expect((d.vision as any).mock.calls[0][0]).toHaveLength(6);
        expect(r.doubts.some(x => x.includes('primeras 6'))).toBe(true);
    });
});

describe('buildTextSheetPrompt', () => {
    it('lista los campos con unidad y prohibe inventar', () => {
        const p = buildTextSheetPrompt('pH 7,2', fields);
        expect(p).toContain('"3.ph": Parámetros in situ — pH (U pH)');
        expect(p).toContain('NUNCA adivines');
        expect(p).toContain('pH 7,2');
    });
});

describe('readSheetText con OCR (analisis de planillas de la OIT)', () => {
    const tmpFile = (name: string, bytes: number[]) => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-'));
        const p = path.join(dir, name);
        fs.writeFileSync(p, Buffer.from(bytes));
        return { p, dir };
    };

    it('una foto se transcribe con la IA de vision y queda como leida (revisar)', async () => {
        const { p, dir } = tmpFile('foto.jpg', [0xff, 0xd8, 0xff]);
        const r = await readSheetText(p, 'foto.jpg', { ocr: true, transcribe: async () => 'pH: 7,1\nTemperatura: 23' });
        expect(r.status).toBe('LEIDO');
        expect(r.text).toContain('pH: 7,1');
        expect(r.reason).toContain('IA de visión');
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('si la vision falla, queda como no leida con el motivo', async () => {
        const { p, dir } = tmpFile('foto.png', [0x89, 0x50]);
        const r = await readSheetText(p, 'foto.png', { ocr: true, transcribe: async () => { throw new Error('GPU ocupada'); } });
        expect(r.status).toBe('IMAGEN');
        expect(r.reason).toContain('GPU ocupada');
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('sin OCR una foto sigue marcada como imagen', async () => {
        const { p, dir } = tmpFile('foto.jpg', [0xff, 0xd8]);
        expect((await readSheetText(p, 'foto.jpg')).status).toBe('IMAGEN');
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
