import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { parseBlocks, normalizeChart, chartToSvg, toHtml, toXlsxBuffer, toPptxBuffer, inferTitle, plain } from '../src/services/assistantExport';

const MD = [
    '# Estado de las OIT',
    '',
    '**Resumen**',
    'Hay 47 OIT en el sistema, la mayoría **completadas**.',
    '',
    '## Por estado',
    '| Estado | Cantidad |',
    '|--------|---------:|',
    '| Completada | 22 |',
    '| Pendiente | 15 |',
    '| Requiere revisión <b>x</b> | 9 |',
    '',
    '```chart',
    '{"type":"pie","title":"OIT por estado","labels":["Completada","Pendiente","Revisión"],"series":[{"name":"OIT","data":[22,15,9]}]}',
    '```',
    '',
    '## Siguientes pasos',
    '- Asignar ingeniero a las pendientes',
    '1. Revisar las 9 en revisión',
].join('\n');

describe('parseBlocks', () => {
    const b = parseBlocks(MD);
    it('reconoce titulos, parrafos, tablas, graficas y listas', () => {
        expect(b.map(x => x.kind)).toEqual(['heading', 'heading', 'paragraph', 'heading', 'table', 'chart', 'heading', 'list']);
    });
    it('lee la tabla sin la fila separadora y limpia el formato de las celdas', () => {
        const t = b.find(x => x.kind === 'table') as any;
        expect(t.header).toEqual(['Estado', 'Cantidad']);
        expect(t.rows).toHaveLength(3);
        expect(t.rows[0]).toEqual(['Completada', '22']);
    });
    it('trata una linea en negrita sola como titulo de seccion', () => {
        expect(b[1]).toEqual({ kind: 'heading', level: 3, text: 'Resumen' });
        expect((b[2] as any).text).toBe('Hay 47 OIT en el sistema, la mayoría completadas.');
    });
    it('junta viñetas y numeradas en una lista', () => {
        expect((b[7] as any).items).toEqual(['Asignar ingeniero a las pendientes', 'Revisar las 9 en revisión']);
    });
    it('quita citas, separadores y enlaces de descarga inventados', () => {
        const x = parseBlocks(['> Nota importante', '', '---', '', '[Descargar PDF](#) | [Excel](#)', '', 'Fin'].join('\n'));
        expect(x).toEqual([{ kind: 'paragraph', text: 'Nota importante' }, { kind: 'paragraph', text: 'Fin' }]);
    });
    it('un bloque chart invalido se descarta sin romper', () => {
        expect(parseBlocks('```chart\n{no es json\n```\nhola').map(x => x.kind)).toEqual(['paragraph']);
    });
});

describe('normalizeChart', () => {
    it('acepta la forma con series y la forma corta con data', () => {
        expect(normalizeChart('{"type":"line","labels":["a","b"],"series":[{"name":"s","data":[1,"2,5"]}]}')).toEqual({ type: 'line', title: '', labels: ['a', 'b'], series: [{ name: 's', data: [1, 2.5] }] });
        expect(normalizeChart({ type: 'torta', title: 'T', labels: ['a'], data: [3] })).toEqual({ type: 'pie', title: 'T', labels: ['a'], series: [{ name: 'T', data: [3] }] });
    });
    it('rellena con 0 los datos que faltan y rechaza lo inutilizable', () => {
        expect(normalizeChart({ labels: ['a', 'b'], series: [{ name: 's', data: [5] }] })!.series[0].data).toEqual([5, 0]);
        expect(normalizeChart({ labels: [], series: [] })).toBeNull();
        expect(normalizeChart('texto')).toBeNull();
    });
});

describe('chartToSvg / toHtml', () => {
    it('dibuja barras, lineas y torta como SVG valido y escapa el texto', () => {
        const bar = chartToSvg({ type: 'bar', title: 'A <b>', labels: ['x', 'y'], series: [{ name: 's', data: [1, 3] }] });
        expect(bar).toMatch(/^<svg /);
        expect((bar.match(/<rect /g) || []).length).toBe(2);
        expect(bar).toContain('A &lt;b&gt;');
        expect(chartToSvg({ type: 'line', title: '', labels: ['x', 'y'], series: [{ name: 's', data: [1, 3] }] })).toContain('<polyline');
        const pie = chartToSvg({ type: 'pie', title: '', labels: ['x', 'y'], series: [{ name: 's', data: [1, 3] }] });
        expect((pie.match(/<path /g) || []).length).toBe(2);
        expect(pie).toContain('(75%)');
    });
    it('el HTML del PDF trae portada, tabla, grafica y no deja pasar HTML del contenido', () => {
        const html = toHtml('Mi <informe>', MD, { author: 'Hernán', date: new Date('2026-10-05T12:00:00Z') });
        expect(html).toContain('<h1>Mi &lt;informe&gt;</h1>');
        expect(html).toContain('Generado por Hernán');
        expect(html).toContain('<th>Estado</th>');
        expect(html).toContain('<svg ');
        expect(html).not.toContain('<b>x</b>');
        expect(html).not.toContain('```');
    });
});

describe('toXlsxBuffer', () => {
    it('crea una hoja por tabla y por grafica, con numeros como numeros', () => {
        const XLSX = require('xlsx');
        const wb = XLSX.read(toXlsxBuffer('Estado', MD), { type: 'buffer' });
        expect(wb.SheetNames).toEqual(['Por estado', 'OIT por estado']);
        expect(XLSX.utils.sheet_to_json(wb.Sheets['Por estado'])[0]).toEqual({ Estado: 'Completada', Cantidad: 22 });
        expect(XLSX.utils.sheet_to_json(wb.Sheets['OIT por estado'])[1]).toEqual({ 'Categoría': 'Pendiente', OIT: 15 });
    });
    it('sin tablas ni graficas exporta el texto', () => {
        const XLSX = require('xlsx');
        const wb = XLSX.read(toXlsxBuffer('T', 'Solo un párrafo.'), { type: 'buffer' });
        expect(wb.SheetNames).toEqual(['Respuesta']);
    });
});

describe('toPptxBuffer', () => {
    it('genera un .pptx valido con portada, secciones, tabla y grafica nativa', async () => {
        const buf = await toPptxBuffer('Estado de las OIT', MD, { author: 'Hernán' });
        const zip = new PizZip(buf);
        const slides = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
        expect(slides.length).toBe(5); // portada + resumen + tabla + grafica + pasos
        const all = slides.map(n => zip.file(n)!.asText()).join('');
        expect(all).toContain('Estado de las OIT');
        expect(all).toContain('Completada');
        expect(all).toContain('Asignar ingeniero a las pendientes');
        expect(Object.keys(zip.files).some(n => /^ppt\/charts\/chart\d+\.xml$/.test(n))).toBe(true);
    }, 30000);
});

describe('inferTitle / plain', () => {
    it('usa el primer titulo, o el de la grafica, o el valor por defecto', () => {
        expect(inferTitle(MD)).toBe('Estado de las OIT');
        expect(inferTitle('texto suelto')).toBe('Informe del asistente');
    });
    it('quita formato Markdown', () => {
        expect(plain('**a** y `b` [c](http://x) <br> d')).toBe('a y b c  ·  d');
    });
});
