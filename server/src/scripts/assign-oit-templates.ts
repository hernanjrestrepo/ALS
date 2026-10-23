/**
 * Asigna plantillas de muestreo a las OIT ya cargadas a partir de sus servicios (las
 * nuevas lo hacen solas al analizarse). No toca las OIT que ya tienen plantillas
 * elegidas. Sin IA: reglas fijas sobre el nombre del servicio.
 *
 * Uso (desde server/, tras compilar): node dist/scripts/assign-oit-templates.js
 */
import { PrismaClient } from '@prisma/client';
import { autoAssignTemplates } from '../services/templateAssignment';

const prisma = new PrismaClient();

async function main() {
    const oits = await prisma.oIT.findMany({ where: { aiData: { not: null } }, select: { id: true, oitNumber: true } });
    let assigned = 0;
    for (const o of oits) {
        if ((await autoAssignTemplates(o.id)).length) assigned++;
    }
    const withTemplates = await prisma.oIT.count({ where: { AND: [{ selectedTemplateIds: { not: null } }, { selectedTemplateIds: { not: '[]' } }] } });
    console.log(`OIT revisadas: ${oits.length} | con plantillas asignadas ahora: ${assigned} | total con plantillas: ${withTemplates}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
