/**
 * Convierte una respuesta del asistente (Markdown + bloques ```chart) en documentos descargables:
 * PDF, PowerPoint y Excel. Las graficas se describen con un JSON pequeno que el modelo emite:
 *
 *   ```chart
 *   {"type":"bar","title":"OIT por estado","labels":["Pendiente","Completada"],"series":[{"name":"OIT","data":[15,22]}]}
 *   ```
 *
 * La pantalla lo dibuja con recharts; aqui se dibuja como SVG (PDF) o grafica nativa (PowerPoint).
 */

export type ChartType = 'bar' | 'line' | 'pie';
export interface ChartSpec {
    type: ChartType;
    title: string;
    labels: string[];
    series: Array<{ name: string; data: number[] }>;
}
export type Block =
    | { kind: 'heading'; level: number; text: string }
    | { kind: 'paragraph'; text: string }
    | { kind: 'list'; items: string[] }
    | { kind: 'table'; header: string[]; rows: string[][] }
    | { kind: 'chart'; chart: ChartSpec };

export const PALETTE = ['#004CAB', '#00A3A6', '#F59E0B', '#7C3AED', '#DC2626', '#059669', '#DB2777', '#475569'];

const toNumber = (v: unknown): number => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
};

/** Valida y normaliza lo que emitio el modelo. Devuelve null si no es una grafica utilizable. */
export function normalizeChart(raw: unknown): ChartSpec | null {
    let o: any = raw;
    if (typeof raw === 'string') {
        try { o = JSON.parse(raw.trim()); } catch { return null; }
    }
    if (!o || typeof o !== 'object') return null;
    const labels: string[] = Array.isArray(o.labels) ? o.labels.map((l: unknown) => String(l)) : [];
    if (!labels.length) return null;
    let series: Array<{ name: string; data: number[] }> = [];
    if (Array.isArray(o.series)) {
        series = o.series
            .filter((s: any) => s && Array.isArray(s.data))
            .map((s: any, i: number) => ({ name: String(s.name || `Serie ${i + 1}`), data: labels.map((_, k) => toNumber(s.data[k])) }));
    } else if (Array.isArray(o.data) || Array.isArray(o.values)) {
        const d = o.data || o.values;
        series = [{ name: String(o.name || o.title || 'Valor'), data: labels.map((_, k) => toNumber(d[k])) }];
    }
    if (!series.length) return null;
    const t = String(o.type || 'bar').toLowerCase();
    const type: ChartType = /pie|torta|pastel|dona|donut/.test(t) ? 'pie' : /line|linea|línea/.test(t) ? 'line' : 'bar';
    return { type, title: String(o.title || ''), labels: labels.slice(0, 40), series: series.slice(0, 6).map(s => ({ ...s, data: s.data.slice(0, 40) })) };
}

const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

/** Texto plano de una celda/linea Markdown (sin **, `, enlaces ni <br>). */
export function plain(md: string): string {
    return String(md ?? '')
        .replace(/<br\s*\/?>/gi, ' · ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/^#{1,6}\s+/, '') // solo marca de titulo ("## x"); "#14856" es un numero de OIT
        .trim();
}

export function parseBlocks(markdown: string): Block[] {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;
    while (i < lines.length) {
        // citas ("> nota") se tratan como texto normal
        const line = lines[i] = lines[i].replace(/^\s*>\s?/, '');
        if (!line.trim()) { i++; continue; }
        // separadores y enlaces de "descarga" inventados por el modelo no van al documento
        if (/^\s*([-*_]\s*){3,}$/.test(line) || /\]\(#?\)/.test(line)) { i++; continue; }

        const fence = line.trim().match(/^```\s*(\w*)/);
        if (fence) {
            const lang = fence[1].toLowerCase();
            const body: string[] = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i].trim())) body.push(lines[i++]);
            i++;
            const chart = lang === 'chart' || lang === 'json' || lang === 'grafica' ? normalizeChart(body.join('\n')) : null;
            if (chart) blocks.push({ kind: 'chart', chart });
            else if (lang !== 'chart' && body.join('').trim()) blocks.push({ kind: 'paragraph', text: body.join('\n') });
            continue;
        }

        const h = line.match(/^(#{1,6})\s+(.*)$/);
        if (h) { blocks.push({ kind: 'heading', level: h[1].length, text: plain(h[2]) }); i++; continue; }

        if (/^\s*\|/.test(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
            const header = splitRow(line).map(plain);
            i += 2;
            const rows: string[][] = [];
            while (i < lines.length && /^\s*\|/.test(lines[i])) {
                const cells = splitRow(lines[i++]).map(plain);
                rows.push(header.map((_, k) => cells[k] ?? ''));
            }
            blocks.push({ kind: 'table', header, rows });
            continue;
        }

        if (/^\s*([-*+•]|\d+[.)])\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*([-*+•]|\d+[.)])\s+/.test(lines[i])) items.push(plain(lines[i++].replace(/^\s*([-*+•]|\d+[.)])\s+/, '')));
            blocks.push({ kind: 'list', items });
            continue;
        }

        // Linea en negrita sola = titulo de seccion ("**Resumen**")
        const bold = line.trim().match(/^\*\*([^*]+)\*\*:?\s*$/);
        if (bold) { blocks.push({ kind: 'heading', level: 3, text: bold[1].trim() }); i++; continue; }

        const para: string[] = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^```/.test(lines[i].trim()) && !/^\s*\|/.test(lines[i]) && !/^\s*([-*+•]|\d+[.)])\s+/.test(lines[i])) para.push(lines[i++]);
        blocks.push({ kind: 'paragraph', text: plain(para.join(' ')) });
    }
    return blocks;
}

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtNum = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : String(Math.round(n * 100) / 100));

/** Grafica como SVG autonomo (para el PDF). */
export function chartToSvg(c: ChartSpec, width = 680, height = 340): string {
    const title = c.title ? `<text x="${width / 2}" y="22" text-anchor="middle" font-size="15" font-weight="700" fill="#0f172a">${esc(c.title)}</text>` : '';
    const top = c.title ? 40 : 14;
    const font = 'font-family="Helvetica, Arial, sans-serif"';

    if (c.type === 'pie') {
        const data = c.series[0].data.map(v => Math.max(0, v));
        const total = data.reduce((a, b) => a + b, 0) || 1;
        const cx = 190, cy = top + (height - top) / 2, r = Math.min(150, (height - top) / 2 - 12);
        let ang = -Math.PI / 2;
        const slices = data.map((v, i) => {
            const a2 = ang + (v / total) * Math.PI * 2;
            const large = a2 - ang > Math.PI ? 1 : 0;
            const p = v / total >= 0.9999
                ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PALETTE[i % PALETTE.length]}"/>`
                : `<path d="M${cx},${cy} L${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)} A${r},${r} 0 ${large} 1 ${(cx + r * Math.cos(a2)).toFixed(1)},${(cy + r * Math.sin(a2)).toFixed(1)} Z" fill="${PALETTE[i % PALETTE.length]}" stroke="#fff" stroke-width="1.5"/>`;
            ang = a2;
            return p;
        }).join('');
        const legend = c.labels.map((l, i) => `<rect x="380" y="${top + 8 + i * 22}" width="12" height="12" rx="2" fill="${PALETTE[i % PALETTE.length]}"/><text x="398" y="${top + 19 + i * 22}" font-size="12" fill="#334155">${esc(l.slice(0, 30))}: ${fmtNum(data[i] || 0)} (${Math.round(((data[i] || 0) / total) * 100)}%)</text>`).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ${font}>${title}${slices}${legend}</svg>`;
    }

    const left = 56, right = 16, bottom = 64;
    const w = width - left - right, h = height - top - bottom;
    const max = Math.max(1, ...c.series.flatMap(s => s.data));
    const niceMax = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; })();
    const y = (v: number) => top + h - (v / niceMax) * h;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(f => `<line x1="${left}" x2="${left + w}" y1="${y(niceMax * f)}" y2="${y(niceMax * f)}" stroke="#e2e8f0"/><text x="${left - 8}" y="${y(niceMax * f) + 4}" text-anchor="end" font-size="11" fill="#64748b">${fmtNum(niceMax * f)}</text>`).join('');
    const band = w / c.labels.length;
    const labels = c.labels.map((l, i) => `<text x="${left + band * i + band / 2}" y="${top + h + 16}" text-anchor="end" font-size="11" fill="#334155" transform="rotate(-28 ${left + band * i + band / 2} ${top + h + 16})">${esc(l.slice(0, 22))}</text>`).join('');
    let marks = '';
    if (c.type === 'line') {
        marks = c.series.map((s, si) => {
            const pts = s.data.map((v, i) => `${(left + band * i + band / 2).toFixed(1)},${y(v).toFixed(1)}`);
            return `<polyline points="${pts.join(' ')}" fill="none" stroke="${PALETTE[si % PALETTE.length]}" stroke-width="2.5"/>` + pts.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3.5" fill="${PALETTE[si % PALETTE.length]}"/>`).join('');
        }).join('');
    } else {
        const bw = Math.min(46, (band * 0.72) / c.series.length);
        marks = c.series.map((s, si) => s.data.map((v, i) => {
            const x = left + band * i + band / 2 - (bw * c.series.length) / 2 + bw * si;
            const showVal = c.labels.length <= 14;
            return `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${Math.max(0, top + h - y(v)).toFixed(1)}" rx="2" fill="${PALETTE[si % PALETTE.length]}"/>` + (showVal ? `<text x="${(x + (bw - 2) / 2).toFixed(1)}" y="${(y(v) - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#334155">${fmtNum(v)}</text>` : '');
        }).join('')).join('');
    }
    const legend = c.series.length > 1 ? c.series.map((s, i) => `<rect x="${left + i * 130}" y="${height - 14}" width="11" height="11" rx="2" fill="${PALETTE[i % PALETTE.length]}"/><text x="${left + 16 + i * 130}" y="${height - 4}" font-size="11" fill="#334155">${esc(s.name.slice(0, 18))}</text>`).join('') : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ${font}>${title}${grid}<line x1="${left}" x2="${left + w}" y1="${top + h}" y2="${top + h}" stroke="#94a3b8"/>${marks}${labels}${legend}</svg>`;
}

/** HTML completo y con marca para imprimir a PDF. */
export function toHtml(title: string, markdown: string, meta: { author?: string; date?: Date } = {}): string {
    const same = (x: string) => x.trim().toLowerCase() === title.trim().toLowerCase();
    // el primer titulo suele repetir el de la portada
    const body = parseBlocks(markdown).filter((b, i) => !(i === 0 && b.kind === 'heading' && same(b.text))).map(b => {
        switch (b.kind) {
            case 'heading': return `<h${Math.min(b.level + 1, 4)}>${esc(b.text)}</h${Math.min(b.level + 1, 4)}>`;
            case 'paragraph': return `<p>${esc(b.text)}</p>`;
            case 'list': return `<ul>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
            case 'table': return `<table><thead><tr>${b.header.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
            case 'chart': return `<div class="chart">${chartToSvg(b.chart)}</div>`;
        }
    }).join('\n');
    const date = (meta.date || new Date()).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 18mm 15mm 18mm 15mm; }
* { box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; font-size: 11.5px; line-height: 1.55; margin: 0; }
.cover { background: linear-gradient(120deg, #004CAB, #0077c8); color: #fff; padding: 22px 26px; border-radius: 10px; margin-bottom: 20px; }
.cover .brand { font-size: 11px; letter-spacing: 2px; opacity: .85; text-transform: uppercase; }
.cover h1 { font-size: 23px; margin: 6px 0 4px; line-height: 1.2; }
.cover .meta { font-size: 11px; opacity: .9; }
h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
h2 { font-size: 16px; color: #004CAB; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin: 20px 0 8px; }
h3 { font-size: 13.5px; color: #004CAB; margin: 16px 0 6px; } h4 { font-size: 12px; margin: 12px 0 4px; }
p { margin: 6px 0; } ul { margin: 6px 0 6px 18px; padding: 0; } li { margin: 2px 0; }
table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; page-break-inside: auto; }
thead { display: table-header-group; } tr { page-break-inside: avoid; }
th { background: #004CAB; color: #fff; text-align: left; padding: 6px 8px; font-size: 11px; }
td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f8fafc; }
.chart { text-align: center; margin: 12px 0 16px; page-break-inside: avoid; } .chart svg { max-width: 100%; height: auto; }
.foot { margin-top: 26px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 9.5px; }
</style></head><body>
<div class="cover"><div class="brand">ALS Xmart · Asistente IA</div><h1>${esc(title)}</h1><div class="meta">${esc(date)}${meta.author ? ' · Generado por ' + esc(meta.author) : ''}</div></div>
${body}
<div class="foot">Documento generado automáticamente por el asistente de ALS Xmart a partir de los datos del sistema en la fecha indicada. Verifique la información antes de usarla en documentos oficiales.</div>
</body></html>`;
}

export async function toPdfBuffer(title: string, markdown: string, meta: { author?: string } = {}): Promise<Buffer> {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.setContent(toHtml(title, markdown, meta), { waitUntil: 'load' });
        return Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    } finally {
        await browser.close();
    }
}

const sheetName = (s: string, used: Set<string>) => {
    let base = (s || 'Hoja').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Hoja';
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = `${base.slice(0, 25)} ${n++}`;
    used.add(name.toLowerCase());
    return name;
};
const cellValue = (v: string): string | number => (/^-?\d+([.,]\d+)?$/.test(v.trim()) ? parseFloat(v.trim().replace(',', '.')) : v);

/** Excel: una hoja por tabla y por grafica; si no hay ninguna, el texto. */
export function toXlsxBuffer(title: string, markdown: string): Buffer {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const used = new Set<string>();
    const blocks = parseBlocks(markdown);
    let lastHeading = title;
    for (const b of blocks) {
        if (b.kind === 'heading') lastHeading = b.text;
        if (b.kind === 'table') {
            const ws = XLSX.utils.aoa_to_sheet([b.header, ...b.rows.map(r => r.map(cellValue))]);
            ws['!cols'] = b.header.map((h, k) => ({ wch: Math.min(60, Math.max(h.length, ...b.rows.map(r => String(r[k] ?? '').length)) + 2) }));
            XLSX.utils.book_append_sheet(wb, ws, sheetName(lastHeading, used));
        }
        if (b.kind === 'chart') {
            const ws = XLSX.utils.aoa_to_sheet([['Categoría', ...b.chart.series.map(s => s.name)], ...b.chart.labels.map((l, i) => [l, ...b.chart.series.map(s => s.data[i] ?? 0)])]);
            ws['!cols'] = [{ wch: 32 }, ...b.chart.series.map(() => ({ wch: 16 }))];
            XLSX.utils.book_append_sheet(wb, ws, sheetName(b.chart.title || 'Gráfica', used));
        }
    }
    if (!wb.SheetNames.length) {
        const rows = blocks.flatMap(b => b.kind === 'list' ? b.items.map(i => ['• ' + i]) : b.kind === 'heading' || b.kind === 'paragraph' ? [[b.text]] : []);
        const ws = XLSX.utils.aoa_to_sheet([[title], [], ...rows]);
        ws['!cols'] = [{ wch: 110 }];
        XLSX.utils.book_append_sheet(wb, ws, sheetName('Respuesta', used));
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

const chunk = <T,>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** PowerPoint 16:9 con portada, una diapositiva por seccion, tablas paginadas y graficas nativas editables. */
export async function toPptxBuffer(title: string, markdown: string, meta: { author?: string; date?: Date } = {}): Promise<Buffer> {
    const mod = require('pptxgenjs');
    const PptxGenJS = mod.default || mod;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
    pptx.author = meta.author || 'ALS Xmart';
    pptx.title = title;
    const BLUE = '004CAB', DARK = '0F172A', GREY = '64748B';
    const date = (meta.date || new Date()).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    pptx.defineSlideMaster({
        title: 'ALS',
        background: { color: 'FFFFFF' },
        objects: [
            { rect: { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: BLUE } } },
            { rect: { x: 0, y: 7.2, w: 13.33, h: 0.3, fill: { color: 'F1F5F9' } } },
            { text: { text: 'ALS Xmart · Asistente IA', options: { x: 0.4, y: 7.2, w: 6, h: 0.3, fontSize: 9, color: GREY, fontFace: 'Arial' } } },
            { text: { text: date, options: { x: 8.9, y: 7.2, w: 4, h: 0.3, fontSize: 9, color: GREY, align: 'right', fontFace: 'Arial' } } },
        ],
        slideNumber: { x: 12.6, y: 0.3, fontSize: 10, color: 'FFFFFF', fontFace: 'Arial' },
    });

    const cover = pptx.addSlide();
    cover.background = { color: BLUE };
    cover.addText('ALS XMART · ASISTENTE IA', { x: 0.7, y: 2.2, w: 12, h: 0.4, fontSize: 14, color: 'BFDBFE', charSpacing: 3, fontFace: 'Arial' });
    cover.addText(title, { x: 0.7, y: 2.7, w: 12, h: 1.8, fontSize: 38, bold: true, color: 'FFFFFF', fontFace: 'Arial', valign: 'top', fit: 'shrink' });
    cover.addText(`${date}${meta.author ? ' · ' + meta.author : ''}`, { x: 0.7, y: 4.7, w: 12, h: 0.4, fontSize: 14, color: 'DBEAFE', fontFace: 'Arial' });

    const newSlide = (heading: string) => {
        const s = pptx.addSlide({ masterName: 'ALS' });
        s.addText(heading.slice(0, 90), { x: 0.4, y: 0.12, w: 11.9, h: 0.66, fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Arial', valign: 'middle', fit: 'shrink' });
        return s;
    };

    let heading = title;
    let textBuf: Array<{ text: string; bullet: boolean }> = [];
    const flushText = () => {
        if (!textBuf.length) return;
        for (const part of chunk(textBuf, 9)) {
            const s = newSlide(heading);
            s.addText(part.map(t => ({ text: t.text.slice(0, 420), options: { bullet: t.bullet, breakLine: true, paraSpaceAfter: 8 } })), { x: 0.6, y: 1.15, w: 12.1, h: 5.8, fontSize: 17, color: DARK, fontFace: 'Arial', valign: 'top', fit: 'shrink' });
        }
        textBuf = [];
    };

    for (const b of parseBlocks(markdown)) {
        if (b.kind === 'heading') { flushText(); heading = b.text; continue; }
        if (b.kind === 'paragraph') { textBuf.push({ text: b.text, bullet: false }); continue; }
        if (b.kind === 'list') { b.items.forEach(i => textBuf.push({ text: i, bullet: true })); continue; }
        flushText();
        if (b.kind === 'table') {
            const cols = b.header.length || 1;
            const fs = cols > 6 ? 9 : cols > 4 ? 11 : 12;
            const head = b.header.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: BLUE }, fontSize: fs, fontFace: 'Arial' } }));
            chunk(b.rows, 11).forEach((rows, page, all) => {
                const s = newSlide(all.length > 1 ? `${heading} (${page + 1}/${all.length})` : heading);
                s.addTable([head, ...rows.map((r, ri) => r.map(c => ({ text: c.slice(0, 160), options: { fontSize: fs, color: DARK, fontFace: 'Arial', fill: { color: ri % 2 ? 'F8FAFC' : 'FFFFFF' } } })))], { x: 0.4, y: 1.15, w: 12.5, colW: Array(cols).fill(12.5 / cols), border: { type: 'solid', color: 'E2E8F0', pt: 0.75 }, valign: 'middle', margin: 0.06 });
            });
        }
        if (b.kind === 'chart') {
            const c = b.chart;
            const s = newSlide(c.title || heading);
            const data = c.series.map(x => ({ name: x.name, labels: c.labels, values: x.data }));
            const common = { x: 0.6, y: 1.15, w: 12.1, h: 5.8, chartColors: PALETTE.map(p => p.slice(1)), showLegend: c.series.length > 1 || c.type === 'pie', legendPos: 'b' as const, legendFontSize: 12, dataLabelFontSize: 11, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11 };
            if (c.type === 'pie') s.addChart(pptx.ChartType.pie, [data[0]], { ...common, showPercent: true, showLegend: true });
            else if (c.type === 'line') s.addChart(pptx.ChartType.line, data, { ...common, lineSize: 3, lineDataSymbolSize: 7 });
            else s.addChart(pptx.ChartType.bar, data, { ...common, barDir: 'col', showValue: c.labels.length <= 14, barGapWidthPct: 60 });
        }
    }
    flushText();
    return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
}

export const EXPORT_FORMATS = {
    pdf: { mime: 'application/pdf', ext: 'pdf' },
    pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx' },
    xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
} as const;
export type ExportFormat = keyof typeof EXPORT_FORMATS;

/** Titulo razonable cuando la pantalla no envia uno: primer encabezado o primeras palabras. */
export function inferTitle(markdown: string, fallback = 'Informe del asistente'): string {
    const blocks = parseBlocks(markdown);
    const h = blocks.find(b => b.kind === 'heading') as any;
    if (h?.text) return h.text.slice(0, 90);
    const c = blocks.find(b => b.kind === 'chart') as any;
    if (c?.chart?.title) return c.chart.title.slice(0, 90);
    return fallback;
}
