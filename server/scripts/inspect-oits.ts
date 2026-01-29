import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:../prisma/dev.db',
        },
    },
});

async function main() {
    console.log('--- INSPECTING OIT DATA ---');
    const oitCount = await prisma.oIT.count();
    console.log(`Total OITs in DB: ${oitCount}`);

    const oits = await prisma.oIT.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    if (oits.length === 0) {
        console.log('No OITs found in the database table.');
    } else {
        oits.forEach(oit => {
            console.log(`\nOIT: ${oit.oitNumber} [ID: ${oit.id}]`);
            console.log(`- Status: ${oit.status}`);
            console.log(`- serviceDates: ${oit.serviceDates}`);
            console.log(`- planningProposal exists: ${!!oit.planningProposal}`);
        });
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
