import { describe, it, expect } from 'vitest';
import { quotationsMentioned, quotationDetail, buildAssistantContext } from '../src/services/assistantContext';

const q = {
    id: 'q1', quotationNumber: 'SIACOT-20741-09-2026', clientName: 'COMPAS S.A.', status: 'NON_COMPLIANT', approvedForOit: false,
    client: { name: 'COMPAS S.A.', nit: '800156044-6' }, services: [{ name: 'Agua potable' }, { name: 'Agua superficial' }],
    linkedOITs: [{ oitNumber: '14833', status: 'PENDING' }],
    complianceResult: JSON.stringify({
        status: 'NON_COMPLIANT', score: 55, summary: 'Comparada contra Decreto 1076 art. 2.2.3.3.9.10',
        comparedAgainst: ['Decreto 1076 — artículo 2.2.3.3.9.10'], sampleMatrix: 'Agua Superficial, Agua Potable',
        issues: [{ severity: 'CRITICAL', category: 'Límite de cuantificación', parameter: 'Zinc', description: 'El límite cotizado (0.09 mg/L) es mayor que el de la norma (0.01 mg/L).', normReference: 'Decreto 1076 art. 2.2.3.3.9.10' }],
        parameterChecks: [{ normParameter: 'Zinc', normLimit: '0.01 mg/L', quotedAs: 'Zinc', quotedLoq: '0.09 mg/L', problems: [{ type: 'LIMITE_CUANTIFICACION' }] }],
    }),
    findingReviews: JSON.stringify({ 'limite de cuantificacion|zinc': { decision: 'ACEPTADO', comment: 'Se debe revisar porque los límites sí cumplen', userName: 'Ana Melendez', at: '2026-10-30' } }),
    extractedText: 'Documentos de referencia 1. Aguas: Decreto 1076 Artículo 2.2.3.3.9.10',
};

describe('Martha tiene acceso al detalle de las cotizaciones', () => {
    it('detecta la cotizacion por su numero SIACOT, la abierta en pantalla y la vinculada a la OIT', () => {
        const list = [{ id: 'q1', quotationNumber: 'SIACOT-20741-09-2026' }, { id: 'q2', quotationNumber: 'SIACOT-20857-10-2026_V1' }];
        expect(quotationsMentioned('¿por qué SIACOT-20741 tiene diferencias?', list).map(x => x.id)).toEqual(['q1']);
        expect(quotationsMentioned('siacot 20857', list).map(x => x.id)).toEqual(['q2']);
        expect(quotationsMentioned('hola', list, 'q2').map(x => x.id)).toEqual(['q2']);
        expect(quotationsMentioned('hola', list, undefined, ['q1']).map(x => x.id)).toEqual(['q1']);
        expect(quotationsMentioned('hola', list)).toEqual([]);
    });

    it('el detalle trae norma, limite cotizado, hallazgos, decision de Ana, OIT y texto del documento', () => {
        const d = quotationDetail(q);
        expect(d).toContain('COMPAS S.A.');
        expect(d).toContain('puntaje 55/100');
        expect(d).toContain('Agua potable, Agua superficial');
        expect(d).toContain('#14833');
        expect(d).toContain('límite norma: 0.01 mg/L | cotizado como: Zinc | LC cotizado: 0.09 mg/L');
        expect(d).toContain('DECISIÓN de Ana Melendez (ACEPTADO): Se debe revisar porque los límites sí cumplen');
        expect(d).toContain('Documentos de referencia');
    });

    it('el detalle entra al contexto que recibe la IA', () => {
        const ctx = buildAssistantContext({ oits: [], quotations: [], templates: [], standards: [], resources: [], users: [], nonConformities: [], unreadNotifications: 0, quotationDetails: [q] }, 'por que difiere el zinc');
        expect(ctx).toContain('DETALLE COMPLETO DE LAS COTIZACIONES');
        expect(ctx).toContain('LC cotizado: 0.09 mg/L');
    });
});
