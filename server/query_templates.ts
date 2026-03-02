import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const templates = await prisma.samplingTemplate.findMany();
    for (const t of templates) {
        console.log(`[${t.oitType}] ${t.name}: ${t.reportTemplateFile}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
