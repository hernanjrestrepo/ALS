/**
 * Vincula con su cotizacion las OIT que nacieron de un resultado de laboratorio (sin PDF ni numero
 * de cotizacion), usando la empresa y el tipo de muestra del resultado. Las nuevas lo hacen solas.
 * No reemplaza vinculos existentes y no vincula si hay mas de una cotizacion posible. Sin IA.
 *
 * Uso (desde server/, tras compilar): node dist/scripts/link-oits-by-company.js
 */
import { PrismaClient } from '@prisma/client';
import { autoLinkOit } from '../services/oitAutoLink';

const prisma = new PrismaClient();

async function main() {
    const oits = await prisma.oIT.findMany({
        where: { quotationId: null, OR: [{ quotationRef: null }, { quotationRef: '' }], labResultsUrl: { not: null } },
        select: { id: true, oitNumber: true },
        orderBy: { createdAt: 'asc' },
    });
    const tally: Record<string, number> = {};
    for (const o of oits) {
        const r = await autoLinkOit(o.id, undefined, prisma);
        tally[r.status] = (tally[r.status] || 0) + 1;
        if (r.status === 'vinculada') console.log(`  ${o.oitNumber} -> ${r.quotationNumber}`);
        if (r.status === 'ambigua') console.log(`  ${o.oitNumber}: varias posibles (${r.candidatas.join(', ')})`);
    }
    console.log(`OIT sin vinculo con resultado de laboratorio: ${oits.length}`, JSON.stringify(tally));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
