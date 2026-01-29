import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING OIT ASSIGNMENT SYNC ---');

    // 1. Get all OITs with serviceDates
    const oits = await prisma.oIT.findMany({
        where: {
            serviceDates: { not: null }
        },
        select: {
            id: true,
            oitNumber: true,
            serviceDates: true
        }
    });

    console.log(`Found ${oits.length} OITs with service dates.`);

    for (const oit of oits) {
        if (!oit.serviceDates) continue;

        try {
            const serviceDates = JSON.parse(oit.serviceDates as string);
            const engineerIds = new Set<string>();

            // Extract IDs from all services
            Object.values(serviceDates).forEach((schedule: any) => {
                if (schedule.engineerIds && Array.isArray(schedule.engineerIds)) {
                    schedule.engineerIds.forEach((eid: string) => engineerIds.add(eid));
                }
            });

            const uniqueIds = Array.from(engineerIds);

            if (uniqueIds.length > 0) {
                console.log(`Syncing ${uniqueIds.length} engineers for OIT ${oit.oitNumber}...`);

                // Use transaction to ensure consistency
                await prisma.$transaction(async (tx) => {
                    // Remove existing to avoid duplicates (safest way to sync)
                    await tx.oITAssignment.deleteMany({
                        where: { oitId: oit.id }
                    });

                    // Create new assignments
                    await tx.oITAssignment.createMany({
                        data: uniqueIds.map(userId => ({
                            oitId: oit.id,
                            userId
                        }))
                    });
                });
            }
        } catch (err) {
            console.error(`Error processing OIT ${oit.oitNumber}:`, err);
        }
    }

    console.log('--- SYNC COMPLETED ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
