// Cumplimiento de cotizaciones contra el ARTICULO que la propia cotizacion pide
// comparar ("Artículo de la norma a comparar: ...").
//
// Queja del 2026-10-15 (Ana Lucia, cotizacion SIACOT-20938-10-2026): el motor le
// pasaba a la IA los primeros 8000 caracteres de cada norma. En la tabla del
// Decreto 1076 el art. 2.2.3.3.9.7 empieza en el caracter 22.344, asi que la IA
// comparo contra el 2.2.3.3.9.3 (consumo humano) y listo 25 "faltantes" que no
// aplicaban. Aqui la norma se corta al articulo pedido, y el veredicto se arma en
// codigo a partir de la revision por parametro que devuelve la IA.

export const NORM_CITATION = /(?:resoluci[oó]n|decreto|res\.?)\s*(?:n[°º]?\.?\s*)?0*(\d{2,4})\b/gi;

// Extrae numeros de norma citados (ej. "Resolucion 0699", "Decreto 1076"), sin IA.
export function extractCitedStandardNumbers(text: string): Set<string> {
    const numbers = new Set<string>();
    for (const match of text.matchAll(NORM_CITATION)) {
        numbers.add(match[1].replace(/^0+/, ''));
    }
    return numbers;
}

// Numero de Sistema Serambiente impreso en el encabezado de cada pagina de la
// oferta (ej. SIACOT-20938-10-2026, SIACOT-17822-04-2025_V2). Se toma el que mas
// se repite por si el documento menciona otra cotizacion.
const SIACOT_NUMBER = /\bSIACOT-\d+-\d{1,2}-\d{4}(?:_V\d+)?\b/gi;

export function extractQuotationNumber(text: string): string | null {
    const counts = new Map<string, number>();
    for (const match of text.matchAll(SIACOT_NUMBER)) {
        const n = match[0].toUpperCase();
        counts.set(n, (counts.get(n) || 0) + 1);
    }
    let best: string | null = null;
    for (const [n, c] of counts) {
        if (!best || c > (counts.get(best) || 0)) best = n;
    }
    return best;
}

export interface ComparisonTarget {
    normNumber: string;
    articles: string[];
    table?: string;
    category?: string;
    raw: string;
}

const ARTICLE_MARKER = /Art[ií]culos?\s+de\s+la\s+norma\s+a\s+comparar\s*:?/gi;
const ROMAN = '[IVX]+';

// "1. Aguas: Decreto 1076 de 2015 ... Artículo de la norma a comparar: 2.2.3.3.9.7."
// Cada marcador se empareja con la ultima norma citada antes de el.
export function parseComparisonTargets(text: string): ComparisonTarget[] {
    const targets: ComparisonTarget[] = [];
    const seen = new Set<string>();
    const markers = [...text.matchAll(ARTICLE_MARKER)];
    // "Comparación con el artículo 4, tabla 2, categoría III - ..." (renglon aparte en la oferta)
    const comparisonLine = text.match(/Comparaci[oó]n\s+con\s+el\s+art[ií]culo[^\n]*/i)?.[0] || '';

    markers.forEach((m, i) => {
        const start = m.index as number;
        const prevEnd = i > 0 ? (markers[i - 1].index as number) + markers[i - 1][0].length : 0;
        const before = text.slice(Math.max(prevEnd, start - 800), start);
        const norms = [...before.matchAll(NORM_CITATION)];
        const normNumber = norms.length ? norms[norms.length - 1][1].replace(/^0+/, '') : '';

        const raw = text.slice(start + m[0].length, start + m[0].length + 200)
            .replace(/^[\s-]+/, '')
            .split(/\n\s*-/)[0]
            .replace(/\s+/g, ' ')
            .trim();
        const withoutNorm = raw.replace(NORM_CITATION, ' ');
        const articlePart = withoutNorm.split(/tabla|cuadro|categor[ií]a/i)[0];
        const articles = [...articlePart.matchAll(/\d+(?:\.\d+)*/g)].map(a => a[0]);
        if (!articles.length) return;

        const table = (raw.match(/tabla\s*(?:n[°º.]*\s*)?(\d+)/i) || comparisonLine.match(/tabla\s*(?:n[°º.]*\s*)?(\d+)/i) || [])[1];
        const category = (raw.match(new RegExp(`categor[ií]a\\s+(${ROMAN})(?![IVX])`, 'i'))
            || comparisonLine.match(new RegExp(`categor[ií]a\\s+(${ROMAN})(?![IVX])`, 'i')) || [])[1];

        const target: ComparisonTarget = { normNumber, articles, raw };
        if (table) target.table = table;
        if (category) target.category = category.toUpperCase();
        const key = `${normNumber}|${articles.join(',')}|${table || ''}|${category || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            targets.push(target);
        }
    });
    return targets;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function articleRegex(articles: string[], flags = 'i'): RegExp {
    return new RegExp(`Art[ií]culo\\s+(?:${articles.map(escapeRegex).join('|')})(?!\\.?\\d)`, flags);
}

// Las normas cargadas desde Excel son una tabla por renglon:
// Nombre legislación \t Parámetro \t Unidad \t Límite inferior \t Límite superior \t Referencia
export function isTabularStandard(content: string): boolean {
    return content.includes('=== Hoja:') && content.includes('\t');
}

function sliceTabular(content: string, target: ComparisonTarget): string | null {
    const art = articleRegex(target.articles);
    let rows = content.split('\n')
        .map(line => line.split('\t'))
        .filter(cols => cols.length >= 3 && art.test(cols[0]));
    if (!rows.length) return null;

    // Tabla y categoria solo filtran si la norma las distingue en sus renglones.
    if (target.table) {
        const re = new RegExp(`tabla\\s*(?:n[°º.]*\\s*)?${target.table}(?!\\d)`, 'i');
        const byTable = rows.filter(cols => re.test(cols[0]));
        if (byTable.length) rows = byTable;
    }
    if (target.category) {
        const re = new RegExp(`categor[ií]a\\s+${target.category}(?![IVX])`, 'i');
        const byCategory = rows.filter(cols => re.test(cols[0]));
        if (byCategory.length) rows = byCategory;
    }

    const groups = new Map<string, string[][]>();
    for (const cols of rows) {
        const heading = cols[0].trim();
        if (!groups.has(heading)) groups.set(heading, []);
        groups.get(heading)!.push(cols.slice(1, 6).map(c => c.trim() || '-'));
    }
    const out: string[] = [];
    for (const [heading, params] of groups) {
        out.push(`### ${heading}`);
        out.push('Parámetro | Unidad | Límite inferior | Límite superior | Referencia');
        for (const p of params) out.push(p.join(' | '));
    }
    return out.join('\n');
}

function sliceText(content: string, target: ComparisonTarget): string | null {
    const re = articleRegex(target.articles, 'gi');
    const matches = [...content.matchAll(re)];
    if (!matches.length) return null;
    // Preferir el titulo del articulo (al inicio de renglon) sobre una mencion de paso.
    const heading = matches.find(m => /\n\s*$/.test(content.slice(Math.max(0, (m.index as number) - 6), m.index))) || matches[0];
    const start = heading.index as number;
    const next = /\n\s*ART[ÍI]CULO\s+\d/gi;
    next.lastIndex = start + heading[0].length;
    const end = next.exec(content)?.index ?? start + 8000;
    return content.slice(start, Math.min(end, start + 8000)).trim();
}

export interface StandardLike {
    title: string;
    content?: string | null;
    description?: string | null;
}

export interface ArticleBlock {
    target: ComparisonTarget;
    standardTitle: string;
    text: string;
}

export function describeTarget(t: ComparisonTarget): string {
    const parts = [`artículo ${t.articles.join(', ')}`];
    if (t.table) parts.push(`tabla ${t.table}`);
    if (t.category) parts.push(`categoría ${t.category}`);
    return parts.join(', ');
}

// Para cada articulo pedido, el texto de ese articulo en las normas cargadas.
// Si la misma norma esta cargada como Excel y como PDF, se usa la tabla del Excel.
export function buildArticleBlocks(standards: StandardLike[], targets: ComparisonTarget[]) {
    const blocks: ArticleBlock[] = [];
    const notFound: ComparisonTarget[] = [];
    for (const target of targets) {
        const candidates = standards.filter(s => target.normNumber && extractCitedStandardNumbers(s.title).has(target.normNumber));
        const slices = candidates.map(s => {
            const content = s.content || '';
            const tabular = isTabularStandard(content);
            const text = tabular ? sliceTabular(content, target) : sliceText(content, target);
            return { s, tabular, text };
        }).filter(x => x.text);
        const chosen = slices.some(x => x.tabular) ? slices.filter(x => x.tabular) : slices;
        if (!chosen.length) {
            notFound.push(target);
            continue;
        }
        for (const x of chosen) blocks.push({ target, standardTitle: x.s.title, text: x.text as string });
    }
    return { blocks, notFound };
}

// --- Matriz -----------------------------------------------------------------

function norm(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface MatrixMismatch {
    parameter: string;
    quotedMatrix: string;
    sampleMatrix: string;
}

const MATRIX_BOUNDARY = /^(aguas?|no\d*|si\d*|\d+|ml|l|cantidad|monitoreo)$/i;

// "Asunto: Caracterización de Agua Superficial." contra parametros cotizados con
// otra matriz en el nombre, p. ej. "Coliformes Totales (Agua Potable)".
export function detectMatrixMismatches(text: string): { sampleMatrix: string | null; mismatches: MatrixMismatch[] } {
    const flat = text.replace(/\s+/g, ' ');
    const sampleMatrix = flat.match(/Asunto:\s*Caracterizaci[oó]n\s+de\s+([^.]+?)\s*\./i)?.[1]?.trim() || null;
    if (!sampleMatrix) return { sampleMatrix: null, mismatches: [] };

    const mismatches: MatrixMismatch[] = [];
    const seen = new Set<string>();
    for (const m of flat.matchAll(/\((agua[^()]{2,40})\)/gi)) {
        const quotedMatrix = m[1].trim();
        const q = norm(quotedMatrix);
        const s = norm(sampleMatrix);
        if (s.includes(q) || q.includes(s)) continue;
        const tokens = flat.slice(Math.max(0, (m.index as number) - 60), m.index).trim().split(' ');
        let cut = 0;
        tokens.forEach((t, i) => { if (MATRIX_BOUNDARY.test(t)) cut = i + 1; });
        const parameter = tokens.slice(cut).join(' ').trim() || quotedMatrix;
        const key = norm(parameter);
        if (seen.has(key)) continue;
        seen.add(key);
        mismatches.push({ parameter, quotedMatrix, sampleMatrix });
    }
    return { sampleMatrix, mismatches };
}

// --- Equivalencias de nombres -----------------------------------------------

// Pares que el laboratorio confirmo que NO son el mismo parametro (Ana Lucia,
// 2026-10-15: "el artículo pide compuestos fenólicos y yo seleccioné fenoles,
// lo cual no es correcto").
export const NON_EQUIVALENT_PARAMETERS: Array<[string, string]> = [
    ['Fenoles', 'Compuestos fenólicos'],
];

// Pares que el laboratorio confirmo que SI son el mismo parametro (Ana Lucia,
// 2026-10-15: "efectivamente coliformes termotolerantes y fecales es lo mismo y
// detergentes SAAM y tensoactivos también es lo mismo"). Las nuevas parejas se
// confirman por consulta y quedan en la tabla ParameterRule.
export const EQUIVALENT_PARAMETERS: Array<[string, string]> = [
    ['Coliformes fecales', 'Coliformes termotolerantes'],
    ['Tensoactivos', 'Detergentes (SAAM)'],
];

export interface ParameterRules {
    equivalent: Array<[string, string]>;
    nonEquivalent: Array<[string, string]>;
}

export const BUILTIN_RULES: ParameterRules = {
    equivalent: EQUIVALENT_PARAMETERS,
    nonEquivalent: NON_EQUIVALENT_PARAMETERS,
};

// --- Prompt -------------------------------------------------------------------

// Timeout de la llamada a Ollama (axios): la IA estaba ocupada, no la respuesta mala.
export function isAITimeout(error: unknown): boolean {
    const e = error as { code?: string; message?: string };
    return e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message || '');
}

export const COMPLIANCE_SYSTEM_PROMPT = `Eres un auditor técnico riguroso de cotizaciones de laboratorio ambiental. Comparas lo que ofrece la cotización contra el artículo de la norma que la propia cotización pide comparar. No asumes conformidad por defecto, no inventas parámetros y no usas artículos distintos a los que se te entregan.`;

// La IA solo empareja cada parametro del articulo con el analisis cotizado y
// revisa faltantes y limite de cuantificacion; nombre y matriz los decide
// applySystemChecks con reglas fijas.
export function buildCompliancePrompt(quotationText: string, blocks: Array<{ label: string; text: string }>): string {
    return `## COTIZACIÓN
${quotationText.substring(0, 12000)}

## ARTÍCULO DE LA NORMA A COMPARAR (es lo único contra lo que se compara)
${blocks.map(b => `#### ${b.label}\n${b.text}`).join('\n\n')}

## CÓMO REVISAR
Recorre UNO POR UNO todos los parámetros del artículo de arriba, incluidos los que están bien. Para cada uno:
1. quotedAs: el análisis de la cotización que corresponde a ese parámetro, aunque tenga otro nombre (un sinónimo, una sigla como DQO o SAAM, una abreviatura como "E. coli", o un parámetro parecido). Escribe solo el nombre del análisis como aparece en la columna "Análisis", con lo que tenga entre paréntesis, pero sin el método, el límite ni las unidades. Ojo: el PDF pega la matriz al nombre ("Agua PotablePh" es el análisis "Ph"). Si ningún análisis le corresponde, déjalo vacío.
2. normLimit: el límite del artículo con su unidad (o el rango), sin los guiones de columnas vacías. quotedLoq: el límite de cuantificación cotizado para ese análisis, con su unidad.
3. problems:
   - FALTANTE: ningún análisis de la cotización le corresponde.
   - LIMITE_CUANTIFICACION: el límite de cuantificación cotizado es MAYOR que el límite máximo del artículo, en las mismas unidades. No aplica si el artículo pide "Ausencia" o un rango (como el pH).
   No juzgues nombres ni matrices: eso lo revisa el sistema.
Si el artículo tiene varias tablas o categorías y la cotización dice cuál, usa solo esa.

## RESPONDE SOLO JSON
{
  "parameters": [
    {"normParameter": "<nombre como aparece en el artículo>", "normLimit": "<límite del artículo con unidad>", "quotedAs": "<análisis de la cotización, o vacío>", "quotedLoq": "<límite de cuantificación cotizado con unidad, o vacío>", "problems": [{"type": "FALTANTE|LIMITE_CUANTIFICACION", "detail": "<explicación corta>"}]}
  ],
  "quotationNumberFound": "<número de cotización del documento, o vacío>"
}`;
}

// --- Veredicto ----------------------------------------------------------------

export type ProblemType = 'FALTANTE' | 'PARAMETRO_INCORRECTO' | 'NOMBRE_DISTINTO' | 'MATRIZ' | 'LIMITE_CUANTIFICACION' | 'OTRO';

export interface ParameterCheck {
    normParameter: string;
    normLimit?: string;
    quotedAs?: string;
    quotedLoq?: string;
    problems: Array<{ type: ProblemType; detail?: string }>;
}

export interface QuotationIssue {
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    category: string;
    parameter?: string;
    description: string;
    normReference?: string;
    recommendation?: string;
}

const PROBLEM_INFO: Record<ProblemType, { label: string; severity: QuotationIssue['severity']; action?: string }> = {
    FALTANTE: { label: 'Parámetro faltante', severity: 'CRITICAL', action: 'Incluir el parámetro, o marcar que el cliente solo pidió los parámetros cotizados.' },
    PARAMETRO_INCORRECTO: { label: 'Parámetro incorrecto', severity: 'CRITICAL', action: 'Cotizar el parámetro tal como lo pide el artículo.' },
    MATRIZ: { label: 'Matriz distinta a la muestra', severity: 'CRITICAL', action: 'Seleccionar el análisis de la matriz que corresponde a la muestra.' },
    LIMITE_CUANTIFICACION: { label: 'Límite de cuantificación', severity: 'CRITICAL', action: 'Usar un método con límite de cuantificación menor o igual al límite de la norma.' },
    NOMBRE_DISTINTO: { label: 'Nombre por confirmar', severity: 'WARNING', action: 'Confirmar si es el mismo parámetro que pide la norma.' },
    OTRO: { label: 'Observación', severity: 'WARNING' },
};

const PROBLEM_TYPES = Object.keys(PROBLEM_INFO) as ProblemType[];

// La IA devuelve JSON libre: se normaliza a la forma esperada sin inventar nada.
export function normalizeParameterChecks(raw: unknown): ParameterCheck[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((p: any) => p && typeof p.normParameter === 'string' && p.normParameter.trim())
        .map((p: any) => {
            const problems = (Array.isArray(p.problems) ? p.problems : [])
                .map((pr: any) => {
                    const type = String(pr?.type || '').toUpperCase().trim() as ProblemType;
                    return { type: PROBLEM_TYPES.includes(type) ? type : 'OTRO' as ProblemType, detail: pr?.detail ? String(pr.detail) : undefined };
                });
            const check: ParameterCheck = { normParameter: p.normParameter.trim(), problems };
            for (const k of ['normLimit', 'quotedAs', 'quotedLoq'] as const) {
                if (p[k] !== undefined && p[k] !== null && String(p[k]).trim()) check[k] = String(p[k]).trim();
            }
            return check;
        });
}

// Palabras para comparar nombres: sin tildes ni mayusculas, y singular y plural
// cuentan igual (cloruro/cloruros, detergente/detergentes, fenol/fenoles).
function words(s: string): string[] {
    return norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean)
        .map(w => w.length > 3 ? w.replace(/(es|s)$/, '').replace(/e$/, '') : w);
}

// Nombre base: sin la columna "Aguas" que el PDF pega al nombre y sin parentesis
// (matriz, sigla o metodo).
function baseName(s: string): string {
    return words(s.replace(/\([^)]*\)/g, ' ').replace(/^\s*aguas\s+/i, '')).join(' ');
}

// Siglas entre parentesis: "Demanda Química de Oxígeno (DQO)" -> "dqo". De 3 o
// mas letras: "(Al)" de aluminio chocaria con la palabra "al".
function acronyms(s: string): string[] {
    return [...s.matchAll(/\(([^)]*)\)/g)].map(m => words(m[1]).join(' ')).filter(a => a.length >= 3);
}

const hasPhrase = (big: string, small: string) => ` ${big} `.includes(` ${small} `);

// "escherichia coli" -> "e coli"
function abbreviated(base: string): string {
    const parts = base.split(' ');
    return parts.length >= 2 && parts[0].length > 3 ? [parts[0][0], ...parts.slice(1)].join(' ') : base;
}

function sameParameter(a: string, b: string): boolean {
    const x = baseName(a);
    const y = baseName(b);
    if (!x || !y) return false;
    // "Muestreo puntual determinación in situ pH" cubre "pH"
    if (x === y || hasPhrase(x, y) || hasPhrase(y, x)) return true;
    if (abbreviated(x) === y || abbreviated(y) === x) return true;
    // "DQO" cubre "Demanda Química de Oxígeno (DQO)"; "... como SAAM" cubre "(SAAM)"
    return acronyms(a).some(ac => hasPhrase(y, ac)) || acronyms(b).some(ac => hasPhrase(x, ac));
}

function inPairs(pairs: Array<[string, string]>, a: string, b: string): boolean {
    return pairs.some(([p, q]) => (sameParameter(a, p) && sameParameter(b, q)) || (sameParameter(a, q) && sameParameter(b, p)));
}

// ¿El nombre del parametro aparece en la parte tecnica de la cotizacion? (antes
// de "Términos y condiciones"). El PDF pega la matriz al nombre ("Agua PotablePh",
// "Agua PotableE. Coli"), asi que se separan esas palabras primero.
export function mentionedInQuotation(text: string, parameter: string): boolean {
    const end = text.search(/T[ée]rminos\s+y\s+condiciones/i);
    const region = (end > 0 ? text.slice(0, end) : text).replace(/([a-záéíóúñ]{3,})([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
    const tokens = words(region);
    const haystack = tokens.join(' ');
    const base = baseName(parameter);
    const parts = base.split(' ');
    const candidates = [base, abbreviated(base), ...acronyms(parameter)];
    if (candidates.filter(Boolean).some(c => hasPhrase(haystack, c))) return true;

    // "Cloro residual libre" frente a "Cloro libre medido en campo": 2 de cada 3
    // palabras del nombre, juntas en el texto.
    const significant = [...new Set(parts.filter(w => w.length > 3))];
    if (significant.length < 2) return false;
    const needed = Math.ceil((2 * significant.length) / 3);
    const span = significant.length + 3;
    for (let i = 0; i < tokens.length; i++) {
        const window = new Set(tokens.slice(i, i + span));
        if (significant.filter(w => window.has(w)).length >= needed) return true;
    }
    return false;
}

// El limite de cuantificacion solo se compara contra un limite con unidad: en
// la Res. 2115 art. 13 (IRCA) los numeros son puntajes de riesgo, no limites.
const isConcentration = (v?: string) => !!v && /\d/.test(v) && /[a-zµ%]/i.test(v);

// "0.4 mg SAAM/L" -> mg/l; "10 mg CaCO3/L" -> mg/l; "1.5 mL/L" -> ml/l. Lo que no
// se reconoce (rangos, "% de saturación", UFC frente a microorganismos) no se compara.
function canonicalUnit(u: string): string | null {
    const x = norm(u).replace(/μ/g, 'µ').replace(/\s+/g, '');
    const conc = x.match(/^(mg|µg|ug|ng|g)[a-z0-9-]*\/(100ml|ml|l)[a-z0-9-]*$/);
    if (conc) return `${conc[1] === 'ug' ? 'µg' : conc[1]}/${conc[2]}`;
    return /^(ml\/l|ntu|upc|uc)$/.test(x) ? x : null;
}

function parseQuantity(s?: string): { value: number; unit: string } | null {
    const m = (s || '').replace(/\s+/g, ' ').trim().match(/^[<≤]?\s*(\d+(?:[.,]\d+)?)\s*\(?\s*([a-zµμ][^()]*?)\)?$/i);
    if (!m) return null;
    const unit = canonicalUnit(m[2]);
    return unit ? { value: parseFloat(m[1].replace(',', '.')), unit } : null;
}

// Nombre, matriz y textos los decide el sistema, no la IA: en la prueba real del
// 2026-10-15 la IA marco "matriz distinta" en Fenoles y Detergentes (que no
// dicen "Agua Potable"), dio por incorrectos nombres que el laboratorio aun no ha
// dicho si son sinonimos, no reconocio "E. Coli" ni "Ph" y escribio en ingles.
// Aqui se descartan esos juicios y se recalculan con reglas fijas; correrlo dos
// veces da lo mismo.
export function applySystemChecks(checks: ParameterCheck[], mismatches: MatrixMismatch[], quotationText = '', rules: ParameterRules = BUILTIN_RULES) {
    for (const c of checks) {
        if (c.normLimit) c.normLimit = c.normLimit.replace(/^(\s*-\s+)+/, '').trim();
        if (c.quotedAs) c.quotedAs = c.quotedAs.replace(/^aguas\s+/i, '').trim();
        c.problems = c.problems.filter(p => !['MATRIZ', 'PARAMETRO_INCORRECTO', 'NOMBRE_DISTINTO'].includes(p.type));
        // Limite de cuantificacion: si ambos valores se pueden leer con la misma
        // unidad, decide el codigo (la IA lo marco en una corrida y en otra no).
        const limit = parseQuantity(c.normLimit);
        const loq = parseQuantity(c.quotedLoq);
        if (limit && loq && limit.unit === loq.unit) {
            c.problems = c.problems.filter(p => p.type !== 'LIMITE_CUANTIFICACION');
            if (c.quotedAs && loq.value > limit.value) c.problems.push({ type: 'LIMITE_CUANTIFICACION' });
        } else {
            c.problems = c.problems.filter(p => p.type !== 'LIMITE_CUANTIFICACION' || (isConcentration(c.normLimit) && isConcentration(c.quotedLoq)));
        }
        for (const p of c.problems) {
            if (p.type === 'LIMITE_CUANTIFICACION') {
                p.detail = `El límite de cuantificación cotizado (${c.quotedLoq}) es mayor que el límite de la norma (${c.normLimit}).`;
            }
        }

        if (!c.quotedAs) {
            // Sin analisis asignado es faltante, aunque la IA no lo haya marcado.
            if (!c.problems.some(p => p.type === 'FALTANTE' || p.type === 'OTRO')) c.problems.unshift({ type: 'FALTANTE' });
            for (const p of c.problems) {
                if (p.type !== 'FALTANTE') continue;
                if (quotationText && mentionedInQuotation(quotationText, c.normParameter)) {
                    p.type = 'OTRO';
                    p.detail = `«${c.normParameter}» aparece en la cotización, pero no se pudo emparejar con un análisis. Verificar.`;
                } else {
                    p.detail = `No se cotizó ningún análisis para «${c.normParameter}».`;
                }
            }
            continue;
        }
        // Si la IA asigno un analisis, el parametro no esta faltante.
        c.problems = c.problems.filter(p => p.type !== 'FALTANTE');
        if (inPairs(rules.nonEquivalent, c.normParameter, c.quotedAs)) {
            c.problems.unshift({ type: 'PARAMETRO_INCORRECTO', detail: `La norma pide «${c.normParameter}» y se cotizó «${c.quotedAs}», que no es el mismo parámetro.` });
        } else if (!sameParameter(c.normParameter, c.quotedAs) && !inPairs(rules.equivalent, c.normParameter, c.quotedAs)) {
            c.problems.unshift({ type: 'NOMBRE_DISTINTO', detail: `La norma pide «${c.normParameter}» y se cotizó «${c.quotedAs}». Confirmar si es el mismo parámetro.` });
        }
    }

    const unmatched: MatrixMismatch[] = [];
    for (const mm of mismatches) {
        const check = checks.find(c => c.quotedAs && sameParameter(c.quotedAs, mm.parameter));
        if (!check) {
            unmatched.push(mm);
            continue;
        }
        check.problems.push({ type: 'MATRIZ', detail: `Se cotizó el análisis para ${mm.quotedMatrix}, pero la muestra es ${mm.sampleMatrix}.` });
    }
    return unmatched;
}

export interface VerdictInput {
    checks: ParameterCheck[];
    unmatchedMatrix?: MatrixMismatch[];
    comparedAgainst?: string[];
    warnings?: Array<{ category: string; description: string; recommendation?: string }>;
}

export interface Verdict {
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED';
    compliant?: boolean;
    score: number;
    summary: string;
    issues: QuotationIssue[];
}

export function buildVerdict(input: VerdictInput): Verdict {
    const { checks, unmatchedMatrix = [], comparedAgainst = [], warnings = [] } = input;
    const issues: QuotationIssue[] = [];
    const counts = new Map<string, number>();

    // Un parametro de la norma que la cotizacion no ofrece es una SUGERENCIA: la
    // norma lo pide, pero lo que el cliente solicito es lo cotizado (Hernan, 2026-10-15).
    for (const c of checks) {
        for (const p of c.problems) {
            const isMissing = p.type === 'FALTANTE';
            const info = PROBLEM_INFO[p.type];
            const label = isMissing ? 'Sugerido por la norma (no cotizado)' : info.label;
            counts.set(label, (counts.get(label) || 0) + 1);
            const quoted = c.quotedAs ? ` Cotizado como: «${c.quotedAs}»${c.quotedLoq ? `, límite de cuantificación ${c.quotedLoq}` : ''}.` : '';
            issues.push({
                severity: isMissing ? 'INFO' : info.severity,
                category: label,
                parameter: c.normParameter,
                description: `${p.detail || label}${quoted}`.trim(),
                normReference: [comparedAgainst.join('; '), c.normLimit ? `límite ${c.normLimit}` : ''].filter(Boolean).join(' — ') || undefined,
                recommendation: isMissing ? 'Confirmar con el cliente si necesita este parámetro.' : info.action,
            });
        }
    }
    for (const mm of unmatchedMatrix) {
        counts.set(PROBLEM_INFO.MATRIZ.label, (counts.get(PROBLEM_INFO.MATRIZ.label) || 0) + 1);
        issues.push({
            severity: 'CRITICAL',
            category: PROBLEM_INFO.MATRIZ.label,
            parameter: mm.parameter,
            description: `«${mm.parameter} (${mm.quotedMatrix})» está cotizado para ${mm.quotedMatrix}, pero la muestra es ${mm.sampleMatrix}.`,
            recommendation: PROBLEM_INFO.MATRIZ.action,
        });
    }
    for (const w of warnings) {
        issues.push({ severity: 'WARNING', category: w.category, description: w.description, recommendation: w.recommendation });
    }

    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    issues.sort((a, b) => order[a.severity] - order[b.severity]);

    const score = complianceScore(checks);

    let status: Verdict['status'];
    let compliant: boolean | undefined;
    if (issues.some(i => i.severity === 'CRITICAL')) {
        status = 'NON_COMPLIANT';
        compliant = false;
    } else if (issues.some(i => i.severity === 'WARNING') || !checks.length) {
        status = 'REVIEW_REQUIRED';
    } else {
        status = 'COMPLIANT';
        compliant = true;
    }

    const against = comparedAgainst.length ? `Comparada contra ${comparedAgainst.join('; ')}` : 'Sin artículo de norma para comparar';
    const detail = [...counts].map(([label, n]) => `${label.toLowerCase()}: ${n}`).join(', ');
    const summary = `${against} (${checks.length} parámetro${checks.length === 1 ? '' : 's'} del artículo). ${detail ? `Hallazgos — ${detail}.` : 'Sin hallazgos.'}`;

    return { status, compliant, score, summary, issues };
}

// Puntuacion = de lo COTIZADO, que porcentaje esta sin observaciones. Antes solo
// restaban los incumplimientos graves y SIACOT-20857 mostraba 100 con 2 nombres por
// confirmar (Hernan, 2026-10-19). Lo sugerido por la norma no cotizado no entra: no
// es incumplimiento, va en "cobertura". Un hallazgo que Ana acepto cuenta como bien.
export function complianceScore(checks: ParameterCheck[], acceptedParameters: Set<string> = new Set()): number {
    const quoted = checks.filter(c => !c.problems.length || c.problems.some(p => p.type !== 'FALTANTE'));
    if (!quoted.length) return 0;
    const ok = quoted.filter(c => acceptedParameters.has(c.normParameter) || !c.problems.some(p => p.type !== 'FALTANTE'));
    return Math.round((100 * ok.length) / quoted.length);
}

// Cuantos parametros del articulo se cotizaron (los demas son sugeridos).
export function normCoverage(checks: ParameterCheck[]): { quoted: number; total: number } {
    return { quoted: checks.filter(c => !c.problems.some(p => p.type === 'FALTANTE')).length, total: checks.length };
}

// Decision de Ana sobre un hallazgo por revisar o un incumplimiento (2026-10-19:
// "yo no apruebo, Ana aprueba"). Queda con quien, cuando y por que.
export type FindingDecision = 'ACEPTADO' | 'EN_REVISION' | 'RECHAZADO';
export const FINDING_DECISIONS: FindingDecision[] = ['ACEPTADO', 'EN_REVISION', 'RECHAZADO'];
export interface FindingReview {
    decision: FindingDecision;
    comment: string;
    userId?: string;
    userName?: string;
    at: string;
    history?: Array<Omit<FindingReview, 'history'>>;
}
export type FindingReviews = Record<string, FindingReview>;

// Clave estable de un hallazgo: sobrevive a volver a analizar (la descripcion de la
// IA puede cambiar de palabras; categoria + parametro no).
export function issueKey(issue: Pick<QuotationIssue, 'category' | 'parameter' | 'description'>): string {
    const norm = (s?: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    return `${norm(issue.category)}|${issue.parameter ? norm(issue.parameter) : norm(issue.description).slice(0, 120)}`;
}

export interface EffectiveCompliance {
    status: Verdict['status'];
    compliant?: boolean;
    score: number;
    approvedForOit: boolean;
    pendingDecisions: number;
}

// Veredicto despues de las decisiones de Ana: todo hallazgo por revisar o
// incumplimiento aceptado -> conforme (con excepcion) y habilitada para OIT; uno
// rechazado -> no conforme; mientras quede alguno sin decidir o en revision -> revisar.
export function applyFindingReviews(result: any, reviews: FindingReviews = {}): EffectiveCompliance {
    const issues: QuotationIssue[] = normalizeIssues(result?.issues);
    const checks: ParameterCheck[] = Array.isArray(result?.parameterChecks) ? result.parameterChecks : [];
    const actionable = issues.filter(i => i.severity !== 'INFO');
    const decisionOf = (i: QuotationIssue) => reviews[issueKey(i)]?.decision;
    const accepted = new Set(actionable.filter(i => i.parameter && decisionOf(i) === 'ACEPTADO').map(i => i.parameter as string));
    // Un parametro con varios hallazgos solo cuenta como bien si se aceptaron todos.
    for (const i of actionable) if (i.parameter && decisionOf(i) !== 'ACEPTADO') accepted.delete(i.parameter);
    const score = result?.error ? 0 : complianceScore(checks, accepted);
    const pendingDecisions = actionable.filter(i => decisionOf(i) !== 'ACEPTADO' && decisionOf(i) !== 'RECHAZADO').length;

    // Un error del analisis (archivo no encontrado, IA caida) no se puede aceptar.
    if (result?.error) return { status: 'REVIEW_REQUIRED', score, approvedForOit: false, pendingDecisions };
    if (!checks.length && !actionable.length) return { status: 'REVIEW_REQUIRED', score, approvedForOit: false, pendingDecisions };
    if (actionable.some(i => decisionOf(i) === 'RECHAZADO')) return { status: 'NON_COMPLIANT', compliant: false, score, approvedForOit: false, pendingDecisions };
    if (actionable.every(i => decisionOf(i) === 'ACEPTADO')) return { status: 'COMPLIANT', compliant: true, score, approvedForOit: true, pendingDecisions: 0 };
    const original = result?.status as Verdict['status'];
    return { status: original === 'NON_COMPLIANT' ? 'NON_COMPLIANT' : 'REVIEW_REQUIRED', compliant: original === 'NON_COMPLIANT' ? false : undefined, score, approvedForOit: false, pendingDecisions };
}

// Resultados guardados antes de este cambio traen issues como texto suelto; la
// pantalla espera objetos (por eso se veian 25 tarjetas "INFO" vacias).
export function normalizeIssues(issues: unknown): QuotationIssue[] {
    if (!Array.isArray(issues)) return [];
    return issues.map((i: any) => typeof i === 'string'
        ? { severity: 'WARNING', category: 'Observación', description: i }
        : { ...i, description: i?.description || i?.detail || JSON.stringify(i) });
}

// Parametros con nombre distinto que el sistema no puede decidir: cada uno es una
// consulta para el laboratorio (se guarda la respuesta para no volver a preguntar).
export function pendingNameQuestions(checks: ParameterCheck[]): Array<{ normParameter: string; quotedAs: string; normReference: string }> {
    return checks
        .filter(c => c.quotedAs && c.problems.some(p => p.type === 'NOMBRE_DISTINTO'))
        .map(c => ({ normParameter: c.normParameter, quotedAs: c.quotedAs as string, normReference: c.normLimit || '' }));
}

// Clave estable de una pareja de nombres (independiente del orden y de la matriz).
export function consultationKey(normParameter: string, quotedAs: string): string {
    return [baseName(normParameter), baseName(quotedAs)].sort().join(' | ');
}
