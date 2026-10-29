import PizZip from 'pizzip';

const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

// Acabado del informe Word generado desde la plantilla (reclamo del 28-oct, OIT 14985): salia con
// 159 parrafos resaltados, instrucciones de la plantilla ("Aqui se adjuntan las fotos"), tablas con
// la fila de ejemplo ("Nombre / XX"), bloques de otra matriz (piezometro y aljibe en un informe de
// piscina), valores en blanco y conclusiones sin datos. Este paso trabaja sobre el .docx ya generado:
// no cambia la plantilla aprobada, solo completa y limpia lo que sale de ella.

export interface ReportResult { parametro: string; valor: any; unidad?: string; metodo?: string; limite?: string; normativa?: string; cumple?: boolean | null }
export interface FieldMeasurement { name: string; value: string; unit?: string }

export interface ReportContext {
    serviceName: string;
    oitNumber: string;
    year: number;
    results: ReportResult[];
    field: FieldMeasurement[];
    norm?: string;
    sampleId?: string;
    reportNumber?: string;
    sampleDate?: string;
    pointName?: string;
    coordinates?: string;
    contact?: { name?: string; phone?: string; email?: string; activity?: string };
    labFileName?: string;
    analysis: string[];
    conclusions: string[];
    fieldNarrative: string[];
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

// ------------------------------------------------------------------ utilidades de texto
const fold = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const UNITS_WORDS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
export const countWords = (n: number) => `${n} (${UNITS_WORDS[n] || n})`;

// Matriz que el informe debe nombrar segun el servicio (la plantilla de agua dice "subterranea").
export function matrixLabel(serviceName: string): { word: string; title: string; groundwater: boolean } {
    const s = fold(serviceName);
    if (/piscina|recreativ/.test(s)) return { word: 'de piscina', title: 'AGUA DE PISCINA', groundwater: false };
    if (/potable|consumo/.test(s)) return { word: 'potable', title: 'AGUA POTABLE', groundwater: false };
    if (/residual|vertimiento/.test(s)) return { word: 'residual', title: 'AGUA RESIDUAL', groundwater: false };
    if (/superficial|rio|quebrada|embalse/.test(s)) return { word: 'superficial', title: 'AGUA SUPERFICIAL', groundwater: false };
    return { word: 'subterránea', title: 'AGUA SUBTERRÁNEA', groundwater: true };
}

// ------------------------------------------------------------------ DOM
const children = (el: any, name: string): any[] => Array.from(el.childNodes || []).filter((n: any) => n.nodeName === name) as any[];
const all = (el: any, name: string): any[] => Array.from(el.getElementsByTagName(name)) as any[];
const textOf = (el: any): string => all(el, 'w:t').map((t: any) => t.textContent || '').join('');

function setParaText(p: any, text: string) {
    const runs = children(p, 'w:r');
    let keep = runs.find(r => all(r, 'w:t').length) || runs[0];
    if (!keep) {
        const doc = p.ownerDocument;
        keep = doc.createElementNS(W, 'w:r');
        p.appendChild(keep);
    }
    for (const r of runs) if (r !== keep) p.removeChild(r);
    for (const t of children(keep, 'w:t')) keep.removeChild(t);
    for (const n of ['w:tab', 'w:br', 'w:drawing', 'w:fldChar', 'w:instrText']) for (const x of children(keep, n)) keep.removeChild(x);
    const t = p.ownerDocument.createElementNS(W, 'w:t');
    t.setAttribute('xml:space', 'preserve');
    t.appendChild(p.ownerDocument.createTextNode(text));
    keep.appendChild(t);
}

function setCellText(tc: any, text: string) {
    const ps = children(tc, 'w:p');
    if (!ps.length) return;
    setParaText(ps[0], text);
    for (const extra of ps.slice(1)) tc.removeChild(extra);
}

function removeNode(n: any) { if (n && n.parentNode) n.parentNode.removeChild(n); }

function bodyParagraphs(doc: any): any[] {
    const body = doc.getElementsByTagName('w:body')[0];
    return Array.from(body.childNodes).filter((n: any) => n.nodeName === 'w:p') as any[];
}

// ------------------------------------------------------------------ limpieza
export function stripHighlights(doc: any): number {
    let n = 0;
    for (const h of all(doc, 'w:highlight')) { removeNode(h); n++; }
    // Sombreado de texto y parrafo (no el de las celdas de encabezado de las tablas).
    for (const shd of all(doc, 'w:shd')) {
        const parent = shd.parentNode?.nodeName;
        if (parent === 'w:rPr' || parent === 'w:pPr') { removeNode(shd); n++; }
    }
    return n;
}

const INSTRUCTION = [
    /^En este p[aá]rrafo se deben/i,
    /^Aqu[ií] se agrega la imagen/i,
    /^Se debe relacionar el motivo/i,
    /^Nota:.*\(especificar la informaci[oó]n suministrada/i,
];

function removeInstructionParagraphs(doc: any): number {
    let n = 0;
    for (const p of all(doc, 'w:p')) {
        const t = textOf(p).trim();
        if (t && INSTRUCTION.some(re => re.test(t))) { removeNode(p); n++; }
    }
    return n;
}

// Indices de tablas, de figuras, de graficas y de fotografias que quedaron con ejemplos ("Fotografia 1. XXXX").
function removeExampleIndexes(doc: any) {
    const ps = all(doc, 'w:p');
    for (const p of ps) {
        const t = textOf(p).trim();
        if (/^ÍNDICE DE (GRÁFICAS|FOTOGRAFÍAS)/i.test(t) || /^(Gráfica|Fotografía) \d+\./i.test(t) && /\d+$/.test(t) && t.length < 90) removeNode(p);
    }
}

// Parrafos de graficas de ejemplo: los datos de la plantilla no son de esta OIT.
function removeChartParagraphs(doc: any) {
    for (const p of all(doc, 'w:p')) {
        const hasChart = all(p, 'c:chart').length > 0;
        const t = textOf(p).trim();
        if (hasChart || /^Gr[aá]fica \d+\.\s/.test(t) || /^Fuente: ALS ENVIRONMENTAL S\.A\.S\.?,? (XXXX|2026)\.?\s*$/i.test(t) && p.previousSibling && /Gr[aá]fica/.test(textOf(p.previousSibling))) removeNode(p);
    }
}

// ------------------------------------------------------------------ bloques que no aplican
function removeRange(paras: any[], fromRe: RegExp, toRe: RegExp, keepEnd = true): number {
    const start = paras.findIndex(p => fromRe.test(textOf(p).trim()));
    if (start < 0) return 0;
    let end = paras.findIndex((p, i) => i > start && toRe.test(textOf(p).trim()));
    if (end < 0) end = paras.length;
    let n = 0;
    for (let i = start; i < (keepEnd ? end : end + 1); i++) { removeNode(paras[i]); n++; }
    return n;
}

function pruneSamplingBlocks(doc: any, ctx: ReportContext) {
    const m = matrixLabel(ctx.serviceName);
    let paras = bodyParagraphs(doc);
    if (!m.groundwater) {
        // Piezometro y aljibe solo existen en aguas subterraneas.
        removeRange(paras, /^Muestreo de aguas subterr/i, /^Modalidad de muestreo/i);
    }
    paras = bodyParagraphs(doc);
    const compuesto = /compuest/i.test(ctx.serviceName);
    const drop = (re: RegExp) => {
        const i = paras.findIndex(p => re.test(textOf(p).trim()));
        if (i < 0) return;
        removeNode(paras[i]);
        // El parrafo descriptivo que sigue al titulo de la modalidad.
        if (paras[i + 1] && !/^(Simple|Compuesto|Integrado)/i.test(textOf(paras[i + 1]).trim())) removeNode(paras[i + 1]);
    };
    if (!compuesto) drop(/^Compuesto:?$/i);
    drop(/^Integrado v[eé]rtices/i);
    drop(/^Integrado por profundidad/i);
    if (compuesto) drop(/^Simple:?$/i);
}

// ------------------------------------------------------------------ tablas
function tableByHeader(doc: any, re: RegExp): any | null {
    return all(doc, 'w:tbl').find((t: any) => { const first = children(t, 'w:tr')[0]; return first && re.test(fold(textOf(first))); }) || null;
}

function cloneRow(tr: any, values: string[]) {
    const row = tr.cloneNode(true);
    const cells = children(row, 'w:tc');
    values.forEach((v, i) => { if (cells[i]) setCellText(cells[i], v); });
    return row;
}

// Reemplaza las filas de ejemplo (desde dataFrom) por una fila por cada dato.
function fillRows(table: any, dataFrom: number, rows: string[][], emptyRow?: string[]) {
    const trs = children(table, 'w:tr');
    const template = trs[trs.length > dataFrom ? Math.min(dataFrom, trs.length - 1) : trs.length - 1];
    const toWrite = rows.length ? rows : (emptyRow ? [emptyRow] : []);
    if (!toWrite.length || !template) return;
    const anchor = template.nextSibling;
    const fresh = toWrite.map(v => cloneRow(template, v));
    for (const old of trs.slice(dataFrom)) removeNode(old);
    for (const r of fresh) table.insertBefore(r, anchor && anchor.parentNode === table ? anchor : null);
}

export function fillTables(doc: any, ctx: ReportContext) {
    const results = ctx.results;
    const val = (r: ReportResult) => `${r.valor ?? ''}`.trim();
    const cumple = (r: ReportResult) => r.cumple === true ? 'Conforme' : r.cumple === false ? 'No conforme' : 'No aplica';

    // Tabla 0: informacion de la empresa (lo que falta se dice, no se deja en blanco).
    const t0 = all(doc, 'w:tbl').find((t: any) => /razon social/.test(fold(textOf(children(t, 'w:tr')[0] || t))));
    if (t0) {
        const fill: Record<string, string> = {
            'correo contacto': ctx.contact?.email || 'No suministrado',
            'nombre del cliente': ctx.contact?.name || 'No suministrado',
            'telefono': ctx.contact?.phone || 'No suministrado',
            'actividad economica': ctx.contact?.activity || 'No suministrada',
        };
        for (const tr of children(t0, 'w:tr')) {
            const cells = children(tr, 'w:tc');
            const label = fold(textOf(cells[0] || tr)).replace(/[:\s]+$/, '');
            for (const [k, v] of Object.entries(fill)) {
                // "Nombre del cliente" en esta tabla es la etiqueta del representante.
                if (label.startsWith(k) && cells[1] && !textOf(cells[1]).trim()) setCellText(cells[1], v);
            }
        }
    }

    // Tabla 1: laboratorio responsable.
    const t1 = tableByHeader(doc, /^laboratorio/);
    if (t1) fillRows(t1, 2, [['ALS ENVIRONMENTAL S.A.S.', [...new Set(results.map(r => r.parametro))].slice(0, 12).join(', ') || 'Ver Anexo 1', 'Resolución de acreditación IDEAM (Anexo 3)']]);

    // Tabla 2: identificacion de la muestra.
    const t2 = all(doc, 'w:tbl').find((t: any) => /identificacion de la muestra/.test(fold(textOf(t))));
    if (t2) {
        const trs = children(t2, 'w:tr');
        const last = trs[trs.length - 1];
        const c = children(last, 'w:tc');
        if (c.length >= 4) {
            setCellText(c[0], ctx.sampleId || '');
            setCellText(c[1], ctx.reportNumber || 'Ver Anexo 1');
            setCellText(c[2], ctx.sampleDate || '');
            setCellText(c[3], ctx.pointName || '');
        }
    }

    // Tabla 3: equipos e instrumentos in situ (solo si hubo mediciones en campo).
    const t3 = tableByHeader(doc, /^parametro/);
    const isT3 = (t: any) => /equipo utilizado/.test(fold(textOf(t)));
    const equipment = all(doc, 'w:tbl').find(isT3);
    if (equipment) {
        fillRows(equipment, 2, ctx.field.map(f => [f.name, f.unit || '-', 'Ver planilla de verificación de equipos (FO-IT-PSM-23-04)', 'Ver Anexo 5', 'Según planilla de campo', 'NA', 'NA']),
            ['No se registraron mediciones in situ', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA']);
    }
    void t3;

    // Tabla 4: metodos de laboratorio.
    const methods = all(doc, 'w:tbl').find((t: any) => /limite de cuantificacion/.test(fold(textOf(t))) && /metodo analitico/.test(fold(textOf(t))) && !isT3(t));
    if (methods) fillRows(methods, 1, results.map(r => [r.parametro, r.unidad || '-', r.metodo || 'Ver Anexo 1', r.limite || '-']), ['Ver Anexo 1', '-', '-', '-']);

    // Tabla 5: registro fotografico.
    const t5 = all(doc, 'w:tbl').find((t: any) => /registro fotografico/.test(fold(textOf(t))));
    if (t5) {
        for (const tc of all(t5, 'w:tc')) if (/aqui se adjuntan las fotos/.test(fold(textOf(tc)))) setCellText(tc, 'El registro fotográfico se encuentra en el Anexo 2 (formatos de campo).');
    }

    // Tabla 6: ubicacion del punto.
    const t6 = all(doc, 'w:tbl').find((t: any) => /georreferenciacion/.test(fold(textOf(t))));
    if (t6) {
        const trs = children(t6, 'w:tr');
        const set = (row: any, v: string) => { if (row) { const c = children(row, 'w:tc'); if (c[4]) setCellText(c[4], v); if (c[5]) setCellText(c[5], v === ctx.coordinates ? '' : 'NA'); } };
        set(trs[2], ctx.coordinates || 'No reportadas');
        const r3 = trs[3];
        if (r3) { const c = children(r3, 'w:tc'); if (c[4]) setCellText(c[4], ctx.coordinates ? '' : 'No reportadas'); if (c[5]) setCellText(c[5], 'NA'); }
    }

    // Tablas 7 y 8: resultados de campo y de laboratorio.
    const resultTables = all(doc, 'w:tbl').filter((t: any) => /declaracion de conformidad/.test(fold(textOf(t))) && /nombre del punto/.test(fold(textOf(t))));
    const [tCampo, tLab] = resultTables;
    const head = (t: any, text: string) => {
        // Encabezado de la columna de resultados: nombre del punto, fecha, hora, ID.
        const trs = children(t, 'w:tr');
        const rowsHead = trs.slice(0, 4);
        const labels = [ctx.pointName || 'Punto de monitoreo', ctx.sampleDate || '', '', ctx.sampleId || ''];
        rowsHead.forEach((tr: any, i: number) => {
            const c = children(tr, 'w:tc');
            const cell = i === 0 ? c[2] : c.find((x: any) => /fecha de monitoreo|hora|^id/.test(fold(textOf(x))));
            if (!cell) return;
            if (i === 0) setCellText(cell, labels[0]);
            else if (i === 1) setCellText(cell, `Fecha de monitoreo: ${labels[1]}`);
            else if (i === 3) setCellText(cell, `ID: ${labels[3]}`);
        });
        void text;
    };
    if (tCampo) {
        head(tCampo, 'campo');
        fillRows(tCampo, 4, ctx.field.map(f => [f.name, f.unit || '-', f.value, '-', 'No aplica']), ['Sin mediciones in situ', '-', 'No se registraron', '-', 'No aplica']);
    }
    if (tLab) {
        head(tLab, 'laboratorio');
        fillRows(tLab, 4, results.map(r => [r.parametro, r.unidad || '-', val(r), r.normativa || r.limite || '-', cumple(r)]), ['Ver Anexo 1', '-', '-', '-', '-']);
    }

    // Tabla 9: anexos.
    const t9 = all(doc, 'w:tbl').find((t: any) => /anexo 1\. reporte de laboratorio/.test(fold(textOf(t))));
    if (t9) {
        const row = children(t9, 'w:tr').find((tr: any) => /anexo 1/.test(fold(textOf(tr))));
        if (row) { const c = children(row, 'w:tc'); if (c[1]) setCellText(c[1], 'ALS ENVIRONMENTAL S.A.S.'); if (c[2]) setCellText(c[2], ctx.labFileName || 'Reporte de laboratorio'); }
    }

    // Tabla 10: el segundo bloque de historial es el ejemplo de la plantilla.
    const t10 = all(doc, 'w:tbl').find((t: any) => /historial|identificacion unica/.test(fold(textOf(t))) && /version inicial/.test(fold(textOf(t))));
    if (t10) {
        const trs = children(t10, 'w:tr');
        const second = trs.findIndex((tr: any, i: number) => i > 3 && /^version/.test(fold(textOf(tr))));
        if (second > 0) for (const tr of trs.slice(second)) removeNode(tr);
    }
}

// ------------------------------------------------------------------ texto
const PLACEHOLDER_FIXES: Array<[RegExp, string | ((ctx: ReportContext) => string)]> = [
    [/\(\s*\)/g, ''],
    [/\s*\(Diligenciar la versi[oó]n vigente\)/gi, ''],
    [/diligenciar c[oó]digo y nombre de formatos empleados/gi, 'plan de monitoreo de aguas (FO-PO-PSM-72-13), planilla de campo muestreo simple (FO-PO-PSM-45-01) y cadena de custodia (FO-PO-PSM-13-03)'],
    [/(S\.A\.S\.?,)\s*XXXX\b/g, ctx => `$1 ${ctx.year}`],
    [/\s+e IT-XXXX-XX/gi, ''],
    [/instrumento de muestreo\s*,\s*seleccionado/gi, 'el instrumento de muestreo seleccionado'],
    [/\bXXXX\b/g, ctx => String(ctx.year)],
];

function fixPlaceholders(doc: any, ctx: ReportContext) {
    const m = matrixLabel(ctx.serviceName);
    for (const p of all(doc, 'w:p')) {
        let t = textOf(p);
        if (!t.trim()) continue;
        let next = t;
        for (const [re, to] of PLACEHOLDER_FIXES) next = next.replace(re, typeof to === 'function' ? to(ctx) : to);
        if (!m.groundwater) {
            next = next
                .replace(/aguas subterr[aá]neas/gi, 'aguas ' + m.word)
                .replace(/agua subterr[aá]nea/gi, 'agua ' + m.word)
                .replace(/\(\s*subterr[aá]nea\s*\)/gi, `(${m.word})`)
                .replace(/\bsubterr[aá]nea\b/gi, m.word);
        }
        next = next.replace(/\bX \(X\)/g, countWords(1)).replace(/ {2,}/g, ' ');
        if (next !== t) setParaText(p, next);
    }
}

// Sin mediciones in situ: fuera el parrafo de metodos de campo, la escala de pH y su figura.
function pruneFieldOnlyContent(doc: any, ctx: ReportContext) {
    if (ctx.field.length) return;
    for (const p of all(doc, 'w:p')) {
        const t = textOf(p).trim();
        if (/^Para la medici[oó]n del par[aá]metro In situ/i.test(t)) {
            setParaText(p, 'En este servicio no se realizaron mediciones in situ; los métodos empleados para el análisis de la muestra en laboratorio se describen en la Tabla 4.');
        }
        if (/^Fuente: Prichard/i.test(t)) {
            const cap = p.previousSibling;
            if (cap && /^Figura \d+\. Escala de pH/i.test(textOf(cap).trim())) {
                const img = cap.previousSibling;
                if (img && all(img, 'w:drawing').length) removeNode(img);
                removeNode(cap);
            }
            removeNode(p);
        }
    }
}

// Normativa aplicable (el apartado quedaba vacio).
function fillNorm(doc: any, ctx: ReportContext) {
    const paras = bodyParagraphs(doc);
    const i = paras.findIndex(p => /^Normativa aplicable$/i.test(textOf(p).trim()));
    if (i < 0) return;
    const next = paras[i + 1];
    const text = ctx.norm
        ? `La declaración de conformidad se realizó frente a la siguiente normatividad: ${ctx.norm}.`
        : 'La declaración de conformidad se realizó frente a la normatividad indicada en la orden de trabajo y en el reporte de laboratorio (Anexo 1).';
    if (next && !textOf(next).trim()) setParaText(next, text);
    else if (next && /^Informaci[oó]n de la empresa/i.test(textOf(next).trim())) {
        const p = next.cloneNode(true);
        setParaText(p, text);
        next.parentNode.insertBefore(p, next);
    }
}

// Analisis y conclusiones reales en lugar de las frases de la plantilla con valores vacios.
function replaceNarrative(doc: any, ctx: ReportContext) {
    let paras = bodyParagraphs(doc);
    const mk = (model: any, text: string) => { const p = model.cloneNode(true); setParaText(p, text); return p; };

    // Entre la Tabla 8 y las conclusiones: analisis de resultados.
    const lab = paras.findIndex(p => /^Resultados de laboratorio/i.test(textOf(p).trim()));
    const conc = paras.findIndex((p, i) => i > lab && /^CONCLUSIONES$/i.test(textOf(p).trim()));
    if (lab >= 0 && conc > lab) {
        const body = paras.slice(lab + 1, conc).filter(p => textOf(p).trim().length > 60);
        const model = body[body.length - 1] || body[0];
        if (model) {
            // Se conserva solo el parrafo que introduce la tabla; el resto eran frases de ejemplo.
            const keep = body.find(p => /Tabla 8/.test(textOf(p))) || null;
            for (const p of paras.slice(lab + 1, conc)) if (p !== keep && textOf(p).trim().length > 40 && !/^Tabla \d+\./.test(textOf(p).trim()) && !/^Fuente:/.test(textOf(p).trim())) removeNode(p);
            const anchor = paras[conc];
            for (const t of ctx.analysis) anchor.parentNode.insertBefore(mk(model, t), anchor);
        }
    }

    // Resultados de campo: narrativa con los valores medidos o el aviso de que no hubo.
    paras = bodyParagraphs(doc);
    const campo = paras.findIndex(p => /^Resultados de campo/i.test(textOf(p).trim()));
    const lab2 = paras.findIndex((p, i) => i > campo && /^Resultados de laboratorio/i.test(textOf(p).trim()));
    if (campo >= 0 && lab2 > campo) {
        const seg = paras.slice(campo + 1, lab2);
        const model = seg.find(p => textOf(p).trim().length > 60);
        for (const p of seg) { const t = textOf(p).trim(); if (t.length > 60 && !/^El resultado obtenido/.test(t) && !/^Tabla \d+\./.test(t) && !/^Fuente:/.test(t)) removeNode(p); }
        if (model) {
            const anchor = paras[lab2];
            for (const t of ctx.fieldNarrative) anchor.parentNode.insertBefore(mk(model, t), anchor);
        }
    }

    // Conclusiones.
    paras = bodyParagraphs(doc);
    const c0 = paras.findIndex(p => /^CONCLUSIONES$/i.test(textOf(p).trim()));
    const end = paras.findIndex((p, i) => i > c0 && /^ALS ENVIRONMENTAL S\.A\.S\.\s*$/i.test(textOf(p).trim()));
    if (c0 >= 0 && end > c0) {
        const seg = paras.slice(c0 + 1, end).filter(p => textOf(p).trim());
        const intro = seg[0];
        const model = seg[1] || seg[0];
        if (model) {
            for (const p of seg.slice(1)) removeNode(p);
            const m = matrixLabel(ctx.serviceName);
            if (intro) setParaText(intro, `Se realizó la evaluación de la calidad del agua ${m.word} en ${countWords(1)} punto. De lo cual se concluye lo siguiente:`);
            const anchor = paras[end];
            for (const t of ctx.conclusions) anchor.parentNode.insertBefore(mk(model, t), anchor);
        }
    }
}

// ------------------------------------------------------------------ entrada
export function postProcessReportXml(xml: string, ctx: ReportContext): { xml: string; highlights: number } {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    removeInstructionParagraphs(doc);
    pruneSamplingBlocks(doc, ctx);
    fixPlaceholders(doc, ctx);
    pruneFieldOnlyContent(doc, ctx);
    fillNorm(doc, ctx);
    fillTables(doc, ctx);
    replaceNarrative(doc, ctx);
    removeChartParagraphs(doc);
    removeExampleIndexes(doc);
    const highlights = stripHighlights(doc);
    return { xml: new XMLSerializer().serializeToString(doc), highlights };
}

export function postProcessReportDocx(buffer: Buffer, ctx: ReportContext): Buffer {
    const zip = new PizZip(buffer);
    const file = zip.file('word/document.xml');
    if (!file) return buffer;
    const { xml } = postProcessReportXml(file.asText(), ctx);
    zip.file('word/document.xml', xml);
    // Word recalcula la tabla de contenido y los indices al abrir el documento.
    const settings = zip.file('word/settings.xml');
    if (settings) {
        let s = settings.asText();
        if (!/w:updateFields/.test(s)) s = s.replace(/<w:settings([^>]*)>/, '<w:settings$1><w:updateFields w:val="true"/>');
        zip.file('word/settings.xml', s);
    }
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}
