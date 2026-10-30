/**
 * Llena el modulo Clientes con la ficha de cliente de cada OIT ya cargada (las OIT nuevas lo
 * hacen solas). Crea los que faltan y completa campos vacios; no pisa lo escrito a mano.
 * No usa la IA: solo lee el texto del PDF.
 *
 * Uso (desde server/, tras compilar): node dist/scripts/sync-clients-from-oits.js
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { pdfService } from '../services/pdf.service';
import { extractClientCard, upsertClientFromCard } from '../services/clientSync';

const prisma = new PrismaClient();

async function main() {
    const before = await prisma.client.count();
    const oits = await prisma.oIT.findMany({ where: { oitFileUrl: { not: null } }, select: { oitNumber: true, oitFileUrl: true }, orderBy: { createdAt: 'asc' } });
    const tally: Record<string, number> = {};
    for (const o of oits) {
        const file = path.join(__dirname, '../../uploads', path.basename(o.oitFileUrl as string));
        if (!fs.existsSync(file) || !/\.pdf$/i.test(file)) { tally.sin_pdf = (tally.sin_pdf || 0) + 1; continue; }
        try {
            const r = await upsertClientFromCard(extractClientCard(await pdfService.extractText(file)), prisma);
            tally[r] = (tally[r] || 0) + 1;
        } catch (e) {
            tally.error = (tally.error || 0) + 1;
            console.error(`OIT ${o.oitNumber}:`, (e as Error).message);
        }
    }
    console.log(`OIT revisadas: ${oits.length}`, JSON.stringify(tally));
    console.log(`Clientes antes: ${before} | ahora: ${await prisma.client.count()}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
