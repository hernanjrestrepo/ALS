import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PERSONAL_MONITOREO } from '../src/data/personal-monitoreo';

// La tabla de personal (simulada) arranca con la semilla del listado de Operaciones.
const staff = PERSONAL_MONITOREO.map((p, i) => ({ id: `s${i}`, nombre: p.nombre, cargo: p.cargo, correo: p.correo.toLowerCase(), activo: true }));
const db = vi.hoisted(() => ({ user: { findMany: vi.fn() }, monitoringStaff: { findMany: vi.fn() } }));
vi.mock('@prisma/client', () => ({ PrismaClient: class { constructor() { return db as any; } } }));

import { getEngineers } from '../src/controllers/user.controller';
import { invalidateStaffCache, isSupervisor, staffEmails } from '../src/services/monitoringStaff';

const res = () => {
    const r: any = { body: undefined, status() { return r; }, json(b: any) { r.body = b; return r; } };
    return r;
};

beforeEach(() => {
    vi.clearAllMocks();
    invalidateStaffCache();
    db.user.findMany.mockResolvedValue([]);
    db.monitoringStaff.findMany.mockImplementation(async () => staff.filter(s => s.activo));
});

describe('personal de monitoreo para asignar OIT (desde la tabla)', () => {
    it('la semilla trae las 20 personas de Operaciones', () => {
        expect(PERSONAL_MONITOREO).toHaveLength(20);
    });

    it('el selector consulta solo los correos de la tabla', async () => {
        await getEngineers({} as any, res());
        const where = db.user.findMany.mock.calls[0][0].where;
        expect(where.email.in.sort()).toEqual(staff.map(s => s.correo).sort());
        expect(where.email.in).not.toContain('ana.melendez@alsglobal.com');
        expect(where.email.in).not.toContain('ceo@paradixe.xyz');
    });

    it('si alguien se desactiva en la tabla, deja de aparecer', async () => {
        staff[0].activo = false;
        invalidateStaffCache();
        expect(await staffEmails()).not.toContain(staff[0].correo);
        staff[0].activo = true;
    });

    it('supervisa segun el cargo de la tabla', async () => {
        expect(await isSupervisor('josue.trespalacios@alsglobal.com')).toBe(true);
        expect(await isSupervisor('Raul.Calderon@ALSGlobal.com')).toBe(true);
        expect(await isSupervisor('armandop2810@gmail.com')).toBe(false);
        expect(await isSupervisor(undefined)).toBe(false);
    });

    it('la tabla se consulta una vez y se reutiliza (cache)', async () => {
        await staffEmails(); await staffEmails(); await isSupervisor('x@y.com');
        expect(db.monitoringStaff.findMany).toHaveBeenCalledTimes(1);
    });
});
