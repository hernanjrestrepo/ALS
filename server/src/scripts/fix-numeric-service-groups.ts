/**
 * Renombra los grupos numericos ("1") de los resultados de laboratorio ya recibidos
 * al nombre del servicio de la OIT, para que el informe encuentre plantilla y datos.
 * Solo cambia la clave; no regenera informes ni toca otros datos.
 *
 * Uso (desde server/, tras compilar): node dist/scripts/fix-numeric-service-groups.js
 */
import { PrismaClient } from '@prisma/client';
import { serviceGroupName } from '../controllers/oit.controller';

const prisma = new PrismaClient();

function renameKeys(raw: string | null, aiData: string | null): { json: string; changed: string[] } | null {
    if (!raw) return null;
    let obj: any;
    try { obj = JSON.parse(raw); } catch { return null; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const changed: string[] = [];
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        const name = serviceGroupName(aiData, k);
        if (name !== k && !(name in obj)) {
            out[name] = Array.isArray(v) && Array.isArray(out[name]) ? [...out[name], ...v] : v;
            changed.push(`${k} -> ${name}`);
        } else out[k] = v;
    }
    return changed.length ? { json: JSON.stringify(out), changed } : null;
}

async function main() {
    const oits = await prisma.oIT.findMany({ select: { id: true, oitNumber: true, aiData: true, labResultsAnalysis: true, labResultsUrl: true, samplingSheetAnalysis: true } });
    let fixed = 0;
    for (const o of oits) {
        const data: any = {};
        const notes: string[] = [];
        for (const field of ['labResultsAnalysis', 'labResultsUrl', 'samplingSheetAnalysis'] as const) {
            const r = renameKeys(o[field], o.aiData);
            if (r) { data[field] = r.json; notes.push(`${field}: ${r.changed.join(', ')}`); }
        }
        if (Object.keys(data).length) {
            await prisma.oIT.update({ where: { id: o.id }, data });
            fixed++;
            console.log(`OIT ${o.oitNumber}: ${notes.join(' | ')}`);
        }
    }
    console.log(`OIT revisadas: ${oits.length} | corregidas: ${fixed}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
