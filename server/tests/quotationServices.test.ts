import { describe, it, expect, vi } from 'vitest';
vi.mock('@prisma/client', () => ({ PrismaClient: class { } }));
import { parseServiceIds } from '../src/controllers/quotation.controller';

describe('servicios de una cotizacion (uno, varios o todos)', () => {
    it('acepta varios campos serviceIds del formulario', () => {
        expect(parseServiceIds({ serviceIds: ['a', 'b', 'c'] })).toEqual(['a', 'b', 'c']);
    });
    it('un solo serviceIds llega como texto', () => {
        expect(parseServiceIds({ serviceIds: 'a' })).toEqual(['a']);
    });
    it('acepta una lista JSON o un texto separado por comas', () => {
        expect(parseServiceIds({ serviceIds: '["a","b"]' })).toEqual(['a', 'b']);
        expect(parseServiceIds({ serviceIds: 'a, b ,c' })).toEqual(['a', 'b', 'c']);
    });
    it('sigue aceptando el serviceId de siempre', () => {
        expect(parseServiceIds({ serviceId: 'x' })).toEqual(['x']);
    });
    it('quita vacios y repetidos; sin nada devuelve lista vacia', () => {
        expect(parseServiceIds({ serviceIds: ['a', '', 'a', ' b '] })).toEqual(['a', 'b']);
        expect(parseServiceIds({})).toEqual([]);
        expect(parseServiceIds({ serviceIds: '[roto' })).toEqual([]);
    });
});
