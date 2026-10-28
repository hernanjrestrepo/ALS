import { describe, it, expect } from 'vitest';
import { cleanSheetValues, parseJsonObject, buildSheetPrompt, valueIsNearLabel } from '../src/services/sheetReader';

const fields = [{ key: 'ph', label: 'pH', unit: 'unid. pH' }, { key: 'cond', label: 'Conductividad', unit: 'µS/cm' }, { key: 'obs', label: 'Observaciones' }];

describe('lectura de planilla por foto', () => {
    it('toma solo los campos pedidos y descarta vacios o ilegibles', () => {
        const raw = { ph: '7,32', cond: 845, obs: 'N/A', inventado: '99', extra: null };
        expect(cleanSheetValues(raw, fields)).toEqual({ ph: '7,32', cond: '845' });
    });

    it('lee el JSON aunque el modelo agregue texto alrededor (respuesta real del 23-oct)', () => {
        expect(parseJsonObject('Aquí está:\n{\n "ph": "7,32",\n "cond": "845"\n}')).toEqual({ ph: '7,32', cond: '845' });
        expect(parseJsonObject('sin json')).toBeNull();
    });

    it('el pedido lista cada campo con su unidad y prohibe adivinar', () => {
        const p = buildSheetPrompt(fields);
        expect(p).toContain('"cond": Conductividad (µS/cm)');
        expect(p).toContain('NUNCA adivines');
    });
});

describe('valor inventado por la IA', () => {
    const text = 'pH  unidades de pH  SM 4500H+ B  7,11  7,12\nConductividad  µS/cm  mS/cm  SM 2510 B\n\nTemperatura Muestra  30,1  30,1\nRANGOS Conductividad 84 uS/cm - 50 mS/cm';
    it('acepta el valor que esta junto al parametro', () => {
        expect(valueIsNearLabel(text, { key: 'a', label: 'Parámetros in situ — pH' }, '7,11')).toBe(true);
        expect(valueIsNearLabel(text, { key: 'b', label: 'Parámetros in situ — Temperatura' }, '30,1')).toBe(true);
    });
    it('rechaza el numero que no esta junto al parametro (conductividad en blanco)', () => {
        expect(valueIsNearLabel(text, { key: 'c', label: 'Parámetros in situ — Conductividad' }, '20')).toBe(false);
    });
    it('no comprueba lo que no es numerico', () => {
        expect(valueIsNearLabel(text, { key: 'd', label: 'Toma de muestra' }, 'según protocolo')).toBe(true);
    });
});
