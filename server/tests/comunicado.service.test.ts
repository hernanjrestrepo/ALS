import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

const existsSync = vi.fn<(p: string) => boolean>();
const readFileSync = vi.fn();
const writeFileSync = vi.fn();
const mkdirSync = vi.fn();

vi.mock('fs', () => {
    const api = {
        existsSync: (p: string) => existsSync(p),
        readFileSync: (p: string) => readFileSync(p),
        writeFileSync: (p: string, data: unknown) => writeFileSync(p, data),
        mkdirSync: (p: string, o?: unknown) => mkdirSync(p, o)
    };
    return { ...api, default: api };
});

import PizZip from 'pizzip';
import { comunicadoService } from '../src/services/comunicado.service';

const oit = { oitNumber: 'OIT-2026-001', location: 'Cartagena', description: 'Muestreo de agua' };

function writtenDocumentXml(): string {
    const buffer = writeFileSync.mock.calls.at(-1)![1] as Buffer;
    return new PizZip(buffer).file('word/document.xml')!.asText();
}

beforeEach(() => {
    existsSync.mockReset().mockReturnValue(true);
    readFileSync.mockReset();
    writeFileSync.mockReset();
    mkdirSync.mockReset();
});

describe('comunicadoService.generateComunicado', () => {
    it('writes the document to the uploads directory with a sanitized file name', async () => {
        const filename = await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua / Residual*');

        expect(filename).toMatch(/^Comunicado_Agua_Residual_OIT-2026-001_\d+\.docx$/);
        expect(path.basename(writeFileSync.mock.calls[0][0] as string)).toBe(filename);
        expect(mkdirSync).not.toHaveBeenCalled();
    });

    it('creates the uploads directory when it does not exist yet', async () => {
        existsSync.mockImplementation((p: string) => !p.endsWith('uploads'));

        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua');

        expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true });
    });

    it('embeds the header logo when the template asset is available', async () => {
        readFileSync.mockReturnValue(Buffer.from('89504e470d0a1a0a', 'hex'));

        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua');

        expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('header_logo.png'));
    });

    it('skips the logo when the asset is missing', async () => {
        existsSync.mockImplementation((p: string) => !p.endsWith('header_logo.png'));

        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua');

        expect(readFileSync).not.toHaveBeenCalled();
    });

    it('includes the boilerplate, signature and disclaimer text', async () => {
        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua');

        const xml = writtenDocumentXml();
        expect(xml).toContain('COMUNICADO TÉCNICO');
        expect(xml).toContain('ISO/IEC 17025');
        expect(xml).toContain('Juan Bustamante R.');
        expect(xml).toContain('ALS ENVIRONMENTAL S.A.S.');
        expect(xml).toContain('NO representan un concepto definitivo');
    });

    it('builds the reference line from the service and OIT when no reference is given', async () => {
        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua');

        expect(writtenDocumentXml()).toContain('Agua – OIT OIT-2026-001');
    });

    it('prefers the provided reference, location and norms', async () => {
        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua', {
            reportRef: 'REF-123',
            location: 'Planta Norte',
            norms: 'Resolución 631 de 2015'
        });

        const xml = writtenDocumentXml();
        expect(xml).toContain('REF-123');
        expect(xml).toContain('Lugar de muestreo: Planta Norte');
        expect(xml).toContain('Normatividad de referencia: Resolución 631 de 2015');
    });

    it('falls back through location, description and a placeholder', async () => {
        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua');
        expect(writtenDocumentXml()).toContain('Lugar de muestreo: Cartagena');

        await comunicadoService.generateComunicado({ oitNumber: 'OIT-2', description: 'Ruido' }, 'C', 'Ruido');
        expect(writtenDocumentXml()).toContain('Lugar de muestreo: Ruido');

        await comunicadoService.generateComunicado({ oitNumber: 'OIT-3' }, 'C', 'Ruido');
        expect(writtenDocumentXml()).toContain('Lugar de muestreo: No especificado');
    });

    it('omits the norms line when no norms are provided', async () => {
        await comunicadoService.generateComunicado(oit, 'Contenido', 'Agua');

        expect(writtenDocumentXml()).not.toContain('Normatividad de referencia');
    });

    it('renders numbered headings, bold runs and blank lines from the AI content', async () => {
        await comunicadoService.generateComunicado(
            oit,
            '1. Alcalinidad alta\n\nEl parámetro **pH** se encuentra dentro del rango.',
            'Agua'
        );

        const xml = writtenDocumentXml();
        expect(xml).toContain('1. Alcalinidad alta');
        expect(xml).toContain('pH');
        expect(xml).toContain('El parámetro ');
    });
});
