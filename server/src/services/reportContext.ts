import { FieldMeasurement, ReportContext, ReportResult, matrixLabel } from './reportPostProcess';

// Datos del informe a partir de lo que ya tiene el sistema: el resultado de laboratorio que la IA
// ya extrajo (parsedData), el texto del reporte, el muestreo de campo y la OIT. El analisis y las
// conclusiones se redactan SOLO con esos datos: una version determinista siempre disponible y,
// si la IA responde bien (sin numeros que no estaban en los datos), una redaccion mas fluida.

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function longDate(iso?: string): string {
    const m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    return `${Number(m[3])} de ${MONTHS[Number(m[2]) - 1]} de ${m[1]}`;
}

const pick = (re: RegExp, text: string) => (re.exec(text)?.[1] || '').trim();

export function readLabHeader(labText: string) {
    const t = String(labText || '');
    return {
        reportNumber: pick(/Reporte\s*No\.?\s*:?\s*(\d{3,})/i, t),
        sampleDate: pick(/Fecha de muestreo:?\s*(\d{4}-\d{2}-\d{2})/i, t),
        norm: pick(/Normatividad:?\s*([^\n]+?)(?=\s{2,}|\n|Fecha de muestreo|$)/i, t).replace(/\s+/g, ' '),
        contact: pick(/Contacto:?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ ]{4,60}?)(?=\s{2,}|\n|Datos|$)/, t),
        phone: pick(/Tel[eé]fono:?\s*([\d/ -]{6,30})/i, t),
    };
}

export function measurementsFromSampling(samplingRaw: string | null | undefined, serviceName: string): { field: FieldMeasurement[]; coordinates?: string } {
    try {
        const sd = JSON.parse(samplingRaw || '{}');
        const svc = Object.values<any>(sd.services || {}).find(s => String(s?.serviceName || '').trim() === serviceName.trim())
            || (Object.keys(sd.services || {}).length === 1 ? Object.values<any>(sd.services)[0] : null);
        if (!svc) return { field: [] };
        const field: FieldMeasurement[] = [];
        for (const st of svc.steps || []) {
            if (Array.isArray(st.measurements)) for (const m of st.measurements) if (String(m?.value || '').trim()) field.push({ name: String(m.name), value: String(m.value), unit: m.unit || '' });
        }
        const gps = svc.visits?.[0]?.arrival?.gps;
        return { field, coordinates: gps ? `${gps.lat.toFixed(6)}°, ${gps.lng.toFixed(6)}°` : undefined };
    } catch { return { field: [] }; }
}

const fmtResult = (r: ReportResult) => `${r.valor}${r.unidad ? ` ${r.unidad}` : ''}`;

export function deterministicSections(serviceName: string, results: ReportResult[], norm: string | undefined, field: FieldMeasurement[]) {
    const matrix = matrixLabel(serviceName).word;
    const ok = results.filter(r => r.cumple === true);
    const bad = results.filter(r => r.cumple === false);
    const unknown = results.filter(r => r.cumple !== true && r.cumple !== false);
    const normText = norm ? `frente a ${norm}` : 'frente a la normatividad indicada en el reporte de laboratorio';

    const analysis: string[] = [];
    if (!results.length) {
        analysis.push('No fue posible leer los resultados del reporte de laboratorio; las tablas y conclusiones deben completarse con el Anexo 1.');
    } else {
        analysis.push(`Se evaluaron ${results.length} parámetro(s) en la muestra de agua ${matrix}: ${results.map(r => r.parametro).join(', ')}. Los valores obtenidos se presentan en la Tabla 8 y se compararon ${normText}.`);
        for (const r of results) {
            const limit = r.normativa ? ` frente a un valor aceptable de ${r.normativa}${r.unidad ? ` ${r.unidad}` : ''}` : '';
            const verdict = r.cumple === true ? 'cumple' : r.cumple === false ? 'no cumple' : 'no tiene declaración de conformidad en el reporte';
            analysis.push(`${r.parametro}: se reportó ${fmtResult(r)}${limit}; el resultado ${verdict}.`);
        }
    }

    const conclusions: string[] = [];
    if (results.length) {
        if (!bad.length && !unknown.length) conclusions.push(`Los ${results.length} parámetro(s) evaluados en el agua ${matrix} cumplen ${normText}.`);
        else {
            if (ok.length) conclusions.push(`${ok.length} de ${results.length} parámetro(s) cumplen ${normText}: ${ok.map(r => r.parametro).join(', ')}.`);
            if (bad.length) conclusions.push(`No cumplen: ${bad.map(r => `${r.parametro} (${fmtResult(r)}${r.normativa ? `, aceptable ${r.normativa}` : ''})`).join('; ')}. Se recomienda revisar el sistema y repetir el muestreo para confirmar.`);
            if (unknown.length) conclusions.push(`Sin declaración de conformidad en el reporte: ${unknown.map(r => r.parametro).join(', ')}.`);
        }
    } else {
        conclusions.push('El informe queda pendiente de los resultados de laboratorio (Anexo 1).');
    }
    if (!field.length) conclusions.push('No se registraron mediciones in situ para este servicio, por lo que el análisis se limita a los resultados de laboratorio.');

    const fieldNarrative = field.length
        ? [`En campo se registraron las siguientes mediciones in situ: ${field.map(f => `${f.name} ${f.value}${f.unit ? ` ${f.unit}` : ''}`).join('; ')}.`]
        : ['En este servicio no se registraron mediciones in situ; los resultados corresponden a los análisis de laboratorio.'];
    return { analysis, conclusions, fieldNarrative };
}

// La IA solo redacta: se acepta su texto si no trae numeros que no estaban en los datos.
export function aiTextIsGrounded(text: string, source: string): boolean {
    const allowed = new Set((source.match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.')));
    const nums = (text.match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.'));
    return nums.every(n => allowed.has(n) || Number(n) <= 12 || /^(19|20)\d\d$/.test(n));
}

export function buildReportContext(input: {
    oit: any; serviceName: string; parsed: any; labText: string; labFileName?: string;
    ai?: { analysis?: string[]; conclusions?: string[] } | null;
}): ReportContext {
    const { oit, serviceName, parsed, labText } = input;
    const header = readLabHeader(labText);
    const results: ReportResult[] = (parsed?.resultados || []).map((r: any) => ({
        parametro: String(r.parametro || '').trim(), valor: r.valor, unidad: r.unidad, metodo: r.metodo,
        limite: r.limite, normativa: r.normativa != null ? String(r.normativa) : undefined, cumple: typeof r.cumple === 'boolean' ? r.cumple : null,
    })).filter((r: ReportResult) => r.parametro);
    const { field, coordinates } = measurementsFromSampling(oit.samplingData, serviceName);
    const point = parsed?.puntos?.[0];
    const base = deterministicSections(serviceName, results, header.norm || undefined, field);
    const source = JSON.stringify({ results, field, norm: header.norm });
    const ai = input.ai;
    const useAi = (list?: string[]) => !!list?.length && list.every(t => aiTextIsGrounded(t, source));

    return {
        serviceName,
        oitNumber: oit.oitNumber,
        year: new Date().getFullYear(),
        results,
        field,
        norm: header.norm || undefined,
        sampleId: point?.idMuestra || point?.id || undefined,
        reportNumber: header.reportNumber || undefined,
        sampleDate: header.sampleDate ? longDate(header.sampleDate) : undefined,
        pointName: point?.nombre || point?.descripcion || undefined,
        coordinates,
        contact: { name: header.contact || undefined, phone: header.phone || undefined },
        labFileName: input.labFileName,
        analysis: useAi(ai?.analysis) ? ai!.analysis! : base.analysis,
        conclusions: useAi(ai?.conclusions) ? ai!.conclusions! : base.conclusions,
        fieldNarrative: base.fieldNarrative,
    };
}

export function buildAiPrompt(ctx: ReportContext): string {
    const facts = {
        servicio: ctx.serviceName, normatividad: ctx.norm || 'no indicada',
        resultadosLaboratorio: ctx.results.map(r => ({ parametro: r.parametro, valor: r.valor, unidad: r.unidad, valorAceptable: r.normativa, cumple: r.cumple })),
        medicionesEnCampo: ctx.field,
    };
    return `Eres analista técnico ambiental de ALS Environmental. Redacta para un informe técnico formal, en español y en tercera persona, el ANÁLISIS DE RESULTADOS y las CONCLUSIONES de este servicio, usando ÚNICAMENTE estos datos:
${JSON.stringify(facts)}

REGLAS:
- No inventes valores, límites, normas, causas ni recomendaciones que no se deduzcan de los datos. Si falta un dato, dilo.
- Cada afirmación sobre cumplimiento debe salir del campo "cumple".
- Analisis: un párrafo introductorio y un párrafo por parámetro o grupo de parámetros (valor, unidad, valor aceptable, cumple o no).
- Conclusiones: 2 a 5 frases cortas.
Responde SOLO un JSON: {"analysis": ["párrafo", ...], "conclusions": ["frase", ...]}`;
}
