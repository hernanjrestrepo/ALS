import { describe, it, expect } from 'vitest';
import { WaterIndicesService } from '../src/services/water-indices';

describe('WaterIndicesService.calculateICOMO', () => {
    it('returns null when any input is missing', () => {
        expect(WaterIndicesService.calculateICOMO(undefined, 100, 50)).toBeNull();
        expect(WaterIndicesService.calculateICOMO(5, undefined, 50)).toBeNull();
        expect(WaterIndicesService.calculateICOMO(5, 100, undefined)).toBeNull();
    });

    it('scores clean water as no contamination', () => {
        // satOD 100 -> iOD 0, dbo < 2 -> 0, coli < 500 -> 0
        expect(WaterIndicesService.calculateICOMO(1, 100, 100)).toEqual({
            value: 0,
            label: 'Ninguna'
        });
    });

    it('caps the sub-indices at 1 for extreme contamination', () => {
        // dbo > 30 -> 1, coli > 20000 -> 1, satOD 0 -> iOD 1
        expect(WaterIndicesService.calculateICOMO(45, 50000, 0)).toEqual({
            value: 1,
            label: 'Muy alto'
        });
    });

    it('applies the logarithmic formulas inside the interpolation ranges', () => {
        const iOD = 1 - 0.01 * 60;
        const iDBO = -0.05 + 0.7 * Math.log10(10);
        const iColi = -1.44 + 0.56 * Math.log10(5000);
        const expected = Number(((iOD + iDBO + iColi) / 3).toFixed(3));

        const result = WaterIndicesService.calculateICOMO(10, 5000, 60);
        expect(result?.value).toBe(expected);
        expect(result?.label).toBe('Medio');
    });

    it('treats saturation above 100% as fully oxygenated', () => {
        const result = WaterIndicesService.calculateICOMO(1, 100, 120);
        expect(result?.value).toBe(0);
    });
});

describe('WaterIndicesService.calculateICOMI', () => {
    it('returns null when any input is missing', () => {
        expect(WaterIndicesService.calculateICOMI(undefined, 100, 100)).toBeNull();
        expect(WaterIndicesService.calculateICOMI(50, undefined, 100)).toBeNull();
        expect(WaterIndicesService.calculateICOMI(50, 100, undefined)).toBeNull();
    });

    it('returns zero for values below the lower thresholds', () => {
        expect(WaterIndicesService.calculateICOMI(20, 40, 40)).toEqual({
            value: 0,
            label: 'Ninguna'
        });
    });

    it('caps each sub-index at 1 above the upper thresholds', () => {
        expect(WaterIndicesService.calculateICOMI(200, 300, 300)).toEqual({
            value: 1,
            label: 'Muy alto'
        });
    });

    it('interpolates conductivity, hardness and alkalinity in range', () => {
        const iCond = Math.pow(10, -9.09 + 4.4 * Math.log10(100));
        const iHard = -0.25 + 0.005 * 200;
        const iAlcal = -0.25 + 0.005 * 200;
        const expected = Number(((iCond + iHard + iAlcal) / 3).toFixed(3));

        const result = WaterIndicesService.calculateICOMI(100, 200, 200);
        expect(result?.value).toBe(expected);
    });
});

describe('WaterIndicesService.calculateICOSUS', () => {
    it('returns null when sst is missing', () => {
        expect(WaterIndicesService.calculateICOSUS(undefined)).toBeNull();
    });

    it('returns zero below 10 mg/L', () => {
        expect(WaterIndicesService.calculateICOSUS(5)).toEqual({ value: 0, label: 'Ninguna' });
    });

    it('returns 1 above 340 mg/L', () => {
        expect(WaterIndicesService.calculateICOSUS(400)).toEqual({ value: 1, label: 'Muy alto' });
    });

    it('interpolates linearly inside the range', () => {
        expect(WaterIndicesService.calculateICOSUS(100)).toEqual({ value: 0.28, label: 'Bajo' });
    });
});

describe('WaterIndicesService.calculateRemoval', () => {
    it('returns null on missing values or a zero inlet', () => {
        expect(WaterIndicesService.calculateRemoval(undefined, 10)).toBeNull();
        expect(WaterIndicesService.calculateRemoval(10, undefined)).toBeNull();
        expect(WaterIndicesService.calculateRemoval(0, 10)).toBeNull();
    });

    it('labels removal efficiency by percentage bands', () => {
        expect(WaterIndicesService.calculateRemoval(100, 10)).toEqual({ value: 90, label: 'Alta' });
        expect(WaterIndicesService.calculateRemoval(100, 20)).toEqual({ value: 80, label: 'Alta' });
        expect(WaterIndicesService.calculateRemoval(100, 40)).toEqual({ value: 60, label: 'Media' });
        expect(WaterIndicesService.calculateRemoval(100, 50)).toEqual({ value: 50, label: 'Media' });
        expect(WaterIndicesService.calculateRemoval(100, 80)).toEqual({ value: 20, label: 'Baja' });
    });

    it('reports negative removal when the outlet is worse than the inlet', () => {
        expect(WaterIndicesService.calculateRemoval(50, 75)).toEqual({ value: -50, label: 'Baja' });
    });
});

describe('contamination labels', () => {
    it('maps each band via the public ICOSUS entry point', () => {
        // value = -0.02 + 0.003 * sst
        const cases: Array<[number, string]> = [
            [10, 'Ninguna'], // 0.01
            [70, 'Ninguna'], // 0.19
            [140, 'Bajo'], // 0.4
            [200, 'Medio'], // 0.58
            [260, 'Alto'], // 0.76
            [330, 'Muy alto'] // 0.97
        ];
        for (const [sst, label] of cases) {
            expect(WaterIndicesService.calculateICOSUS(sst)?.label).toBe(label);
        }
    });
});
