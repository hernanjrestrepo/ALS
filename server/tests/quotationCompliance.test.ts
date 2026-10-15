import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    extractQuotationNumber, parseComparisonTargets, buildArticleBlocks, detectMatrixMismatches,
    normalizeParameterChecks, applySystemChecks, buildVerdict, normalizeIssues,
} from '../src/services/quotationCompliance';

// Fragmentos reales: cotizaciones de produccion (sin el bloque del destinatario) y
// renglones de las normas Excel cargadas en Xmart.
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/quotation-compliance.json'), 'utf-8'));
const standards = [fx.decreto1076, fx.res0699, fx.res2115];

describe('extractQuotationNumber', () => {
    it('lee el SIACOT del encabezado de la oferta', () => {
        expect(extractQuotationNumber(fx.siacot20938)).toBe('SIACOT-20938-10-2026');
        expect(extractQuotationNumber(fx.siacot19607)).toBe('SIACOT-19607-01-2026');
    });
    it('conserva la version', () => {
        expect(extractQuotationNumber('No. COTIZACIÓN   SIACOT-17822-04-2025_V2   DÍA')).toBe('SIACOT-17822-04-2025_V2');
    });
    it('sin SIACOT no inventa numero', () => {
        expect(extractQuotationNumber('Cotización de prueba sin numero')).toBeNull();
    });
});

describe('parseComparisonTargets', () => {
    it('Decreto 1076, articulo 2.2.3.3.9.7 (prueba de Ana, 15-oct)', () => {
        expect(parseComparisonTargets(fx.siacot20938)).toEqual([
            { normNumber: '1076', articles: ['2.2.3.3.9.7'], raw: '2.2.3.3.9.7.' },
        ]);
    });
    it('Resolucion 0699, articulo 4, tabla 2 y la categoria del renglon de comparacion', () => {
        const [t] = parseComparisonTargets(fx.siacot19607);
        expect(t).toMatchObject({ normNumber: '699', articles: ['4'], table: '2', category: 'III' });
    });
    it('Resolucion 2115, articulo 13', () => {
        expect(parseComparisonTargets(fx.siacot20673)).toMatchObject([{ normNumber: '2115', articles: ['13'] }]);
    });
});

describe('buildArticleBlocks', () => {
    it('le pasa a la IA el articulo pedido y no el primero de la tabla', () => {
        const { blocks, notFound } = buildArticleBlocks(standards, parseComparisonTargets(fx.siacot20938));
        expect(notFound).toEqual([]);
        expect(blocks).toHaveLength(1);
        const text = blocks[0].text;
        expect(text).toContain('2.2.3.3.9.7');
        for (const p of ['Coliformes fecales', 'Coliformes totales', 'Compuestos Fenólicos', 'Oxígeno disuelto', 'pH', 'Tensoactivos', 'Grasas y aceites flotantes', 'Materiales flotantes']) {
            expect(text).toContain(p);
        }
        // Lo que la IA comparo por error el 15-oct (art. 2.2.3.3.9.3, consumo humano)
        expect(text).not.toContain('Arsénico');
        expect(text).not.toContain('2.2.3.3.9.3');
        expect(text).not.toContain('2.2.3.3.9.8');
    });
    it('filtra por tabla y categoria cuando la norma las distingue', () => {
        const { blocks } = buildArticleBlocks(standards, parseComparisonTargets(fx.siacot19607));
        expect(blocks).toHaveLength(1);
        expect(blocks[0].text).toContain('CATEGORÍA III');
        expect(blocks[0].text).not.toContain('CATEGORÍA II ');
        expect(blocks[0].text).not.toMatch(/Tabla 1\./);
    });
    it('reporta el articulo que no esta en las normas cargadas', () => {
        const { blocks, notFound } = buildArticleBlocks(standards, [{ normNumber: '1076', articles: ['2.2.3.3.9.99'], raw: '' }]);
        expect(blocks).toEqual([]);
        expect(notFound).toHaveLength(1);
    });
    it('norma en texto (PDF): toma el articulo desde su titulo hasta el siguiente', () => {
        const pdf = { title: 'Resolución 2115', content: 'ARTÍCULO 12. Otro. Ver artículo 13.\nARTÍCULO 13. IRCA. Cuadro 6.\nColor 6\nARTÍCULO 14. Siguiente.' };
        const { blocks } = buildArticleBlocks([pdf], [{ normNumber: '2115', articles: ['13'], raw: '' }]);
        expect(blocks[0].text).toBe('ARTÍCULO 13. IRCA. Cuadro 6.\nColor 6');
    });
    it('si la norma esta como Excel y como PDF, usa la tabla del Excel', () => {
        const pdf = { title: 'Resolución 2115', content: 'ARTÍCULO 13. texto del pdf' };
        const { blocks } = buildArticleBlocks([pdf, fx.res2115], parseComparisonTargets(fx.siacot20673));
        expect(blocks.map(b => b.standardTitle)).toEqual(['Resolución 2115 de 2007 Agua potable']);
    });
});

describe('detectMatrixMismatches', () => {
    it('parametros "(Agua Potable)" en una muestra de agua superficial', () => {
        const r = detectMatrixMismatches(fx.siacot20938);
        expect(r.sampleMatrix).toBe('Agua Superficial');
        expect(r.mismatches.map(m => m.parameter)).toEqual(['Coliformes Termotolerantes', 'Coliformes Totales']);
    });
    it('sin falsos positivos cuando la matriz coincide', () => {
        expect(detectMatrixMismatches(fx.siacot20673).mismatches).toEqual([]);
        expect(detectMatrixMismatches(fx.siacot19607).mismatches).toEqual([]);
    });
});

// Respuesta REAL de gpt-oss en produccion (prueba en seco del 2026-10-15 sobre el
// PDF de Ana, art. 2.2.3.3.9.7), con sus errores: "matriz distinta" en Fenoles y
// Detergentes, y termotolerantes/detergentes dados por incorrectos.
const anaChecks = () => normalizeParameterChecks([
    { normParameter: 'Coliformes fecales', normLimit: '200 microorganismos/100mL', quotedAs: 'Aguas Coliformes Termotolerantes (Agua Potable)', quotedLoq: '0 UFC/100 mL', problems: [{ type: 'PARAMETRO_INCORRECTO', detail: "El nombre cotizado es 'Coliformes Termotolerantes', no coincide con 'Coliformes fecales'." }, { type: 'MATRIZ', detail: 'La muestra es agua superficial, pero el análisis está marcado como (Agua Potable).' }] },
    { normParameter: 'Coliformes totales', normLimit: '1000 microorganismos/100mL', quotedAs: 'Aguas Coliformes Totales (Agua Potable)', quotedLoq: '0 UFC/100 mL', problems: [{ type: 'MATRIZ', detail: 'La muestra es agua superficial, pero el análisis está marcado como (Agua Potable).' }] },
    { normParameter: 'Compuestos Fenólicos', normLimit: '0.002 mg/L', quotedAs: 'Aguas Fenoles', quotedLoq: '0.1 mg/L', problems: [{ type: 'PARAMETRO_INCORRECTO', detail: "El nombre cotizado es 'Fenoles', no coincide con 'Compuestos Fenólicos'." }, { type: 'MATRIZ', detail: 'La muestra es agua superficial, pero el análisis está marcado como (Agua Potable).' }, { type: 'LIMITE_CUANTIFICACION', detail: 'El límite de cuantificación 0.1 mg/L excede el límite máximo permitido 0.002 mg/L.' }] },
    { normParameter: 'Oxígeno disuelto', normLimit: '70 % concentración de saturación', problems: [{ type: 'FALTANTE', detail: 'No se cotizó análisis de oxígeno disuelto.' }] },
    { normParameter: 'pH', normLimit: '5.0-9.0 Unidades', problems: [{ type: 'FALTANTE', detail: 'No se cotizó análisis de pH.' }] },
    { normParameter: 'Tensoactivos', normLimit: '0.5 mg/L', quotedAs: 'Aguas Detergentes (Saam)', quotedLoq: '0.4 mg SAAM/L', problems: [{ type: 'PARAMETRO_INCORRECTO', detail: "El nombre cotizado es 'Detergentes', no coincide con 'Tensoactivos'." }, { type: 'MATRIZ', detail: 'La muestra es agua superficial, pero el análisis está marcado como (Agua Potable).' }] },
    { normParameter: 'Grasas y aceites flotantes', normLimit: 'Ausencia', problems: [{ type: 'FALTANTE', detail: 'No se cotizó análisis de grasas y aceites flotantes.' }] },
    { normParameter: 'Materiales flotantes', normLimit: 'Ausencia', problems: [{ type: 'FALTANTE', detail: 'No se cotizó análisis de materiales flotantes.' }] },
    { normParameter: '', problems: [] },
]);

const kinds = (checks: ReturnType<typeof anaChecks>) =>
    Object.fromEntries(checks.map(c => [c.normParameter, c.problems.map(p => p.type).join(',')]));

describe('applySystemChecks', () => {
    it('nombre y matriz salen de reglas fijas, no del juicio de la IA', () => {
        const checks = anaChecks();
        expect(checks).toHaveLength(8);
        const unmatched = applySystemChecks(checks, detectMatrixMismatches(fx.siacot20938).mismatches, fx.siacot20938);
        expect(unmatched).toEqual([]);
        expect(kinds(checks)).toEqual({
            'Coliformes fecales': 'NOMBRE_DISTINTO,MATRIZ', // termotolerantes = fecales: pendiente de Ana
            'Coliformes totales': 'MATRIZ',
            'Compuestos Fenólicos': 'PARAMETRO_INCORRECTO,LIMITE_CUANTIFICACION', // Ana: fenoles no es compuestos fenolicos
            'Oxígeno disuelto': 'FALTANTE',
            'pH': 'FALTANTE',
            'Tensoactivos': 'NOMBRE_DISTINTO', // detergentes SAAM = tensoactivos: pendiente de Ana; sin "(Agua Potable)"
            'Grasas y aceites flotantes': 'FALTANTE',
            'Materiales flotantes': 'FALTANTE',
        });
        expect(checks[0].quotedAs).toBe('Coliformes Termotolerantes (Agua Potable)');
    });

    it('Res. 2115 art. 13 (IRCA): puntajes no son limites, y "Ph"/"E. Coli" pegados a la matriz no son faltantes', () => {
        // Respuesta real de la IA (prueba en seco 2026-10-15, SIACOT-20673-09-2026), recortada
        const checks = normalizeParameterChecks([
            { normParameter: 'pH', normLimit: '1.5', problems: [{ type: 'FALTANTE', detail: 'No analysis provided' }] },
            { normParameter: 'Alcalinidad Total', normLimit: '1', quotedAs: 'Alcalinidad', quotedLoq: '10 mg CaCO3/L', problems: [{ type: 'LIMITE_CUANTIFICACION', detail: 'Loq exceeds article limit' }] },
            { normParameter: 'COT', normLimit: '3', quotedAs: 'CARBONO ORGANICO TOTAL (COT)', quotedLoq: '0.5 mg/L', problems: [] },
            { normParameter: 'Escherichia Coli', normLimit: '25', problems: [{ type: 'FALTANTE', detail: 'No analysis provided' }] },
            { normParameter: 'Calcio', normLimit: '1', quotedAs: 'Calcio Total', quotedLoq: '1 mg/L Ca', problems: [] },
            { normParameter: 'Cloro Residual Libre', normLimit: '15', problems: [{ type: 'FALTANTE', detail: 'No analysis provided' }] },
        ]);
        applySystemChecks(checks, detectMatrixMismatches(fx.siacot20673).mismatches, fx.siacot20673);
        expect(kinds(checks)).toEqual({
            'pH': 'OTRO',
            'Alcalinidad Total': '',
            'COT': '',
            'Escherichia Coli': 'OTRO',
            'Calcio': '',
            'Cloro Residual Libre': 'OTRO', // la cotizacion dice "Cloro libre medido en campo"
        });
        expect(checks[0].problems[0].detail).toContain('aparece en la cotización');
        const v = buildVerdict({ checks });
        expect(v.status).toBe('REVIEW_REQUIRED'); // nada grave; se verifica pH y E. coli
        expect(v.issues.some(i => /analysis|exceeds/i.test(i.description))).toBe(false); // nada en ingles
    });

    it('Res. 0699: siglas cubren el nombre largo; el limite de cuantificacion se compara con unidad', () => {
        const checks = normalizeParameterChecks([
            { normParameter: 'Demanda Química de Oxígeno (DQO)', normLimit: '- - 200.0 mg/L O2', quotedAs: 'Aguas DQO (SM 5220 D20)', quotedLoq: '6,0 mg/L', problems: [] },
            { normParameter: 'Sustancias Activas al Azul de Metileno (SAAM)', normLimit: '- - 0.5 mg/L', quotedAs: 'Aguas Surfactantes Aniónicos como SAAM (SM 5540 C0)', quotedLoq: '0,4 mg/L', problems: [] },
            { normParameter: 'Fenoles', normLimit: '- - 0.01 mg/L', quotedAs: 'Aguas Fenoles (SM 5530 B, D0)', quotedLoq: '0,1 mg/L', problems: [{ type: 'LIMITE_CUANTIFICACION', detail: 'Loq 0,1 mg/L > límite 0,01 mg/L' }] },
            { normParameter: 'Nitrógeno Total (N)', normLimit: '- - 20.0 mg/L', quotedAs: 'Aguas Nitrógeno Kjeldahl (SM 4500-Norg B, SM 4500-NH3 B, C)', quotedLoq: '5,0 mg/L', problems: [] },
            { normParameter: 'Cadmio (Cd)', normLimit: 'Análisis y Reporte', problems: [] }, // la IA no lo marco
            { normParameter: 'Aluminio (Al)', normLimit: '1.0 mg/L', problems: [{ type: 'FALTANTE' }] },
        ]);
        applySystemChecks(checks, [], fx.siacot19607);
        expect(kinds(checks)).toEqual({
            'Demanda Química de Oxígeno (DQO)': '',
            'Sustancias Activas al Azul de Metileno (SAAM)': '',
            'Fenoles': 'LIMITE_CUANTIFICACION',
            'Nitrógeno Total (N)': 'NOMBRE_DISTINTO', // Kjeldahl no es nitrogeno total: lo confirma el analista
            'Cadmio (Cd)': 'FALTANTE',
            'Aluminio (Al)': 'FALTANTE', // "(Al)" no se confunde con la palabra "al" del texto
        });
        expect(checks[2].normLimit).toBe('0.01 mg/L');
        expect(checks[2].problems[0].detail).toBe('El límite de cuantificación cotizado (0,1 mg/L) es mayor que el límite de la norma (0.01 mg/L).');
    });

    it('el limite de cuantificacion lo compara el codigo cuando las unidades se pueden leer', () => {
        const checks = normalizeParameterChecks([
            // 4a corrida real, Res. 0699: la IA no lo marco (0,1 > 0,01 mg/L)
            { normParameter: 'Fenoles', normLimit: '0.01 mg/L', quotedAs: 'Fenoles', quotedLoq: '0,1 mg/L', problems: [] },
            // la IA lo marco sin razon: 0,4 mg SAAM/L <= 0,5 mg/L
            { normParameter: 'Tensoactivos', normLimit: '0.5 mg/L', quotedAs: 'Tensoactivos (SAAM)', quotedLoq: '0.4 mg SAAM/L', problems: [{ type: 'LIMITE_CUANTIFICACION' }] },
            { normParameter: 'Sólidos Sedimentables', normLimit: '1.5 mL/L', quotedAs: 'Sólidos Sedimentables', quotedLoq: '0,1 mL/L', problems: [] },
            // unidades que no se pueden comparar: se deja lo que diga la IA
            { normParameter: 'Coliformes totales', normLimit: '1000 microorganismos/100mL', quotedAs: 'Coliformes Totales', quotedLoq: '0 UFC/100 mL', problems: [] },
        ]);
        applySystemChecks(checks, []);
        expect(kinds(checks)).toEqual({ 'Fenoles': 'LIMITE_CUANTIFICACION', 'Tensoactivos': '', 'Sólidos Sedimentables': '', 'Coliformes totales': '' });
    });

    it('"E. Coli" es "Escherichia coli"', () => {
        const checks = normalizeParameterChecks([{ normParameter: 'Escherichia Coli', quotedAs: 'E. Coli', problems: [] }]);
        applySystemChecks(checks, []);
        expect(checks[0].problems).toEqual([]);
    });

    it('sin analisis asignado es faltante aunque la IA no lo marque (2a corrida real sobre la prueba de Ana)', () => {
        const checks = normalizeParameterChecks([
            { normParameter: 'Grasas y aceites flotantes', normLimit: 'Ausencia', problems: [] },
            { normParameter: 'Materiales flotantes', normLimit: 'Ausencia', problems: [] },
        ]);
        applySystemChecks(checks, [], fx.siacot20938);
        expect(kinds(checks)).toEqual({ 'Grasas y aceites flotantes': 'FALTANTE', 'Materiales flotantes': 'FALTANTE' });
        expect(checks[1].problems[0].detail).toBe('No se cotizó ningún análisis para «Materiales flotantes».');
    });

    it('mismo parametro con otra forma de escribirlo no es "nombre distinto"', () => {
        const checks = normalizeParameterChecks([
            { normParameter: 'Cloruros', quotedAs: 'Aguas Cloruro', problems: [] },
            { normParameter: 'pH', quotedAs: 'Muestreo Puntual Determinación In Situ pH', problems: [] },
            { normParameter: 'Grasas y aceites', quotedAs: 'Grasas y Aceites', problems: [] },
            { normParameter: 'Oxígeno disuelto', quotedAs: 'Oxigeno Disuelto', problems: [{ type: 'FALTANTE' }] },
        ]);
        applySystemChecks(checks, []);
        expect(checks.every(c => c.problems.length === 0)).toBe(true);
    });
});

describe('buildVerdict', () => {
    const against = ['Decreto 1076 de 2015 — artículo 2.2.3.3.9.7'];

    it('no conforme por las razones del articulo: matriz, parametro incorrecto y faltantes', () => {
        const checks = anaChecks();
        const unmatched = applySystemChecks(checks, detectMatrixMismatches(fx.siacot20938).mismatches, fx.siacot20938);
        const v = buildVerdict({ checks, unmatchedMatrix: unmatched, comparedAgainst: against });
        expect(v.status).toBe('NON_COMPLIANT');
        expect(v.compliant).toBe(false);
        const cats = v.issues.map(i => `${i.severity}:${i.category}:${i.parameter}`);
        expect(cats).toContain('CRITICAL:Matriz distinta a la muestra:Coliformes fecales');
        expect(cats).toContain('CRITICAL:Matriz distinta a la muestra:Coliformes totales');
        expect(cats).toContain('CRITICAL:Parámetro incorrecto:Compuestos Fenólicos');
        expect(cats).toContain('CRITICAL:Parámetro faltante:pH');
        expect(cats).toContain('WARNING:Nombre por confirmar:Tensoactivos');
        expect(cats.filter(c => c.includes('Matriz'))).toHaveLength(2);
        // Ninguna tarjeta vacia: todas traen texto
        expect(v.issues.every(i => i.description && i.description.length > 5)).toBe(true);
        expect(v.score).toBe(13); // 1 de 8 sin problema grave (tensoactivos)
        expect(v.summary).toContain('Decreto 1076 de 2015 — artículo 2.2.3.3.9.7');
    });

    it('con "el cliente solo pidio estos parametros" los faltantes pasan a informativos', () => {
        const checks = anaChecks();
        applySystemChecks(checks, detectMatrixMismatches(fx.siacot20938).mismatches, fx.siacot20938);
        const v = buildVerdict({ checks, clientScopeOnly: true, comparedAgainst: against });
        const missing = v.issues.filter(i => i.parameter === 'pH');
        expect(missing).toEqual([expect.objectContaining({ severity: 'INFO', category: 'No cotizado (el cliente no lo pidió)' })]);
        // Los errores de lo que si se cotizo se siguen marcando
        expect(v.status).toBe('NON_COMPLIANT');
        expect(v.score).toBe(25); // 1 de 4 cotizados sin problema grave
    });

    it('con alcance del cliente y lo cotizado correcto queda conforme', () => {
        const checks = normalizeParameterChecks([
            { normParameter: 'Coliformes totales', quotedAs: 'Coliformes Totales', problems: [] },
            { normParameter: 'pH', problems: [{ type: 'FALTANTE' }] },
        ]);
        expect(buildVerdict({ checks, clientScopeOnly: true }).status).toBe('COMPLIANT');
        expect(buildVerdict({ checks }).status).toBe('NON_COMPLIANT');
    });

    it('solo nombres por confirmar -> requiere revision, no se aprueba sola', () => {
        const checks = normalizeParameterChecks([{ normParameter: 'Tensoactivos', quotedAs: 'Detergentes (Saam)', problems: [] }]);
        applySystemChecks(checks, []);
        const v = buildVerdict({ checks });
        expect(v.status).toBe('REVIEW_REQUIRED');
        expect(v.compliant).toBeUndefined();
    });

    it('matriz distinta que la IA no asocio a ningun parametro igual cuenta', () => {
        const v = buildVerdict({ checks: [], unmatchedMatrix: [{ parameter: 'Coliformes Totales', quotedMatrix: 'Agua Potable', sampleMatrix: 'Agua Superficial' }] });
        expect(v.status).toBe('NON_COMPLIANT');
        expect(v.issues[0].description).toContain('la muestra es Agua Superficial');
    });

    it('recalcular dos veces da lo mismo (cambiar la casilla no duplica hallazgos)', () => {
        const checks = anaChecks();
        const mm = detectMatrixMismatches(fx.siacot20938).mismatches;
        applySystemChecks(checks, mm);
        applySystemChecks(checks, mm);
        expect(buildVerdict({ checks }).issues.filter(i => i.category === 'Matriz distinta a la muestra')).toHaveLength(2);
    });
});

describe('normalizeIssues', () => {
    it('los resultados viejos con texto suelto se muestran con su texto', () => {
        expect(normalizeIssues(['Decreto 1076 de 2015: Arsénico'])).toEqual([
            { severity: 'WARNING', category: 'Observación', description: 'Decreto 1076 de 2015: Arsénico' },
        ]);
    });
});
