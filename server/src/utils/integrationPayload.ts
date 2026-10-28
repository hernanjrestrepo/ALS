import { Request } from 'express';

// Sistema Serambiente llama a los webhooks desde un proceso propio y ya ha mandado
// la URL del PDF mal armada y campos que no llegaban como JSON esperado. Este lector
// acepta las variantes razonables para que un descuido de formato del otro lado no
// deje la OIT sin entrar.

const SERAMBIENTE_HOST = /^(https?:\/\/(?:www\.)?sistemaserambiente\.com)(?![/:?#])(?=PDF\/|public\/)/i;

// "https://sistemaserambiente.comPDF/OIT-...pdf" -> "https://sistemaserambiente.com/serambiente/PDF/OIT-...pdf"
// "https://sistemaserambiente.compublic/OT-...pdf" -> "https://sistemaserambiente.com/public/OT-...pdf"
export function normalizeDocumentUrl(raw: string): string {
    let url = String(raw).trim().replace(/^["']+|["']+$/g, '');
    url = url.replace(SERAMBIENTE_HOST, (_m, host: string) => `${host}/`);
    // sin ruta de aplicacion, los PDF de OIT viven bajo /serambiente/PDF/
    url = url.replace(/^(https?:\/\/(?:www\.)?sistemaserambiente\.com)\/PDF\//i, '$1/serambiente/PDF/');
    return url;
}

function findKey(obj: Record<string, any>, names: string[]): string | undefined {
    const wanted = names.map(n => n.toLowerCase());
    for (const key of Object.keys(obj)) {
        if (wanted.includes(key.toLowerCase())) {
            const value = obj[key];
            if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
        }
    }
    return undefined;
}

// Que hacer cuando Sistema Serambiente manda una OIT por el webhook from-url.
// Solo se (re)procesa una OIT nueva o una cuya recepcion anterior fallo; una que
// ya avanzo en ALS (incluidas las creadas al llegar su resultado de laboratorio)
// nunca vuelve a PENDING ni se le pisa el analisis: a lo sumo se le pega el PDF.
const FROM_URL_RETRY_STATUSES = new Set(['REVIEW_IMPORTANT', 'ERROR']);

export type FromUrlAction = 'process' | 'attach-pdf' | 'ignore';

export function fromUrlAction(existing: { status: string; oitFileUrl: string | null } | null): FromUrlAction {
    if (!existing || FROM_URL_RETRY_STATUSES.has(existing.status)) return 'process';
    return existing.oitFileUrl ? 'ignore' : 'attach-pdf';
}

export interface IntegrationPayload {
    OT?: string;
    DOCUMENTO?: string;
    SERVICIO?: string;
    group?: string;
    // solo para diagnostico cuando algo falta
    contentType: string;
    keys: string[];
}

export function readIntegrationPayload(req: Request): IntegrationPayload {
    let body: any = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    const merged: Record<string, any> = { ...(req.query as any), ...(body && typeof body === 'object' ? body : {}) };

    const rawDoc = findKey(merged, ['DOCUMENTO', 'documento', 'url', 'documentUrl', 'document', 'pdf', 'archivo']);
    return {
        OT: findKey(merged, ['OT', 'oit', 'oitNumber', 'orden']),
        DOCUMENTO: rawDoc ? normalizeDocumentUrl(rawDoc) : undefined,
        SERVICIO: findKey(merged, ['SERVICIO', 'servicio']),
        group: findKey(merged, ['group']),
        contentType: String(req.headers['content-type'] || '(ninguno)'),
        keys: Object.keys(merged),
    };
}

// Clave compartida opcional para los webhooks de Serambiente. Mientras WEBHOOK_SHARED_SECRET no
// este definida todo se acepta como siempre (Serambiente aun no la manda); al definirla, solo
// entran llamadas con la clave en la cabecera x-webhook-key o en el campo "key".
export function webhookKeyOk(req: Request): boolean {
    const secret = (process.env.WEBHOOK_SHARED_SECRET || '').trim();
    if (!secret) return true;
    const given = String(req.headers['x-webhook-key'] || (req.query as any)?.key || (req.body && typeof req.body === 'object' ? (req.body as any).key : '') || '');
    return given === secret;
}
