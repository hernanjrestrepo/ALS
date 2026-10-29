import { describe, it, expect } from 'vitest';
import { readLabHeader, deterministicSections, aiTextIsGrounded, longDate, measurementsFromSampling } from '../src/services/reportContext';
import { matrixLabel, countWords } from '../src/services/reportPostProcess';

// Texto real del resultado de laboratorio de la OIT 14985 (servicio 1).
const LAB = `RESULTADOS DE LABORATORIO  Versión: 01
Reporte No.  27117
Datos del Cliente
Empresa:  ADVISORS PROAMBIENTE S.A.S  Ciudad:  BARRANQUILLA
Teléfono:  3600434/3008034688  Contacto:  GLORIA SANTANDER
Fecha Reporte:  2026-10-27  Orden de Servicio:  14985 1-AGUA DE PISCINA  Normatividad:  Resolución Número 000234 DE 2026
Fecha de muestreo:  2026-10-16  Muestreado por:  CLIENTE`;

const results = [
    { parametro: 'Coliformes Termotolerantes', valor: '0', unidad: 'UFC/100 cm³', normativa: '0', cumple: true },
    { parametro: 'E. Coli', valor: '0', unidad: 'UFC/100 cm³', normativa: '0', cumple: true },
    { parametro: 'Mesoaerobios', valor: '0', unidad: 'UFC/mL', normativa: '200', cumple: true },
];

describe('contexto del informe', () => {
    it('lee numero de reporte, fecha, norma, contacto y telefono del reporte de laboratorio', () => {
        const h = readLabHeader(LAB);
        expect(h.reportNumber).toBe('27117');
        expect(h.sampleDate).toBe('2026-10-16');
        expect(h.norm).toBe('Resolución Número 000234 DE 2026');
        expect(h.contact).toBe('GLORIA SANTANDER');
        expect(h.phone).toContain('3600434');
        expect(longDate('2026-10-16')).toBe('16 de octubre de 2026');
    });

    it('nombra la matriz segun el servicio: la plantilla de agua dice subterranea', () => {
        expect(matrixLabel('Análisis de agua de piscina - Servicio 1')).toMatchObject({ word: 'de piscina', groundwater: false });
        expect(matrixLabel('Monitoreo de agua subterránea (MATRIZAGUAS)').groundwater).toBe(true);
        expect(matrixLabel('Análisis de agua potable').word).toBe('potable');
        expect(countWords(1)).toBe('1 (uno)');
    });

    it('analisis y conclusiones salen solo de los datos', () => {
        const s = deterministicSections('Análisis de agua de piscina - Servicio 1', results, 'Resolución Número 000234 DE 2026', []);
        expect(s.analysis[0]).toContain('3 parámetro(s)');
        expect(s.analysis.join(' ')).toContain('E. Coli: se reportó 0 UFC/100 cm³ frente a un valor aceptable de 0 UFC/100 cm³; el resultado cumple.');
        expect(s.conclusions[0]).toContain('cumplen frente a Resolución Número 000234 DE 2026');
        expect(s.conclusions.join(' ')).toContain('No se registraron mediciones in situ');
    });

    it('un parametro que no cumple aparece en las conclusiones', () => {
        const s = deterministicSections('Agua potable', [{ ...results[0], valor: '5', cumple: false }], undefined, []);
        expect(s.conclusions.join(' ')).toContain('No cumplen: Coliformes Termotolerantes (5 UFC/100 cm³, aceptable 0)');
    });

    it('rechaza texto de la IA con cifras que no estan en los datos', () => {
        const source = JSON.stringify({ results });
        expect(aiTextIsGrounded('Los tres parámetros reportaron 0 UFC.', source)).toBe(true);
        expect(aiTextIsGrounded('El pH fue 7,8 y la turbiedad 45 NTU.', source)).toBe(false);
    });

    it('toma las mediciones y el GPS del muestreo del servicio', () => {
        const sampling = JSON.stringify({ services: { 'ai-service-0': { serviceName: 'Agua', steps: [{ measurements: [{ name: 'pH', value: '7,11', unit: 'unid.' }] }], visits: [{ arrival: { gps: { lat: 10.95, lng: -74.76 } } }] } } });
        const r = measurementsFromSampling(sampling, 'Agua');
        expect(r.field).toEqual([{ name: 'pH', value: '7,11', unit: 'unid.' }]);
        expect(r.coordinates).toBe('10.950000°, -74.760000°');
    });
});
