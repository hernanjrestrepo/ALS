import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const oits = await prisma.oIT.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            oitNumber: true,
            status: true,
            createdAt: true,
            quotation: {
                select: {
                    clientName: true
                }
            }
        }
    });

    console.log(JSON.stringify(oits, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
