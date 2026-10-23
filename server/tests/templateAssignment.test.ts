import { describe, it, expect } from 'vitest';
import { templateNameForService, assignTemplatesToAiData } from '../src/services/templateAssignment';

// Nombres reales de servicios de las OIT en produccion (23-oct).
describe('plantilla segun el servicio de la OIT', () => {
    it.each([
        ['Monitoreo de Agua Subterránea (MATRIZAGUAS)', 'Agua'],
        ['Análisis de agua residual no doméstica – muestra compuesta', 'Agua'],
        ['Análisis de agua de piscina - Servicio 3', 'Agua'],
        ['Muestreo y análisis de agua potable', 'Agua'],
        ['Monitoreo de Calidad de Aire', 'Calidad de Aire'],
        ['Emisión de Ruido (3 puntos)', 'Ruido - Emisión'],
        ['Ruido Ambiental (3 puntos)', 'Ruido - Ambiental'],
    ])('%s -> %s', (service, template) => {
        expect(templateNameForService(service)).toBe(template);
    });

    it.each([
        'Elaboración del Informe de Cumplimiento Ambiental (ICA)',
        'Reporte Registro Único Ambiental (RUA)',
        'Geodatabase – Calidad de Aire',
        'Fichas ICA – Emisión de Ruido',
        'Creación de Geodatabase (GDB) para el ICA',
        'Coordinación técnica y administrativa del proyecto',
        'Residuos Sólidos (TCLP) – Muestra 1',
        'Matriz de Alimentos',
    ])('sin plantilla (escritorio o ambiguo): %s', service => {
        expect(templateNameForService(service)).toBeNull();
    });

    const templates = [{ id: 't-agua', name: 'Agua' }, { id: 't-aire', name: 'Calidad de Aire' }];

    it('asigna la plantilla a cada servicio y devuelve las de la OIT', () => {
        const ai = { data: { services: [{ name: 'Monitoreo de Agua Subterránea (MATRIZAGUAS)' }, { name: 'Elaboración de fichas ICA' }] } };
        const r = assignTemplatesToAiData(ai, templates);
        expect(r?.templateIds).toEqual(['t-agua']);
        expect(ai.data.services[0]).toMatchObject({ templates: [{ id: 't-agua', name: 'Agua' }] });
        expect((ai.data.services[1] as any).templates).toBeUndefined();
    });

    it('respeta plantillas que ya traia el servicio y sirve para la carga manual (data.oit.services)', () => {
        const ai = { data: { oit: { services: [{ name: 'Calidad de Aire', templates: [{ id: 'manual' }] }, { name: 'Agua Potable' }] } } };
        expect(assignTemplatesToAiData(ai, templates)?.templateIds).toEqual(['manual', 't-agua']);
    });

    it('sin servicios con plantilla clara no asigna nada', () => {
        expect(assignTemplatesToAiData({ data: { services: [{ name: 'Reporte RUA' }] } }, templates)).toBeNull();
    });
});
