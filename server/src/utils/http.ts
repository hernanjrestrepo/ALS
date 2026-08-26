import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export function getAuthUser(req: Request) {
    return (req as AuthenticatedRequest).user;
}

export function getUserId(req: Request): string {
    return (req as AuthenticatedRequest).user!.userId;
}

interface ErrorOptions {
    status?: number;
    key?: 'error' | 'message';
    logLabel?: string;
    extra?: Record<string, unknown>;
}

export function handleError(
    res: Response,
    err: unknown,
    message: string,
    opts: ErrorOptions = {}
) {
    if (opts.logLabel !== undefined) {
        console.error(opts.logLabel, err);
    } else {
        console.error(err);
    }

    const body = {
        [opts.key || 'error']: message,
        ...opts.extra
    };
    return res.status(opts.status || 500).json(body);
}
