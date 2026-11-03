import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

// IA en Amazon Bedrock (Hernan, 2026-11-03: quitar la GPU de ALS, ~US$384/mes, y pasar a una
// instancia M6 sin GPU). Mistral Large 3 atiende texto y fotos con el mismo modelo: probado el
// 3-nov con una planilla escrita a mano (8 s, dejo vacia la conductividad en blanco) y con
// extraccion de texto (0,5 s). Se usa por el rol IAM de la instancia: sin llaves en el .env.
//
// El resto del codigo habla "Ollama" (ollamaPost con /api/generate y /api/chat). Para no tocar
// los ~12 sitios de llamada, con LLM_BACKEND=bedrock esas peticiones se traducen aqui a la API
// Converse y la respuesta vuelve con la forma de Ollama.

export const bedrockEnabled = (): boolean => (process.env.LLM_BACKEND || '').trim().toLowerCase() === 'bedrock';
export const bedrockModelId = (): string => (process.env.BEDROCK_MODEL_ID || 'mistral.mistral-large-3-675b-instruct').trim();
// Fotos y planillas escaneadas: Claude Sonnet 5.5 leyo 8 de 8 valores de una planilla densa (FO-PO-PSM-45-01);
// Mistral Large 3 acerto 3 de 8, Pixtral 1, Nova Pro 4 y Qwen3-VL 7 (puso la temperatura en la conductividad
// en blanco). Se prueba el 3-nov-2026 con la planilla real de la OT 15030.
export const bedrockVisionModelId = (): string => (process.env.BEDROCK_VISION_MODEL_ID || 'us.anthropic.claude-sonnet-5-5').trim();
// Los modelos Claude 5 rechazan "temperature".
const acceptsTemperature = (modelId: string) => !/anthropic/i.test(modelId);

let client: BedrockRuntimeClient | null = null;
const getClient = () => (client ||= new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1', maxAttempts: 4 }));

export interface ConversePlan {
    system?: Array<{ text: string }>;
    messages: any[];
    inferenceConfig: { maxTokens: number; temperature: number };
    wantsJson: boolean;
    kind: 'generate' | 'chat';
    hasImages: boolean;
}

const JSON_NOTE = 'Responde únicamente con JSON válido, sin texto adicional ni bloques de código.';

function imageBlock(b64: string) {
    const bytes = Buffer.from(b64, 'base64');
    const isPng = bytes.slice(0, 4).toString('hex') === '89504e47';
    const isWebp = bytes.slice(8, 12).toString('ascii') === 'WEBP';
    return { image: { format: isPng ? 'png' : isWebp ? 'webp' : 'jpeg', source: { bytes } } };
}

// Peticion estilo Ollama -> Converse. Funcion pura (se prueba sin red).
export function toConverse(url: string, body: any): ConversePlan {
    const wantsJson = body?.format === 'json';
    const opts = body?.options || {};
    const inferenceConfig = {
        maxTokens: Math.min(Math.max(Number(opts.num_predict) || 4096, 16), 8192),
        temperature: typeof opts.temperature === 'number' ? Math.min(Math.max(opts.temperature, 0), 1) : 0.2,
    };
    const systemTexts: string[] = [];
    if (body?.system) systemTexts.push(String(body.system));
    if (wantsJson) systemTexts.push(JSON_NOTE);
    const system = systemTexts.length ? [{ text: systemTexts.join('\n\n') }] : undefined;

    if (/\/api\/chat$/.test(url)) {
        const messages = (body.messages || []).map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: [...(Array.isArray(m.images) ? m.images.map(imageBlock) : []), { text: String(m.content ?? '') || ' ' }],
        }));
        return { system, messages, inferenceConfig, wantsJson, kind: 'chat', hasImages: (body.messages || []).some((m: any) => Array.isArray(m.images) && m.images.length > 0) };
    }
    return { system, messages: [{ role: 'user', content: [{ text: String(body?.prompt ?? '') || ' ' }] }], inferenceConfig, wantsJson, kind: 'generate', hasImages: false };
}

// Respuesta del modelo -> forma de Ollama. Con format:'json' se quitan las vallas ```json.
export function fromConverse(plan: ConversePlan, text: string) {
    let out = String(text || '');
    if (plan.wantsJson) out = out.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return plan.kind === 'chat'
        ? { message: { role: 'assistant', content: out }, done: true }
        : { response: out, done: true };
}

// "Recalentar" el modelo (prompt 'ok', keep_alive -1) no tiene sentido en un servicio gestionado.
const isWarmup = (b: any) => b && b.keep_alive !== undefined && String(b.prompt || '').trim().toLowerCase() === 'ok' && Number(b?.options?.num_predict) === 1;

export async function bedrockPost(url: string, body: any, config?: { timeout?: number }): Promise<{ data: any }> {
    if (isWarmup(body)) return { data: { response: '', done: true } };
    const plan = toConverse(url, body);
    const ctl = new AbortController();
    const timer = config?.timeout ? setTimeout(() => ctl.abort(), config.timeout) : null;
    try {
        const modelId = plan.hasImages ? bedrockVisionModelId() : bedrockModelId();
        const inferenceConfig: any = acceptsTemperature(modelId) ? plan.inferenceConfig : { maxTokens: plan.inferenceConfig.maxTokens };
        const res = await getClient().send(new ConverseCommand({
            modelId, system: plan.system, messages: plan.messages, inferenceConfig,
        }), { abortSignal: ctl.signal });
        const text = (res.output?.message?.content || []).map((c: any) => c.text || '').join('');
        return { data: fromConverse(plan, text) };
    } finally {
        if (timer) clearTimeout(timer);
    }
}
