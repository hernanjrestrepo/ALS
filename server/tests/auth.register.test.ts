import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const count = vi.fn();
const findUnique = vi.fn();
const create = vi.fn();

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        user = {
            count: (...a: unknown[]) => count(...a),
            findUnique: (...a: unknown[]) => findUnique(...a),
            create: (...a: unknown[]) => create(...a),
        };
    }
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() } }));

import { register } from '../src/controllers/auth.controller';

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
};
const req = (body: object) => ({ body } as Request);

describe('register (registro publico cerrado)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.JWT_SECRET = 'secreto-solo-para-pruebas';
    });

    it('rechaza con 403 y no crea nada cuando ya existen usuarios', async () => {
        count.mockResolvedValue(40);
        const res = mockRes();
        await register(req({ email: 'intruso@example.com', password: 'x12345', name: 'X' }), res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(create).not.toHaveBeenCalled();
    });

    it('permite crear el primer usuario de una instalacion nueva como SUPER_ADMIN', async () => {
        count.mockResolvedValue(0);
        findUnique.mockResolvedValue(null);
        create.mockResolvedValue({ id: '1', email: 'admin@example.com', name: 'admin', role: 'SUPER_ADMIN' });
        const res = mockRes();
        await register(req({ email: 'Admin@Example.com', password: 'x12345' }), res);
        expect(create).toHaveBeenCalledTimes(1);
        expect((create.mock.calls[0][0] as any).data.role).toBe('SUPER_ADMIN');
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
