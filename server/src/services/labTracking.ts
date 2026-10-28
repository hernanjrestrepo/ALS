import { normalizeParameterName } from './labNames';

// Seguimiento del laboratorio por OIT y servicio (reunion del 27-oct con Sirys y Juan):
// que servicios esperan resultado, cuales ya lo tienen, de quien es cada archivo (ALS o
// tercero), si el laboratorio marco "cargue completo" y que parametros cotizados no
// aparecen en los resultados. Funciones puras: la base de datos se lee fuera.

export type LabOrigin = 'ALS' | 'TERCERO' | 'DESCONOCIDO';

// Servicios de escritorio: no generan resultado de laboratorio.
const DESKTOP = /\b(ica|rua|gdb|geodatabase|fichas?|informe de cumplimiento|informe multitemporal|coordinacion|consultoria|geodatabase)\b/;

const fold = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const needsLabResult = (serviceName: string): boolean => !!fold(serviceName).trim() && !DESKTOP.test(fold(serviceName));

// Quien emitio el resultado, leyendo el encabezado del PDF. El emisor es ALS si el
// documento lo dice; si parece un informe de laboratorio de otra entidad, es tercero.
export function classifyLabText(text: string): LabOrigin {
    const head = String(text || '').slice(0, 3000);
    if (!head.trim()) return 'DESCONOCIDO';
    // Los formatos de ALS traen su codigo de calidad ("Codigo: FO-PO-PSM-26-08"), aunque no digan ALS.
    if (/\bFO-(PO|IT)-PSM-\d|\bALS\b|ALS (Life Sciences|Environmental|Global|Colombia)|serambiente/i.test(head)) return 'ALS';
    if (/laboratorio|resultados? (de )?(an[aá]lisis|laboratorio)|informe de ensayo|m[eé]todo|ISO\/IEC 17025|ONAC|IDEAM/i.test(head)) return 'TERCERO';
    return 'DESCONOCIDO';
}

export type GroupedFiles = Record<string, string[]>;

export function parseGrouped<T = any>(raw: string | null | undefined): Record<string, T> {
    if (!raw) return {};
    try {
        const v = JSON.parse(raw);
        if (Array.isArray(v)) return { General: v as unknown as T };
        return v && typeof v === 'object' ? v : {};
    } catch { return {}; }
}

export interface OitServiceInfo { index: number; name: string; hasTemplate: boolean }

export function servicesOf(aiDataRaw: string | null | undefined): OitServiceInfo[] {
    try {
        const ai = JSON.parse(aiDataRaw || '{}');
        const list: any[] = ai?.data?.services || ai?.data?.oit?.services || [];
        return list
            .map((s, index) => ({ index, name: String(s?.name || '').trim(), hasTemplate: Array.isArray(s?.templates) && s.templates.length > 0 }))
            .filter(s => s.name);
    } catch { return []; }
}

// Archivos del servicio: por su nombre; el numero de servicio ("1") de los envios antiguos tambien cuenta.
export function filesForService(grouped: GroupedFiles, svc: OitServiceInfo, onlyOne: boolean): string[] {
    const out = [...(grouped[svc.name] || []), ...(grouped[String(svc.index + 1)] || [])];
    if (onlyOne) out.push(...(grouped.General || []));
    return [...new Set(out)];
}

export interface ServiceLabStatus {
    key: string;
    name: string;
    files: Array<{ file: string; origin: LabOrigin }>;
    hasAnalysis: boolean;
    complete: boolean;
    completedAt?: string;
    completedBy?: string;
    missing?: string[];
    state: 'SIN_RESULTADOS' | 'PARCIAL' | 'COMPLETO';
    issues: string[];
}

export function serviceStatuses(oit: {
    aiData?: string | null; labResultsUrl?: string | null; labResultsAnalysis?: string | null;
    labFileSource?: string | null; labComplete?: string | null;
}): ServiceLabStatus[] {
    const services = servicesOf(oit.aiData).filter(s => needsLabResult(s.name));
    const grouped = parseGrouped<string[]>(oit.labResultsUrl);
    const analyses = parseGrouped<unknown>(oit.labResultsAnalysis);
    const sources = parseGrouped<LabOrigin>(oit.labFileSource) as unknown as Record<string, LabOrigin>;
    const complete = parseGrouped<{ at: string; by?: string; missing?: string[] }>(oit.labComplete);
    const only = services.length === 1;

    const result: ServiceLabStatus[] = services.map(svc => {
        const files = filesForService(grouped, svc, only).map(file => ({ file, origin: sources[file] || 'DESCONOCIDO' }));
        const doneKey = [svc.name, String(svc.index + 1)].find(k => complete[k]);
        const done = doneKey ? complete[doneKey] : undefined;
        const hasAnalysis = [svc.name, String(svc.index + 1), ...(only ? ['General'] : [])].some(k => !!analyses[k]);
        const issues: string[] = [];
        if (!files.length) issues.push('Sin resultados de laboratorio.');
        else if (files.length && !hasAnalysis) issues.push('Resultados cargados; el análisis de la IA aún no termina.');
        return {
            key: svc.name, name: svc.name, files, hasAnalysis,
            complete: !!done, completedAt: done?.at, completedBy: done?.by, missing: done?.missing,
            state: !files.length ? 'SIN_RESULTADOS' : done ? 'COMPLETO' : 'PARCIAL',
            issues,
        };
    });
    // Resultados guardados con un nombre que no es de ningun servicio (carga manual "General"...).
    const used = new Set(result.flatMap(r => r.files.map(f => f.file)));
    const orphans = Object.values(grouped).flat().filter(f => !used.has(f));
    if (orphans.length) {
        result.push({
            key: 'General', name: 'Otros resultados sin servicio', files: [...new Set(orphans)].map(file => ({ file, origin: sources[file] || 'DESCONOCIDO' })),
            hasAnalysis: !!analyses.General, complete: !!complete.General, state: complete.General ? 'COMPLETO' : 'PARCIAL',
            issues: ['Resultados sin servicio asignado.'],
        });
    }
    return result;
}

// Parametros cotizados (nombre como lo escribio la cotizacion) que no aparecen en el texto de
// los resultados. Compara por palabras sin tildes ("Nitritos" ~ "Nitrito").
export function missingParameters(quoted: string[], resultsText: string): string[] {
    const body = fold(resultsText);
    return [...new Set(quoted.map(q => String(q || '').trim()).filter(Boolean))].filter(q => {
        const norm = normalizeParameterName(q);
        if (!norm) return false;
        if (body.includes(norm)) return false;
        const words = norm.split(' ').filter(w => w.length >= 3);
        // El nombre cotizado suele traer palabras de mas ("Conductividad eléctrica"): basta que
        // aparezca la primera palabra y al menos la mitad del nombre.
        const hits = words.filter(w => body.includes(w.replace(/s$/, ''))).length;
        return !(words.length && body.includes(words[0].replace(/s$/, '')) && hits / words.length >= 0.5);
    });
}
