import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const authMiddleware = vi.fn();

vi.mock('../src/middleware/auth.middleware', () => ({
    authMiddleware: (...args: unknown[]) => authMiddleware(...args)
}));

import { integrationAuthMiddleware } from '../src/middleware/integration.middleware';

function mockReq(headers: Record<string, string>): Request {
    return {
        headers,
        header: (name: string) => headers[name.toLowerCase()]
    } as unknown as Request;
}

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

beforeEach(() => {
    authMiddleware.mockReset();
    vi.stubEnv('INTEGRATION_API_KEY', 'integration-key-123456');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('integrationAuthMiddleware', () => {
    it('delegates to the JWT middleware when an authorization header is present', async () => {
        const req = mockReq({ authorization: 'Bearer t' });
        const next = vi.fn() as unknown as NextFunction;

        await integrationAuthMiddleware(req, mockRes(), next);

        expect(authMiddleware).toHaveBeenCalledOnce();
        expect(next).not.toHaveBeenCalled();
    });

    it('accepts a matching api key', async () => {
        const next = vi.fn() as unknown as NextFunction;
        const res = mockRes();

        await integrationAuthMiddleware(mockReq({ 'x-api-key': 'integration-key-123456' }), res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.statusCode).toBe(0);
    });

    it.each([
        ['a wrong key of equal length', 'integration-key-654321'],
        ['a wrong key of different length', 'nope'],
        ['an empty key', '']
    ])('rejects %s', async (_label, key) => {
        const res = mockRes();
        const next = vi.fn() as unknown as NextFunction;

        await integrationAuthMiddleware(mockReq({ 'x-api-key': key }), res, next);

        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects a request with no credentials at all', async () => {
        const res = mockRes();

        await integrationAuthMiddleware(mockReq({}), res, vi.fn() as unknown as NextFunction);

        expect(res.statusCode).toBe(401);
        expect(res.payload).toEqual({ error: 'No autorizado' });
    });

    it('rejects an api key when none is configured', async () => {
        vi.stubEnv('INTEGRATION_API_KEY', '');
        const res = mockRes();

        await integrationAuthMiddleware(mockReq({ 'x-api-key': 'anything' }), res, vi.fn() as unknown as NextFunction);

        expect(res.statusCode).toBe(401);
    });
});
