import { PrismaClient } from '@prisma/client';

// Las plantillas de muestreo salen de la OIT, no se eligen a mano (Hernan, 2026-10-23,
// OIT 14824). El analisis de la OIT trae los servicios ("Monitoreo de Agua Subterranea
// (MATRIZAGUAS)") pero nunca se les asignaba plantilla: 1 de 196 OIT tenia plantillas y
// Muestreo pedia "Seleccionar Plantilla". La asignacion es por reglas fijas sobre el
// nombre del servicio (sin IA) y nunca reemplaza una seleccion hecha a mano.

const prisma = new PrismaClient();

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Servicios de escritorio (informes, reportes, bases de datos): no hay toma de muestras.
const DOCUMENTARY = /\b(ica|rua|gdb|geodatabase|fichas?|informe de cumplimiento|informe multitemporal|coordinacion|consultoria)\b/;

// Nombre de la plantilla (como esta en Xmart) que corresponde a un servicio, o null si
// no hay una clara. Lo ambiguo (fuentes fijas previo/informe, residuos TCLP) queda sin
// asignar para que se elija a mano.
export function templateNameForService(serviceName: string): string | null {
    const s = norm(serviceName || '');
    if (!s.trim() || DOCUMENTARY.test(s)) return null;
    if (/ruido/.test(s)) {
        if (/intradomicil/.test(s)) return 'Ruido - Intradomiciliario';
        const emision = /emision/.test(s);
        const ambiental = /ambiental/.test(s);
        if (emision && ambiental) return 'Ruido - Emisión y Ambiental';
        if (emision) return 'Ruido - Emisión';
        if (ambiental) return 'Ruido - Ambiental';
        return null;
    }
    if (/olor/.test(s)) return 'Olores Ofensivos';
    if (/particulas viables|bioaerosol/.test(s)) return 'Partículas Viables';
    if (/fuentes? fijas?|chimenea|isocinet/.test(s)) return null;
    if (/calidad (de(l)? )?aire|\baire\b/.test(s)) return 'Calidad de Aire';
    if (/respel|residuos peligrosos/.test(s)) return 'Caracterización de RESPEL';
    if (/punto seco/.test(s)) return 'Punto Seco';
    if (/suelo/.test(s)) return 'Suelos';
    if (/biota|flora|fauna|hidrobiolog|macroinvertebr|perifiton|plancton/.test(s)) return 'Biota';
    if (/\baguas?\b|vertimiento|piscina|\barnd\b/.test(s)) return 'Agua';
    return null;
}

interface TemplateRef { id: string; name: string }

// Donde guarda los servicios cada flujo: el webhook en data.services, la carga
// manual en data.oit.services.
function servicesOf(ai: any): any[] | null {
    if (Array.isArray(ai?.data?.services)) return ai.data.services;
    if (Array.isArray(ai?.data?.oit?.services)) return ai.data.oit.services;
    return null;
}

export function assignTemplatesToAiData(ai: any, templates: TemplateRef[]): { ai: any; templateIds: string[] } | null {
    const services = servicesOf(ai);
    if (!services?.length) return null;
    const byName = new Map(templates.map(t => [norm(t.name), t]));
    const ids: string[] = [];
    for (const service of services) {
        if (Array.isArray(service.templates) && service.templates.length) {
            service.templates.forEach((t: any) => t?.id && ids.push(String(t.id)));
            continue;
        }
        const name = templateNameForService(String(service.name || ''));
        const template = name ? byName.get(norm(name)) : undefined;
        if (!template) continue;
        service.templates = [{ id: template.id, name: template.name }];
        ids.push(template.id);
    }
    const unique = [...new Set(ids)];
    return unique.length ? { ai, templateIds: unique } : null;
}

// Asigna las plantillas de una OIT si todavia no tiene ninguna elegida.
export async function autoAssignTemplates(oitId: string): Promise<string[]> {
    const oit = await prisma.oIT.findUnique({ where: { id: oitId }, select: { aiData: true, selectedTemplateIds: true, oitNumber: true } });
    if (!oit?.aiData) return [];
    const current = (() => { try { return JSON.parse(oit.selectedTemplateIds || '[]'); } catch { return []; } })();
    if (Array.isArray(current) && current.length) return [];
    let ai: any;
    try { ai = JSON.parse(oit.aiData); } catch { return []; }
    const templates = await prisma.samplingTemplate.findMany({ select: { id: true, name: true } });
    const result = assignTemplatesToAiData(ai, templates);
    if (!result) return [];
    await prisma.oIT.update({
        where: { id: oitId },
        data: { aiData: JSON.stringify(result.ai), selectedTemplateIds: JSON.stringify(result.templateIds) },
    });
    console.log(`[Plantillas] OIT ${oit.oitNumber}: ${result.templateIds.length} plantilla(s) asignada(s) desde sus servicios`);
    return result.templateIds;
}
