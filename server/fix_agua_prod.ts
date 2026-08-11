import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    // 1. Find the Agua templates
    const aguaTemplates = await prisma.samplingTemplate.findMany({
        where: {
            OR: [
                { oitType: { contains: 'AGUA' } },
                { name: { contains: 'AGUA' } }
            ]
        }
    });
    
    console.log('--- Agua Templates ---');
    for (const t of aguaTemplates) {
        console.log(`[${t.oitType}] ${t.name} -> ${t.reportTemplateFile}`);
        
        // Let's set the correct report template if missing
            await prisma.samplingTemplate.update({
                where: { id: t.id },
                data: { reportTemplateFile: 'FO-PO-PSM-64-10 FORMATO PARA LA ELABORACIÓN DE INFORME PUNTO SECO-plantilla.docx' }
            });
            console.log(`UPDATED ${t.name} with template file`);
        }
    }

    // 2. Identify the OIT that the user is working on. It's likely the latest one.
    const latestOIT = await prisma.oIT.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (latestOIT) {
        console.log('--- Latest OIT ---');
        console.log(latestOIT.id, latestOIT.oitNumber);
        
        // Clear labResultsAnalysis to force regeneration
        if (latestOIT.labResultsAnalysis && latestOIT.labResultsAnalysis.includes('General')) {
            console.log('Found lab analysis:', Object.keys(JSON.parse(latestOIT.labResultsAnalysis)));
            
            // Delete the analysis for 'SERVICIO 1 - AGUAS' to let them regenerate
            const parsed = JSON.parse(latestOIT.labResultsAnalysis);
            if (parsed['SERVICIO 1 - AGUAS']) {
                delete parsed['SERVICIO 1 - AGUAS'];
                await prisma.oIT.update({
                    where: { id: latestOIT.id },
                    data: { labResultsAnalysis: JSON.stringify(parsed) }
                });
                console.log('Cleared lab analysis for SERVICIO 1 - AGUAS');
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
