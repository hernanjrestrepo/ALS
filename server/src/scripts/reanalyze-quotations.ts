/**
 * Vuelve a correr el analisis de cumplimiento de todas las cotizaciones con PDF,
 * una por una (la IA local no aguanta varias a la vez). Se usa cuando cambia el
 * motor de analisis: el resultado guardado no se recalcula solo.
 *
 * Uso (desde server/, tras compilar): node dist/scripts/reanalyze-quotations.js
 * No usar ts-node: pdf.service.ts no pasa su chequeo de tipos ('marked') y
 * todas las cotizaciones quedan con error de analisis.
 */
import { PrismaClient } from '@prisma/client';
import { runQuotationAnalysis } from '../controllers/quotation.controller';

const prisma = new PrismaClient();

function summary(q: any) {
    let score: any = '';
    let issues = 0;
    try {
        const r = JSON.parse(q.complianceResult || '{}');
        score = r.score ?? '';
        issues = Array.isArray(r.issues) ? r.issues.length : 0;
    } catch { /* resultado no-JSON: se muestra vacio */ }
    return `${q.quotationNumber} | ${q.status} | aprobada=${q.approvedForOit} | score=${score} | hallazgos=${issues}`;
}

async function main() {
    const quotations = await prisma.quotation.findMany({
        where: { fileUrl: { not: null } },
        orderBy: { createdAt: 'asc' },
    });
    console.log(`Cotizaciones con PDF: ${quotations.length}`);

    for (const q of quotations) {
        console.log(`\nANTES:   ${summary(q)}`);
        await prisma.quotation.update({ where: { id: q.id }, data: { status: 'ANALYZING' } });
        const started = Date.now();
        await runQuotationAnalysis(q.id, q.fileUrl as string);
        const after = await prisma.quotation.findUnique({ where: { id: q.id } });
        console.log(`DESPUES: ${summary(after)} (${Math.round((Date.now() - started) / 1000)} s)`);
    }
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(async () => { await prisma.$disconnect(); process.exit(); });
