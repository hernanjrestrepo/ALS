import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export function getAuthUser(req: AuthenticatedRequest) {
    return req.user;
}

export function getUserId(req: AuthenticatedRequest): string {
    return req.user!.userId;
}

interface ErrorOptions {
    status?: number;
    key?: 'error' | 'message';
    logLabel?: string;
    includeError?: boolean;
    response?: Record<string, unknown>;
    log?: () => void;
}

export function handleError(
    res: Response,
    err: unknown,
    message: string,
    opts: ErrorOptions = {}
) {
    if (opts.log) {
        opts.log();
    } else if (opts.logLabel !== undefined) {
        console.error(opts.logLabel, err);
    } else {
        console.error(err);
    }

    const body = opts.response || {
        [opts.key || 'error']: message,
        ...(opts.includeError ? { error: String(err) } : {})
    };
    return res.status(opts.status || 500).json(body);
}
