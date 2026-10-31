// Una OIT creada sola por el resultado de laboratorio (sin documento de OIT) no trae servicios para
// programar. Se toman de la cotizacion vinculada: son los mismos que el cliente contrato (30-oct, OIT 14833).

interface PlannedService { name: string; proposedDate: string | null; duration: number; templates: unknown[] }

function parse(raw: string | null | undefined): any {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function hasPlannedServices(aiDataRaw: string | null | undefined): boolean {
    const a = parse(aiDataRaw);
    const list = a?.data?.services || a?.data?.oit?.services;
    return Array.isArray(list) && list.length > 0;
}

/** Servicios de la cotizacion en el formato del plan de una OIT, o null si la cotizacion no los tiene. */
export function planFromQuotation(quotation: { quotationNumber: string; aiData?: string | null; services?: Array<{ name: string }> }): string | null {
    const ai = parse(quotation.aiData);
    const fromAi: any[] = Array.isArray(ai?.services) ? ai.services : [];
    const services: PlannedService[] = fromAi.length
        ? fromAi.filter(s => s?.name).map(s => ({ name: String(s.name), proposedDate: s.proposedDate || null, duration: Number(s.duration) || 1, templates: [] }))
        : (quotation.services || []).map(s => ({ name: s.name, proposedDate: null, duration: 1, templates: [] }));
    if (!services.length) return null;
    return JSON.stringify({
        valid: true,
        message: `Servicios tomados de la cotización ${quotation.quotationNumber} (la OIT no trae documento propio).`,
        source: 'quotation',
        data: { services },
    });
}
