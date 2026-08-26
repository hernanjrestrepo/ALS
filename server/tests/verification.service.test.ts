import { describe, it, expect, vi, beforeEach } from 'vitest';

const chat = vi.fn<(prompt: string) => Promise<string>>();
const extractText = vi.fn<(p: string) => Promise<string>>();
const existsSync = vi.fn<(p: string) => boolean>();
const oitFindUnique = vi.fn();
const oitUpdate = vi.fn();

vi.mock('../src/services/ai.service', () => ({
    aiService: { chat: (p: string) => chat(p) }
}));

vi.mock('../src/services/pdf.service', () => ({
    pdfService: { extractText: (p: string) => extractText(p) }
}));

vi.mock('fs', () => {
    const api = { existsSync: (p: string) => existsSync(p) };
    return { ...api, default: api };
});

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        oIT = {
            findUnique: (...args: unknown[]) => oitFindUnique(...args),
            update: (...args: unknown[]) => oitUpdate(...args)
        };
    }
}));

import verificationService from '../src/services/verification.service';

const aiVerdict = {
    valid: true,
    score: 92,
    discrepancies: [],
    matches: ['Fechas coinciden'],
    summary: 'Consistente'
};

const oit = {
    id: 'oit-1',
    oitNumber: 'OIT-2026-001',
    description: 'Muestreo de agua',
    location: 'Cartagena',
    scheduledDate: new Date('2026-05-05T00:00:00.000Z'),
    serviceDates: JSON.stringify(['2026-05-05']),
    aiData: null,
    stepValidations: null,
    labResultsUrl: null,
    fieldFormUrl: null
};

beforeEach(() => {
    chat.mockReset().mockResolvedValue(JSON.stringify(aiVerdict));
    extractText.mockReset().mockResolvedValue('');
    existsSync.mockReset().mockReturnValue(true);
    oitFindUnique.mockReset().mockResolvedValue(oit);
    oitUpdate.mockReset().mockResolvedValue({});
});

describe('verificationService.verifyConsistency', () => {
    it('fails when the OIT does not exist', async () => {
        oitFindUnique.mockResolvedValue(null);

        await expect(verificationService.verifyConsistency('missing')).rejects.toThrow('OIT not found');
    });

    it('stores the parsed verdict on the OIT and returns it', async () => {
        await expect(verificationService.verifyConsistency('oit-1')).resolves.toEqual(aiVerdict);
        expect(oitUpdate).toHaveBeenCalledWith({
            where: { id: 'oit-1' },
            data: { fieldFormAnalysis: JSON.stringify(aiVerdict) }
        });
    });

    it('strips markdown fences from the answer', async () => {
        chat.mockResolvedValue('```json\n{"valid":false,"score":10}\n```');

        await expect(verificationService.verifyConsistency('oit-1')).resolves.toEqual({ valid: false, score: 10 });
    });

    it('reads the client name from either AI shape', async () => {
        oitFindUnique.mockResolvedValue({ ...oit, aiData: JSON.stringify({ data: { clientName: 'ACME' } }) });
        await verificationService.verifyConsistency('oit-1');
        expect(chat.mock.calls[0][0]).toContain('Cliente: ACME');

        oitFindUnique.mockResolvedValue({ ...oit, aiData: JSON.stringify({ clientName: 'Otro Cliente' }) });
        await verificationService.verifyConsistency('oit-1');
        expect(chat.mock.calls[1][0]).toContain('Cliente: Otro Cliente');
    });

    it('ignores malformed AI data and step validations', async () => {
        oitFindUnique.mockResolvedValue({ ...oit, aiData: '{not json', stepValidations: '{not json' });

        await expect(verificationService.verifyConsistency('oit-1')).resolves.toEqual(aiVerdict);
        expect(chat.mock.calls[0][0]).toContain('Cliente: ');
    });

    it('summarizes the step values and results captured in the app', async () => {
        oitFindUnique.mockResolvedValue({
            ...oit,
            stepValidations: JSON.stringify({
                s1: { data: { value: 'pH 7.2' } },
                s2: { data: { result: 'Conforme' } },
                s3: { data: {} }
            })
        });

        await verificationService.verifyConsistency('oit-1');

        expect(chat.mock.calls[0][0]).toContain('pH 7.2, Conforme');
    });

    it('extracts text from the local lab report and field form', async () => {
        oitFindUnique.mockResolvedValue({
            ...oit,
            labResultsUrl: 'uploads/lab.pdf',
            fieldFormUrl: 'uploads/field.pdf'
        });
        extractText.mockResolvedValueOnce('RESULTADOS LAB').mockResolvedValueOnce('PLANILLA CAMPO');

        await verificationService.verifyConsistency('oit-1');

        expect(extractText).toHaveBeenCalledWith('uploads/lab.pdf');
        expect(extractText).toHaveBeenCalledWith('uploads/field.pdf');
        expect(chat.mock.calls[0][0]).toContain('RESULTADOS LAB');
        expect(chat.mock.calls[0][0]).toContain('PLANILLA CAMPO');
    });

    it('rewrites remote upload URLs into local upload paths', async () => {
        oitFindUnique.mockResolvedValue({
            ...oit,
            labResultsUrl: 'https://cdn.example.com/uploads/lab.pdf',
            fieldFormUrl: 'https://cdn.example.com/uploads/field.pdf'
        });

        await verificationService.verifyConsistency('oit-1');

        expect(extractText).toHaveBeenCalledWith('uploads/lab.pdf');
        expect(extractText).toHaveBeenCalledWith('uploads/field.pdf');
    });

    it('skips extraction when the files are not on disk', async () => {
        existsSync.mockReturnValue(false);
        oitFindUnique.mockResolvedValue({ ...oit, labResultsUrl: 'uploads/lab.pdf', fieldFormUrl: 'uploads/f.pdf' });

        await verificationService.verifyConsistency('oit-1');

        expect(extractText).not.toHaveBeenCalled();
    });

    it('continues when a document cannot be read', async () => {
        oitFindUnique.mockResolvedValue({ ...oit, labResultsUrl: 'uploads/lab.pdf' });
        extractText.mockRejectedValue(new Error('corrupt pdf'));

        await expect(verificationService.verifyConsistency('oit-1')).resolves.toEqual(aiVerdict);
    });

    it('truncates both document extracts to 5000 characters', async () => {
        oitFindUnique.mockResolvedValue({ ...oit, labResultsUrl: 'uploads/lab.pdf', fieldFormUrl: 'uploads/f.pdf' });
        extractText.mockResolvedValue('Ω'.repeat(6000));

        await verificationService.verifyConsistency('oit-1');

        const runs = chat.mock.calls[0][0].match(/Ω+/g)!;
        expect(runs).toHaveLength(2);
        expect(runs.every(run => run.length === 5000)).toBe(true);
    });

    it('raises a domain error when the verdict cannot be parsed', async () => {
        chat.mockResolvedValue('sin json');

        await expect(verificationService.verifyConsistency('oit-1')).rejects.toThrow('Falló la verificación por IA');
        expect(oitUpdate).not.toHaveBeenCalled();
    });

    it('raises a domain error when the AI call fails', async () => {
        chat.mockRejectedValue(new Error('offline'));

        await expect(verificationService.verifyConsistency('oit-1')).rejects.toThrow('Falló la verificación por IA');
    });
});
