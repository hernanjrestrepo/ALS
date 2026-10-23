import { describe, it, expect } from 'vitest';
import { areaDeCorreo, AREA_POR_CORREO } from '../src/data/personal-als';

describe('area de cada usuario segun el listado de personal', () => {
    it('ubica a cada persona en su area, sin importar mayusculas del correo', () => {
        expect(areaDeCorreo('Ana.Melendez@ALSGlobal.com')).toBe('Comercial');
        expect(areaDeCorreo('eduardo.ibarra@alsglobal.com')).toBe('Operaciones');
        expect(areaDeCorreo('ivis.cervantes@alsglobal.com')).toBe('Laboratorio');
        expect(areaDeCorreo('ana.blanco@alsglobal.com')).toBe('Direccion Tecnica');
    });

    it('quien no esta en el listado no tiene area (ve el menu normal de su rol)', () => {
        expect(areaDeCorreo('ceo@paradixe.xyz')).toBeNull();
        expect(areaDeCorreo(undefined)).toBeNull();
    });

    it('solo hay areas conocidas', () => {
        const areas = new Set(Object.values(AREA_POR_CORREO));
        expect([...areas].sort()).toEqual(['Comercial', 'Consultoria', 'Direccion Tecnica', 'Infraestructura Tecnologica', 'Laboratorio', 'Operaciones', 'Sistema Integrado De Gestion']);
    });
});
