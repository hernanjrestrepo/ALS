import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const latestOIT = await prisma.oIT.findFirst({ orderBy: { createdAt: 'desc' } });
    console.log('OIT:', latestOIT?.oitNumber);
    console.log('labResultsUrl:', latestOIT?.labResultsUrl);
}
main().catch(console.error).finally(() => prisma.$disconnect());
