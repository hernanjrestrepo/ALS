
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUGGING ENGINEER OIT VISIBILITY ---');

    // 1. List all Engineers
    const engineers = await prisma.user.findMany({
        where: { role: 'ENGINEER' },
        select: { id: true, name: true, email: true, role: true }
    });
    console.log('\n1. Engineers found:', engineers.length);
    engineers.forEach(e => console.log(`   - [${e.id}] ${e.name} (${e.email}) Role: ${e.role}`));

    // 2. List all Assignments
    const assignments = await prisma.oITAssignment.findMany({
        include: {
            user: { select: { name: true } },
            oit: { select: { oitNumber: true } }
        }
    });
    console.log('\n2. Total Assignments:', assignments.length);
    assignments.forEach(a => console.log(`   - OIT: ${a.oit.oitNumber} assigned to ${a.user.name} (${a.userId})`));

    // 3. Check for users with wrong role casing
    const weirdUsers = await prisma.user.findMany({
        where: {
            role: { not: 'ENGINEER' },
            // Simple check for case sensitivity issues manually visually
        },
        select: { id: true, name: true, role: true }
    });
    const potentialEngineers = weirdUsers.filter(u => u.role.toUpperCase() === 'ENGINEER');
    if (potentialEngineers.length > 0) {
        console.log('\n3. WARNING: Users with incorrect role casing:', potentialEngineers);
    } else {
        console.log('\n3. No users with incorrect role casing found.');
    }

    // 4. Check OITs visible to the first engineer (if any)
    if (engineers.length > 0) {
        const testEngV = engineers[0];
        console.log(`\n4. Simulating query for Engineer: ${testEngV.name} (${testEngV.id})`);
        const whereClause = {
            assignedEngineers: {
                some: {
                    userId: testEngV.id
                }
            }
        };

        const visibleOITs = await prisma.oIT.count({ where: whereClause });
        console.log(`   - Visible OITs count: ${visibleOITs}`);
    }

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
