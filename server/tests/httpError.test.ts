import { describe, it, expect } from 'vitest';
import { httpErrorFor } from '../src/utils/errors';

describe('httpErrorFor', () => {
    it('archivo muy grande -> 413 con mensaje claro (antes 500 generico)', () => {
        expect(httpErrorFor({ name: 'MulterError', code: 'LIMIT_FILE_SIZE', message: 'File too large' }, 100))
            .toEqual({ status: 413, message: 'El archivo supera el tamaño máximo de 100 MB.' });
    });
    it('demasiados archivos -> 400', () => {
        expect(httpErrorFor({ name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE', message: 'Unexpected field' }).status).toBe(400);
    });
    it('formato no permitido -> 400 en espanol', () => {
        const r = httpErrorFor({ message: 'Only PDF, DOC, DOCX, TXT, Excel, CSV, and Image files are allowed' });
        expect(r.status).toBe(400);
        expect(r.message).toContain('Formato de archivo no permitido');
    });
    it('error interno no expone detalles', () => {
        expect(httpErrorFor(new Error('boom'))).toEqual({ status: 500, message: 'Error interno del servidor' });
    });
    it('errores con estado < 500 conservan su mensaje', () => {
        expect(httpErrorFor({ status: 404, message: 'No existe' })).toEqual({ status: 404, message: 'No existe' });
    });
});
