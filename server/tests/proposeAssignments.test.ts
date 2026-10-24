import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({
    user: { findMany: vi.fn() },
    oIT: { findMany: vi.fn() },
    resource: { findMany: vi.fn() },
}));
vi.mock('@prisma/client', () => ({ PrismaClient: class { constructor() { return db as any; } } }));

import { buildAssignmentPlan, proposeAssignments } from '../src/controllers/planning.controller';

beforeEach(() => {
    vi.clearAllMocks();
    db.user.findMany.mockResolvedValue([
        { id: 'arm', name: 'Armando Pumarejo Jimenez', email: 'armandop2810@gmail.com' },
        { id: 'alv', name: 'Alvaro Audivet Castro', email: 'alvaroj.audivetc@gmail.com' },
        { id: 'jos', name: 'Josue Trespalacios Solano', email: 'josue.trespalacios@alsglobal.com' },
    ]);
    db.oIT.findMany.mockResolvedValue([
        // Alvaro ya esta el 27 en otra OIT
        { status: 'SCHEDULED', serviceDates: JSON.stringify({ x: { confirmed: true, date: '2026-10-27', engineerIds: ['alv'] } }) },
        // Una OIT cancelada no ocupa a nadie
        { status: 'CANCELLED', serviceDates: JSON.stringify({ y: { confirmed: true, date: '2026-10-27', engineerIds: ['arm'] } }) },
        // Programacion sin confirmar no cuenta
        { status: 'PENDING', serviceDates: JSON.stringify({ z: { confirmed: false, date: '2026-10-27', engineerIds: ['arm'] } }) },
    ]);
    db.resource.findMany.mockResolvedValue([{ type: 'Aguas', quantity: 2 }, { type: 'Aguas', quantity: 1 }]);
});

describe('buildAssignmentPlan (datos reales de la base, simulada)', () => {
    it('usa la ocupacion de otras OIT y deja fuera canceladas y sin confirmar', async () => {
        const r = await buildAssignmentPlan('oit-1', [{ key: 's1', name: 'Monitoreo de Agua Superficial', date: '2026-10-27' }]);
        expect(r.services[0].engineerIds).toEqual(['arm']);
        expect(r.flags).toEqual([]);
        expect(db.oIT.findMany.mock.calls[0][0].where.id).toEqual({ not: 'oit-1' });
    });

    it('sin equipos de la matriz hay bandera roja', async () => {
        const r = await buildAssignmentPlan('oit-1', [{ key: 's1', name: 'Ruido Ambiental (4 puntos)', date: '2026-10-28' }]);
        expect(r.flags).toContain('Sin equipos disponibles de Ruido para «Ruido Ambiental (4 puntos)».');
    });

    it('Josue (jefe) solo se asigna si no queda nadie de campo', async () => {
        db.oIT.findMany.mockResolvedValue([
            { status: 'SCHEDULED', serviceDates: JSON.stringify({ x: { confirmed: true, date: '2026-10-29', engineerIds: ['arm', 'alv'] } }) },
        ]);
        const r = await buildAssignmentPlan('oit-1', [{ key: 's1', name: 'Calidad de Aire', date: '2026-10-29' }]);
        expect(r.services[0].engineerIds).toEqual(['jos']);
    });
});

describe('proposeAssignments', () => {
    it('sin servicios responde 400', async () => {
        const res: any = { statusCode: 200, status(c: number) { this.statusCode = c; return this; }, json() { return this; } };
        await proposeAssignments({ params: { id: 'o' }, body: {} } as any, res);
        expect(res.statusCode).toBe(400);
    });
});
