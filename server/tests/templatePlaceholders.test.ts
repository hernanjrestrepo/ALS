import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { SUELO_CONFIG, BIOTA_CONFIG, TEMPLATE_CONFIGS, getTemplateType } from '../src/config/templateConfigs';

const dir = path.join(__dirname, '../templates/reports');

function bodyParagraphs(code: string): { raw: string[]; plain: string; tags: Set<string> } {
    const file = fs.readdirSync(dir).find(n => n.includes(code) && n.endsWith('-plantilla.docx'))!;
    const xml = new PizZip(fs.readFileSync(path.join(dir, file))).file('word/document.xml')!.asText();
    const raw = xml.split('</w:p>').map(p => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join(''));
    const all = raw.join('\n');
    const tags = new Set<string>();
    for (const m of all.matchAll(/\{[#\/^]?([A-Za-z0-9_.]+)\}/g)) tags.add(m[1]);
    return { raw, plain: all.replace(/\{[^}]*\}/g, ''), tags };
}

// Placeholders de ejemplo que un informe real mostraria literalmente al cliente.
const LEFTOVERS: Array<[string, RegExp]> = [
    ['XX/XXXX de ejemplo', /X{2,}/],
    ['xx minusculas de ejemplo', /\bxx/i],
    ['fecha de ejemplo', /DD\/MM\/AAAA|de mes de año/],
    ['sitio de otro cliente', /Mallorqu/i],
];

describe.each([
    ['SUELO (64-11)', '64-11', SUELO_CONFIG],
    ['BIOTA (74-01)', '74-01', BIOTA_CONFIG],
])('plantilla %s: sin placeholders sueltos en el cuerpo', (_name, code, config) => {
    const { plain, tags } = bodyParagraphs(code);

    it.each(LEFTOVERS)('no contiene %s', (_label, re) => {
        expect(plain.match(re)).toBeNull();
    });

    it('no contiene instrucciones editoriales internas', () => {
        expect(plain).not.toMatch(/EN MAYUSCULA|se encuentra en la OIT|aquí se citan|nombrar las comunidades|Relacionar información climática/);
    });

    it('todo tag escalar de la plantilla existe en la configuracion o es de bucle/seccion', () => {
        const loopKeys = new Set([
            // bucles y secciones condicionales que arma TemplateDataMapper (ver generateData)
            'tiene_laboratorios_parametros', 'laboratorios_parametros', 'laboratorio_nombre', 'parametro_nombre', 'resolucion_numero_fecha',
            'tiene_puntos_monitoreo', 'puntos_monitoreo', 'punto_descripcion', 'nombre', 'codigo', 'punto_hora', 'punto_cota',
            'punto_latitud_gms', 'punto_longitud_gms', 'punto_norte_or', 'punto_este_or',
            'tiene_metodos_analiticos', 'metodos_analiticos', 'metodo_analitico', 'tiene_categorias_tamano', 'categorias_tamano',
            'categoria_nombre', 'categoria_criterio', 'tiene_esfuerzo_muestreo', 'esfuerzo_muestreo', 'esfuerzo_tipo', 'esfuerzo_dias',
            'esfuerzo_personas', 'esfuerzo_horas', 'esfuerzo_total', 'tiene_indices_biologicos', 'indices_biologicos', 'indice_nombre',
            'indice_concepto', 'indice_formula', 'indice_variables', 'indice_rango', 'tiene_parametros_puntaje', 'parametros_puntaje',
            'parametro_puntaje', 'tiene_bmw_col', 'bmw_col', 'clase_nombre', 'calidad_descripcion', 'bmw_valor', 'astp_valor',
            'significado', 'color', 'tiene_resultados_laboratorio', 'tiene_anexos', 'anexos', 'anexo_nombre', 'anexo_laboratorio',
            'anexo_archivo', 'anexo_paginas',
        ]);
        const cfg = new Set(Object.keys(config.fields));
        const missing = [...tags].filter(t => !cfg.has(t) && !loopKeys.has(t));
        expect(missing).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Auditoría 2026-09-23, tanda 1: en TODAS las plantillas las citas "Fuente: ..., <año>."
// deben usar {fuente_anio} y no un "XXXX" literal.
// Excepción documentada: 65-09 tiene "Fuente: XXXX, 202X." (fuente desconocida + año), que se
// resuelve en la tanda 2.
// ---------------------------------------------------------------------------
const ALL_TEMPLATES = fs.readdirSync(dir).filter(n => n.endsWith('-plantilla.docx')).sort();

describe.each(ALL_TEMPLATES.map(f => [f.match(/PSM-(\d+-\d+)/)![1], f] as const))(
    'plantilla %s: citas "Fuente"', (code, file) => {
        const xml = new PizZip(fs.readFileSync(path.join(dir, file))).file('word/document.xml')!.asText();
        const paras = xml.split('</w:p>').map(p => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join(''));
        const fuentes = paras.filter(t => /^\s*Fuente/.test(t));
        const allowed = code === '65-09' ? ['Fuente: XXXX, 202X.'] : [];

        it('ninguna cita "Fuente" conserva XXXX', () => {
            const bad = fuentes.filter(t => /X{2,}/.test(t.replace(/\{[^}]*\}/g, '')) && !allowed.includes(t.trim()));
            expect(bad).toEqual([]);
        });

        it('si usa {fuente_anio}, la configuracion lo define', () => {
            if (!fuentes.some(t => t.includes('{fuente_anio}'))) return;
            const cfg = TEMPLATE_CONFIGS[getTemplateType(file)];
            expect(cfg.fields['fuente_anio']).toBeDefined();
        });
    }
);

// ---------------------------------------------------------------------------
// Auditoría 2026-09-23, tanda 2: portadas, historial de cambios/OT en el cuerpo, instrucciones
// editoriales y blancos "[n = ___]". Excepciones = pendientes documentados (tanda 3 / decisión):
//  (las excepciones de la tanda 2 en 67-11 y 65-07 se resolvieron en la tanda 3)
// El encabezado (header*.xml) con "OT XXXX-..." queda fuera: pendiente del formato de la OT.
// ---------------------------------------------------------------------------
const TANDA2_RULES: Array<{ label: string; re: RegExp; allowed?: Record<string, number> }> = [
    { label: 'NOMBRE CLIENTE/EMPRESA', re: /NOMBRE (CLIENTE|EMPRESA)|OMBRE EMPRESA/ },
    { label: 'fecha de ejemplo (DD/MM/AA, Día/Mes/Año, de mes de año)', re: /DD\/MM\/AA|dd\/mm\/año|Día\/Mes\/Año|de mes de año/i, allowed: {} },
    { label: 'portada con placeholder en mayúsculas', re: /^(PROYECTO|PROYECTO, SEDE|CIUDAD, DEPARTAMENTO)$/ },
    { label: 'blanco de instrucción "[n = ___]"', re: /\[[^\]]*___[^\]]*\]|\[diligenciar|\[descripción del arreglo|\[listar|diligenciar código|Diligenciar parámetros/i },
    { label: 'OT XXXX en el cuerpo', re: /OT ?XXXX|XXXX-X-/ },
    { label: 'instrucción de escenarios "deberá conservarse"', re: /deberá conservarse únicamente/ },
];

describe.each(ALL_TEMPLATES.map(f => [f.match(/PSM-(\d+-\d+)/)![1], f] as const))(
    'plantilla %s: tanda 2', (code, file) => {
        const xml = new PizZip(fs.readFileSync(path.join(dir, file))).file('word/document.xml')!.asText();
        const paras = xml.split('</w:p>')
            .map(p => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('').replace(/\{[^}]*\}/g, '').trim())
            .filter(Boolean);

        it.each(TANDA2_RULES.map(r => [r.label, r] as const))('sin %s', (_l, rule) => {
            const hits = paras.filter(t => rule.re.test(t));
            expect(hits.length).toBeLessThanOrEqual(rule.allowed?.[code] ?? 0);
        });
    }
);

// ---------------------------------------------------------------------------
// Auditoría 2026-09-23, tanda 3: placeholders "xx/XX/X" en narrativas y tablas de ejemplo, y
// "Fuente: ..., Año". Excepciones documentadas (pendientes de decisión o legítimas):
//  - 65-07: párrafo suelto "xxx" junto al Certificado del pistófono (sin contexto claro).
//  - 65-09: "X" marcas de SI/NO en la verificación de calibración (casillas), no son placeholders.
// ---------------------------------------------------------------------------
const TANDA3_RULES: Array<{ label: string; re: RegExp; allowed?: Record<string, number> }> = [
    // "Año" como placeholder (no seguido de un año real: "Año 2006" es una cita legítima)
    { label: '"Fuente: ..., Año/AÑO"', re: /^Fuente.*\b(Año|AÑO)\b(?!\s*\d{4})/ },
    { label: 'instrucción "diligenciar fecha"', re: /diligenciar fecha/i },
    // 65-09: "Fuente: XXXX, 202X." (origen de datos por definir). 65-07: "xxx" suelto junto al certificado.
    { label: 'placeholder xxx en minúsculas', re: /\bx{3,}\b/i, allowed: { '65-07': 1, '65-09': 1 } },
    { label: 'celda de ejemplo "X"/"XX" suelta', re: /^X{1,2}$/, allowed: { '65-09': 2 } },
    // 65-09: encabezado "Punto X:" por definir. 66-19: pie de índice "Fotografía 1. Estación X..." sin contraparte en el cuerpo.
    { label: '"Punto x" / "Estación X" de ejemplo', re: /Punto [xX]\b|Estación X\b/, allowed: { '65-09': 1, '66-19': 1 } },
    { label: '"X estaciones" / "X %" de ejemplo', re: /\bX (\(X\) )?estaciones|\bel X ?%/ },
];

describe.each(ALL_TEMPLATES.map(f => [f.match(/PSM-(\d+-\d+)/)![1], f] as const))(
    'plantilla %s: tanda 3', (code, file) => {
        const xml = new PizZip(fs.readFileSync(path.join(dir, file))).file('word/document.xml')!.asText();
        const paras = xml.split('</w:p>')
            .map(p => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('').replace(/\{[^}]*\}/g, '').trim())
            .filter(Boolean);

        it.each(TANDA3_RULES.map(r => [r.label, r] as const))('sin %s', (_l, rule) => {
            const hits = paras.filter(t => rule.re.test(t));
            expect(hits.length).toBeLessThanOrEqual(rule.allowed?.[code] ?? 0);
        });
    }
);

// Todo tag escalar de CADA plantilla debe existir en su configuración (o ser de bucle/sección).
const LOOP_KEYS = new Set([
    'tiene_laboratorios_parametros', 'laboratorios_parametros', 'laboratorio_nombre', 'parametro_nombre', 'resolucion_numero_fecha',
    'tiene_puntos_monitoreo', 'puntos_monitoreo', 'punto_descripcion', 'nombre', 'codigo', 'punto_hora', 'punto_cota',
    'punto_latitud_gms', 'punto_longitud_gms', 'punto_norte_or', 'punto_este_or',
    'tiene_metodos_analiticos', 'metodos_analiticos', 'metodo_analitico', 'tiene_categorias_tamano', 'categorias_tamano',
    'categoria_nombre', 'categoria_criterio', 'tiene_esfuerzo_muestreo', 'esfuerzo_muestreo', 'esfuerzo_tipo', 'esfuerzo_dias',
    'esfuerzo_personas', 'esfuerzo_horas', 'esfuerzo_total', 'tiene_indices_biologicos', 'indices_biologicos', 'indice_nombre',
    'indice_concepto', 'indice_formula', 'indice_variables', 'indice_rango', 'tiene_parametros_puntaje', 'parametros_puntaje',
    'parametro_puntaje', 'tiene_bmw_col', 'bmw_col', 'clase_nombre', 'calidad_descripcion', 'bmw_valor', 'astp_valor',
    'significado', 'color', 'tiene_resultados_laboratorio', 'tiene_anexos', 'anexos', 'anexo_nombre', 'anexo_laboratorio',
    'anexo_archivo', 'anexo_paginas',
]);
// Tags históricos sin entrada de config que ya se resuelven vacíos (pendiente de limpieza).
const KNOWN_UNCONFIGURED: Record<string, string[]> = { '65-07': ['serial_pistofono_1'] };

describe.each(ALL_TEMPLATES.map(f => [f.match(/PSM-(\d+-\d+)/)![1], f] as const))(
    'plantilla %s: tags vs configuración', (code, file) => {
        it('todo tag de la plantilla está configurado', () => {
            const zip = new PizZip(fs.readFileSync(path.join(dir, file)));
            const tags = new Set<string>();
            for (const part of Object.keys(zip.files).filter(n => /^word\/(document|header\d|footer\d)\.xml$/.test(n))) {
                const text = zip.file(part)!.asText().split('</w:p>')
                    .map(p => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('')).join('\n');
                for (const m of text.matchAll(/\{[#\/^]?([A-Za-z0-9_.]+)\}/g)) tags.add(m[1]);
            }
            const cfg = TEMPLATE_CONFIGS[getTemplateType(file)].fields;
            const missing = [...tags].filter(t => !cfg[t] && !LOOP_KEYS.has(t) && !(KNOWN_UNCONFIGURED[code] || []).includes(t));
            expect(missing).toEqual([]);
        });
    }
);
