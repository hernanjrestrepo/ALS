import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { SUELO_CONFIG, BIOTA_CONFIG } from '../src/config/templateConfigs';

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
