import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authMiddleware } from './auth.middleware';

const timingSafeEquals = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Guards the legacy external-integration endpoints. Accepts either a normal
 * user JWT (Authorization header) or the shared integration key sent in
 * `x-api-key` (INTEGRATION_API_KEY). Requests with neither are rejected.
 */
export const integrationAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
        return authMiddleware(req, res, next);
    }

    const configuredKey = process.env.INTEGRATION_API_KEY;
    const providedKey = req.header('x-api-key');

    if (configuredKey && providedKey && timingSafeEquals(configuredKey, providedKey)) {
        return next();
    }

    return res.status(401).json({ error: 'No autorizado' });
};
