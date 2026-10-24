import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    isAITimeout, pendingNameQuestions, consultationKey,
    extractQuotationNumber, parseComparisonTargets, buildArticleBlocks, detectMatrixMismatches,
    normalizeParameterChecks, applySystemChecks, buildVerdict, normalizeIssues,
    complianceScore, normCoverage, issueKey, applyFindingReviews, FindingReviews,
} from '../src/services/quotationCompliance';
import { pickQuotation, baseQuotationNumber } from '../src/services/quotationLink';

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
    it('lo lee del PDF de la OIT, donde el rotulo sale pegado al numero (OIT 14927)', () => {
        expect(extractQuotationNumber('2026-06-22\nNo. COTIZACIÓNSIACOT-20896-10-2026\nFECHA:')).toBe('SIACOT-20896-10-2026');
        expect(extractQuotationNumber('No. COTIZACIÓNSIACOT-20466-07-2026_V1\nFECHA')).toBe('SIACOT-20466-07-2026_V1');
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
            'Coliformes fecales': 'MATRIZ', // termotolerantes = fecales: confirmado por Ana (2026-10-15)
            'Coliformes totales': 'MATRIZ',
            'Compuestos Fenólicos': 'PARAMETRO_INCORRECTO,LIMITE_CUANTIFICACION', // Ana: fenoles no es compuestos fenolicos
            'Oxígeno disuelto': 'FALTANTE',
            'pH': 'FALTANTE',
            'Tensoactivos': '', // detergentes SAAM = tensoactivos: confirmado por Ana; sin "(Agua Potable)"
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
        expect(cats).toContain('INFO:Sugerido por la norma (no cotizado):pH');
        expect(cats).not.toContain('WARNING:Nombre por confirmar:Tensoactivos');
        expect(cats.filter(c => c.includes('Matriz'))).toHaveLength(2);
        // Ninguna tarjeta vacia: todas traen texto
        expect(v.issues.every(i => i.description && i.description.length > 5)).toBe(true);
        // De lo cotizado, cuanto esta sin observaciones (los sugeridos no entran): 1 de 4
        expect(v.score).toBe(25);
        expect(v.summary).toContain('Decreto 1076 de 2015 — artículo 2.2.3.3.9.7');
    });

    it('un parametro que la norma pide y la cotizacion no ofrece es sugerido (INFO), no incumplimiento', () => {
        const checks = anaChecks();
        applySystemChecks(checks, detectMatrixMismatches(fx.siacot20938).mismatches, fx.siacot20938);
        const v = buildVerdict({ checks, comparedAgainst: against });
        const missing = v.issues.filter(i => i.parameter === 'pH');
        expect(missing).toEqual([expect.objectContaining({ severity: 'INFO', category: 'Sugerido por la norma (no cotizado)' })]);
        // Lo que si se cotizo mal sigue siendo incumplimiento
        expect(v.status).toBe('NON_COMPLIANT');
    });

    it('con alcance del cliente y lo cotizado correcto queda conforme', () => {
        const checks = normalizeParameterChecks([
            { normParameter: 'Coliformes totales', quotedAs: 'Coliformes Totales', problems: [] },
            { normParameter: 'pH', problems: [{ type: 'FALTANTE' }] },
        ]);
        // lo que falta es sugerido: no cambia el veredicto
        expect(buildVerdict({ checks }).status).toBe('COMPLIANT');
    });

    it('solo nombres por confirmar -> requiere revision, no se aprueba sola', () => {
        const checks = normalizeParameterChecks([{ normParameter: 'Nitrógeno Total (N)', quotedAs: 'Nitrógeno Kjeldahl', problems: [] }]);
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

describe('equivalencias confirmadas y consultas', () => {
    it('termotolerantes = fecales y SAAM = tensoactivos (confirmado por Ana, 2026-10-15)', () => {
        const checks = normalizeParameterChecks([
            { normParameter: 'Coliformes fecales', quotedAs: 'Coliformes Termotolerantes', problems: [] },
            { normParameter: 'Tensoactivos', quotedAs: 'Detergentes (Saam)', problems: [] },
        ]);
        applySystemChecks(checks, []);
        expect(checks.every(c => c.problems.length === 0)).toBe(true);
        expect(pendingNameQuestions(checks)).toEqual([]);
    });

    it('una regla aprendida (base de datos) se usa en lugar de consultar otra vez', () => {
        const rules = { equivalent: [['Nitrógeno Total', 'Nitrógeno Kjeldahl']] as Array<[string, string]>, nonEquivalent: [] };
        const checks = normalizeParameterChecks([{ normParameter: 'Nitrógeno Total (N)', quotedAs: 'Nitrógeno Kjeldahl', problems: [] }]);
        applySystemChecks(checks, [], '', rules);
        expect(checks[0].problems).toEqual([]);
    });

    it('nombre no resuelto genera una consulta con clave estable', () => {
        const checks = normalizeParameterChecks([{ normParameter: 'Nitrógeno Total (N)', normLimit: '20 mg/L', quotedAs: 'Nitrógeno Kjeldahl', problems: [] }]);
        applySystemChecks(checks, []);
        const q = pendingNameQuestions(checks);
        expect(q).toEqual([{ normParameter: 'Nitrógeno Total (N)', quotedAs: 'Nitrógeno Kjeldahl', normReference: '20 mg/L' }]);
        expect(consultationKey('Nitrógeno Total (N)', 'Nitrógeno Kjeldahl')).toBe(consultationKey('Nitrógeno Kjeldahl', 'Nitrógeno Total (N)'));
    });

    it('reconoce el timeout de la IA y no lo confunde con otros errores', () => {
        expect(isAITimeout({ code: 'ECONNABORTED', message: 'timeout of 180000ms exceeded' })).toBe(true);
        expect(isAITimeout(new Error('timeout of 180000ms exceeded'))).toBe(true);
        expect(isAITimeout(new Error('connect ECONNREFUSED'))).toBe(false);
    });
});

describe('regla "no es el mismo parametro" (respuesta del laboratorio)', () => {
    it('una pareja marcada como distinta es parametro incorrecto (critico), no una duda', () => {
        const rules = { equivalent: [] as Array<[string, string]>, nonEquivalent: [['Cloruros', 'Cloro residual']] as Array<[string, string]> };
        const checks = normalizeParameterChecks([{ normParameter: 'Cloruros', quotedAs: 'Cloro residual', problems: [] }]);
        applySystemChecks(checks, [], '', rules);
        expect(kinds(checks)).toEqual({ 'Cloruros': 'PARAMETRO_INCORRECTO' });
        expect(pendingNameQuestions(checks)).toEqual([]);
        expect(buildVerdict({ checks }).status).toBe('NON_COMPLIANT');
    });
});

// SIACOT-20857-10-2026_V1 (19-oct): 32 parametros del articulo, 12 cotizados, 2 con
// nombre por confirmar y 20 sugeridos. Mostraba puntuacion 100 con 22 hallazgos.
function siacot20857Checks() {
    const quoted = Array.from({ length: 10 }, (_, i) => ({ normParameter: `Cotizado ${i + 1}`, quotedAs: `Cotizado ${i + 1}`, problems: [] }));
    const names = [
        { normParameter: 'Nitratos + Nitritos', quotedAs: 'AguasNitratos', problems: [{ type: 'NOMBRE_DISTINTO' }] },
        { normParameter: 'Nitrito', quotedAs: 'AguasNitritos', problems: [{ type: 'NOMBRE_DISTINTO' }] },
    ];
    const suggested = Array.from({ length: 20 }, (_, i) => ({ normParameter: `Sugerido ${i + 1}`, problems: [{ type: 'FALTANTE' }] }));
    return normalizeParameterChecks([...quoted, ...names, ...suggested]);
}

describe('puntuacion y decisiones de Ana (19-oct)', () => {
    it('la puntuacion cuenta lo cotizado con observaciones; ya no da 100 con nombres por confirmar', () => {
        const checks = siacot20857Checks();
        const v = buildVerdict({ checks });
        expect(v.status).toBe('REVIEW_REQUIRED');
        expect(v.score).toBe(83); // 10 de 12 cotizados sin observaciones
        expect(normCoverage(checks)).toEqual({ quoted: 12, total: 32 });
        expect(complianceScore(checks, new Set(['Nitrito', 'Nitratos + Nitritos']))).toBe(100);
    });

    const resultOf = (checks: ReturnType<typeof siacot20857Checks>) => ({ ...buildVerdict({ checks }), parameterChecks: checks });
    const review = (decision: any) => ({ decision, comment: 'ok', userName: 'Ana', at: '2026-10-19T15:00:00Z' });

    it('sin decisiones queda en revision y no habilita OIT', () => {
        const e = applyFindingReviews(resultOf(siacot20857Checks()), {});
        expect(e).toMatchObject({ status: 'REVIEW_REQUIRED', approvedForOit: false, pendingDecisions: 2, score: 83 });
    });

    it('Ana acepta los dos con justificacion -> conforme y habilitada para OIT', () => {
        const result = resultOf(siacot20857Checks());
        const keys = result.issues.filter(i => i.severity !== 'INFO').map(issueKey);
        expect(keys).toHaveLength(2);
        const reviews: FindingReviews = Object.fromEntries(keys.map(k => [k, review('ACEPTADO')]));
        expect(applyFindingReviews(result, reviews)).toMatchObject({ status: 'COMPLIANT', compliant: true, approvedForOit: true, score: 100, pendingDecisions: 0 });
    });

    it('uno aceptado y otro en revision sigue en revision; uno rechazado es no conforme', () => {
        const result = resultOf(siacot20857Checks());
        const [a, b] = result.issues.filter(i => i.severity !== 'INFO').map(issueKey);
        expect(applyFindingReviews(result, { [a]: review('ACEPTADO'), [b]: review('EN_REVISION') }))
            .toMatchObject({ status: 'REVIEW_REQUIRED', approvedForOit: false, pendingDecisions: 1, score: 92 });
        expect(applyFindingReviews(result, { [a]: review('ACEPTADO'), [b]: review('RECHAZADO') }))
            .toMatchObject({ status: 'NON_COMPLIANT', compliant: false, approvedForOit: false });
    });

    it('la clave del hallazgo no cambia si la IA redacta distinto al volver a analizar', () => {
        const a = { category: 'Nombre por confirmar', parameter: 'Nitrito', description: 'Texto uno' };
        const b = { category: 'Nombre por confirmar', parameter: 'Nitrito', description: 'Otro texto' };
        expect(issueKey(a)).toBe(issueKey(b));
    });

    it('un analisis con error no se puede aprobar con decisiones', () => {
        const e = applyFindingReviews({ error: 'Archivo no encontrado', issues: [{ severity: 'CRITICAL', category: 'Sistema', description: 'x' }] }, {});
        expect(e).toMatchObject({ status: 'REVIEW_REQUIRED', approvedForOit: false });
    });
});

describe('vinculo automatico OIT -> cotizacion', () => {
    const qs = [
        { id: 'v1', quotationNumber: 'SIACOT-20857-10-2026_V1' },
        { id: 'v2', quotationNumber: 'SIACOT-20857-10-2026_V2' },
        { id: 'x', quotationNumber: 'SIACOT-19445-11-2025' },
    ];
    it('prefiere el numero exacto', () => {
        expect(pickQuotation('SIACOT-20857-10-2026_V1', qs)?.id).toBe('v1');
        expect(pickQuotation('siacot-19445-11-2025', qs)?.id).toBe('x');
    });
    it('si la OIT cita otra version, toma la mas reciente del mismo numero', () => {
        expect(pickQuotation('SIACOT-20857-10-2026', qs)?.id).toBe('v2');
        expect(pickQuotation('SIACOT-20857-10-2026_V3', qs)?.id).toBe('v2');
    });
    it('no vincula a un numero distinto', () => {
        expect(pickQuotation('SIACOT-20858-10-2026', qs)).toBeNull();
        expect(baseQuotationNumber('SIACOT-20466-07-2026_V1')).toBe('SIACOT-20466-07-2026');
    });
});

describe('cliente impreso en la OIT', () => {
    it('lee NOMBRE EMPRESA y NIT del PDF de Serambiente (OIT 14824)', async () => {
        const { extractOitClient } = await import('../src/services/quotationLink');
        const text = 'INFORMACIÓN BÁSICA DEL CLIENTE\nNOMBRE EMPRESA:GREMCA AGRICULTURA Y ENERGIA SOSTENIBLE S.A.\nNIT:860031768-0\nDIRECCIÓN:CALLE 75 # 59 - 69';
        expect(extractOitClient(text)).toMatchObject({ name: 'GREMCA AGRICULTURA Y ENERGIA SOSTENIBLE S.A.', nit: '860031768-0' });
        expect(extractOitClient('sin datos')).toEqual({ name: null, nit: null, reportTo: null });
    });
});
