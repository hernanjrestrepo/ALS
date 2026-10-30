/**
 * OpenRouter para el chat de la IA de ALS (Hernan, 2026-10-30: "conectalo ya a OpenRouter y pon un
 * modelo rapido"). La GPU local (T4) atiende una solicitud a la vez y la revision de cumplimiento de
 * una cotizacion con varios articulos tardaba mas de 10 minutos (SIACOT-20741, COMPAS). Por aqui
 * pasa lo mismo que antes iba a gpt-oss local, en segundos y sin ocupar la GPU:
 *   - revision de cumplimiento de cotizaciones, validaciones, verificacion, planeacion,
 *     lectura del buzon y el chat de Martha (todo lo que llama aiService.chat).
 * La lectura de planillas con fotos (vision) sigue en la GPU local.
 *
 * Reglas (iguales a las del operador de EVA): sin razonamiento largo, el proveedor mas rapido, y
 * solo proveedores que NO guardan los datos (data_collection: deny): por aqui pasan cotizaciones y
 * resultados de clientes. Si OpenRouter falla, aiService.chat vuelve al modelo local.
 *
 * Config en server/.env:  OPENROUTER_API_KEY (obligatoria), OPENROUTER_MODELS (lista separada por
 * comas, el primero es el principal), AI_CHAT_PROVIDER=ollama para apagarlo.
 */
import axios from 'axios';

const URL = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
// Haiku 5.5: US$0,10 / 0,50 por millon de tokens (leido de openrouter.ai/api/v1/models el 2026-10-30).
export const DEFAULT_MODELS = ['anthropic/claude-haiku-5.5', 'deepseek/deepseek-v3.2', 'moonshotai/kimi-k2.6'];

export const openrouterEnabled = (): boolean =>
    !!process.env.OPENROUTER_API_KEY?.trim() && (process.env.AI_CHAT_PROVIDER || 'openrouter').toLowerCase() !== 'ollama';

export function openrouterModels(): string[] {
    const list = String(process.env.OPENROUTER_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);
    return (list.length ? list : DEFAULT_MODELS).slice(0, 3); // OpenRouter acepta hasta 3 modelos de respaldo
}

export interface OpenRouterOptions { temperature?: number; seed?: number; maxTokens?: number; timeoutMs?: number }

/** Cuerpo de /chat/completions (separado para poder probarlo sin red). */
export function buildBody(system: string, prompt: string, opts: OpenRouterOptions = {}) {
    const models = openrouterModels();
    return {
        model: models[0],
        models,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: opts.temperature ?? 0,
        ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
        max_tokens: opts.maxTokens ?? 12000,
        reasoning: { enabled: false },
        provider: { sort: 'latency', data_collection: 'deny' },
    };
}

export async function openrouterChat(system: string, prompt: string, opts: OpenRouterOptions = {}): Promise<string> {
    const started = Date.now();
    const r = await axios.post(`${URL}/chat/completions`, buildBody(system, prompt, opts), {
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://als.paradixe.xyz',
            'X-Title': 'ALS Xmart',
        },
        timeout: opts.timeoutMs ?? 180_000,
    });
    const text = String(r.data?.choices?.[0]?.message?.content || '');
    const u = r.data?.usage || {};
    console.log(`[OpenRouter] ${r.data?.model || '?'} en ${((Date.now() - started) / 1000).toFixed(1)} s (${u.prompt_tokens ?? '?'} entrada / ${u.completion_tokens ?? '?'} salida${u.cost !== undefined ? `, US$${Number(u.cost).toFixed(4)}` : ''})`);
    if (!text.trim()) throw new Error('OpenRouter respondio vacio');
    return text;
}
