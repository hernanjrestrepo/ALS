import { describe, it, expect } from 'vitest';
import { cleanSheetValues, parseJsonObject, buildSheetPrompt } from '../src/services/sheetReader';

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
