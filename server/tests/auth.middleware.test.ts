import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const verify = vi.fn();
const findUnique = vi.fn();

vi.mock('jsonwebtoken', () => ({
    default: { verify: (...args: unknown[]) => verify(...args) }
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        user = { findUnique: (...args: unknown[]) => findUnique(...args) };
    }
}));

import {
    authMiddleware,
    requireRole,
    requireAdmin,
    requireEngineer,
    requireSuperAdmin,
    AuthenticatedRequest
} from '../src/middleware/auth.middleware';

function mockRes() {
    const res = {
        statusCode: 0,
        payload: undefined as any,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(body: any) {
            this.payload = body;
            return this;
        }
    };
    return res as unknown as Response & { statusCode: number; payload: any };
}

const TEST_SECRET = 'x'.repeat(48);

beforeEach(() => {
    verify.mockReset();
    findUnique.mockReset();
    vi.stubEnv('JWT_SECRET', TEST_SECRET);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('authMiddleware', () => {
    it('attaches the user and continues for a valid bearer token', async () => {
        verify.mockReturnValue({ userId: 'u1' });
        findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN' });

        const req = { headers: { authorization: 'Bearer good-token' } } as Request;
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        await authMiddleware(req, res, next);

        expect(verify).toHaveBeenCalledWith('good-token', TEST_SECRET);
        expect((req as AuthenticatedRequest).user).toEqual({ userId: 'u1', role: 'ADMIN' });
        expect(next).toHaveBeenCalledOnce();
    });

    it('uses the configured JWT secret', async () => {
        const otherSecret = 'y'.repeat(48);
        vi.stubEnv('JWT_SECRET', otherSecret);
        verify.mockReturnValue({ userId: 'u1' });
        findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN' });

        await authMiddleware({ headers: { authorization: 'Bearer t' } } as Request, mockRes(), vi.fn());

        expect(verify).toHaveBeenCalledWith('t', otherSecret);
    });

    it('rejects the request when JWT_SECRET is missing or weak', async () => {
        vi.stubEnv('JWT_SECRET', 'secret');
        const res = mockRes();
        const next = vi.fn();

        await authMiddleware({ headers: { authorization: 'Bearer t' } } as Request, res, next as unknown as NextFunction);

        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
        expect(verify).not.toHaveBeenCalled();
    });

    it('rejects a request without an authorization header', async () => {
        const res = mockRes();
        const next = vi.fn();

        await authMiddleware({ headers: {} } as Request, res, next as unknown as NextFunction);

        expect(res.statusCode).toBe(401);
        expect(res.payload).toEqual({ error: 'No autorizado' });
        expect(next).not.toHaveBeenCalled();
        expect(verify).not.toHaveBeenCalled();
    });

    it('rejects a token whose user no longer exists', async () => {
        verify.mockReturnValue({ userId: 'ghost' });
        findUnique.mockResolvedValue(null);
        const res = mockRes();

        await authMiddleware({ headers: { authorization: 'Bearer t' } } as Request, res, vi.fn());

        expect(res.statusCode).toBe(401);
        expect(res.payload).toEqual({ error: 'Usuario no encontrado' });
    });

    it('rejects a token that fails verification', async () => {
        verify.mockImplementation(() => {
            throw new Error('jwt malformed');
        });
        const res = mockRes();

        await authMiddleware({ headers: { authorization: 'Bearer bad' } } as Request, res, vi.fn());

        expect(res.statusCode).toBe(401);
        expect(res.payload).toEqual({ error: 'Token inválido' });
    });

    it('rejects when the database lookup fails', async () => {
        verify.mockReturnValue({ userId: 'u1' });
        findUnique.mockRejectedValue(new Error('db down'));
        const res = mockRes();

        await authMiddleware({ headers: { authorization: 'Bearer t' } } as Request, res, vi.fn());

        expect(res.statusCode).toBe(401);
        expect(res.payload).toEqual({ error: 'Token inválido' });
    });
});

describe('requireRole', () => {
    it('continues when the role is allowed', () => {
        const req = { user: { userId: 'u1', role: 'ENGINEER' } } as AuthenticatedRequest;
        const next = vi.fn();

        requireRole(['ENGINEER'])(req, mockRes(), next as unknown as NextFunction);

        expect(next).toHaveBeenCalledOnce();
    });

    it('rejects an unauthenticated request', () => {
        const res = mockRes();

        requireRole(['ADMIN'])({} as Request, res, vi.fn());

        expect(res.statusCode).toBe(401);
        expect(res.payload).toEqual({ error: 'No autorizado' });
    });

    it('reports the required and current roles on a forbidden request', () => {
        const req = { user: { userId: 'u1', role: 'TECHNICIAN' } } as AuthenticatedRequest;
        const res = mockRes();
        const next = vi.fn();

        requireRole(['ADMIN', 'SUPER_ADMIN'])(req, res, next as unknown as NextFunction);

        expect(res.statusCode).toBe(403);
        expect(res.payload).toEqual({
            error: 'No tienes permisos para esta acción',
            requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
            currentRole: 'TECHNICIAN'
        });
        expect(next).not.toHaveBeenCalled();
    });
});

describe('role shortcuts', () => {
    const call = (middleware: any, role: string) => {
        const next = vi.fn();
        const res = mockRes();
        middleware({ user: { userId: 'u1', role } } as AuthenticatedRequest, res, next);
        return { allowed: next.mock.calls.length === 1, status: res.statusCode };
    };

    it('only lets SUPER_ADMIN through requireSuperAdmin', () => {
        expect(call(requireSuperAdmin, 'SUPER_ADMIN').allowed).toBe(true);
        expect(call(requireSuperAdmin, 'ADMIN')).toEqual({ allowed: false, status: 403 });
    });

    it('lets admins and super admins through requireAdmin', () => {
        expect(call(requireAdmin, 'ADMIN').allowed).toBe(true);
        expect(call(requireAdmin, 'SUPER_ADMIN').allowed).toBe(true);
        expect(call(requireAdmin, 'ENGINEER')).toEqual({ allowed: false, status: 403 });
    });

    it('lets engineers and above through requireEngineer', () => {
        expect(call(requireEngineer, 'ENGINEER').allowed).toBe(true);
        expect(call(requireEngineer, 'ADMIN').allowed).toBe(true);
        expect(call(requireEngineer, 'TECHNICIAN')).toEqual({ allowed: false, status: 403 });
    });
});
