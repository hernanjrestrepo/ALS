import { describe, it, expect, vi, beforeEach } from 'vitest';

const chat = vi.fn<(prompt: string) => Promise<string>>();
const oitFindUnique = vi.fn();
const templateFindMany = vi.fn();

vi.mock('../src/services/ai.service', () => ({
    aiService: { chat: (p: string) => chat(p) }
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        oIT = { findUnique: (...args: unknown[]) => oitFindUnique(...args) };
        samplingTemplate = { findMany: (...args: unknown[]) => templateFindMany(...args) };
    }
}));

import { planningService } from '../src/services/planning.service';

const oit = {
    id: 'oit-1',
    oitNumber: 'OIT-2026-001',
    description: 'Muestreo de agua residual y ruido ambiental',
    location: 'Cartagena'
};

const templates = [
    { id: 't-agua', name: 'Agua Residual', oitType: 'AGUA', steps: [] },
    { id: 't-ruido', name: 'Ruido Ambiental', oitType: 'RUIDO', steps: [] }
];

beforeEach(() => {
    chat.mockReset();
    oitFindUnique.mockReset().mockResolvedValue(oit);
    templateFindMany.mockReset().mockResolvedValue(templates);
});

describe('planningService.runOITAnalysis', () => {
    it('fails when the OIT does not exist', async () => {
        oitFindUnique.mockResolvedValue(null);

        await expect(planningService.runOITAnalysis('missing')).rejects.toThrow('OIT not found');
    });

    it('gives the model the OIT context and the numbered template catalogue', async () => {
        chat.mockResolvedValue('[]');

        await planningService.runOITAnalysis('oit-1');

        const prompt = chat.mock.calls[0][0];
        expect(prompt).toContain('OIT-2026-001');
        expect(prompt).toContain('Cartagena');
        expect(prompt).toContain('"index": 1');
        expect(prompt).toContain('t-ruido');
    });

    it('truncates the document extract to 5000 characters', async () => {
        oitFindUnique.mockResolvedValue({ ...oit, description: 'Ω'.repeat(6000) });
        chat.mockResolvedValue('[]');

        await planningService.runOITAnalysis('oit-1');

        const extract = chat.mock.calls[0][0].split('**TEXTO DEL DOCUMENTO (EXTRACTO):**')[1];
        expect(extract.match(/Ω+/)![0].length).toBe(5000);
    });

    it('maps the detected services to their templates', async () => {
        chat.mockResolvedValue(
            JSON.stringify([
                { serviceName: 'Agua residual', templateId: 't-agua', group: 'AGUA' },
                { serviceName: 'Ruido ambiental', templateId: 't-ruido', group: 'RUIDO' }
            ])
        );

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toEqual({
            totalServicesFound: 2,
            services: [
                { name: 'Agua residual', matcher: 'AGUA', templateNumbers: ['t-agua'] },
                { name: 'Ruido ambiental', matcher: 'RUIDO', templateNumbers: ['t-ruido'] }
            ]
        });
    });

    it('strips markdown fences before parsing', async () => {
        chat.mockResolvedValue('```json\n[{"serviceName":"Agua","templateId":"t-agua","group":"AGUA"}]\n```');

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toMatchObject({ totalServicesFound: 1 });
    });

    it('recovers the JSON array when the model wraps it in prose', async () => {
        chat.mockResolvedValue('Encontré esto:\n[{"serviceName":"Agua","templateId":"t-agua","group":"AGUA"}]\nEso es todo.');

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toEqual({
            totalServicesFound: 1,
            services: [{ name: 'Agua', matcher: 'AGUA', templateNumbers: ['t-agua'] }]
        });
    });

    it('returns no services when the answer cannot be parsed at all', async () => {
        chat.mockResolvedValue('no hay json aquí');

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toEqual({
            totalServicesFound: 0,
            services: []
        });
    });

    it('returns no services when the answer is valid JSON but not an array', async () => {
        chat.mockResolvedValue('{"serviceName":"Agua"}');

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toEqual({
            totalServicesFound: 0,
            services: []
        });
    });

    it('falls back to the first template and generic labels for incomplete services', async () => {
        chat.mockResolvedValue('[{}]');

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toEqual({
            totalServicesFound: 1,
            services: [{ name: 'Servicio Detectado', matcher: 'GENERAL', templateNumbers: ['t-agua'] }]
        });
    });

    it('leaves the template list empty when no templates are registered', async () => {
        templateFindMany.mockResolvedValue([]);
        chat.mockResolvedValue('[{"serviceName":"Agua","group":"AGUA"}]');

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toEqual({
            totalServicesFound: 1,
            services: [{ name: 'Agua', matcher: 'AGUA', templateNumbers: [] }]
        });
    });

    it('degrades to an empty analysis when the AI call fails', async () => {
        chat.mockRejectedValue(new Error('offline'));

        await expect(planningService.runOITAnalysis('oit-1')).resolves.toEqual({
            totalServicesFound: 0,
            services: []
        });
    });
});

describe('planningService stubs', () => {
    it('returns the documented placeholder values', async () => {
        await expect(planningService.generatePlanningDocument('oit-1')).resolves.toBe('');
        await expect(planningService.generateProposal('oit-1')).resolves.toEqual({
            success: true,
            message: 'Proposal generation stub'
        });
        await expect(planningService.acceptProposal('oit-1')).resolves.toEqual({
            success: true,
            message: 'Proposal accepted stub'
        });
        await expect(planningService.rejectProposal('oit-1')).resolves.toEqual({
            success: true,
            message: 'Proposal rejected stub'
        });
    });
});
