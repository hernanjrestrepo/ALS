
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔒 Creating Super Admin...');

    const email = process.env.ADMIN_EMAIL || 'superadmin@paradixe.com';
    const password = process.env.ADMIN_PASSWORD;

    if (!password || password.length < 12) {
        throw new Error('ADMIN_PASSWORD debe estar definido con al menos 12 caracteres');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            name: 'Super Admin Paradixe'
        },
        create: {
            email,
            name: 'Super Admin Paradixe',
            password: hashedPassword,
            role: 'SUPER_ADMIN'
        }
    });

    console.log('✅ Super Admin created/updated successfully.');
    console.log('-------------------------------------------');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('-------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
