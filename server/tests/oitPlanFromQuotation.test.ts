import { describe, it, expect } from 'vitest';
import { hasPlannedServices, planFromQuotation } from '../src/services/oitPlanFromQuotation';

describe('plan de una OIT sin documento', () => {
    it('toma los servicios de la cotización con su duración', () => {
        const q = { quotationNumber: 'SIACOT-20741-09-2026', aiData: JSON.stringify({ services: [
            { name: 'Caracterización de Agua Superficial (2 puntos)', proposedDate: null, duration: 1 },
            { name: 'Caracterización de Agua Potable (3 puntos)', proposedDate: null, duration: 2 },
        ] }) };
        const plan = JSON.parse(planFromQuotation(q)!);
        expect(plan.valid).toBe(true);
        expect(plan.data.services.map((s: any) => s.name)).toEqual(['Caracterización de Agua Superficial (2 puntos)', 'Caracterización de Agua Potable (3 puntos)']);
        expect(plan.data.services[1].duration).toBe(2);
        expect(hasPlannedServices(JSON.stringify(plan))).toBe(true);
    });
    it('sin servicios en el análisis usa los servicios seleccionados', () => {
        const plan = JSON.parse(planFromQuotation({ quotationNumber: 'X', aiData: null, services: [{ name: 'Agua' }] })!);
        expect(plan.data.services).toHaveLength(1);
    });
    it('sin nada que programar devuelve null', () => {
        expect(planFromQuotation({ quotationNumber: 'X', aiData: null })).toBeNull();
        expect(hasPlannedServices(null)).toBe(false);
    });
});
