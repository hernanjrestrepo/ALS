import { describe, it, expect } from 'vitest';
import { remapResolutions, similarity } from '../src/services/quotationAutofill';
import { buildArticleBlocks, parseComparisonTargets } from '../src/services/quotationCompliance';

describe('remapResolutions: los datos subsanados sobreviven a un nuevo analisis', () => {
    const value = { value: 'No aplica', userName: 'Ana' };

    it('mismo faltante con la misma redaccion', () => {
        const out = remapResolutions({ 'Formato de inscripción de clientes diligenciado': value }, ['Formato de inscripción de clientes diligenciado']);
        expect(out['Formato de inscripción de clientes diligenciado']).toBe(value);
    });

    it('la IA redacta distinto el mismo faltante: el dato pasa a la redaccion vigente', () => {
        const out = remapResolutions(
            { 'Copia del volante de consignación del anticipo, si aplica': value },
            ['Volante de consignación del anticipo (copia), si aplica', 'Formato de inscripción de clientes'],
        );
        expect(out['Volante de consignación del anticipo (copia), si aplica']).toBe(value);
        expect(Object.keys(out)).toHaveLength(1);
    });

    it('un dato que ya nadie pide se conserva (no se borra lo que escribio una persona)', () => {
        const out = remapResolutions({ 'Orden de servicio o contrato del cliente': value }, ['Autorización de la autoridad ambiental']);
        expect(out).toEqual({ 'Orden de servicio o contrato del cliente': value });
    });

    it('no usa el mismo faltante dos veces', () => {
        const out = remapResolutions({ 'Volante de consignación del anticipo': value, 'Volante consignación anticipo copia': { value: 'x' } }, ['Volante de consignación del anticipo']);
        // el faltante vigente recibe un solo dato; el otro se conserva con su propia clave
        expect(out['Volante de consignación del anticipo']).toBe(value);
        expect(out['Volante consignación anticipo copia']).toEqual({ value: 'x' });
    });

    it('similarity', () => {
        expect(similarity('Formato de inscripción de clientes', 'Orden de servicio')).toBe(0);
    });
});

describe('articulo sin norma citada (SIACOT-19469)', () => {
    const cotizacion = `-
Artículo de la norma a comparar:
13 Fabricación de Artículos de Hormigón, Cemento y Yeso.
-
2. Aguas:
-
No aplica`;
    const res631 = {
        title: 'Resolucion 631 2015',
        content: `ARTÍCULO 12. Otra actividad.\nTexto del doce.\n\nARTÍCULO 13. Parámetros fisicoquímicos y sus valores límites máximos permisibles en los vertimientos puntuales de aguas residuales no domésticas (ARND) de las actividades de Fabricación de Artículos de Hormigón, Cemento y Yeso.\nDQO\tmg/L O2\t-\t400,00\n\nARTÍCULO 14. Siguiente.\nTexto.`,
    };
    const decreto = { title: 'Decreto 1076 de 2015', content: 'Artículo 13. Algo sin relación con el cemento.\nTexto.' };

    it('encuentra el articulo por su titulo aunque no se cite la norma', () => {
        const targets = parseComparisonTargets(cotizacion);
        expect(targets[0].normNumber).toBe('');
        const { blocks, notFound } = buildArticleBlocks([decreto, res631], targets);
        expect(notFound).toHaveLength(0);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].standardTitle).toBe('Resolucion 631 2015');
        expect(blocks[0].text).toContain('DQO');
        expect(blocks[0].text).not.toContain('Siguiente');
    });

    it('si ninguna norma trae ese articulo con ese titulo, sigue sin encontrarlo', () => {
        const { blocks, notFound } = buildArticleBlocks([decreto], parseComparisonTargets(cotizacion));
        expect(blocks).toHaveLength(0);
        expect(notFound).toHaveLength(1);
    });
});

describe('articulo con una columna por actividad (Res. 631, art. 13)', () => {
    const tabla = [
        'ARTÍCULO 13. Parámetros fisicoquímicos ... de actividades asociadas con fabricación y manufactura de bienes.',
        'PARÁMETRO\tUNIDADES\tFABRICACIÓN DE VIDRIO, CEMENTO, CAL Y YESO\tFABRICACIÓN DE ARTÍCULOS DE HORMIGÓN, CEMENTO Y YESO',
        'Generales',
        'pH\tUnidades de pH\t6,00 a 9,00\t6,00 a 9,00',
        'Demanda Química de Oxígeno (DQO)\tmg/L O₂\t130,00\t200,00',
        'Cinc (Zn)\tmg/L\t-\t3,00',
        'PARÁMETRO\tUNIDADES\tTRATAMIENTO DE METALES\tFABRICACIÓN DE APARATOS DE USO DOMÉSTICO',
        'Cinc (Zn)\tmg/L\t9,99\t8,88',
    ].join('\n');

    it('deja solo la columna de la actividad que pide la cotizacion', () => {
        const targets = parseComparisonTargets('Artículo de la norma a comparar:\n13 Fabricación de Artículos de Hormigón, Cemento y Yeso.\n-');
        const { blocks } = buildArticleBlocks([{ title: 'Resolucion 631 2015', content: tabla }], targets);
        expect(blocks).toHaveLength(1);
        const t = blocks[0].text;
        expect(t).toContain('Demanda Química de Oxígeno (DQO) | mg/L O₂ | 200,00');
        expect(t).toContain('Cinc (Zn) | mg/L | 3,00');
        expect(t).not.toContain('130,00');
        expect(t).not.toContain('8,88');
    });
});

describe('ensureServicesForQuotation: doméstica y no doméstica son servicios distintos', () => {
    it('la clave conserva el "no"', async () => {
        const mod: any = await import('../src/services/quotationAutofill');
        expect(mod.serviceKey('Agua residual no doméstica')).not.toBe(mod.serviceKey('Agua Residual Doméstica'));
        expect(mod.serviceKey('AGUA RESIDUAL DOMÉSTICA')).toBe(mod.serviceKey('Agua residual doméstica'));
    });
});
