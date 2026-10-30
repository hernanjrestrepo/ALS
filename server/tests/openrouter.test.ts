import { describe, it, expect, afterEach } from 'vitest';
import { buildBody, openrouterEnabled, openrouterModels, DEFAULT_MODELS } from '../src/services/openrouter';

const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });

describe('OpenRouter para el chat de la IA', () => {
    it('solo se activa con llave y se apaga con AI_CHAT_PROVIDER=ollama', () => {
        delete process.env.OPENROUTER_API_KEY;
        expect(openrouterEnabled()).toBe(false);
        process.env.OPENROUTER_API_KEY = 'k';
        expect(openrouterEnabled()).toBe(true);
        process.env.AI_CHAT_PROVIDER = 'ollama';
        expect(openrouterEnabled()).toBe(false);
    });

    it('el cuerpo va sin razonamiento largo, al proveedor mas rapido y sin proveedores que guardan datos', () => {
        const b = buildBody('sistema', 'pregunta', { temperature: 0, seed: 42 });
        expect(b.model).toBe(DEFAULT_MODELS[0]);
        expect(b.models).toEqual(DEFAULT_MODELS);
        expect(b.reasoning).toEqual({ enabled: false });
        expect(b.provider).toEqual({ sort: 'latency', data_collection: 'deny' });
        expect(b.messages).toEqual([{ role: 'system', content: 'sistema' }, { role: 'user', content: 'pregunta' }]);
        expect(b.seed).toBe(42);
        expect(b.max_tokens).toBe(12000);
    });

    it('los modelos se cambian por OPENROUTER_MODELS (maximo 3)', () => {
        process.env.OPENROUTER_MODELS = 'a/uno, b/dos ,c/tres,d/cuatro';
        expect(openrouterModels()).toEqual(['a/uno', 'b/dos', 'c/tres']);
    });
});
