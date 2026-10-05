/**
 * Contexto del asistente: una foto COMPLETA pero compacta del sistema (una linea por registro)
 * mas el detalle de lo que la pregunta menciona. Antes el chat volcaba los 627 recursos con
 * 4 lineas cada uno y solo 10 OITs: desbordaba el contexto del modelo y no incluia cotizaciones,
 * ingenieros, servicios ni no conformidades.
 *
 * Funciones puras (sin Prisma) para poder probarlas.
 */

export const OIT_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente', UPLOADING: 'Cargando archivos', ANALYZING: 'Analizando',
    REVIEW_REQUIRED: 'Pendiente de aprobación', REVIEW_NEEDED: 'Requiere revisión',
    REVIEW_IMPORTANT: 'Requiere revisión', SCHEDULED: 'Programada',
    IN_PROGRESS: 'En muestreo', COMPLETED: 'Completada',
};
export const statusLabel = (s: string) => OIT_STATUS_LABELS[s] || s;

export interface AssistantData {
    oits: any[];            // con assignedEngineers.user, quotation, _count
    quotations: any[];
    templates: any[];
    standards: any[];
    resources: any[];
    users: any[];           // solo id, name, email, role, active
    nonConformities: any[];
    unreadNotifications: number;
}

const clip = (v: unknown, n: number) => {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const fmtDate = (d: unknown) => {
    if (!d) return '';
    const x = new Date(d as any);
    return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10);
};
const parse = (s: unknown): any => {
    if (!s) return null;
    if (typeof s === 'object') return s;
    try { return JSON.parse(String(s)); } catch { return null; }
};
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Servicios, alertas y faltantes que la IA extrajo del documento de la OIT. */
export function oitExtract(oit: any) {
    const ai = parse(oit.aiData);
    const d = ai?.data || ai?.parsedData || ai || {};
    const services: string[] = Array.isArray(d.services) ? d.services.map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean) : [];
    return {
        services,
        alerts: Array.isArray(d.alerts) ? d.alerts.map(String) : [],
        missing: Array.isArray(d.missing) ? d.missing.map(String) : [],
        location: oit.location || d.location || '',
        description: oit.description || d.description || '',
    };
}

/**
 * Por que una OIT esta detenida y que hacer. El dato existe en el sistema (errores guardados del
 * analisis de laboratorio, alertas y faltantes del documento), pero disperso: aqui se resume para
 * que el asistente lo pueda explicar. Devuelve null si la OIT no requiere atencion.
 */
export function oitAttention(oit: any): { cause: string; solution: string } | null {
    const x = oitExtract(oit);
    const lab = parse(oit.labResultsAnalysis);
    const labTexts: string[] = [];
    if (lab && typeof lab === 'object') {
        for (const [group, v] of Object.entries(lab)) {
            const inner = parse(v) || v;
            const raw = typeof inner === 'object' && inner ? String((inner as any).rawText || '') : String(inner || '');
            if ((typeof inner === 'object' && (inner as any)?.error) || /^Error/i.test(raw)) labTexts.push(`${group !== 'General' ? `servicio ${group}: ` : ''}${raw}`);
        }
    } else if (typeof oit.labResultsAnalysis === 'string' && /error/i.test(oit.labResultsAnalysis)) {
        labTexts.push(oit.labResultsAnalysis);
    }

    if (labTexts.length) {
        const timeout = labTexts.some(t => /timeout|exceeded|agot/i.test(t));
        return {
            cause: timeout
                ? 'El análisis automático (IA) de los resultados de laboratorio no terminó: superó el tiempo límite de 3 minutos. Los resultados sí están cargados, pero no se pudieron leer ni se generó el informe final.'
                : `El análisis automático (IA) de los resultados de laboratorio falló: ${clip(labTexts.join(' / '), 220)}`,
            solution: 'Volver a lanzar el análisis: en la OIT, pestaña Informe, cargar de nuevo el PDF de resultados de laboratorio del servicio. Si el PDF es muy largo, subirlo dividido por servicio. Al terminar bien, la OIT pasa a Completada y se genera el informe final.',
        };
    }
    if (oit.status === 'REVIEW_NEEDED' || oit.status === 'REVIEW_IMPORTANT') {
        return {
            cause: 'Un proceso automático de esta OIT terminó con error y quedó para revisión manual; el sistema no guardó el detalle del error.',
            solution: 'Abrir la OIT, revisar qué paso quedó incompleto (análisis del documento, muestreo o resultados de laboratorio) y repetirlo.',
        };
    }
    if (oit.status === 'REVIEW_REQUIRED') {
        const pend = [
            x.missing.length ? `información faltante en el documento: ${x.missing.map((m: string) => clip(m, 90)).join('; ')}` : '',
            x.alerts.length ? `alertas: ${x.alerts.map((m: string) => clip(m, 90)).join('; ')}` : '',
            !oit.planningAccepted ? 'la planeación aún no ha sido aceptada' : '',
        ].filter(Boolean);
        return {
            cause: `El documento ya fue analizado y espera la revisión y aprobación de una persona${pend.length ? ' (' + pend.join(' | ') + ')' : ''}.`,
            solution: 'Abrir la OIT, revisar los datos extraídos, completar lo faltante y aceptar la planeación (fecha, ingeniero y recursos) en la pestaña Agenda.',
        };
    }
    return null;
}

function oitLine(oit: any): string {
    const x = oitExtract(oit);
    const eng = (oit.assignedEngineers || []).map((a: any) => a.user?.name).filter(Boolean);
    const parts = [
        `#${oit.oitNumber}`,
        statusLabel(oit.status),
        `creada ${fmtDate(oit.createdAt)}`,
        oit.scheduledDate ? `programada ${fmtDate(oit.scheduledDate)}` : 'sin programar',
        oit.quotation?.clientName ? `cliente: ${clip(oit.quotation.clientName, 40)}` : '',
        x.location ? `lugar: ${clip(x.location, 50)}` : '',
        x.services.length ? `servicios: ${clip(x.services.join('; '), 90)}` : '',
        eng.length ? `ingenieros: ${eng.join(', ')}` : 'sin ingeniero',
        `planeación ${oit.planningAccepted ? 'aceptada' : 'no aceptada'}`,
        oit.samplingData ? 'con muestreo' : 'sin muestreo',
        oit.labResultsUrl ? 'con resultados de laboratorio' : '',
        oit.finalReportUrl ? 'con informe final' : '',
        x.alerts.length ? `alertas: ${x.alerts.length}` : '',
        x.missing.length ? `faltantes: ${x.missing.length}` : '',
    ].filter(Boolean);
    return '- ' + parts.join(' | ');
}

function oitDetail(oit: any): string {
    const x = oitExtract(oit);
    const eng = (oit.assignedEngineers || []).map((a: any) => `${a.user?.name}${a.user?.email ? ` <${a.user.email}>` : ''}`);
    const sampling = parse(oit.samplingData);
    const steps: any[] = Array.isArray(sampling?.steps) ? sampling.steps : [];
    const lab = parse(oit.labResultsAnalysis);
    const labText = typeof lab === 'object' && lab ? (lab.rawText || lab.summary || '') : '';
    const resultados: any[] = Array.isArray(lab?.parsedData?.resultados) ? lab.parsedData.resultados : [];
    const lines = [
        `OIT #${oit.oitNumber} — ${statusLabel(oit.status)}`,
        `Descripción: ${clip(x.description, 400) || 'N/A'}`,
        `Ubicación: ${x.location || 'N/A'}`,
        `Creada: ${fmtDate(oit.createdAt)} | Programada: ${fmtDate(oit.scheduledDate) || 'sin programar'} | Última modificación: ${fmtDate(oit.updatedAt)}`,
        `Ingenieros asignados: ${eng.join(', ') || 'ninguno'}`,
        `Cotización: ${oit.quotation ? `${oit.quotation.quotationNumber} (${clip(oit.quotation.clientName, 60) || 'sin cliente'}, ${oit.quotation.status})` : 'ninguna'}`,
        `Planeación aceptada: ${oit.planningAccepted ? 'sí' : 'no'}`,
        x.services.length ? `Servicios solicitados: ${x.services.join('; ')}` : '',
        x.alerts.length ? `Alertas del análisis: ${x.alerts.map((a: string) => clip(a, 160)).join(' / ')}` : '',
        x.missing.length ? `Información faltante: ${x.missing.map((a: string) => clip(a, 160)).join(' / ')}` : '',
        steps.length ? `Checklist de muestreo (${steps.length} pasos):\n${steps.map((s, i) => `   ${i + 1}. ${clip(s.description || s.title || `Paso ${i + 1}`, 70)}: ${clip(typeof s.value === 'object' ? JSON.stringify(s.value) : s.value, 140) || '(sin respuesta)'}`).join('\n')}` : 'Checklist de muestreo: sin registrar',
        oit.finalAnalysis ? `Análisis del muestreo: ${clip(oit.finalAnalysis, 900)}` : '',
        resultados.length ? `Resultados de laboratorio (${resultados.length}): ${resultados.slice(0, 40).map((r: any) => `${r.parametro}=${r.valor}${r.unidad ? ' ' + r.unidad : ''}`).join('; ')}` : '',
        labText ? `Análisis de laboratorio: ${clip(labText, 900)}` : '',
        `Archivos: OIT ${oit.oitFileUrl ? 'sí' : 'no'}, resultados de laboratorio ${oit.labResultsUrl ? 'sí' : 'no'}, planillas ${oit.samplingSheetUrl ? 'sí' : 'no'}, informe de muestreo ${oit.samplingReportUrl ? 'sí' : 'no'}, informe final ${oit.finalReportUrl ? 'sí' : 'no'}`,
    ];
    return lines.filter(Boolean).join('\n');
}

/** OITs que la pregunta nombra por numero (o la que el usuario tiene abierta). */
export function oitsMentioned(message: string, oits: any[], currentOitId?: string): any[] {
    const msg = norm(message);
    const hit = oits.filter(o => {
        const n = norm(String(o.oitNumber));
        return n.length >= 3 && new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(msg);
    });
    const cur = currentOitId ? oits.find(o => o.id === currentOitId) : null;
    const out = cur ? [cur, ...hit.filter(o => o.id !== cur.id)] : hit;
    return out.slice(0, 4);
}

const STOP = new Set(['para', 'como', 'cual', 'cuales', 'cuantos', 'cuantas', 'que', 'los', 'las', 'del', 'con', 'una', 'uno', 'por', 'hay', 'tenemos', 'tiene', 'tienen', 'esta', 'estan', 'sobre', 'dame', 'muestra', 'lista', 'listado', 'equipos', 'equipo', 'recursos', 'recurso', 'sistema', 'todos', 'todas', 'oit', 'oits', 'quiero', 'necesito', 'favor', 'genera', 'tabla', 'grafica', 'informe', 'reporte']);

/** Recursos cuyo nombre/codigo/marca/modelo/serial/variable coincide con palabras de la pregunta. */
export function resourcesMatching(message: string, resources: any[], max = 30): any[] {
    const words = norm(message).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP.has(w));
    if (!words.length) return [];
    const scored = resources.map(r => {
        const hay = norm([r.name, r.code, r.brand, r.model, r.serial, r.variable, r.type, r.location].filter(Boolean).join(' '));
        return { r, score: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, max).map(x => x.r);
}

const resourceLine = (r: any) => '- ' + [
    clip(r.name, 60), r.code ? `código ${r.code}` : '', r.type, [r.brand, r.model].filter(Boolean).join(' '),
    r.serial ? `serie ${r.serial}` : '', r.status === 'AVAILABLE' ? 'disponible' : r.status,
    r.location ? `ubicación ${clip(r.location, 30)}` : '',
    r.calibrationExpiry ? `calibración vence ${fmtDate(r.calibrationExpiry)}` : '',
].filter(Boolean).join(' | ');

export function buildAssistantContext(data: AssistantData, message: string, opts: { currentOitId?: string; now?: Date } = {}): string {
    const now = opts.now || new Date();
    const { oits, quotations, templates, standards, resources, users, nonConformities } = data;

    const byStatus: Record<string, number> = {};
    oits.forEach(o => { byStatus[statusLabel(o.status)] = (byStatus[statusLabel(o.status)] || 0) + 1; });

    const resByType: Record<string, { total: number; disponibles: number }> = {};
    resources.forEach(r => {
        const t = r.type || 'Sin tipo';
        resByType[t] ||= { total: 0, disponibles: 0 };
        resByType[t].total++;
        if (r.status === 'AVAILABLE') resByType[t].disponibles++;
    });
    const in60 = new Date(now.getTime() + 60 * 86400000);
    const withExpiry = resources.filter(r => r.calibrationExpiry && !isNaN(new Date(r.calibrationExpiry).getTime()));
    const expired = withExpiry.filter(r => new Date(r.calibrationExpiry) < now);
    const dueSoon = withExpiry.filter(r => new Date(r.calibrationExpiry) >= now && new Date(r.calibrationExpiry) <= in60)
        .sort((a, b) => +new Date(a.calibrationExpiry) - +new Date(b.calibrationExpiry));

    const countType = (list: any[], t: string) => list.filter(r => (r.type || 'Sin tipo') === t).length;
    const calLabel = (r: any) => `${clip(r.name, 40)}${r.code ? ` [${r.code}]` : ''} (${r.type || 'sin tipo'}, ${fmtDate(r.calibrationExpiry)})`;

    const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : '0%');
    const ROLE: Record<string, string> = { SUPER_ADMIN: 'Super administrador', ADMIN: 'Administrador', ENGINEER: 'Ingeniero', USER: 'Usuario' };
    const usersByRole: Record<string, number> = {};
    users.forEach(u => { const r = ROLE[u.role] || u.role; usersByRole[r] = (usersByRole[r] || 0) + 1; });
    const engineers = users.filter(u => u.role === 'ENGINEER');

    const attention = oits.map(oit => ({ oit, ...(oitAttention(oit) || { cause: '', solution: '' }) })).filter(a => a.cause);
    const mentioned = oitsMentioned(message, oits, opts.currentOitId);
    const matchedResources = resourcesMatching(message, resources);

    const sections = [
        `FECHA DE HOY: ${fmtDate(now)}`,

        mentioned.length ? `=== DETALLE DE LAS OIT QUE MENCIONA LA PREGUNTA${opts.currentOitId ? ' (la primera es la que el usuario tiene abierta en pantalla)' : ''} ===\n${mentioned.map(oitDetail).join('\n\n')}` : '',

        `=== RESUMEN ===\nOITs: ${oits.length} (${Object.entries(byStatus).map(([k, v]) => `${k}: ${v} = ${pct(v, oits.length)}`).join(', ')})\nCotizaciones: ${quotations.length} | Plantillas de muestreo: ${templates.length} | Normas: ${standards.length} | Recursos/equipos: ${resources.length} | Usuarios: ${users.length} (${Object.entries(usersByRole).map(([k, v]) => `${k}: ${v}`).join(', ')}) | No conformidades: ${nonConformities.length} | Notificaciones sin leer del usuario: ${data.unreadNotifications}`,

        attention.length ? `=== OIT QUE REQUIEREN ATENCIÓN (${attention.length}): CAUSA Y QUÉ HACER ===\n${attention.map(a => `- #${a.oit.oitNumber} (${statusLabel(a.oit.status)}${a.oit.quotation?.clientName ? `, cliente ${clip(a.oit.quotation.clientName, 40)}` : ''}${oitExtract(a.oit).location ? `, ${clip(oitExtract(a.oit).location, 40)}` : ''})\n  Causa: ${a.cause}\n  Qué hacer: ${a.solution}`).join('\n')}` : '',

        `=== TODAS LAS OIT (${oits.length}) ===\n${oits.map(oitLine).join('\n') || '(ninguna)'}`,

        `=== COTIZACIONES (${quotations.length}) ===\n${quotations.map(q => `- ${q.quotationNumber} | cliente: ${clip(q.clientName, 50) || 'N/A'} | ${q.status}${q.approvedForOit ? ' | aprobada para OIT' : ''} | ${fmtDate(q.createdAt)} | ${clip(q.description, 100)}`).join('\n') || '(ninguna)'}`,

        `=== RECURSOS Y EQUIPOS (${resources.length}) por tipo ===\n${Object.entries(resByType).map(([t, v]) => `- ${t}: ${v.total} = ${pct(v.total, resources.length)} del inventario (${v.disponibles} disponibles; calibración vencida: ${countType(expired, t)}, por vencer en 60 días: ${countType(dueSoon, t)}, sin fecha de calibración registrada: ${countType(resources.filter(r => !r.calibrationExpiry), t)})`).join('\n')}\nCalibración vencida: ${expired.length}${expired.length ? ' → ' + expired.slice(0, 15).map(calLabel).join('; ') : ''}\nCalibración por vencer en 60 días: ${dueSoon.length}${dueSoon.length ? ' → ' + dueSoon.slice(0, 15).map(calLabel).join('; ') : ''}`,

        matchedResources.length ? `=== RECURSOS QUE COINCIDEN CON LA PREGUNTA (${matchedResources.length}) ===\n${matchedResources.map(resourceLine).join('\n')}` : '',

        `=== PLANTILLAS DE MUESTREO (${templates.length}) ===\n${templates.map(t => `- ${t.name} | tipo: ${t.oitType} | ${(parse(t.steps) || []).length} pasos${t.reportTemplateFile ? ` | informe: ${clip(t.reportTemplateFile, 60)}` : ''}`).join('\n') || '(ninguna)'}`,

        `=== NORMAS Y ESTÁNDARES (${standards.length}) ===\n${standards.map(s => `- ${clip(s.title, 110)}${s.type ? ` | ${s.type}` : ''}${s.description ? ` | ${clip(s.description, 110)}` : ''}`).join('\n') || '(ninguna)'}`,

        `=== INGENIEROS (${engineers.length}) ===\n${engineers.map(u => `- ${u.name}${u.email ? ` <${u.email}>` : ''}`).join('\n') || '(ninguno)'}`,

        nonConformities.length ? `=== NO CONFORMIDADES (${nonConformities.length}) ===\n${nonConformities.map(n => `- OIT #${n.oit?.oitNumber || '?'} | ${n.severity || ''} ${n.status || ''} | ${clip(n.title, 60)}: ${clip(n.description, 140)}`).join('\n')}` : '',
    ];
    return sections.filter(Boolean).join('\n\n');
}

export const ASSISTANT_SYSTEM_PROMPT = `Eres el asistente del sistema ALS Xmart (gestión de Órdenes de Inspección y Toma de muestras, OIT, de un laboratorio ambiental). Respondes en español, de forma clara y profesional.

REGLAS:
- Responde SOLO con los datos del sistema que recibes abajo. Si el dato no está, dilo ("no tengo ese dato en el sistema"); NUNCA inventes números, nombres, fechas ni estados.
- Cuando te pidan cantidades, cuenta sobre los datos entregados y da la cifra exacta.
- Porcentajes: usa los que ya vienen calculados en los datos. Si necesitas otro, divide la cantidad entre el total y verifica que la suma dé 100%; si dudas, da solo la cantidad.
- No escribas enlaces ni botones de descarga: la pantalla ya los muestra.
- Cuando pregunten por qué una OIT está detenida, en revisión o con problemas, o qué hacer con ella, usa la sección "OIT QUE REQUIEREN ATENCIÓN: CAUSA Y QUÉ HACER". Si varias OIT comparten la misma causa, dilo una sola vez de forma clara ("las 9 tienen la misma causa: ...") y luego lista las OIT; no repitas el mismo texto en cada fila.
- NUNCA llenes una tabla con "no tengo ese dato" en cada celda. Si de verdad falta un dato, dilo en una frase, explica qué sí sabes y sugiere dónde mirarlo dentro del sistema.
- Los usuarios escriben los estados de muchas formas ("review_needed", "requiere revisión", "en revisión"): son lo mismo. Responde siempre con el nombre en español.
- Para listas y comparaciones usa tablas Markdown (| Columna | Columna |). Para resúmenes usa títulos y viñetas.
- No emitas veredictos de cumplimiento normativo que no estén en los datos.
- Sé concreto: empieza por la respuesta, luego el detalle.

GRÁFICAS: cuando el usuario pida una gráfica, o cuando comparar cantidades se entienda mejor de forma visual, agrega un bloque de código con el lenguaje "chart" y un JSON en UNA sola línea, con esta forma exacta:
\`\`\`chart
{"type":"bar","title":"OIT por estado","labels":["Pendiente","Completada"],"series":[{"name":"OIT","data":[15,22]}]}
\`\`\`
- "type" es "bar" (comparar categorías), "pie" (partes de un total, máximo 8 categorías) o "line" (evolución en el tiempo).
- "labels" y cada "data" deben tener la misma cantidad de elementos; "data" son solo números tomados de los datos del sistema.
- Acompaña siempre la gráfica con una frase de interpretación y, si aplica, la tabla con las cifras.

INFORMES Y PRESENTACIONES: el usuario puede descargar tu respuesta como PDF, PowerPoint o Excel con los botones que aparecen debajo. Si te pide un informe, una presentación o un reporte, escríbelo completo y bien estructurado: un título con "# ", secciones con "## ", viñetas cortas, tablas y gráficas. Cada sección "## " se convierte en una diapositiva. No digas que no puedes generar archivos.`;
