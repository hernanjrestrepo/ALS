import { describe, it, expect } from 'vitest';
import { toConverse, fromConverse, bedrockEnabled } from '../src/services/bedrock';

const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
const jpg = Buffer.from('ffd8ffe000104a464946', 'hex').toString('base64');

describe('Bedrock: traduccion de las peticiones estilo Ollama', () => {
    it('/api/generate: prompt, system, temperatura y maximo de tokens', () => {
        const p = toConverse('http://x/api/generate', { model: 'gpt-oss', system: 'Eres A', prompt: 'hola', options: { temperature: 0, num_predict: 300, num_ctx: 16384 } });
        expect(p.kind).toBe('generate');
        expect(p.messages).toEqual([{ role: 'user', content: [{ text: 'hola' }] }]);
        expect(p.system).toEqual([{ text: 'Eres A' }]);
        expect(p.inferenceConfig).toEqual({ maxTokens: 300, temperature: 0 });
    });

    it('format json agrega la instruccion de JSON y quita las vallas de la respuesta', () => {
        const p = toConverse('http://x/api/generate', { prompt: 'dame json', format: 'json' });
        expect(p.system?.[0].text).toContain('JSON válido');
        expect(fromConverse(p, '```json\n{"a":1}\n```')).toEqual({ response: '{"a":1}', done: true });
    });

    it('/api/chat con fotos: cada imagen es un bloque con su formato', () => {
        const p = toConverse('http://x/api/chat', { messages: [{ role: 'user', content: 'lee esto', images: [png, jpg] }] });
        const blocks = p.messages[0].content;
        expect(blocks[0].image.format).toBe('png');
        expect(blocks[1].image.format).toBe('jpeg');
        expect(blocks[2]).toEqual({ text: 'lee esto' });
        expect(fromConverse(p, 'texto')).toEqual({ message: { role: 'assistant', content: 'texto' }, done: true });
    });

    it('sin temperatura usa un valor moderado y limita los tokens', () => {
        const p = toConverse('http://x/api/generate', { prompt: 'x', options: { num_predict: 999999 } });
        expect(p.inferenceConfig.maxTokens).toBe(8192);
        expect(p.inferenceConfig.temperature).toBe(0.2);
    });

    it('solo se activa con LLM_BACKEND=bedrock', () => {
        delete process.env.LLM_BACKEND;
        expect(bedrockEnabled()).toBe(false);
        process.env.LLM_BACKEND = 'Bedrock';
        expect(bedrockEnabled()).toBe(true);
        delete process.env.LLM_BACKEND;
    });

    it('las fotos van al modelo de vision y el texto al de texto', () => {
        const withImg = toConverse('http://x/api/chat', { messages: [{ role: 'user', content: 'lee', images: [png] }] });
        const text = toConverse('http://x/api/generate', { prompt: 'hola' });
        expect(withImg.hasImages).toBe(true);
        expect(text.hasImages).toBe(false);
    });
});
