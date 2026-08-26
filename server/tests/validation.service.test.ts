import { describe, it, expect, vi, beforeEach } from 'vitest';

const chat = vi.fn<(prompt: string, model?: string, system?: string) => Promise<string>>();

vi.mock('../src/services/ai.service', () => ({
    aiService: { chat: (p: string, m?: string, s?: string) => chat(p, m, s) }
}));

import { validationService } from '../src/services/validation.service';

beforeEach(() => {
    chat.mockReset();
});

describe('validationService.validateStepData', () => {
    it('sends the step context and the user data to the model', async () => {
        chat.mockResolvedValue('{"validated":true,"feedback":"ok","confidence":0.9}');

        await validationService.validateStepData('Medir pH', 'Valor entre 0 y 14', { value: '7.2' });

        const prompt = chat.mock.calls[0][0];
        expect(prompt).toContain('Medir pH');
        expect(prompt).toContain('Valor entre 0 y 14');
        expect(prompt).toContain('"value": "7.2"');
    });

    it('parses a JSON answer wrapped in markdown fences and prose', async () => {
        chat.mockResolvedValue('Listo:\n```json\n{"validated":true,"feedback":"Datos completos","confidence":0.95}\n```');

        await expect(validationService.validateStepData('paso', 'req', { value: 1 })).resolves.toEqual({
            validated: true,
            feedback: 'Datos completos',
            confidence: 0.95
        });
    });

    it('treats any non-true validated value as a rejection and fills defaults', async () => {
        chat.mockResolvedValue('{"validated":"yes"}');

        await expect(validationService.validateStepData('paso', 'req', {})).resolves.toEqual({
            validated: false,
            feedback: 'Validación completada',
            confidence: 0.8
        });
    });

    it('returns a rejection when the model output cannot be parsed', async () => {
        chat.mockResolvedValue('sin json');

        await expect(validationService.validateStepData('paso', 'req', {})).resolves.toEqual({
            validated: false,
            feedback: 'Error al validar los datos. Por favor intenta de nuevo.',
            confidence: 0
        });
    });

    it('returns a rejection when the AI call fails', async () => {
        chat.mockRejectedValue(new Error('offline'));

        await expect(validationService.validateStepData('paso', 'req', {})).resolves.toMatchObject({
            validated: false,
            confidence: 0
        });
    });
});

describe('validationService.generateFinalAnalysis', () => {
    it('includes the OIT, template and step data in the prompt', async () => {
        chat.mockResolvedValue('análisis final');

        const result = await validationService.generateFinalAnalysis('OIT-1', 'Agua', [
            { step: 'Paso 1', data: { value: '7.2' }, validation: { validated: true } }
        ]);

        expect(result).toBe('análisis final');
        const prompt = chat.mock.calls[0][0];
        expect(prompt).toContain('OIT-1');
        expect(prompt).toContain('Agua');
        expect(prompt).toContain('Paso 1');
    });

    it('raises a domain error when the AI call fails', async () => {
        chat.mockRejectedValue(new Error('offline'));

        await expect(validationService.generateFinalAnalysis('OIT-1', 'Agua', [])).rejects.toThrow(
            'Error al generar el análisis final'
        );
    });
});

describe('validationService.generateFinalReportContent', () => {
    const oit = { oitNumber: 'OIT-1', description: 'Muestreo de agua', finalAnalysis: 'Todo normal' };

    it('truncates the lab text to 8000 characters and includes the sheet analysis', async () => {
        chat.mockResolvedValue('# INFORME');

        await validationService.generateFinalReportContent(oit, 'Ω'.repeat(9000), 'Agua', { quality: 'buena' });

        const prompt = chat.mock.calls[0][0];
        expect(prompt.match(/Ω+/)![0].length).toBe(8000);
        expect(prompt).toContain('"quality": "buena"');
        expect(prompt).toContain('Todo normal');
    });

    it('falls back to placeholders when template and sheet analysis are missing', async () => {
        chat.mockResolvedValue('# INFORME');

        await validationService.generateFinalReportContent({ oitNumber: 'OIT-1' }, 'texto');

        const prompt = chat.mock.calls[0][0];
        expect(prompt).toContain('No se dispone de análisis de planillas detallado');
        expect(prompt).toContain('Sin observaciones mayores');
        expect(prompt).toContain('MONITOREO AMBIENTAL');
    });

    it('raises a domain error when the AI call fails', async () => {
        chat.mockRejectedValue(new Error('offline'));

        await expect(validationService.generateFinalReportContent(oit, 'texto')).rejects.toThrow(
            'Error al generar el contenido del informe final'
        );
    });
});

describe('validationService.generateComunicadoContent', () => {
    const oit = { oitNumber: 'OIT-1', description: 'Muestreo', location: 'Cartagena' };

    it('isolates the service type from the service context and trims the answer', async () => {
        chat.mockResolvedValue('  cuerpo del comunicado  ');

        const result = await validationService.generateComunicadoContent(
            oit,
            'resultados de laboratorio',
            'AGUA (Agua - Checklist, Muestreo)'
        );

        expect(result).toBe('cuerpo del comunicado');
        const prompt = chat.mock.calls[0][0];
        expect(prompt).toContain('SERVICIO A COMUNICAR: AGUA');
        expect(prompt).toContain('AGUA (Agua - Checklist, Muestreo)');
        expect(prompt).toContain('Cartagena');
    });

    it('truncates the lab analysis to 6000 characters', async () => {
        chat.mockResolvedValue('cuerpo');

        await validationService.generateComunicadoContent(oit, 'Ω'.repeat(7000), 'RUIDO');

        expect(chat.mock.calls[0][0].match(/Ω+/)![0].length).toBe(6000);
    });

    it('raises a domain error when the AI call fails', async () => {
        chat.mockRejectedValue(new Error('offline'));

        await expect(validationService.generateComunicadoContent(oit, 'lab', 'AGUA')).rejects.toThrow(
            'Error al generar contenido del comunicado'
        );
    });
});
