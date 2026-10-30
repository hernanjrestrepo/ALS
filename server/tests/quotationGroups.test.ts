import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseServiceGroups, parseReferences } from '../src/services/quotationGroups';

// Texto real de la cotizacion SIACOT-20741-09-2026 (COMPAS): 3 servicios y 3 referencias.
const COMPAS = fs.readFileSync(path.join(__dirname, 'fixtures/cotizacion-compas-3-matrices.txt'), 'utf8');

describe('cotizacion con varias matrices: cada una con su norma y articulo', () => {
    const groups = parseServiceGroups(COMPAS);

    it('separa los 3 servicios de la cotizacion de COMPAS', () => {
        expect(groups.map(g => g.index)).toEqual([1, 2, 3]);
        expect(groups[0].title).toMatch(/Agua Superficial/);
        expect(groups[1].title).toMatch(/Biota/); // el titulo punteado corrige el "Aguas Superficial" mal escrito
        expect(groups[2].title).toMatch(/Agua Potable/);
    });

    it('cada servicio trae solo su propia tabla de analisis', () => {
        expect(groups[0].text).toMatch(/Cobre/);
        expect(groups[0].text).toMatch(/Zinc/);
        expect(groups[0].text).not.toMatch(/Alcalinidad/);        // eso es agua potable
        expect(groups[0].text).not.toMatch(/Fitoplancton/);       // eso es biota
        expect(groups[1].text).toMatch(/Fitoplancton/);
        expect(groups[1].text).not.toMatch(/Cobre/);
        expect(groups[2].text).toMatch(/Alcalinidad/);
        expect(groups[2].text).not.toMatch(/Mercurio/);
    });

    it('Aguas: Decreto 1076, articulos 2.2.3.3.9.10 y 2.2.3.3.9.13', () => {
        expect(groups[0].noAplica).toBe(false);
        expect(groups[0].targets).toHaveLength(1);
        expect(groups[0].targets[0].normNumber).toBe('1076');
        expect(groups[0].targets[0].articles).toEqual(['2.2.3.3.9.10', '2.2.3.3.9.13']);
    });

    it('Biota: "No aplica" se respeta (no se compara con nada)', () => {
        expect(groups[1].noAplica).toBe(true);
        expect(groups[1].targets).toEqual([]);
    });

    it('Agua potable: Resolucion 2115, articulo 13', () => {
        expect(groups[2].targets).toHaveLength(1);
        expect(groups[2].targets[0].normNumber).toBe('2115');
        expect(groups[2].targets[0].articles).toEqual(['13']);
    });

    it('lee las 3 referencias con su etiqueta', () => {
        const refs = parseReferences(COMPAS);
        expect(refs.map(r => r.label)).toEqual(['Aguas', 'Biota Acuatica Continental', 'Agua Potable']);
    });

    it('una cotizacion sin servicios numerados no se separa (se compara todo junto como antes)', () => {
        expect(parseServiceGroups('Cotizacion simple.\nMatriz Analisis Metodo\nAguas pH SM 4500\nArtículo de la norma a comparar: 2.2.3.3.9.7')).toEqual([]);
    });

    it('sin seccion de referencias: la frase "para el informe de agua potable, comparar con la resolucion 2115" va al servicio de agua potable', () => {
        const text = [
            '1. Caracterización de Agua Superficial', 'Caracterización de Agua Superficial en 2 punto(s)', 'MatrizAnálisisMétodo', 'AguasCobre SM 3030K 0.003 mg/L',
            '2. Caracterización de Agua Potable', 'Caracterización de Agua Potable en 3 punto(s)', 'MatrizAnálisisMétodo', 'Agua PotableAlcalinidad SM 2320 10',
            'Para el informe de agua potable, comparar con la resolución 2115 del 2007 sobre agua para consumo humano.',
            'Artículo de la norma a comparar:', '13',
        ].join('\n');
        const g = parseServiceGroups(text);
        expect(g).toHaveLength(2);
        expect(g[0].targets).toEqual([]);
        expect(g[1].targets[0]?.normNumber).toBe('2115');
    });
});
