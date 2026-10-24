import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({
    monitoringStaff: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    user: { findMany: vi.fn() },
}));
vi.mock('@prisma/client', () => ({ PrismaClient: class { constructor() { return db as any; } } }));

import { listStaff, createStaff, updateStaff, deleteStaff } from '../src/controllers/monitoringStaff.controller';
import routes from '../src/routes/monitoringStaff.routes';
import { requireAdmin } from '../src/middleware/auth.middleware';

const res = () => {
    const r: any = { statusCode: 200, body: undefined };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: any) => { r.body = b; return r; };
    return r;
};

beforeEach(() => {
    vi.clearAllMocks();
    db.monitoringStaff.findUnique.mockResolvedValue(null);
    db.monitoringStaff.create.mockImplementation(async ({ data }: any) => ({ id: 'n1', ...data }));
    db.monitoringStaff.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
});

describe('personal de monitoreo editable', () => {
    it('lista con la cuenta de ALS de cada persona', async () => {
        db.monitoringStaff.findMany.mockResolvedValue([
            { id: '1', nombre: 'Armando', cargo: 'Ingeniero De Campo', correo: 'armandop2810@gmail.com', activo: true },
            { id: '2', nombre: 'Nuevo', cargo: 'Auxiliar de Campo', correo: 'nuevo@gmail.com', activo: true },
        ]);
        db.user.findMany.mockResolvedValue([{ email: 'armandop2810@gmail.com', isActive: true, role: 'ENGINEER' }]);
        const r = res();
        await listStaff({} as any, r);
        expect(r.body[0].cuentaAls).toEqual({ activa: true, rol: 'ENGINEER' });
        expect(r.body[1].cuentaAls).toBeNull();
    });

    it('agrega una persona con correo en minusculas', async () => {
        const r = res();
        await createStaff({ body: { nombre: ' Pepe Perez ', cargo: 'Ingeniero De Campo', correo: 'Pepe@Gmail.com' } } as any, r);
        expect(r.statusCode).toBe(201);
        expect(db.monitoringStaff.create).toHaveBeenCalledWith({ data: { nombre: 'Pepe Perez', cargo: 'Ingeniero De Campo', correo: 'pepe@gmail.com', activo: true } });
    });

    it('rechaza datos incompletos, correo invalido o repetido', async () => {
        const r1 = res(); await createStaff({ body: { nombre: '', cargo: 'X', correo: 'a@b.co' } } as any, r1);
        expect(r1.statusCode).toBe(400);
        const r2 = res(); await createStaff({ body: { nombre: 'A', cargo: 'X', correo: 'no-es-correo' } } as any, r2);
        expect(r2.statusCode).toBe(400);
        db.monitoringStaff.findUnique.mockResolvedValue({ id: 'x' });
        const r3 = res(); await createStaff({ body: { nombre: 'A', cargo: 'X', correo: 'a@b.co' } } as any, r3);
        expect(r3.statusCode).toBe(409);
    });

    it('edita cargo y activa/desactiva', async () => {
        db.monitoringStaff.findUnique.mockResolvedValueOnce({ id: '1', nombre: 'A', cargo: 'Ingeniero De Campo', correo: 'a@b.co', activo: true });
        const r = res();
        await updateStaff({ params: { id: '1' }, body: { cargo: 'Supervisor De Operaciones', activo: false } } as any, r);
        expect(db.monitoringStaff.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { cargo: 'Supervisor De Operaciones', activo: false } });
    });

    it('no deja cambiar el correo por uno de otra persona', async () => {
        db.monitoringStaff.findUnique
            .mockResolvedValueOnce({ id: '1', nombre: 'A', cargo: 'C', correo: 'a@b.co', activo: true })
            .mockResolvedValueOnce({ id: '2', correo: 'otro@b.co' });
        const r = res();
        await updateStaff({ params: { id: '1' }, body: { correo: 'otro@b.co' } } as any, r);
        expect(r.statusCode).toBe(409);
    });

    it('quita una persona; 404 si no existe', async () => {
        db.monitoringStaff.findUnique.mockResolvedValueOnce({ id: '1' });
        const r1 = res(); await deleteStaff({ params: { id: '1' } } as any, r1);
        expect(db.monitoringStaff.delete).toHaveBeenCalledWith({ where: { id: '1' } });
        const r2 = res(); await deleteStaff({ params: { id: 'x' } } as any, r2);
        expect(r2.statusCode).toBe(404);
    });

    it('todas las rutas exigen administrador', () => {
        const middlewares = (routes as any).stack.filter((l: any) => !l.route).map((l: any) => l.handle);
        expect(middlewares).toContain(requireAdmin);
    });
});
