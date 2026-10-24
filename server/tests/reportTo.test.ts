import { describe, it, expect } from 'vitest';
import { extractOitClient } from '../src/services/quotationLink';

describe('INFORME A NOMBRE DE (texto real de OIT)', () => {
    it('lee el valor cuando viene', () => {
        const t = 'MAIL:biologia@generadoranare.com.co\nINFORME A NOMBRE DE:GENERADORA NARE S.A.S. E.S.P.\nCONTACTO DE COMPRAS:Grazia Perez';
        expect(extractOitClient(t).reportTo).toBe('GENERADORA NARE S.A.S. E.S.P.');
    });
    it('vacio no toma la etiqueta siguiente', () => {
        const t = 'MAIL:svingenierias@gmail.com\nINFORME A NOMBRE DE:\nCONTACTO DE COMPRAS:\n';
        expect(extractOitClient(t).reportTo).toBeNull();
    });
});
