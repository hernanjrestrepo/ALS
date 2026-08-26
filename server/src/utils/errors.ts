type HttpErrorLike = { message?: string; response?: { data?: unknown } };

/** Texto util para logs a partir de cualquier valor lanzado (Error, error de axios, string). */
export function describeError(error: unknown): string {
    if (error === null || error === undefined) return 'unknown error';
    const responseData = (error as HttpErrorLike)?.response?.data;
    if (responseData) {
        const detail = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
        return `${(error as HttpErrorLike).message || 'HTTP error'} (${detail})`;
    }
    if (error instanceof Error) return error.stack || `${error.name}: ${error.message}`;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

/** Mensaje corto y sin stack, apto para notificaciones y respuestas al usuario. */
export function errorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    const responseData = (error as HttpErrorLike)?.response?.data;
    if (typeof responseData === 'string' && responseData) return responseData.substring(0, 300);
    const message = (error as HttpErrorLike)?.message;
    if (message) return message;
    if (typeof error === 'string') return error;
    return 'error desconocido';
}

export function logError(context: string, error: unknown): void {
    console.error(`[error] ${context}: ${describeError(error)}`);
}

/** Fallo esperado y manejado (dato legado, archivo opcional ausente). */
export function logWarning(context: string, error: unknown): void {
    console.warn(`[warn] ${context}: ${describeError(error)}`);
}

export function parseJsonOrDefault<T>(raw: string | null | undefined, fallback: T, context: string): T {
    if (raw === null || raw === undefined || raw === '') return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch (error) {
        logWarning(`${context}: JSON invalido, se usa valor por defecto`, error);
        return fallback;
    }
}
