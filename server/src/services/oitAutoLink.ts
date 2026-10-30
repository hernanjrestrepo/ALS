/**
 * Vinculo automatico de OIT sin PDF con su cotizacion (Hernan, 2026-10-30: SIACOT-20741 "no se
 * vinculo automaticamente, toco vincularla manualmente. Esto no es aceptable").
 *
 * Por que fallaba: el vinculo se hace leyendo el numero SIACOT del PDF de la OIT. Pero muchas OIT
 * nacen del resultado de laboratorio (Serambiente manda el resultado antes que el PDF de la OIT, o
 * nunca lo manda: 66 de 247 OIT estaban asi), y esas no traen numero de cotizacion.
 *
 * Que se hace ahora: el resultado de laboratorio SI trae la empresa ("Empresa: COMPAS S.A.") y el
 * tipo de muestra ("AGUA POTABLE"). Con eso se busca la cotizacion de esa empresa:
 *   - si hay una sola cotizacion de la empresa sin OIT que le corresponda -> se vincula;
 *   - si hay varias, se elige la que cubre el tipo de muestra (agua potable, residual, suelo...);
 *   - si sigue habiendo mas de una, NO se vincula (un vinculo equivocado es peor que ninguno) y
 *     queda en el registro para revision.
 * Corre cuando llega un resultado de laboratorio y cuando se sube o analiza una cotizacion.
 * Nunca reemplaza un vinculo que ya existe ni uno puesto a mano. Sin IA.
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { nameKey, nitBase } from './clientSync';

const prisma = new PrismaClient();

export interface LabFacts { company: string | null; samples: string[] }

const fold = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Empresa y tipos de muestra que imprime el resultado de laboratorio. */
export function extractLabFacts(text: string): LabFacts {
    const t = String(text || '');
    const company = /Empresa\s*:\s*(.+?)\s+Ciudad\s*:/i.exec(t)?.[1]?.trim() || null;
    const samples = [...t.matchAll(/Tipo de muestra\s*:\s*(.+?)\s+Lugar de muestreo/gi)].map(m => m[1].trim()).filter(Boolean);
    return { company: company && company.length >= 2 ? company.slice(0, 200) : null, samples: [...new Set(samples)] };
}

export interface QuotationLite {
    id: string;
    quotationNumber: string;
    clientName: string | null;
    client?: { name: string; nit?: string | null } | null;
    services?: Array<{ name: string }>;
    complianceResult?: any;
    description?: string | null;
}

const quotationClientKey = (q: QuotationLite) => nameKey(q.client?.name || q.clientName || '');

/** Texto con los servicios y matrices que cubre la cotizacion (para emparejar con el tipo de muestra). */
export function quotationCoverage(q: QuotationLite): string {
    let matrix = '';
    try {
        const r = typeof q.complianceResult === 'string' ? JSON.parse(q.complianceResult) : q.complianceResult;
        matrix = String(r?.sampleMatrix || '');
    } catch { /* sin analisis todavia */ }
    return fold([...(q.services || []).map(s => s.name), matrix, q.description || ''].join(' | '));
}

// "AGUA POTABLE" cubre "Caracterizacion de Agua Potable"; "AGUAS RESIDUALES" cubre "Agua residual no domestica".
const stem = (w: string) => w.replace(/(es|s)$/, '');
function coversSample(coverage: string, sample: string): boolean {
    const words = fold(sample).split(' ').filter(w => w.length > 2).map(stem);
    return words.length > 0 && words.every(w => coverage.includes(w));
}

export type AutoLinkResult = { status: 'vinculada'; quotationNumber: string } | { status: 'ambigua'; candidatas: string[] } | { status: 'sin_candidata' | 'sin_datos' | 'ya_vinculada' };

/** Elige la cotizacion de la empresa (y del tipo de muestra) para una OIT sin numero de cotizacion. */
export function pickByCompany(facts: LabFacts, quotations: QuotationLite[], excluded: Set<string> = new Set()): AutoLinkResult {
    if (!facts.company) return { status: 'sin_datos' };
    const key = nameKey(facts.company);
    let candidates = quotations.filter(q => !excluded.has(q.id) && quotationClientKey(q) === key);
    if (!candidates.length) return { status: 'sin_candidata' };
    // La empresa sola no basta (30-oct: la OIT 14601 de COMPAS es de AGUA MARINA y se vinculo a la cotizacion
    // SIACOT-20741, que cubre agua potable, superficial y biota). Si la cotizacion dice que matrices cubre
    // (servicios elegidos o matrices leidas en el analisis), debe cubrir el tipo de muestra de la OIT. Si
    // todavia no se sabe que cubre, se vincula por la empresa.
    if (facts.samples.length) {
        candidates = candidates.filter(q => {
            const cov = quotationCoverage(q);
            return !cov.replace(/[|\s]/g, '') || facts.samples.some(s => coversSample(cov, s));
        });
        if (!candidates.length) return { status: 'sin_candidata' };
    }
    if (candidates.length === 1) return { status: 'vinculada', quotationNumber: candidates[0].quotationNumber };
    return { status: 'ambigua', candidatas: candidates.map(q => q.quotationNumber) };
}

type Db = typeof prisma;
const defaultReadText = async (file: string) => (await import('./pdf.service')).pdfService.extractText(file);

/** Datos del laboratorio de una OIT: se leen del PDF de resultados ya guardado. */
export async function labFactsOfOit(labResultsUrl: string | null, readText: (f: string) => Promise<string> = defaultReadText): Promise<LabFacts> {
    const files: string[] = [];
    try {
        const parsed = JSON.parse(labResultsUrl || '{}');
        for (const v of Object.values(parsed)) if (Array.isArray(v)) files.push(...v.map(String));
    } catch { /* formato antiguo */ }
    const facts: LabFacts = { company: null, samples: [] };
    for (const f of files.slice(0, 6)) {
        const file = path.join(__dirname, '../../uploads', path.basename(f));
        if (!/\.pdf$/i.test(file) || !fs.existsSync(file)) continue;
        try {
            const x = extractLabFacts(await readText(file));
            facts.company ||= x.company;
            facts.samples = [...new Set([...facts.samples, ...x.samples])];
        } catch { /* un PDF ilegible no frena a los demas */ }
    }
    return facts;
}

const quotationSelect = {
    id: true, quotationNumber: true, clientName: true, description: true, complianceResult: true,
    client: { select: { name: true, nit: true } }, services: { select: { name: true } },
} as const;

/** Vincula UNA OIT (sin cotizacion ni numero de cotizacion) con la cotizacion de su empresa. */
export async function autoLinkOit(oitId: string, facts?: LabFacts, db: Db = prisma): Promise<AutoLinkResult> {
    const oit = await db.oIT.findUnique({ where: { id: oitId }, select: { id: true, oitNumber: true, quotationId: true, quotationRef: true, clientName: true, labResultsUrl: true } });
    if (!oit || oit.quotationId) return { status: 'ya_vinculada' };
    if (oit.quotationRef?.trim()) return { status: 'sin_datos' }; // tiene numero: lo vincula el flujo normal
    const f = facts && facts.company ? facts : await labFactsOfOit(oit.labResultsUrl);
    const company = f.company || oit.clientName;
    if (!company) return { status: 'sin_datos' };
    const quotations = (await db.quotation.findMany({ select: quotationSelect })) as unknown as QuotationLite[];
    const result = pickByCompany({ company, samples: f.samples }, quotations);
    if (result.status === 'vinculada') {
        const q = quotations.find(x => x.quotationNumber === result.quotationNumber)!;
        await db.oIT.update({ where: { id: oit.id }, data: { quotationId: q.id, ...(oit.clientName ? {} : { clientName: company }) } });
        console.log(`[Vinculo] OIT ${oit.oitNumber} vinculada sola a ${q.quotationNumber} (empresa ${company}${f.samples.length ? `, muestra ${f.samples.join('/')}` : ''})`);
    } else if (result.status === 'ambigua') {
        console.warn(`[Vinculo] OIT ${oit.oitNumber} (${company}): varias cotizaciones posibles (${result.candidatas.join(', ')}); no se vincula sola`);
    }
    return result;
}

/** Cuando entra o se analiza una cotizacion: busca las OIT sin vinculo de esa empresa. */
export async function autoLinkOitsForQuotation(quotationId: string, db: Db = prisma): Promise<number> {
    const q = (await db.quotation.findUnique({ where: { id: quotationId }, select: quotationSelect })) as unknown as QuotationLite | null;
    if (!q || !quotationClientKey(q)) return 0;
    const pending = await db.oIT.findMany({
        where: { quotationId: null, OR: [{ quotationRef: null }, { quotationRef: '' }], labResultsUrl: { not: null } },
        select: { id: true },
    });
    let linked = 0;
    for (const o of pending) {
        const r = await autoLinkOit(o.id, undefined, db);
        if (r.status === 'vinculada' && r.quotationNumber === q.quotationNumber) linked++;
    }
    return linked;
}

export { nitBase };
