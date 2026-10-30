import { PrismaClient } from '@prisma/client';
import { extractQuotationNumber } from './quotationCompliance';
import { syncClientFromOitText } from './clientSync';

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

// Cliente impreso en la OIT de Serambiente ("INFORMACIÓN BÁSICA DEL CLIENTE / NOMBRE
// EMPRESA:GREMCA ... / NIT:860031768-0"). El calendario mostraba "Sin Cliente" en todas
// las OIT porque el nombre solo existia dentro de la descripcion de la IA (2026-10-23).
// "INFORME A NOMBRE DE:" dice a nombre de quien sale el informe (reunion del 2026-10-23,
// Josue: "que cuando venga aprobado siempre se jale a nombre de quien va el informe").
// Puede venir vacio; entonces se usa el cliente.
export function extractOitClient(text: string): { name: string | null; nit: string | null; reportTo: string | null } {
    const name = /NOMBRE\s+EMPRESA\s*:\s*([^\n]+)/i.exec(text || '')?.[1]?.trim() || null;
    const nit = /\bNIT\s*:\s*([0-9][0-9.\s-]*[0-9])/i.exec(text || '')?.[1]?.replace(/\s/g, '') || null;
    const reportTo = /INFORME\s+A\s+NOMBRE\s+DE\s*:[ \t]*([^\n]*)/i.exec(text || '')?.[1]?.trim() || null;
    return {
        name: name && name.length >= 2 ? name.slice(0, 200) : null,
        nit,
        reportTo: reportTo && reportTo.length >= 2 && !/:\s*$/.test(reportTo) ? reportTo.slice(0, 200) : null,
    };
}

// Guarda el cliente de la OIT si el documento lo trae.
export async function saveOitClientFromText(oitId: string, text: string) {
    const { name, nit, reportTo } = extractOitClient(text);
    if (!name && !nit && !reportTo) return;
    await prisma.oIT.update({ where: { id: oitId }, data: { clientName: name || undefined, clientNit: nit || undefined, reportTo: reportTo || undefined } });
    // El cliente queda tambien en el modulo Clientes (crea o completa, sin pisar lo escrito a mano).
    await syncClientFromOitText(text);
}

// Lee el SIACOT del texto de la OIT, lo guarda y vincula si la cotizacion ya esta en
// Xmart. Nunca reemplaza un vinculo que alguien puso a mano.
export async function linkOitFromText(oitId: string, text: string): Promise<string | null> {
    await saveOitClientFromText(oitId, text);
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
