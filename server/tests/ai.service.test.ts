import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

import axios from 'axios';
import { AIService } from '../src/services/ai.service';

const mockedAxios = vi.mocked(axios, true);

const generateResponse = (response: string) => ({ data: { response } });

describe('AIService.isAvailable', () => {
    beforeEach(() => vi.resetAllMocks());

    it('is true when the Ollama tags endpoint answers', async () => {
        mockedAxios.get.mockResolvedValue({ data: {} });
        await expect(new AIService().isAvailable()).resolves.toBe(true);
    });

    it('is false when the request fails', async () => {
        mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));
        await expect(new AIService().isAvailable()).resolves.toBe(false);
    });
});

describe('AIService.getModels', () => {
    beforeEach(() => vi.resetAllMocks());

    it('maps model names from the response', async () => {
        mockedAxios.get.mockResolvedValue({ data: { models: [{ name: 'a' }, { name: 'b' }] } });
        await expect(new AIService().getModels()).resolves.toEqual(['a', 'b']);
    });

    it('returns an empty list on error', async () => {
        mockedAxios.get.mockRejectedValue(new Error('boom'));
        await expect(new AIService().getModels()).resolves.toEqual([]);
    });
});

describe('AIService.chat', () => {
    beforeEach(() => vi.resetAllMocks());

    it('sends the prompt with the default model and system prompt', async () => {
        mockedAxios.post.mockResolvedValue(generateResponse('hola'));

        await expect(new AIService().chat('pregunta')).resolves.toBe('hola');

        const [, body] = mockedAxios.post.mock.calls[0];
        expect(body).toMatchObject({ prompt: 'pregunta', stream: false });
        expect((body as any).system).toContain('ingeniería ambiental');
    });

    it('honours an explicit model and system prompt', async () => {
        mockedAxios.post.mockResolvedValue(generateResponse('ok'));

        await new AIService().chat('p', 'my-model', 'sé breve');

        expect(mockedAxios.post.mock.calls[0][1]).toMatchObject({
            model: 'my-model',
            system: 'sé breve'
        });
    });

    it('returns an empty string when the model answers with no content', async () => {
        mockedAxios.post.mockResolvedValue({ data: {} });
        await expect(new AIService().chat('p')).resolves.toBe('');
    });

    it('propagates transport errors', async () => {
        mockedAxios.post.mockRejectedValue(new Error('timeout'));
        await expect(new AIService().chat('p')).rejects.toThrow('timeout');
    });
});

describe('AIService.cascadeSummary', () => {
    beforeEach(() => vi.resetAllMocks());

    it('splits long text into 30k chunks and joins the summaries', async () => {
        mockedAxios.post
            .mockResolvedValueOnce(generateResponse('resumen 1'))
            .mockResolvedValueOnce(generateResponse('resumen 2'));

        const text = 'a'.repeat(30000) + 'b'.repeat(10);
        const result = await new AIService().cascadeSummary(text, 'objetivo');

        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        expect(result).toBe('resumen 1\n\n--- CONTINUACIÓN ---\n\nresumen 2');
        expect(mockedAxios.post.mock.calls[0][1]).toMatchObject({ stream: false });
        expect((mockedAxios.post.mock.calls[0][1] as any).prompt).toContain('objetivo');
    });

    it('marks failed chunks instead of aborting the cascade', async () => {
        mockedAxios.post.mockRejectedValue(new Error('down'));

        const result = await new AIService().cascadeSummary('texto corto', 'objetivo');

        expect(result).toBe('[Error en bloque 1]');
    });
});

describe('AIService.reviseReportNarrative', () => {
    beforeEach(() => vi.resetAllMocks());

    it('strips the prompt delimiters echoed back by the model', async () => {
        mockedAxios.post.mockResolvedValue(
            generateResponse('---INICIO DEL INFORME ACTUAL---\n# Informe\ncontenido\n---FIN DEL INFORME ACTUAL---')
        );

        const result = await new AIService().reviseReportNarrative('# Informe', 'cambia el título');

        expect(result).toBe('# Informe\ncontenido');
    });
});

describe('AIService.analyzeDocument', () => {
    beforeEach(() => vi.resetAllMocks());

    it('falls back to the heuristic analysis when Ollama is unreachable', async () => {
        mockedAxios.get.mockRejectedValue(new Error('down'));

        const result = await new AIService().analyzeDocument('texto');

        expect(result).toEqual({
            status: 'alerta',
            alerts: ['Offline'],
            missing: [],
            evidence: [],
            services: [],
            location: null
        });
        expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('parses JSON wrapped in markdown fences and surrounding prose', async () => {
        mockedAxios.get.mockResolvedValue({ data: {} });
        mockedAxios.post.mockResolvedValue(
            generateResponse(
                'Aquí va:\n```json\n{"status":"check","services":[{"name":"Ruido","proposedDate":null,"duration":1}],"location":"Barranquilla"}\n```\nfin'
            )
        );

        const result = await new AIService().analyzeDocument('texto');

        expect(result.status).toBe('check');
        expect(result.services).toEqual([{ name: 'Ruido', proposedDate: null, duration: 1 }]);
        expect(result.location).toBe('Barranquilla');
        expect(result.alerts).toEqual([]);
        expect(result.rawResponse).toContain('"status":"check"');
    });

    it('defaults missing fields of a partial JSON answer', async () => {
        mockedAxios.get.mockResolvedValue({ data: {} });
        mockedAxios.post.mockResolvedValue(generateResponse('{}'));

        const result = await new AIService().analyzeDocument('texto');

        expect(result).toMatchObject({
            status: 'alerta',
            alerts: [],
            missing: [],
            evidence: [],
            services: [],
            location: null,
            generalProposedDate: null
        });
    });

    it('falls back to the heuristic analysis when the answer is not JSON', async () => {
        mockedAxios.get.mockResolvedValue({ data: {} });
        mockedAxios.post.mockResolvedValue(generateResponse('no soy json'));

        const result = await new AIService().analyzeDocument('texto');

        expect(result.alerts).toEqual(['Offline']);
    });

    it('summarizes documents above 25k characters before analysing them', async () => {
        mockedAxios.get.mockResolvedValue({ data: {} });
        mockedAxios.post.mockResolvedValue(generateResponse('{"status":"check"}'));

        await new AIService().analyzeDocument('x'.repeat(25001));

        // one call for the cascade chunk + one for the analysis itself
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
});

describe('AIService.extractOITData', () => {
    beforeEach(() => vi.resetAllMocks());

    it('parses the JSON answer', async () => {
        mockedAxios.post.mockResolvedValue(
            generateResponse('```json\n{"valid":true,"data":{"oitNumber":"OIT-1"}}\n```')
        );

        await expect(new AIService().extractOITData('texto')).resolves.toEqual({
            valid: true,
            data: { oitNumber: 'OIT-1' }
        });
    });

    it('truncates the document to 15k characters', async () => {
        mockedAxios.post.mockResolvedValue(generateResponse('{"valid":true}'));

        await new AIService().extractOITData('Ω'.repeat(20000));

        const prompt = (mockedAxios.post.mock.calls[0][1] as any).prompt as string;
        expect(prompt.match(/Ω+/)![0].length).toBe(15000);
    });

    it('returns an error object when parsing fails', async () => {
        mockedAxios.post.mockResolvedValue(generateResponse('nope'));

        await expect(new AIService().extractOITData('texto')).resolves.toEqual({
            valid: false,
            message: 'Error'
        });
    });
});

describe('AIService.detectTemplateTags', () => {
    beforeEach(() => vi.resetAllMocks());

    it('reads candidates from the "candidates" key', async () => {
        mockedAxios.post.mockResolvedValue(
            generateResponse(
                '{"candidates":[{"phrase":"NOMBRE DEL CLIENTE","suggestedTagName":"cliente_nombre","suggestedSource":"AI"}]}'
            )
        );

        const result = await new AIService().detectTemplateTags('doc');

        expect(result).toHaveLength(1);
        expect(result[0].phrase).toBe('NOMBRE DEL CLIENTE');
    });

    it('accepts a bare array and a single unwrapped candidate', async () => {
        const service = new AIService();

        mockedAxios.post.mockResolvedValueOnce(
            generateResponse('[{"phrase":"LUGAR","suggestedTagName":"lugar"}]')
        );
        await expect(service.detectTemplateTags('doc')).resolves.toHaveLength(1);

        mockedAxios.post.mockResolvedValueOnce(
            generateResponse('{"phrase":"LUGAR","suggestedTagName":"lugar"}')
        );
        await expect(service.detectTemplateTags('doc')).resolves.toHaveLength(1);
    });

    it('drops hallucinated candidates that echo the prompt and empty phrases', async () => {
        mockedAxios.post.mockResolvedValue(
            generateResponse(
                JSON.stringify({
                    candidates: [
                        { phrase: 'texto exacto del documento', suggestedTagName: 'x' },
                        { phrase: 'suggestedTagName', suggestedTagName: 'y' },
                        { phrase: '', suggestedTagName: 'z' },
                        { phrase: 'NOMBRE DEL CLIENTE', suggestedTagName: 'cliente_nombre' }
                    ]
                })
            )
        );

        const result = await new AIService().detectTemplateTags('doc');

        expect(result.map(c => c.phrase)).toEqual(['NOMBRE DEL CLIENTE']);
    });

    it('returns an empty list when the request fails', async () => {
        mockedAxios.post.mockRejectedValue(new Error('down'));
        await expect(new AIService().detectTemplateTags('doc')).resolves.toEqual([]);
    });
});

describe('AIService.analyzeLabResults', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns the serialized schema when the model follows it', async () => {
        mockedAxios.post.mockResolvedValue(
            generateResponse('{"rawText":"análisis","parsedData":{"cliente":"ACME"}}')
        );

        const result = await new AIService().analyzeLabResults('doc', 'OIT-1');

        expect(JSON.parse(result)).toEqual({ rawText: 'análisis', parsedData: { cliente: 'ACME' } });
    });

    it('wraps the raw answer as narrative when rawText is missing', async () => {
        mockedAxios.post.mockResolvedValue(generateResponse('{"parsedData":{"cliente":"ACME"}}'));

        const result = JSON.parse(await new AIService().analyzeLabResults('doc'));

        expect(result.rawText).toBe('{"parsedData":{"cliente":"ACME"}}');
        expect(result.parsedData).toEqual({ cliente: 'ACME' });
    });

    it('returns an error payload when the answer cannot be parsed', async () => {
        mockedAxios.post.mockResolvedValue(generateResponse('not json'));

        const result = JSON.parse(await new AIService().analyzeLabResults('doc'));

        expect(result).toEqual({
            rawText: 'Error en análisis IA de resultados de laboratorio',
            parsedData: {}
        });
    });
});

describe('AIService stubs', () => {
    afterEach(() => vi.resetAllMocks());

    it('expose stable placeholder values used by the controllers', async () => {
        const service = new AIService();
        await expect(service.recommendResources('doc')).resolves.toEqual(['GPS', 'Vehículo']);
        await expect(service.analyzeSamplingResults({})).resolves.toBe('Analizado');
        await expect(service.analyzeSamplingSheets('doc')).resolves.toEqual({
            summary: 'OK',
            quality: 'buena',
            findings: [],
            recommendations: []
        });
    });
});
