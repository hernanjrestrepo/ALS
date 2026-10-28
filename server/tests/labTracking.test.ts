import { describe, it, expect } from 'vitest';
import { classifyLabText, serviceStatuses, missingParameters, needsLabResult } from '../src/services/labTracking';
import { normalizeParameterName } from '../src/services/labNames';

const ai = JSON.stringify({ data: { services: [
    { name: 'Monitoreo de Agua Subterránea (MATRIZAGUAS)', templates: [{ id: 't' }] },
    { name: 'Ruido Ambiental', templates: [{ id: 'r' }] },
    { name: 'Elaboración de fichas ICA' },
] } });

describe('seguimiento de laboratorio', () => {
    it('los servicios de escritorio no esperan resultado', () => {
        expect(needsLabResult('Elaboración de fichas ICA')).toBe(false);
        expect(needsLabResult('Monitoreo de Agua')).toBe(true);
    });

    it('sin archivos: sin resultados; con archivos: parcial; con cargue completo: completo', () => {
        const base = { aiData: ai };
        expect(serviceStatuses(base).map(s => s.state)).toEqual(['SIN_RESULTADOS', 'SIN_RESULTADOS']);
        const withFile = { aiData: ai, labResultsUrl: JSON.stringify({ 'Monitoreo de Agua Subterránea (MATRIZAGUAS)': ['uploads/a.pdf'] }) };
        expect(serviceStatuses(withFile).map(s => s.state)).toEqual(['PARCIAL', 'SIN_RESULTADOS']);
        const done = { ...withFile, labComplete: JSON.stringify({ 'Monitoreo de Agua Subterránea (MATRIZAGUAS)': { at: '2026-10-28T12:00:00Z' } }) };
        expect(serviceStatuses(done)[0]).toMatchObject({ state: 'COMPLETO', complete: true });
    });

    it('un resultado guardado con el numero del servicio ("1") cuenta para ese servicio', () => {
        const s = serviceStatuses({ aiData: ai, labResultsUrl: JSON.stringify({ '2': ['uploads/r.pdf'] }) });
        expect(s[1].files).toHaveLength(1);
    });

    it('un archivo sin servicio aparece aparte', () => {
        const s = serviceStatuses({ aiData: ai, labResultsUrl: JSON.stringify({ Otro: ['uploads/x.pdf'] }) });
        expect(s.at(-1)).toMatchObject({ name: 'Otros resultados sin servicio' });
    });

    it('distingue resultados de ALS y de terceros por el encabezado', () => {
        expect(classifyLabText('ALS Life Sciences Colombia\nINFORME DE RESULTADOS')).toBe('ALS');
        expect(classifyLabText('SGS Colombia S.A.S.\nInforme de ensayo de laboratorio. Método SM 4500')).toBe('TERCERO');
        expect(classifyLabText('RESULTADOS DE LABORATORIO Código: FO-PO-PSM-26-08 Versión: 03 Datos del Cliente Empresa: LIMA S.A.S.')).toBe('ALS');
        expect(classifyLabText('')).toBe('DESCONOCIDO');
    });

    it('detecta los parametros cotizados que no aparecen en el resultado', () => {
        const results = 'pH 7,1 | Nitritos 0,02 mg/L | Conductividad 450';
        expect(missingParameters(['pH', 'AguasNitritos', 'Plomo', 'Conductividad eléctrica'], results)).toEqual(['Plomo']);
        expect(normalizeParameterName('AguasNitritos')).toBe('nitritos');
    });
});

import { webhookKeyOk } from '../src/utils/integrationPayload';

describe('clave compartida de los webhooks', () => {
    const req = (headers: any = {}, query: any = {}, body: any = {}) => ({ headers, query, body }) as any;
    it('sin WEBHOOK_SHARED_SECRET todo se acepta (como hasta hoy)', () => {
        delete process.env.WEBHOOK_SHARED_SECRET;
        expect(webhookKeyOk(req())).toBe(true);
    });
    it('con la clave definida solo entra quien la manda', () => {
        process.env.WEBHOOK_SHARED_SECRET = 'abc123';
        expect(webhookKeyOk(req())).toBe(false);
        expect(webhookKeyOk(req({ 'x-webhook-key': 'abc123' }))).toBe(true);
        expect(webhookKeyOk(req({}, { key: 'abc123' }))).toBe(true);
        expect(webhookKeyOk(req({}, {}, { key: 'otra' }))).toBe(false);
        delete process.env.WEBHOOK_SHARED_SECRET;
    });
});
