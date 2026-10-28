/**
 * Marca de quien es cada resultado de laboratorio ya recibido (ALS o tercero) leyendo el
 * encabezado de su PDF, y deja el rol LAB a Sirys Gonzalez y Juan Bustamante.
 *
 * Uso (desde server/, tras compilar): node dist/scripts/classify-lab-files.js
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { pdfService } from '../services/pdf.service';
import { classifyLabText, parseGrouped } from '../services/labTracking';

const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.user.updateMany({
        where: { email: { in: ['sirys.gonzalez@alsglobal.com', 'juan.bustamante@alsglobal.com'] }, role: 'USER' },
        data: { role: 'LAB' },
    });
    console.log(`Usuarios de laboratorio con rol LAB: ${roles.count}`);

    const oits = await prisma.oIT.findMany({ where: { labResultsUrl: { not: null } }, select: { id: true, oitNumber: true, labResultsUrl: true, labFileSource: true } });
    const total: Record<string, number> = { ALS: 0, TERCERO: 0, DESCONOCIDO: 0 };
    for (const o of oits) {
        const files = Object.values(parseGrouped<string[]>(o.labResultsUrl)).flat();
        const sources: Record<string, string> = { ...(parseGrouped<string>(o.labFileSource) as any) };
        for (const f of files) {
            const p = path.join(__dirname, '../../', f);
            if (!fs.existsSync(p)) continue;
            let text = '';
            try { text = f.endsWith('.pdf') ? await pdfService.extractText(p) : fs.readFileSync(p, 'utf-8'); } catch { /* ilegible */ }
            sources[f] = classifyLabText(text);
            total[sources[f]]++;
        }
        await prisma.oIT.update({ where: { id: o.id }, data: { labFileSource: JSON.stringify(sources) } });
    }
    console.log(`OIT con resultados: ${oits.length} | archivos: ALS ${total.ALS}, tercero ${total.TERCERO}, sin identificar ${total.DESCONOCIDO}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
