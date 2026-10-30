import { describe, it, expect } from 'vitest';
import { dropOperationsMissing } from '../src/services/ai.service';
import { buildGroupedVerdict, issueKey } from '../src/services/quotationCompliance';

describe('faltantes que son de operaciones', () => {
    it('no reporta fecha de ejecución ni disponibilidad de personal como faltantes', () => {
        const out = dropOperationsMissing([
            'Fecha específica de ejecución de los servicios',
            'Confirmación de disponibilidad de personal',
            'Número de puntos de muestreo',
        ]);
        expect(out).toEqual(['Número de puntos de muestreo']);
    });
    it('tolera valores que no son lista', () => {
        expect(dropOperationsMissing(undefined)).toEqual([]);
    });
});

describe('hallazgos por servicio', () => {
    it('el mismo parámetro en dos matrices es un hallazgo distinto', () => {
        const base = { category: 'Límite de cuantificación', parameter: 'Zinc', description: 'x' };
        expect(issueKey({ ...base, matrix: 'Agua Superficial' })).not.toBe(issueKey({ ...base, matrix: 'Agua Potable' }));
        expect(issueKey(base)).toBe(issueKey({ ...base }));
    });

    it('un servicio que la cotización marca "No aplica" no genera hallazgos', () => {
        const v = buildGroupedVerdict([
            { label: 'Biota', noAplica: true, checks: [], unmatchedMatrix: [], comparedAgainst: [], warnings: [] },
            { label: 'Agua Potable', checks: [], unmatchedMatrix: [], comparedAgainst: [], warnings: [] },
        ]);
        expect(v.issues.some(i => i.matrix === 'Biota')).toBe(false);
        expect(v.summary).toContain('Biota');
    });
});
