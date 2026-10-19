import { PrismaClient } from '@prisma/client';
import { extractQuotationNumber } from './quotationCompliance';

// Vinculo automatico OIT <-> cotizacion (Hernan, 2026-10-19): la OIT se crea en el
// Sistema Serambiente con el numero de la cotizacion, y ese numero viene impreso en el
// PDF de la OIT. Antes el vinculo solo se hacia a mano y 1 de 153 OIT estaba vinculada,
// aunque 96 traian el SIACOT en el documento.

const prisma = new PrismaClient();

// SIACOT-20466-07-2026_V1 -> SIACOT-20466-07-2026 (la OIT puede citar otra version).
export function baseQuotationNumber(n: string): string {
    return n.trim().toUpperCase().replace(/_V\d+$/i, '');
}

const versionOf = (n: string) => Number(/_V(\d+)$/i.exec(n)?.[1] || 0);

// La cotizacion exacta; si no esta, la version mas reciente del mismo numero.
export function pickQuotation<T extends { quotationNumber: string }>(ref: string, candidates: T[]): T | null {
    const exact = candidates.find(q => q.quotationNumber.toUpperCase() === ref.toUpperCase());
    if (exact) return exact;
    const base = baseQuotationNumber(ref);
    const same = candidates.filter(q => baseQuotationNumber(q.quotationNumber) === base);
    return same.sort((a, b) => versionOf(b.quotationNumber) - versionOf(a.quotationNumber))[0] || null;
}

// Lee el SIACOT del texto de la OIT, lo guarda y vincula si la cotizacion ya esta en
// Xmart. Nunca reemplaza un vinculo que alguien puso a mano.
export async function linkOitFromText(oitId: string, text: string): Promise<string | null> {
    const ref = extractQuotationNumber(text || '');
    if (!ref) return null;
    const oit = await prisma.oIT.findUnique({ where: { id: oitId }, select: { quotationId: true } });
    if (!oit) return null;
    let quotationId = oit.quotationId;
    if (!quotationId) {
        const candidates = await prisma.quotation.findMany({
            where: { quotationNumber: { startsWith: baseQuotationNumber(ref), mode: 'insensitive' } },
            select: { id: true, quotationNumber: true },
        });
        quotationId = pickQuotation(ref, candidates)?.id || null;
    }
    await prisma.oIT.update({ where: { id: oitId }, data: { quotationRef: ref, quotationId: quotationId || undefined } });
    if (quotationId && !oit.quotationId) console.log(`[Vinculo] OIT ${oitId} vinculada a la cotizacion ${ref}`);
    return ref;
}

// Al cargar (o renumerar) una cotizacion: vincula las OIT que ya la citaban.
export async function linkOitsToQuotation(quotation: { id: string; quotationNumber: string }): Promise<number> {
    if (!/^SIACOT-/i.test(quotation.quotationNumber)) return 0;
    const base = baseQuotationNumber(quotation.quotationNumber);
    const oits = await prisma.oIT.findMany({
        where: { quotationId: null, quotationRef: { startsWith: base, mode: 'insensitive' } },
        select: { id: true, quotationRef: true },
    });
    const siblings = await prisma.quotation.findMany({
        where: { quotationNumber: { startsWith: base, mode: 'insensitive' } },
        select: { id: true, quotationNumber: true },
    });
    let linked = 0;
    for (const o of oits) {
        if (pickQuotation(o.quotationRef as string, siblings)?.id !== quotation.id) continue;
        await prisma.oIT.update({ where: { id: o.id }, data: { quotationId: quotation.id } });
        linked++;
    }
    if (linked) console.log(`[Vinculo] ${linked} OIT vinculada(s) a la cotizacion ${quotation.quotationNumber}`);
    return linked;
}
