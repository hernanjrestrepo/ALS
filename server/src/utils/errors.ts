type HttpErrorLike = { message?: string; response?: { data?: unknown } };

/** Texto util para logs a partir de cualquier valor lanzado (Error, error de axios, string). */
export function describeError(error: unknown): string {
    if (error === null || error === undefined) return 'unknown error';
    const responseData = (error as HttpErrorLike)?.response?.data;
    // responseData puede ser un stream (p.ej. axios con responseType: 'stream' en un
    // request fallido), que tiene referencias circulares y rompe JSON.stringify.
    if (responseData && typeof responseData !== 'object') {
        return `${(error as HttpErrorLike).message || 'HTTP error'} (${responseData})`;
    }
    if (responseData && typeof responseData === 'object') {
        try {
            return `${(error as HttpErrorLike).message || 'HTTP error'} (${JSON.stringify(responseData)})`;
        } catch {
            return `${(error as HttpErrorLike).message || 'HTTP error'}`;
        }
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

// Respuesta HTTP para un error que escapo de un handler. Los errores de subida (multer)
// se explican en espanol en vez de un 500 generico.
export function httpErrorFor(err: { status?: number; message?: string; code?: string; name?: string } | null | undefined, maxUploadMb = 100): { status: number; message: string } {
    if (err?.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') return { status: 413, message: `El archivo supera el tamaño máximo de ${maxUploadMb} MB.` };
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return { status: 400, message: 'Se enviaron más archivos de los permitidos. Adjunte hasta 6 a la vez.' };
        return { status: 400, message: `No se pudo recibir el archivo: ${err.message}` };
    }
    if (err?.message && /Only PDF, DOC, DOCX/.test(err.message)) {
        return { status: 400, message: 'Formato de archivo no permitido. Use PDF, Word, Excel, CSV, texto o imagen (JPG/PNG).' };
    }
    const status = typeof err?.status === 'number' ? err.status : 500;
    return { status, message: status < 500 && err?.message ? err.message : 'Error interno del servidor' };
}
