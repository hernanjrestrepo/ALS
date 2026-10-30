/**
 * Una cotizacion puede traer varias matrices (agua superficial, biota, agua potable...) y cada una se
 * compara con SU norma y SU articulo (Hernan, 2026-10-30, SIACOT-20741 de COMPAS: "estamos revolviendo
 * absolutamente todo y la conclusion de la IA no es adecuada porque compara los limites con otra cosa").
 *
 * Este modulo lee la cotizacion tal como viene (sin IA) y la separa en grupos:
 *   - cada servicio numerado ("1. Caracterizacion de Agua Superficial" + su tabla de analisis);
 *   - la norma y el articulo de cada uno, tomados de "Documentos de referencia" ("1. Aguas: Decreto 1076
 *     ... Articulo de la norma a comparar: 2.2.3.3.9.10 y 2.2.3.3.9.13"), emparejados por numero o por el
 *     nombre de la matriz; "No aplica" se respeta;
 *   - si la cotizacion no trae esa seccion, una frase como "para el informe de agua potable, comparar con
 *     la resolucion 2115" se asigna al grupo cuya matriz nombra.
 * Si no se puede separar (una sola matriz, o formato distinto), devuelve [] y se compara todo junto como antes.
 */
import { ComparisonTarget, parseComparisonTargets } from './quotationCompliance';

export interface ServiceGroup {
    index: number;
    /** "Caracterización de Agua Superficial" */
    title: string;
    /** Nombre corto de la matriz: "Agua Superficial" */
    matrix: string;
    /** Solo la parte de la cotizacion de este servicio (su tabla de analisis y sus notas). */
    text: string;
    targets: ComparisonTarget[];
    /** La cotizacion dice "No aplica" para este servicio. */
    noAplica: boolean;
    /** Texto de la referencia que la cotizacion trae para este servicio ("Decreto 1076 de 2015 ..."). */
    referenceLabel?: string;
    /** Cuando la norma se asigno por deduccion (no por numero o por nombre) se avisa. */
    note?: string;
}

const fold = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const STOP = new Set(['caracterizacion', 'de', 'la', 'el', 'del', 'los', 'las', 'en', 'y', 'e', 'continental', 'monitoreo', 'muestreo', 'servicio', 'estudio']);
const stem = (w: string) => w.replace(/(es|s)$/, '');
const keywords = (s: string) => [...new Set(fold(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w)).map(stem))];

const SECTION_END = /^\s*\.?\s*(Subcontrataci[oó]n|Documentos de referencia|Precio del Estudio|Forma de pago|Condiciones comerciales|Validez de la oferta)\b/im;
const REF_START = /^\s*\.?\s*Documentos de referencia\b/im;
const REF_END = /^\s*\.?\s*(Precio del Estudio|Forma de pago|Condiciones comerciales|Validez de la oferta)\b/im;

interface Heading { index: number; start: number; title: string; heading: string }

// Encabezados de servicio: "1. Caracterización de Agua Superficial" seguido de la tabla (Matriz / punto(s)).
function findHeadings(text: string): Heading[] {
    const out: Heading[] = [];
    const re = /^[ \t]*(\d{1,2})\.[ \t]+([^\n]{4,120})$/gm;
    for (const m of text.matchAll(re)) {
        const line = m[2].trim();
        if (/:\s*$/.test(line)) continue; // "1. Aguas:" es una referencia, no un servicio
        const after = text.slice((m.index as number) + m[0].length, (m.index as number) + m[0].length + 700);
        if (!/punto\(s\)|toma de muestra|Matriz\s*An[aá]lisis|M[eé]todo/i.test(after)) continue;
        // El titulo real suele estar en la linea ". Caracterización de Biota ..." justo antes de "Alcance:".
        const before = text.slice(Math.max(0, (m.index as number) - 260), m.index as number);
        const dotted = [...before.matchAll(/^[ \t]*\.[ \t]+(Caracterizaci[oó]n[^\n]{3,100})$/gm)].pop()?.[1]?.trim();
        out.push({ index: Number(m[1]), start: m.index as number, title: dotted || line, heading: line });
    }
    return out;
}

export interface Reference {
    index: number;
    label: string;
    noAplica: boolean;
    targets: ComparisonTarget[];
}

// "Documentos de referencia": "1. Aguas: / Decreto 1076 ... / Artículo de la norma a comparar: 2.2.3.3.9.10 y ..."
export function parseReferences(text: string): Reference[] {
    const start = text.search(REF_START);
    if (start < 0) return [];
    const rest = text.slice(start);
    const endRel = rest.slice(20).search(REF_END);
    const body = endRel >= 0 ? rest.slice(0, endRel + 20) : rest;
    const entries = [...body.matchAll(/^[ \t]*(\d{1,2})\.[ \t]+([^\n:]{2,90}):[ \t]*$/gm)];
    const refs: Reference[] = [];
    entries.forEach((m, i) => {
        const chunk = body.slice((m.index as number) + m[0].length, i + 1 < entries.length ? entries[i + 1].index : undefined);
        const afterMarker = chunk.split(/Art[ií]culos?\s+de\s+la\s+norma\s+a\s+comparar\s*:?/i)[1] || '';
        const noAplica = /^\s*(no\s+aplica)/i.test(afterMarker.trim()) || /^\s*(no\s+aplica)\s*$/im.test(chunk.split(/Art[ií]culos?\s+de\s+la\s+norma/i)[0] || '');
        refs.push({ index: Number(m[1]), label: m[2].trim(), noAplica, targets: noAplica ? [] : parseComparisonTargets(chunk) });
    });
    return refs;
}

const MATRIX_WORDS = ['potable', 'residual', 'superficial', 'subterranea', 'marina', 'suelo', 'aire', 'biota', 'sedimento', 'lodo', 'ruido', 'emision', 'vertimiento'];
function matrixKeywordIn(text: string): string | null {
    const f = fold(text);
    return MATRIX_WORDS.find(w => f.includes(w)) || null;
}

/** Separa la cotizacion en servicios y le asigna a cada uno su norma y articulo. [] si no se puede separar. */
export function parseServiceGroups(text: string): ServiceGroup[] {
    const headings = findHeadings(text);
    if (!headings.length) return [];
    const refStart = text.search(REF_START);
    const groups: ServiceGroup[] = headings.map((h, i) => {
        let end = i + 1 < headings.length ? headings[i + 1].start : text.length;
        const boundary = text.slice(h.start + 1).search(SECTION_END);
        if (boundary >= 0) end = Math.min(end, h.start + 1 + boundary);
        // El titulo punteado del SIGUIENTE servicio queda justo antes de su encabezado: no es de este.
        const section = text.slice(h.start, end).replace(/\n[ \t]*\.[ \t]+Caracterizaci[oó]n[^\n]*\n(?:-\n)?(?:Alcance:\n)?(?:-\n)?$/i, '');
        return {
            index: h.index,
            title: h.title.replace(/^\.\s*/, ''),
            matrix: h.title.replace(/^caracterizaci[oó]n\s+de\s+/i, '').trim(),
            text: section.trim(),
            targets: [],
            noAplica: false,
        };
    });

    const refs = parseReferences(text);
    const taken = new Set<number>();
    if (refs.length) {
        const byNumber = refs.length === groups.length;
        refs.forEach((r, i) => {
            let gi = -1;
            if (byNumber) gi = i;
            else {
                // Por el nombre de la matriz: el mejor parecido entre la etiqueta y el titulo/tabla del servicio.
                const kw = keywords(r.label);
                let best = 0;
                groups.forEach((g, k) => {
                    if (taken.has(k)) return;
                    const hay = fold(`${g.title} ${g.text.slice(0, 900)}`);
                    const score = kw.filter(w => hay.includes(w)).length;
                    if (score > best) { best = score; gi = k; }
                });
            }
            if (gi < 0 || taken.has(gi)) return;
            taken.add(gi);
            groups[gi].targets = r.targets;
            groups[gi].noAplica = r.noAplica;
            groups[gi].referenceLabel = r.label;
        });
    } else if (refStart < 0) {
        // Sin seccion de referencias: frases como "para el informe de agua potable, comparar con la resolucion 2115".
        const targets = parseComparisonTargets(text);
        for (const t of targets) {
            const at = text.indexOf(t.raw.slice(0, 20));
            const context = text.slice(Math.max(0, (at < 0 ? text.length : at) - 400), at < 0 ? text.length : at);
            const kw = matrixKeywordIn(context);
            const matches = kw ? groups.filter(g => fold(`${g.title} ${g.text.slice(0, 900)}`).includes(kw)) : [];
            if (matches.length === 1) matches[0].targets.push(t);
            else if (groups.length === 1) groups[0].targets.push(t);
            else groups.forEach(g => { g.targets.push(t); g.note = 'La cotización no dice a qué servicio corresponde esta norma; se comparó con todos.'; });
        }
    }
    return groups;
}
