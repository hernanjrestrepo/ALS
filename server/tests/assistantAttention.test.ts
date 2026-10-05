import { describe, it, expect } from 'vitest';
import { oitAttention, buildAssistantContext } from '../src/services/assistantContext';

// Forma real guardada en produccion cuando el analisis de laboratorio agota el tiempo
const labTimeout = JSON.stringify({ '1': JSON.stringify({ rawText: 'Error en análisis IA de resultados de laboratorio: timeout of 180000ms exceeded', parsedData: {}, error: true }) });
const oit = (n: string, extra: any = {}) => ({ id: 'id-' + n, oitNumber: n, status: 'PENDING', createdAt: new Date('2026-09-21'), updatedAt: new Date('2026-09-22'), assignedEngineers: [], quotation: null, planningAccepted: false, ...extra });

describe('oitAttention', () => {
    it('explica el timeout del analisis de laboratorio y como resolverlo', () => {
        const a = oitAttention(oit('14803', { status: 'REVIEW_NEEDED', labResultsAnalysis: labTimeout }))!;
        expect(a.cause).toContain('superó el tiempo límite de 3 minutos');
        expect(a.solution).toContain('cargar de nuevo el PDF de resultados de laboratorio');
    });
    it('explica otros errores de laboratorio citando el mensaje', () => {
        const lab = JSON.stringify({ General: JSON.stringify({ rawText: 'Error en análisis IA de resultados de laboratorio: Unexpected token', error: true }) });
        expect(oitAttention(oit('1', { status: 'REVIEW_NEEDED', labResultsAnalysis: lab }))!.cause).toContain('Unexpected token');
    });
    it('reconoce el texto de error plano (formato legado)', () => {
        expect(oitAttention(oit('1', { status: 'REVIEW_NEEDED', labResultsAnalysis: 'Error interno al procesar resultados. Por favor, revise el documento manualmente.' }))!.cause).toContain('Error interno');
    });
    it('pendiente de aprobacion: lista faltantes, alertas y la planeacion sin aceptar', () => {
        const a = oitAttention(oit('14080', { status: 'REVIEW_REQUIRED', aiData: JSON.stringify({ data: { missing: ['Falta la dirección'], alerts: ['Fecha vencida'] } }) }))!;
        expect(a.cause).toContain('Falta la dirección');
        expect(a.cause).toContain('Fecha vencida');
        expect(a.cause).toContain('planeación aún no ha sido aceptada');
        expect(a.solution).toContain('pestaña Agenda');
    });
    it('en revision sin detalle guardado: lo dice sin inventar', () => {
        expect(oitAttention(oit('1', { status: 'REVIEW_NEEDED' }))!.cause).toContain('no guardó el detalle');
    });
    it('una OIT normal no requiere atencion, aunque su analisis de laboratorio mencione la palabra error en el texto', () => {
        expect(oitAttention(oit('1'))).toBeNull();
        const ok = JSON.stringify({ General: JSON.stringify({ rawText: 'Los resultados no presentan error de medición.', parsedData: {} }) });
        expect(oitAttention(oit('2', { status: 'COMPLETED', labResultsAnalysis: ok }))).toBeNull();
    });
});

describe('buildAssistantContext: seccion de atencion', () => {
    it('incluye causa y que hacer por cada OIT detenida', () => {
        const ctx = buildAssistantContext({
            oits: [oit('14803', { status: 'REVIEW_NEEDED', labResultsAnalysis: labTimeout, location: 'Bogotá' }), oit('14856')],
            quotations: [], templates: [], standards: [], resources: [], users: [], nonConformities: [], unreadNotifications: 0,
        }, '¿a qué se deben los casos en review_needed?', { now: new Date('2026-10-05') });
        expect(ctx).toContain('OIT QUE REQUIEREN ATENCIÓN (1): CAUSA Y QUÉ HACER');
        expect(ctx).toMatch(/1 OIT\n  OIT: #14803 \(Requiere revisión, Bogotá\)\n  Causa: .*3 minutos.*\n  Qué hacer: /);
    });
    it('agrupa las OIT con la misma causa para explicarla una sola vez', () => {
        const ctx = buildAssistantContext({
            oits: [oit('14803', { status: 'REVIEW_NEEDED', labResultsAnalysis: labTimeout }), oit('14793', { status: 'REVIEW_NEEDED', labResultsAnalysis: labTimeout }), oit('14080', { status: 'REVIEW_REQUIRED' })],
            quotations: [], templates: [], standards: [], resources: [], users: [], nonConformities: [], unreadNotifications: 0,
        }, 'causas', { now: new Date('2026-10-05') });
        expect(ctx).toContain('Grupo 1: 2 OIT con LA MISMA causa y la misma solución\n  OIT: #14803 (Requiere revisión); #14793 (Requiere revisión)');
        expect(ctx).toContain('Grupo 2: 1 OIT\n  OIT: #14080 (Pendiente de aprobación)');
        expect((ctx.match(/superó el tiempo límite de 3 minutos/g) || []).length).toBe(1);
    });
});
