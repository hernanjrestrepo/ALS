import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import PizZip from 'pizzip';
import { parseBlocks, resolveImage, toHtml, toPptxBuffer, plain } from '../src/services/assistantExport';

// PNG de 1x1 real
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const UPLOADS = path.join(__dirname, '../uploads');
const NAME = `prueba-export-${Date.now()}.png`;
fs.mkdirSync(UPLOADS, { recursive: true });
fs.writeFileSync(path.join(UPLOADS, NAME), PNG);
afterAll(() => fs.rmSync(path.join(UPLOADS, NAME), { force: true }));

describe('imagenes en las respuestas del asistente', () => {
    it('una linea ![desc](/uploads/x.png) es un bloque de imagen', () => {
        const b = parseBlocks(`# Informe\n![Panorámica del punto](/uploads/${NAME})\nTexto`);
        expect(b[1]).toEqual({ kind: 'image', alt: 'Panorámica del punto', src: `/uploads/${NAME}` });
    });

    it('una imagen dentro de un parrafo deja solo su descripcion', () => {
        expect(plain('Ver ![foto de la nevera](/uploads/a.jpg) abajo')).toBe('Ver foto de la nevera abajo');
    });

    it('lee solo archivos de imagen de la carpeta de cargas', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-'));
        fs.writeFileSync(path.join(dir, 'a.png'), PNG);
        fs.writeFileSync(path.join(dir, 'b.txt'), 'x');
        expect(resolveImage('/uploads/a.png', dir)?.mime).toBe('image/png');
        expect(resolveImage('https://als.paradixe.xyz/uploads/a.png', dir)?.dataUri).toMatch(/^data:image\/png;base64,/);
        expect(resolveImage('/uploads/b.txt', dir)).toBeNull();
        expect(resolveImage('/uploads/no-existe.png', dir)).toBeNull();
        expect(resolveImage('https://otro-sitio.com/a.png', dir)).toBeNull();
        expect(resolveImage('file:///etc/a.png', dir)).toBeNull();
        expect(resolveImage('../../etc/a.png', path.join(dir, 'sub'))).toBeNull();
    });

    it('el PDF lleva el logo, la foto incrustada y su pie', () => {
        const html = toHtml('Informe', `## Fotos\n![Toma de la muestra](/uploads/${NAME})\n![No existe](/uploads/nada.png)`);
        expect(html).toContain('alt="ALS"');
        expect(html).toContain(`src="data:image/png;base64,${PNG.toString('base64')}"`);
        expect(html).toContain('<figcaption>Toma de la muestra</figcaption>');
        expect(html).toContain('[Imagen no disponible: No existe]');
    });

    it('el PowerPoint lleva la foto y el logo como imagenes', async () => {
        const buf = await toPptxBuffer('Informe', `## Fotos\n![Toma](/uploads/${NAME})`);
        const media = Object.keys(new PizZip(buf).files).filter(f => f.startsWith('ppt/media/'));
        expect(media.length).toBeGreaterThanOrEqual(2);
    }, 20000);
});
