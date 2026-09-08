import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

const chat = vi.fn<(prompt: string) => Promise<string>>();
const cascadeSummary = vi.fn<(text: string, objective: string) => Promise<string>>();
const extractText = vi.fn<(p: string) => Promise<string>>();
const existsSync = vi.fn<(p: string) => boolean>();
const createNotification = vi.fn();
const oitFindUnique = vi.fn();
const standardFindMany = vi.fn();

vi.mock('../src/services/ai.service', () => ({
    aiService: {
        chat: (p: string) => chat(p),
        cascadeSummary: (t: string, o: string) => cascadeSummary(t, o)
    }
}));

vi.mock('../src/services/pdf.service', () => ({
    pdfService: { extractText: (p: string) => extractText(p) }
}));

vi.mock('../src/controllers/notification.controller', () => ({
    createNotification: (...args: unknown[]) => createNotification(...args)
}));

vi.mock('fs', () => {
    const api = { existsSync: (p: string) => existsSync(p) };
    return { ...api, default: api };
});

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        oIT = { findUnique: (...args: unknown[]) => oitFindUnique(...args) };
        standard = { findMany: (...args: unknown[]) => standardFindMany(...args) };
    }
}));

import { complianceService } from '../src/services/compliance.service';

const verdict = {
    compliant: true,
    score: 88,
    oitType: 'AGUA_SUBTERRANEA',
    summary: 'Cumple',
    exclusions: [],
    issues: [],
    recommendations: []
};

const oit = (overrides: Record<string, any> = {}) => ({
    id: 'oit-1',
    oitNumber: 'OIT-2026-001',
    description: 'Monitoreo de agua subterránea',
    quotationFileUrl: null,
    aiData: null,
    ...overrides
});

beforeEach(() => {
    chat.mockReset().mockResolvedValue(JSON.stringify(verdict));
    cascadeSummary.mockReset().mockResolvedValue('resumen de normas');
    extractText.mockReset().mockResolvedValue('');
    existsSync.mockReset().mockReturnValue(true);
    createNotification.mockReset().mockResolvedValue(undefined);
    oitFindUnique.mockReset().mockResolvedValue(oit());
    standardFindMany.mockReset().mockResolvedValue([{ title: 'Res. 631', content: 'Límites' }]);
});

describe('checkCompliance', () => {
    it('fails when the OIT does not exist', async () => {
        oitFindUnique.mockResolvedValue(null);

        await expect(complianceService.checkCompliance('missing', 'u1')).rejects.toThrow('OIT not found');
    });

    it('returns the AI verdict and notifies the requesting user', async () => {
        await expect(complianceService.checkCompliance('oit-1', 'u1')).resolves.toEqual(verdict);
        expect(createNotification).toHaveBeenCalledWith(
            'u1',
            'Conformidad: OIT-2026-001',
            'Resultado: 88/100',
            'SUCCESS',
            'oit-1'
        );
    });

    it('sends a warning notification for a non compliant verdict', async () => {
        chat.mockResolvedValue(JSON.stringify({ ...verdict, compliant: false, score: 40 }));

        await complianceService.checkCompliance('oit-1', 'u1');

        expect(createNotification.mock.calls[0][3]).toBe('WARNING');
    });

    it('extracts the JSON verdict embedded in prose', async () => {
        chat.mockResolvedValue(`Aquí va: ${JSON.stringify(verdict)} fin.`);

        await expect(complianceService.checkCompliance('oit-1', 'u1')).resolves.toEqual(verdict);
    });

    it('returns an empty verdict when the AI answer contains no JSON object', async () => {
        chat.mockResolvedValue('sin json');

        await expect(complianceService.checkCompliance('oit-1', 'u1')).resolves.toEqual({});
        expect(createNotification.mock.calls[0][2]).toBe('Resultado: undefined/100');
    });

    it('degrades gracefully when the AI call fails', async () => {
        chat.mockRejectedValue(new Error('offline'));

        await expect(complianceService.checkCompliance('oit-1', 'u1')).resolves.toMatchObject({ score: 0 });
    });
});

describe('OIT type detection', () => {
    const detectedType = async (description: string) => {
        oitFindUnique.mockResolvedValue(oit({ description }));
        await complianceService.checkCompliance('oit-1', 'u1');
        return chat.mock.calls.at(-1)![0].match(/## OIT: OIT-2026-001 \((\w+)\)/)![1];
    };

    it('recognises each supported matrix from the description', async () => {
        expect(await detectedType('Agua subterranea en pozo')).toBe('AGUA_SUBTERRANEA');
        expect(await detectedType('Caracterización RESPEL')).toBe('RESPEL');
        expect(await detectedType('Punto seco en planta')).toBe('PUNTO_SECO');
        expect(await detectedType('Ruido ambiental nocturno')).toBe('RUIDO_AMBIENTAL');
        expect(await detectedType('Emision de ruido en planta')).toBe('RUIDO_EMISION');
        expect(await detectedType('Ruido intradomiciliario')).toBe('RUIDO_INTRADOMICILIARIO');
        expect(await detectedType('Medición en fuentes fijas')).toBe('FUENTES_FIJAS');
        expect(await detectedType('Calidad de aire')).toBe('AIRE');
        expect(await detectedType('Monitoreo de olores')).toBe('OLORES');
        expect(await detectedType('Particulas viables')).toBe('PARTICULAS');
        expect(await detectedType('Muestreo sin matriz reconocida')).toBe('DEFAULT');
    });

    it('prefers water over the later matrix keywords', async () => {
        expect(await detectedType('Agua subterránea y suelo')).toBe('AGUA_SUBTERRANEA');
    });

    it('queries the standards of the detected category plus the general ones', async () => {
        oitFindUnique.mockResolvedValue(oit({ description: 'Ruido ambiental' }));

        await complianceService.checkCompliance('oit-1', 'u1');

        expect(standardFindMany).toHaveBeenCalledWith({
            where: { OR: [{ category: { in: ['RUIDO', 'GENERAL'] } }, { type: 'OIT' }] }
        });
    });
});

describe('matrices without a compliance verdict', () => {
    it('forces a null verdict for biota and notifies without a score', async () => {
        oitFindUnique.mockResolvedValue(oit({ description: 'Muestreo de biota acuática' }));
        chat.mockResolvedValue(JSON.stringify({ ...verdict, compliant: true, score: 100 }));

        const result = await complianceService.checkCompliance('oit-1', 'u1');

        expect(result.compliant).toBeNull();
        expect(result.score).toBeNull();
        expect(chat.mock.calls[0][0]).toContain('NO emitas un veredicto de conformidad');
        expect(createNotification).toHaveBeenCalledWith(
            'u1',
            'Análisis técnico: OIT-2026-001',
            'Matriz sin veredicto de conformidad (no aplica normativa)',
            'INFO',
            'oit-1'
        );
    });

    it('forces a null verdict for soil as well', async () => {
        oitFindUnique.mockResolvedValue(oit({ description: 'Caracterización de suelo' }));

        const result = await complianceService.checkCompliance('oit-1', 'u1');

        expect(result.compliant).toBeNull();
        expect(createNotification.mock.calls[0][3]).toBe('INFO');
    });
});

describe('quotation extraction', () => {
    it('reads a relative quotation path as-is', async () => {
        oitFindUnique.mockResolvedValue(oit({ quotationFileUrl: '/uploads/cot.pdf' }));
        extractText.mockResolvedValue('COTIZACIÓN 123');

        await complianceService.checkCompliance('oit-1', 'u1');

        expect(extractText).toHaveBeenCalledWith('uploads/cot.pdf');
        expect(chat.mock.calls[0][0]).toContain('COTIZACIÓN 123');
    });

    it('resolves the quotation against the working directory when needed', async () => {
        existsSync.mockImplementation((p: string) => p.startsWith(process.cwd()));
        oitFindUnique.mockResolvedValue(oit({ quotationFileUrl: 'uploads/cot.pdf' }));

        await complianceService.checkCompliance('oit-1', 'u1');

        expect(extractText).toHaveBeenCalledWith(path.join(process.cwd(), 'uploads/cot.pdf'));
    });

    it('skips extraction when the quotation is missing or unreadable', async () => {
        existsSync.mockReturnValue(false);
        oitFindUnique.mockResolvedValue(oit({ quotationFileUrl: 'uploads/cot.pdf' }));
        await complianceService.checkCompliance('oit-1', 'u1');
        expect(extractText).not.toHaveBeenCalled();

        existsSync.mockReturnValue(true);
        extractText.mockRejectedValue(new Error('corrupt'));
        await expect(complianceService.checkCompliance('oit-1', 'u1')).resolves.toEqual(verdict);
    });

    it('truncates the quotation to 10000 characters', async () => {
        oitFindUnique.mockResolvedValue(oit({ quotationFileUrl: 'uploads/cot.pdf' }));
        extractText.mockResolvedValue('Ω'.repeat(12000));

        await complianceService.checkCompliance('oit-1', 'u1');

        expect(chat.mock.calls[0][0].match(/Ω+/)![0].length).toBe(10000);
    });
});

describe('standards content', () => {
    it('falls back to the description or a placeholder and truncates each standard', async () => {
        standardFindMany.mockResolvedValue([
            { title: 'Con contenido', content: 'Ω'.repeat(6000) },
            { title: 'Solo descripción', description: 'Texto de la norma' },
            { title: 'Vacía' }
        ]);

        await complianceService.checkCompliance('oit-1', 'u1');

        const prompt = chat.mock.calls[0][0];
        expect(prompt.match(/Ω+/)![0].length).toBe(5000);
        expect(prompt).toContain('### NORMA: Solo descripción\nTexto de la norma');
        expect(prompt).toContain('### NORMA: Vacía\nSin contenido');
    });

    it('cascade-summarizes the standards when they exceed the context budget', async () => {
        standardFindMany.mockResolvedValue(
            Array.from({ length: 10 }, (_, i) => ({ title: `Norma ${i}`, content: 'x'.repeat(4000) }))
        );

        await complianceService.checkCompliance('oit-1', 'u1');

        expect(cascadeSummary).toHaveBeenCalledWith(
            expect.stringContaining('### NORMA: Norma 0'),
            'Resumir requisitos técnicos clave de estas normas ambientales'
        );
        expect(chat.mock.calls[0][0]).toContain('resumen de normas');
    });
});
