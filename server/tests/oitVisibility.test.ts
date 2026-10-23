import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({
    oIT: { findMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock('@prisma/client', () => ({
    PrismaClient: class { constructor() { return new Proxy(db as any, { get: (t, k) => t[k] ?? new Proxy({}, { get: () => vi.fn() }) }); } },
}));

import { getAllOITs, getOITById } from '../src/controllers/oit.controller';
import { supervisaOperaciones } from '../src/data/personal-monitoreo';

const res = () => {
    const r: any = { statusCode: 200, body: undefined };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: any) => { r.body = b; return r; };
    return r;
};

beforeEach(() => {
    vi.clearAllMocks();
    db.oIT.findMany.mockResolvedValue([]);
});

describe('jefes y supervisores de Operaciones ven todas las OIT', () => {
    it('quien supervisa segun su cargo en el listado', () => {
        expect(supervisaOperaciones('josue.trespalacios@alsglobal.com')).toBe(true);  // Jefe De Operaciones
        expect(supervisaOperaciones('jesus.delahoz@alsglobal.com')).toBe(true);       // Supervisor De Operaciones
        expect(supervisaOperaciones('ivan.barrera@alsglobal.com')).toBe(true);        // Coordinador De Proyectos
        expect(supervisaOperaciones('raul.calderon@alsglobal.com')).toBe(true);       // Planeador De Operaciones
        expect(supervisaOperaciones('armandop2810@gmail.com')).toBe(false);           // Ingeniero De Campo
        expect(supervisaOperaciones('juan.garcia@alsglobal.com')).toBe(false);        // Biologo Senior Consultor
        expect(supervisaOperaciones(undefined)).toBe(false);
    });

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
});
