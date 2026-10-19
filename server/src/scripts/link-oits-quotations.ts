/**
 * Lee el numero SIACOT del PDF de cada OIT ya cargada y la vincula a su cotizacion
 * si esta en Xmart (las OIT nuevas lo hacen solas al analizarse). No toca vinculos
 * puestos a mano. No usa la IA: solo lee el texto del PDF.
 *
 * Uso (desde server/, tras compilar): node dist/scripts/link-oits-quotations.js
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { pdfService } from '../services/pdf.service';
import { linkOitFromText } from '../services/quotationLink';

const prisma = new PrismaClient();

async function main() {
    const oits = await prisma.oIT.findMany({ where: { oitFileUrl: { not: null } }, select: { id: true, oitNumber: true, oitFileUrl: true } });
    let withRef = 0;
    let missingFile = 0;
    for (const o of oits) {
        const file = path.join(__dirname, '../../uploads', path.basename(o.oitFileUrl as string));
        if (!fs.existsSync(file) || !/\.pdf$/i.test(file)) { missingFile++; continue; }
        try {
            const ref = await linkOitFromText(o.id, await pdfService.extractText(file));
            if (ref) withRef++;
        } catch (e) {
            console.error(`OIT ${o.oitNumber}: no se pudo leer`, (e as Error).message);
        }
    }
    const linked = await prisma.oIT.findMany({ where: { quotationId: { not: null } }, select: { oitNumber: true, quotation: { select: { quotationNumber: true } } } });
    console.log(`OIT revisadas: ${oits.length} | con numero de cotizacion en el PDF: ${withRef} | sin PDF local: ${missingFile}`);
    console.log(`OIT vinculadas a una cotizacion de Xmart: ${linked.length}`);
    linked.forEach(l => console.log(`  ${l.oitNumber} -> ${l.quotation?.quotationNumber}`));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
