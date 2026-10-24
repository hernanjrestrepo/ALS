import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PERSONAL_MONITOREO } from '../src/data/personal-monitoreo';

const staff = PERSONAL_MONITOREO.map((p, i) => ({ id: `s${i}`, nombre: p.nombre, cargo: p.cargo, correo: p.correo.toLowerCase(), activo: true }));
const db = vi.hoisted(() => ({
    oIT: { findMany: vi.fn(), findUnique: vi.fn() },
    monitoringStaff: { findMany: vi.fn() },
}));
vi.mock('@prisma/client', () => ({
    PrismaClient: class { constructor() { return new Proxy(db as any, { get: (t, k) => t[k] ?? new Proxy({}, { get: () => vi.fn() }) }); } },
}));

import { getAllOITs, getOITById } from '../src/controllers/oit.controller';
import { invalidateStaffCache } from '../src/services/monitoringStaff';

const res = () => {
    const r: any = { statusCode: 200, body: undefined };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: any) => { r.body = b; return r; };
    return r;
};

beforeEach(() => {
    vi.clearAllMocks();
    invalidateStaffCache();
    db.oIT.findMany.mockResolvedValue([]);
    db.monitoringStaff.findMany.mockResolvedValue(staff);
});

describe('jefes y supervisores de Operaciones ven todas las OIT', () => {
    it('Josue (rol ingeniero, jefe de Operaciones) lista todas las OIT', async () => {
        await getAllOITs({ user: { userId: 'j', role: 'ENGINEER', email: 'josue.trespalacios@alsglobal.com' }, query: {} } as any, res());
        const where = db.oIT.findMany.mock.calls[0][0].where;
        expect(JSON.stringify(where || {})).not.toContain('assignedEngineers');
    });

    it('un ingeniero de campo solo lista las suyas', async () => {
        await getAllOITs({ user: { userId: 'a', role: 'ENGINEER', email: 'armandop2810@gmail.com' }, query: {} } as any, res());
        const where = db.oIT.findMany.mock.calls[0][0].where;
        expect(JSON.stringify(where)).toContain('assignedEngineers');
    });

    it('Josue abre una OIT a la que no esta asignado; un ingeniero de campo no', async () => {
        db.oIT.findUnique.mockResolvedValue({ id: 'o1', assignedEngineers: [] });
        const r1 = res();
        await getOITById({ params: { id: 'o1' }, user: { userId: 'j', role: 'ENGINEER', email: 'josue.trespalacios@alsglobal.com' } } as any, r1);
        expect(r1.statusCode).toBe(200);
        const r2 = res();
        await getOITById({ params: { id: 'o1' }, user: { userId: 'a', role: 'ENGINEER', email: 'armandop2810@gmail.com' } } as any, r2);
        expect(r2.statusCode).toBe(403);
    });

    it('si se cambia el cargo en la tabla a supervisor, ya ve todas', async () => {
        db.monitoringStaff.findMany.mockResolvedValue(staff.map(s => s.correo === 'armandop2810@gmail.com' ? { ...s, cargo: 'Supervisor De Operaciones' } : s));
        await getAllOITs({ user: { userId: 'a', role: 'ENGINEER', email: 'armandop2810@gmail.com' }, query: {} } as any, res());
        expect(JSON.stringify(db.oIT.findMany.mock.calls[0][0].where || {})).not.toContain('assignedEngineers');
    });
});
