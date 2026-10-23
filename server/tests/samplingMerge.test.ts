import { describe, it, expect } from 'vitest';
import { mergeServiceSampling, pendingSamplingServices } from '../src/controllers/oit.controller';

describe('muestreo por servicio', () => {
    const agua = { serviceKey: 'ai-service-0', serviceName: 'Agua', steps: [{ description: 'Cliente', value: 'GREMCA' }], completedAt: '2026-10-23T15:00:00Z', warnings: [{ code: 'NO_GPS', message: 'Sin GPS' }] };
    const ruido = { serviceKey: 'ai-service-1', serviceName: 'Ruido', steps: [{ description: 'Calibración', value: '94 dB' }], completedAt: '2026-10-24T15:00:00Z' };

    it('un servicio no borra el muestreo de otro', () => {
        const first = mergeServiceSampling(null, agua);
        const both = mergeServiceSampling(JSON.stringify(first), ruido);
        expect(Object.keys(both.services)).toEqual(['ai-service-0', 'ai-service-1']);
        expect(both.steps.map((s: any) => s.description)).toEqual(['[Agua] Cliente', '[Ruido] Calibración']);
        expect(both.warnings).toEqual([{ code: 'NO_GPS', message: 'Sin GPS', service: 'Agua' }]);
    });

    it('con un solo servicio los pasos quedan como siempre (el informe no cambia)', () => {
        expect(mergeServiceSampling(null, agua).steps).toEqual([{ description: 'Cliente', value: 'GREMCA' }]);
    });

    it('volver a enviar el mismo servicio lo reemplaza', () => {
        const again = mergeServiceSampling(JSON.stringify(mergeServiceSampling(null, agua)), { ...agua, steps: [{ description: 'Cliente', value: 'otro' }] });
        expect(again.steps).toEqual([{ description: 'Cliente', value: 'otro' }]);
    });

    it('sabe que servicios con plantilla faltan', () => {
        const ai = JSON.stringify({ data: { services: [{ name: 'Agua', templates: [{ id: 't1' }] }, { name: 'Ruido', templates: [{ id: 't2' }] }, { name: 'Informe ICA' }] } });
        expect(pendingSamplingServices(ai, mergeServiceSampling(null, agua))).toEqual(['Ruido']);
        expect(pendingSamplingServices(ai, mergeServiceSampling(JSON.stringify(mergeServiceSampling(null, agua)), ruido))).toEqual([]);
    });
});
