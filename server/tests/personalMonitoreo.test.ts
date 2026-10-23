import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({ user: { findMany: vi.fn() } }));
vi.mock('@prisma/client', () => ({
    PrismaClient: class { constructor() { return db as any; } },
}));

import { getEngineers } from '../src/controllers/user.controller';
import { PERSONAL_MONITOREO, CORREOS_MONITOREO } from '../src/data/personal-monitoreo';

const res = () => {
    const r: any = { body: undefined, status() { return r; }, json(b: any) { r.body = b; return r; } };
    return r;
};

beforeEach(() => {
    vi.clearAllMocks();
    db.user.findMany.mockResolvedValue([]);
});

describe('personal de monitoreo para asignar OIT', () => {
    it('la lista tiene solo el personal de Operaciones con correo ALS o registrado', () => {
        expect(PERSONAL_MONITOREO).toHaveLength(20);
        expect(CORREOS_MONITOREO.has('eduardo.ibarra@alsglobal.com')).toBe(true);
        expect(CORREOS_MONITOREO.has('ingeniero.campo10@alsglobal.com')).toBe(true);
        // Fuera de monitoreo (Comercial, Laboratorio, Direccion Tecnica, super admin)
        expect(CORREOS_MONITOREO.has('ana.melendez@alsglobal.com')).toBe(false);
        expect(CORREOS_MONITOREO.has('ceo@paradixe.xyz')).toBe(false);
        expect(CORREOS_MONITOREO.has('ana.blanco@alsglobal.com')).toBe(false);
    });

    it('el selector consulta solo esos correos', async () => {
        await getEngineers({} as any, res());
        const where = db.user.findMany.mock.calls[0][0].where;
        expect(where.email.in.sort()).toEqual([...CORREOS_MONITOREO].sort());
        expect(where.role.in).toEqual(['ENGINEER', 'ADMIN', 'SUPER_ADMIN']);
    });

    it('devuelve lo que trae la base (ya filtrado) sin mas cambios', async () => {
        db.user.findMany.mockResolvedValue([{ id: '1', email: 'eduardo.ibarra@alsglobal.com', name: 'Eduardo Ibarra', role: 'ENGINEER', assignedOITs: [] }]);
        const r = res();
        await getEngineers({} as any, r);
        expect(r.body).toHaveLength(1);
        expect(r.body[0].email).toBe('eduardo.ibarra@alsglobal.com');
    });
});
