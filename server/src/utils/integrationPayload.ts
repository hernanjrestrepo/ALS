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
