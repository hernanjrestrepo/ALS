import { describe, it, expect, vi } from 'vitest';
vi.mock('@prisma/client', () => ({ PrismaClient: class { } }));
import { extractLabFacts, pickByCompany, quotationCoverage, autoLinkOit, type QuotationLite } from '../src/services/oitAutoLink';

// Texto real del resultado de laboratorio de la OIT 14833 (asi sale del PDF).
const LAB = 'Datos del Cliente \nEmpresa: COMPAS S.A. Ciudad: BARRANQUILLA \nDirección: VIA 40 las Flores Departamento: ATLÁNTICO \nDatos de análisis \nFecha Reporte: 2026-10-27 Orden de Servicio: 14833 3-AGUA POTABLE Muestreado por: ALS ENVIRONMENTAL S.A.S. \nFecha recepción: 2026-09-23 Tipo de muestra: AGUA POTABLE Lugar de muestreo: \nVía 40 # 85 -1560';

const q = (id: string, num: string, client: string, extra: Partial<QuotationLite> = {}): QuotationLite => ({ id, quotationNumber: num, clientName: client, ...extra });

describe('vinculo automatico de OIT sin PDF', () => {
    it('lee la empresa y el tipo de muestra del resultado de laboratorio', () => {
        expect(extractLabFacts(LAB)).toEqual({ company: 'COMPAS S.A.', samples: ['AGUA POTABLE'] });
        expect(extractLabFacts('sin datos')).toEqual({ company: null, samples: [] });
    });

    it('una sola cotizacion de la empresa: se vincula (el caso SIACOT-20741 de COMPAS)', () => {
        const r = pickByCompany(extractLabFacts(LAB), [q('1', 'SIACOT-20741-09-2026', 'COMPAS S.A.'), q('2', 'SIACOT-1-01-2026', 'OTRA EMPRESA S.A.S.')]);
        expect(r).toEqual({ status: 'vinculada', quotationNumber: 'SIACOT-20741-09-2026' });
    });

    it('el nombre se compara sin tildes, puntos ni tipo de sociedad', () => {
        const r = pickByCompany({ company: 'Tecnología y Consultorías Ambientales S.A.S.', samples: [] }, [q('1', 'SIACOT-5', 'TECNOLOGIA Y CONSULTORIAS AMBIENTALES SAS')]);
        expect(r.status).toBe('vinculada');
    });

    it('varias cotizaciones de la empresa: elige la que cubre el tipo de muestra', () => {
        const r = pickByCompany(extractLabFacts(LAB), [
            q('1', 'SIACOT-A', 'COMPAS S.A.', { services: [{ name: 'Agua residual no doméstica' }] }),
            q('2', 'SIACOT-B', 'COMPAS S.A.', { services: [{ name: 'Agua potable' }, { name: 'Agua superficial' }] }),
        ]);
        expect(r).toEqual({ status: 'vinculada', quotationNumber: 'SIACOT-B' });
    });

    it('usa las matrices que leyo el analisis de la cotizacion cuando no tiene servicios elegidos', () => {
        const cov = quotationCoverage(q('1', 'X', 'COMPAS', { complianceResult: JSON.stringify({ sampleMatrix: 'Agua Superficial, Caracterización de Agua Potable' }) }));
        expect(cov).toContain('agua potable');
        const r = pickByCompany(extractLabFacts(LAB), [
            q('1', 'SIACOT-A', 'COMPAS S.A.', { complianceResult: JSON.stringify({ sampleMatrix: 'Suelo' }) }),
            q('2', 'SIACOT-B', 'COMPAS S.A.', { complianceResult: JSON.stringify({ sampleMatrix: 'Agua Superficial, Caracterización de Agua Potable' }) }),
        ]);
        expect(r).toEqual({ status: 'vinculada', quotationNumber: 'SIACOT-B' });
    });

    it('una OIT de AGUA MARINA no se vincula a la cotizacion de COMPAS que cubre potable, superficial y biota (OIT 14601, 30-oct)', () => {
        const compas = q('1', 'SIACOT-20741-09-2026', 'COMPAS S.A.', { complianceResult: JSON.stringify({ sampleMatrix: 'Agua Superficial, Caracterización de Agua Potable, Caracterización de Biota Continental' }) });
        expect(pickByCompany({ company: 'COMPAS S.A.', samples: ['AGUA MARINA'] }, [compas]).status).toBe('sin_candidata');
        expect(pickByCompany({ company: 'COMPAS S.A.', samples: ['AGUA POTABLE'] }, [compas]).status).toBe('vinculada');
        expect(pickByCompany({ company: 'COMPAS S.A.', samples: ['AGUA SUPERFICIAL'] }, [compas]).status).toBe('vinculada');
    });

    it('si todavia no se sabe que cubre la cotizacion, se vincula por la empresa', () => {
        expect(pickByCompany({ company: 'COMPAS S.A.', samples: ['AGUA MARINA'] }, [q('1', 'SIACOT-A', 'COMPAS S.A.')]).status).toBe('vinculada');
    });

    it('si sigue habiendo mas de una, NO vincula (un vinculo equivocado es peor que ninguno)', () => {
        const r = pickByCompany(extractLabFacts(LAB), [q('1', 'SIACOT-A', 'COMPAS S.A.'), q('2', 'SIACOT-B', 'COMPAS S.A.')]);
        expect(r).toEqual({ status: 'ambigua', candidatas: ['SIACOT-A', 'SIACOT-B'] });
    });

    it('sin cotizacion de esa empresa o sin empresa no vincula', () => {
        expect(pickByCompany(extractLabFacts(LAB), [q('1', 'X', 'OTRA S.A.')]).status).toBe('sin_candidata');
        expect(pickByCompany({ company: null, samples: [] }, [q('1', 'X', 'COMPAS S.A.')]).status).toBe('sin_datos');
    });

    it('autoLinkOit guarda el vinculo y la empresa; no toca una OIT ya vinculada ni una con numero de cotizacion', async () => {
        const oits: any = {
            a: { id: 'a', oitNumber: '14833', quotationId: null, quotationRef: '', clientName: null, labResultsUrl: null },
            b: { id: 'b', oitNumber: '1', quotationId: 'q-viejo', quotationRef: '', clientName: null, labResultsUrl: null },
            c: { id: 'c', oitNumber: '2', quotationId: null, quotationRef: 'SIACOT-9-01-2026', clientName: null, labResultsUrl: null },
        };
        const db: any = {
            oIT: { findUnique: vi.fn(async ({ where }: any) => oits[where.id]), update: vi.fn(async ({ where, data }: any) => Object.assign(oits[where.id], data)) },
            quotation: { findMany: vi.fn(async () => [{ id: 'q1', quotationNumber: 'SIACOT-20741-09-2026', clientName: 'COMPAS S.A.', client: null, services: [], complianceResult: null, description: null }]) },
        };
        expect((await autoLinkOit('a', extractLabFacts(LAB), db)).status).toBe('vinculada');
        expect(oits.a.quotationId).toBe('q1');
        expect(oits.a.clientName).toBe('COMPAS S.A.');
        expect((await autoLinkOit('b', extractLabFacts(LAB), db)).status).toBe('ya_vinculada');
        expect(oits.b.quotationId).toBe('q-viejo');
        expect((await autoLinkOit('c', extractLabFacts(LAB), db)).status).toBe('sin_datos');
        expect(oits.c.quotationId).toBeNull();
    });
});
