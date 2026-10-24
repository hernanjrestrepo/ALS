/**
 * Carga la lista inicial de personal de monitoreo (Listado de personal Operaciones
 * 14.09.26) en la tabla MonitoringStaff, solo si esta vacia. Despues se edita en la
 * pantalla "Personal de monitoreo".
 * Uso (desde server/, tras compilar): node dist/scripts/seed-monitoring-staff.js
 */
import { PrismaClient } from '@prisma/client';
import { PERSONAL_MONITOREO } from '../data/personal-monitoreo';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.monitoringStaff.count();
    if (count > 0) {
        console.log(`La tabla ya tiene ${count} personas; no se cambia nada.`);
        return;
    }
    for (const p of PERSONAL_MONITOREO) {
        await prisma.monitoringStaff.create({ data: { nombre: p.nombre, cargo: p.cargo, correo: p.correo.toLowerCase(), activo: true } });
    }
    console.log(`Cargadas ${PERSONAL_MONITOREO.length} personas.`);
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
