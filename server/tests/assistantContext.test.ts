import { describe, it, expect } from 'vitest';
import { buildAssistantContext, oitsMentioned, resourcesMatching, oitExtract, AssistantData } from '../src/services/assistantContext';

const now = new Date('2026-10-05T12:00:00Z');
const oit = (n: string, extra: any = {}) => ({
    id: 'id-' + n, oitNumber: n, status: 'PENDING', createdAt: new Date('2026-09-21'), updatedAt: new Date('2026-09-22'),
    assignedEngineers: [], quotation: null, planningAccepted: false, ...extra,
});
const base = (over: Partial<AssistantData> = {}): AssistantData => ({
    oits: [
        oit('14843', {
            status: 'COMPLETED', location: 'Bogotá', planningAccepted: true,
            assignedEngineers: [{ user: { name: 'Maria Gutierrez', email: 'maria@x.co' } }],
            quotation: { quotationNumber: 'COT-9', clientName: 'VitAE Ingeniería', status: 'APPROVED' },
            aiData: JSON.stringify({ data: { services: [{ name: 'Agua residual' }], alerts: ['a1'], missing: [] } }),
            samplingData: JSON.stringify({ steps: [{ description: 'pH', value: '7.2' }] }),
            finalAnalysis: 'Resumen del muestreo',
        }),
        oit('14856', { location: 'Bar Rodadero' }),
    ],
    quotations: [{ quotationNumber: 'COT-9', clientName: 'VitAE Ingeniería', status: 'APPROVED', approvedForOit: true, createdAt: new Date('2026-09-01'), description: 'Monitoreo' }],
    templates: [{ name: 'Agua subterránea', oitType: 'AGUA', steps: JSON.stringify([{}, {}]) }],
    standards: [{ title: 'Resolución 0631 de 2015', type: 'Agua', description: 'Vertimientos' }],
    resources: [
        { name: 'Sonómetro clase 1', code: 'SON-01', type: 'Ruido', status: 'AVAILABLE', brand: 'Cirrus', calibrationExpiry: new Date('2026-09-01') },
        { name: 'Multiparámetro', code: 'MP-02', type: 'Aguas', status: 'AVAILABLE', calibrationExpiry: new Date('2026-10-20') },
        { name: 'Bomba PM10', code: 'B-03', type: 'Calidad del aire', status: 'IN_USE', calibrationExpiry: new Date('2027-05-01') },
    ],
    users: [{ id: 'u1', name: 'Maria Gutierrez', email: 'maria@x.co', role: 'ENGINEER' }, { id: 'u2', name: 'Admin', email: 'a@x.co', role: 'SUPER_ADMIN' }],
    nonConformities: [{ title: 'Envase roto', description: 'Se rompió un envase', severity: 'MENOR', status: 'ABIERTA', oit: { oitNumber: '14843' } }],
    unreadNotifications: 3,
    ...over,
});

describe('buildAssistantContext', () => {
    it('incluye TODAS las OIT, una linea cada una, con cliente, servicios e ingeniero', () => {
        const ctx = buildAssistantContext(base(), '¿cuántas OIT hay?', { now });
        expect(ctx).toContain('TODAS LAS OIT (2)');
        expect(ctx).toMatch(/#14843 \| Completada .*cliente: VitAE Ingeniería.*servicios: Agua residual.*ingenieros: Maria Gutierrez/);
        expect(ctx).toMatch(/#14856 \| Pendiente .*sin ingeniero/);
        expect(ctx).toContain('Completada: 1');
    });

    it('resume los recursos por tipo en vez de listarlos todos, y avisa de calibraciones', () => {
        const ctx = buildAssistantContext(base(), 'hola', { now });
        expect(ctx).toContain('- Ruido: 1 (1 disponibles)');
        expect(ctx).toContain('- Calidad del aire: 1 (0 disponibles)');
        expect(ctx).toMatch(/Calibración vencida: 1 → Sonómetro clase 1 \[SON-01\] \(2026-09-01\)/);
        expect(ctx).toMatch(/por vencer en 60 días: 1 → Multiparámetro \[MP-02\] \(2026-10-20\)/);
        expect(ctx).not.toContain('RECURSOS QUE COINCIDEN');
    });

    it('agrega el detalle completo de la OIT que la pregunta nombra', () => {
        const ctx = buildAssistantContext(base(), 'resume la OIT 14843', { now });
        expect(ctx).toContain('DETALLE DE LAS OIT QUE MENCIONA LA PREGUNTA');
        expect(ctx).toContain('1. pH: 7.2');
        expect(ctx).toContain('Análisis del muestreo: Resumen del muestreo');
        expect(ctx).toContain('Cotización: COT-9 (VitAE Ingeniería, APPROVED)');
    });

    it('agrega los recursos que coinciden con la pregunta', () => {
        const ctx = buildAssistantContext(base(), '¿tenemos sonómetro disponible?', { now });
        expect(ctx).toContain('RECURSOS QUE COINCIDEN CON LA PREGUNTA (1)');
        expect(ctx).toMatch(/Sonómetro clase 1 \| código SON-01 \| Ruido \| Cirrus \| disponible/);
    });

    it('incluye cotizaciones, normas, plantillas, ingenieros, no conformidades y notificaciones', () => {
        const ctx = buildAssistantContext(base(), 'hola', { now });
        expect(ctx).toContain('COT-9 | cliente: VitAE Ingeniería');
        expect(ctx).toContain('Resolución 0631 de 2015 | Agua');
        expect(ctx).toContain('Agua subterránea | tipo: AGUA | 2 pasos');
        expect(ctx).toContain('Maria Gutierrez <maria@x.co>');
        expect(ctx).toContain('OIT #14843 | MENOR ABIERTA | Envase roto');
        expect(ctx).toContain('Notificaciones sin leer del usuario: 3');
    });

    it('con 600 recursos y 200 OIT el contexto sigue siendo compacto', () => {
        const many = base({
            resources: Array.from({ length: 600 }, (_, i) => ({ name: 'Equipo ' + i, code: 'E' + i, type: 'Calidad del aire', status: 'AVAILABLE' })),
            oits: Array.from({ length: 200 }, (_, i) => oit(String(15000 + i))),
        });
        const ctx = buildAssistantContext(many, '¿cuántos equipos hay?', { now });
        expect(ctx).toContain('Recursos/equipos: 600');
        expect(ctx.length).toBeLessThan(40000); // ~10k tokens: cabe en el contexto de 16384
    });

    it('no rompe con datos corruptos o vacios', () => {
        const ctx = buildAssistantContext(base({ oits: [oit('1', { aiData: '{no json', samplingData: 'x' })], quotations: [], resources: [], nonConformities: [] }), 'oit 1', { now });
        expect(ctx).toContain('#1 | Pendiente');
        expect(ctx).toContain('(ninguna)');
    });
});

describe('oitsMentioned / resourcesMatching / oitExtract', () => {
    const d = base();
    it('detecta numeros de OIT como palabra completa', () => {
        expect(oitsMentioned('estado de la 14843 por favor', d.oits).map(o => o.oitNumber)).toEqual(['14843']);
        expect(oitsMentioned('el valor 148431 no existe', d.oits)).toEqual([]);
    });
    it('pone primero la OIT abierta en pantalla', () => {
        expect(oitsMentioned('compárala con la 14843', d.oits, 'id-14856').map(o => o.oitNumber)).toEqual(['14856', '14843']);
    });
    it('ignora palabras genericas al buscar recursos', () => {
        expect(resourcesMatching('lista los equipos del sistema', d.resources)).toEqual([]);
        expect(resourcesMatching('equipos de la marca cirrus', d.resources).map(r => r.code)).toEqual(['SON-01']);
    });
    it('lee servicios en ambas formas (objeto o texto)', () => {
        expect(oitExtract({ aiData: JSON.stringify({ data: { services: ['Ruido', { name: 'Aire' }] } }) }).services).toEqual(['Ruido', 'Aire']);
    });
});
