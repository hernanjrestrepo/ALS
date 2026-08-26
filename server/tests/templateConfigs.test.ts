import { describe, it, expect } from 'vitest';
import TEMPLATE_CONFIGS, { getTemplateType } from '../src/config/templateConfigs';

describe('getTemplateType', () => {
    const byCode: Array<[string, string]> = [
        ['FO-PO-PSM-64-09 Informe RESPEL.docx', 'RESPEL'],
        ['FO-PO-PSM-64-10 Punto Seco.docx', 'PUNTO_SECO'],
        ['FO-PO-PSM-64-08 Agua.docx', 'ASUB'],
        ['FO-PO-PSM-74-01 Biota.docx', 'BIOTA'],
        ['FO-PO-PSM-64-11 Suelo.docx', 'SUELO'],
        ['FO-PO-PSM-65-09 Emision y Ambiental.docx', 'EMISION_RUIDO_AMBIENTAL'],
        ['FO-PO-PSM-65-06 Emision Ruido.docx', 'EMISION_RUIDO'],
        ['FO-PO-PSM-65-08 Intradomiciliario.docx', 'RUIDO_INTRADOMICILIARIO'],
        ['FO-PO-PSM-65-07 Ruido Ambiental.docx', 'RUIDO_AMBIENTAL'],
        ['FO-PO-PSM-66-18 Calidad Aire.docx', 'CALIDAD_AIRE'],
        ['FO-PO-PSM-66-19 Olores.docx', 'OLORES'],
        ['FO-PO-PSM-66-20 Particulas.docx', 'PARTICULAS_VIABLES'],
        ['FO-PO-PSM-67-10 Fuentes Fijas Previo.docx', 'FUENTES_FIJAS_PREVIO'],
        ['FO-PO-PSM-67-11 Fuentes Fijas.docx', 'FUENTES_FIJAS']
    ];

    it.each(byCode)('resolves %s to %s', (fileName, expected) => {
        expect(getTemplateType(fileName)).toBe(expected);
    });

    it('matches keywords case-insensitively', () => {
        expect(getTemplateType('informe respel final.docx')).toBe('RESPEL');
        expect(getTemplateType('Agua Subterranea.docx')).toBe('ASUB');
        expect(getTemplateType('estudio de BIOTA.docx')).toBe('BIOTA');
        expect(getTemplateType('caracterizacion de suelo.docx')).toBe('SUELO');
    });

    it('defaults to the water template for unknown names', () => {
        expect(getTemplateType('documento-desconocido.docx')).toBe('ASUB');
        expect(getTemplateType('')).toBe('ASUB');
    });

    it('prefers RESPEL over other matches when several keywords are present', () => {
        // RESPEL is evaluated first, so a mixed name resolves to it
        expect(getTemplateType('RESPEL 64-08 mixto.docx')).toBe('RESPEL');
    });
});

describe('TEMPLATE_CONFIGS registry', () => {
    it('registers a config for every template type returned by getTemplateType', () => {
        const resolvedTypes = new Set(
            [
                '64-09',
                '64-10',
                '64-08',
                '74-01',
                '64-11',
                '65-09',
                '65-06',
                '65-08',
                '65-07',
                '66-18',
                '66-19',
                '66-20',
                '67-10',
                '67-11'
            ].map(code => getTemplateType(`FO-PO-PSM-${code}.docx`))
        );

        for (const type of resolvedTypes) {
            expect(TEMPLATE_CONFIGS[type], `missing config for ${type}`).toBeDefined();
        }
    });

    it('keeps each config internally consistent', () => {
        for (const [key, config] of Object.entries(TEMPLATE_CONFIGS)) {
            expect(config.templateType, `templateType mismatch for ${key}`).toBe(key);
            expect(config.displayName.length).toBeGreaterThan(0);
            expect(config.filePattern.length).toBeGreaterThan(0);
            expect(Object.keys(config.fields).length).toBeGreaterThan(0);
        }
    });

    it('declares a valid source and description for every mapped field', () => {
        const validSources = ['OIT', 'AI', 'STATIC', 'SAMPLING', 'DATE', 'SYSTEM'];

        for (const [type, config] of Object.entries(TEMPLATE_CONFIGS)) {
            for (const [tag, mapping] of Object.entries(config.fields)) {
                expect(validSources, `${type}.${tag} has invalid source`).toContain(mapping.source);
                expect(typeof mapping.description).toBe('string');
                if (mapping.source === 'STATIC') {
                    expect(typeof mapping.staticValue, `${type}.${tag} STATIC without value`).toBe('string');
                } else if (mapping.source !== 'SYSTEM') {
                    expect(typeof mapping.field, `${type}.${tag} missing field`).toBe('string');
                }
            }
        }
    });
});
