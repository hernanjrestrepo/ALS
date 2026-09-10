import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeMatrixType(matrixType: string): string {
    return (matrixType || 'GENERAL')
        .toUpperCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'GENERAL';
}

// Formato por defecto: <MATRIZ>-<AÑO>-<NNNN> (ej. AGUA-2026-0001). El formato
// exacto lo debe confirmar Xiomara; mientras tanto queda un valor razonable
// y consistente, facil de cambiar en un solo lugar si se decide otro.
function formatConsecutive(matrixType: string, year: number, value: number): string {
    return `${matrixType}-${year}-${String(value).padStart(4, '0')}`;
}

// Devuelve el consecutivo de una OIT para una matriz dada. Si ya se asigno
// antes (por una generacion previa del informe), reutiliza el mismo numero
// en vez de sacar uno nuevo - el numero de un informe no debe cambiar cada
// vez que se regenera el documento.
export async function getOrAssignConsecutive(oitId: string, matrixType: string): Promise<string> {
    const normalized = normalizeMatrixType(matrixType);

    const existing = await prisma.reportConsecutive.findUnique({
        where: { oitId_matrixType: { oitId, matrixType: normalized } }
    });
    if (existing) return existing.consecutive;

    const year = new Date().getFullYear();
    const counterKey = `${normalized}-${year}`;

    const counter = await prisma.consecutiveCounter.upsert({
        where: { key: counterKey },
        update: { value: { increment: 1 } },
        create: { key: counterKey, value: 1 },
    });

    const consecutive = formatConsecutive(normalized, year, counter.value);

    try {
        await prisma.reportConsecutive.create({ data: { oitId, matrixType: normalized, consecutive } });
    } catch (e) {
        // Carrera rara: otra llamada concurrente ya lo creo para esta misma
        // OIT+matriz. Se usa el que quedo guardado en vez de fallar.
        const raceWinner = await prisma.reportConsecutive.findUnique({
            where: { oitId_matrixType: { oitId, matrixType: normalized } }
        });
        if (raceWinner) return raceWinner.consecutive;
        throw e;
    }

    return consecutive;
}
