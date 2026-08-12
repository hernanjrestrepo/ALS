"use strict";
/**
 * Template Data Mapper V4 — Master Dictionary Approach
 *
 * Each tag in the Word templates is resolved via:
 * 1. Explicit mapping from templateConfigs.ts (source + field)
 * 2. Fallback inference for unmapped tags
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateDataMapper = void 0;
const templateConfigs_1 = __importStar(require("./templateConfigs"));
const docx_service_1 = require("../services/docx.service");
const water_indices_1 = require("../services/water-indices");
const chart_service_1 = require("../services/chart.service");
class TemplateDataMapper {
    constructor(templateFileName, oit, aiAnalysis) {
        this.oit = oit;
        this.aiAnalysis = (aiAnalysis || '').replace(/[#*`]/g, '');
        this.templateType = (0, templateConfigs_1.getTemplateType)(templateFileName);
        this.templateConfig = templateConfigs_1.default[this.templateType] || null;
        this.parsedAI = this.parseAIData();
        this.templateFields = this.getTemplateFieldsList(templateFileName);
        const today = this.oit.scheduledDate ? new Date(this.oit.scheduledDate) : new Date();
        this.day = today.getDate().toString().padStart(2, '0');
        this.month = today.toLocaleDateString('es-CO', { month: 'long' });
        this.year = today.getFullYear().toString();
        this.fullDate = `${this.day} de ${this.month} de ${this.year}`;
        this.monthYear = `${this.month} de ${this.year}`;
        const dd = this.day;
        const mm = (today.getMonth() + 1).toString().padStart(2, '0');
        this.headerDate = `${dd}/${mm}/${this.year}`;
        console.log(`[TemplateMapper] Type: ${this.templateType}, Fields: ${this.templateFields.length}, Config fields: ${this.templateConfig ? Object.keys(this.templateConfig.fields).length : 0}`);
    }
    // ==================== PARSING ====================
    parseAIData() {
        if (!this.oit.aiData)
            return {};
        try {
            const parsed = JSON.parse(this.oit.aiData);
            const data = parsed.parsedData || parsed;
            // Ensure ciudadDepartamento is set
            if (data.ubicacion) {
                data.ubicacion.ciudadDepartamento = `${data.ubicacion.ciudad || 'Barranquilla'}, ${data.ubicacion.departamento || 'Atlántico'}`;
            }
            return data;
        }
        catch (_a) {
            return {};
        }
    }
    getTemplateFieldsList(fileName) {
        try {
            return docx_service_1.docxService.getTemplateFields(fileName);
        }
        catch (_a) {
            return [];
        }
    }
    // ==================== DATA ACCESSORS ====================
    getClient() {
        var _a, _b, _c;
        return this.parsedAI.cliente
            || ((_a = this.oit.quotation) === null || _a === void 0 ? void 0 : _a.clientName)
            || ((_c = (_b = this.oit.description) === null || _b === void 0 ? void 0 : _b.split(':')[0]) === null || _c === void 0 ? void 0 : _c.trim())
            || 'NOMBRE CLIENTE';
    }
    getNIT() {
        return this.parsedAI.nit || 'NIT No Especificado';
    }
    getCity() {
        var _a, _b, _c;
        return ((_a = this.parsedAI.ubicacion) === null || _a === void 0 ? void 0 : _a.ciudad)
            || ((_c = (_b = this.oit.location) === null || _b === void 0 ? void 0 : _b.split(',')[0]) === null || _c === void 0 ? void 0 : _c.trim())
            || 'Barranquilla';
    }
    getDepartment() {
        var _a, _b, _c;
        return ((_a = this.parsedAI.ubicacion) === null || _a === void 0 ? void 0 : _a.departamento)
            || ((_c = (_b = this.oit.location) === null || _b === void 0 ? void 0 : _b.split(',')[1]) === null || _c === void 0 ? void 0 : _c.trim())
            || 'Atlántico';
    }
    getCityDept() {
        return `${this.getCity()}, ${this.getDepartment()}`;
    }
    /** Navigate a dotted path like "puntos[0].nombre" on an object */
    getNestedValue(obj, pathStr) {
        if (!pathStr || !obj)
            return undefined;
        const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.');
        let val = obj;
        for (const p of parts) {
            val = val === null || val === void 0 ? void 0 : val[p];
            if (val === undefined)
                return undefined;
        }
        return val;
    }
    // ==================== FIELD RESOLUTION ====================
    /**
     * Resolve a single tag's value using the Master Dictionary mapping.
     */
    resolveFromMapping(mapping) {
        switch (mapping.source) {
            case 'STATIC':
                return mapping.staticValue || '';
            case 'DATE':
                switch (mapping.field) {
                    case 'day': return this.day;
                    case 'month': return this.month;
                    case 'year': return this.year;
                    case 'fullDate': return this.fullDate;
                    case 'monthYear': return this.monthYear;
                    case 'headerDate': return this.headerDate || this.fullDate;
                    default: return this.fullDate;
                }
            case 'AI':
                const aiVal = this.getNestedValue(this.parsedAI, mapping.field || '');
                if (aiVal !== undefined && aiVal !== null)
                    return String(aiVal);
                // Fallback for common AI fields
                if (mapping.field === 'cliente')
                    return this.getClient();
                if (mapping.field === 'ubicacion.ciudad')
                    return this.getCity();
                if (mapping.field === 'ubicacion.departamento')
                    return this.getDepartment();
                if (mapping.field === 'ubicacion.ciudadDepartamento')
                    return this.getCityDept();
                if (mapping.field === 'tipoEstudio')
                    return this.parsedAI.tipoEstudio || this.oit.description || 'Monitoreo Ambiental';
                if (mapping.field === 'tipoMatriz')
                    return this.parsedAI.tipoMatriz || 'Agua';
                if (mapping.field === 'duracionMuestreo')
                    return this.parsedAI.duracionMuestreo || '8 horas';
                if (mapping.field === 'numeroPuntos')
                    return this.parsedAI.numeroPuntos || '1 (uno)';
                if (mapping.field === 'parametrosAnalizados')
                    return this.parsedAI.parametrosAnalizados || 'Según OIT';
                if (mapping.field === 'periodoMuestreo')
                    return this.parsedAI.periodoMuestreo || this.fullDate;
                return '';
            case 'OIT':
                const oitVal = this.getNestedValue(this.oit, mapping.field || '');
                if (oitVal !== undefined && oitVal !== null)
                    return String(oitVal);
                return '';
            case 'SYSTEM':
                return 'SERAMBIENTE S.A.S.';
            case 'SAMPLING':
                return '';
            default:
                return '';
        }
    }
    /**
     * Fallback inference for tags NOT in the Master Dictionary.
     * Uses keyword matching on the tag name itself.
     */
    inferValue(tagName) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        const lower = tagName.toLowerCase();
        // var_N patterns
        if (tagName.startsWith('var_')) {
            const num = parseInt(tagName.split('_')[1]);
            if (num === 1)
                return this.getClient();
            if (num === 2)
                return this.year;
            if (num === 3)
                return this.getClient();
            if (num === 4)
                return this.parsedAI.tipoMatriz || 'Agua';
            if (num === 5)
                return ((_b = (_a = this.parsedAI.puntos) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.nombre) || 'Punto 1';
            if (num === 6)
                return this.getNIT();
            if (num === 7)
                return this.getCity();
            if (num === 8)
                return ((_d = (_c = this.parsedAI.puntos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.nombre) || 'PM-01';
            if (num === 9)
                return this.getDepartment();
            if (num === 10)
                return ((_f = (_e = this.parsedAI.puntos) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.descripcion) || 'Punto de monitoreo';
            if (num === 11)
                return this.day;
            if (num === 12)
                return this.month;
            if (num === 13)
                return ((_h = (_g = this.parsedAI.puntos) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.latitud) || '';
            if (num === 14)
                return ((_k = (_j = this.parsedAI.puntos) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.longitud) || '';
            if (num === 15)
                return ((_m = (_l = this.parsedAI.puntos) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.id) || 'V00';
            if (num === 16)
                return ((_p = (_o = this.parsedAI.puntos) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.idMuestra) || '';
            if (num === 17)
                return ((_r = (_q = this.parsedAI.puntos) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r.hora) || '08:00';
            if (num === 18)
                return ((_t = (_s = this.parsedAI.puntos) === null || _s === void 0 ? void 0 : _s[0]) === null || _t === void 0 ? void 0 : _t.norte) || '';
            if (num === 19)
                return ((_v = (_u = this.parsedAI.puntos) === null || _u === void 0 ? void 0 : _u[0]) === null || _v === void 0 ? void 0 : _v.este) || '';
            if (num === 20)
                return '';
            return '';
        }
        // Keyword-based fallbacks
        if (lower.includes('cliente') || lower.includes('razon_social') || lower.includes('empresa'))
            return this.getClient();
        if (lower.includes('nit'))
            return this.getNIT();
        if (lower.includes('ciudad') || lower.includes('municipio'))
            return this.getCity();
        if (lower.includes('departamento'))
            return this.getDepartment();
        if (lower.includes('ubicacion') || lower.includes('localizado'))
            return this.getCityDept();
        if (lower.includes('fecha') || lower.includes('realizada_el_dia'))
            return this.fullDate;
        if (lower.includes('fuente_serambiente'))
            return 'SERAMBIENTE S.A.S.';
        if (lower.includes('fuente_1') || lower.includes('fuente_2'))
            return 'SERAMBIENTE S.A.S.';
        if (lower.includes('clima_tropical') || lower.includes('koppen'))
            return this.getCity();
        if (lower.includes('standard_methods'))
            return 'Standard Methods 24th Ed.';
        if (lower.includes('american_public'))
            return 'Standard Methods 24th Ed.';
        if (lower.includes('obtenido_de_www'))
            return 'www.es.climate-data.org';
        if (lower.includes('obtenido_de'))
            return 'IDEAM / Climate-Data.org';
        if (lower.includes('cumplimiento') || lower.includes('compromisos'))
            return this.getClient();
        if (lower.includes('informe_tecnico'))
            return this.parsedAI.tituloInforme || 'AGUA';
        if (lower.includes('estudio_de_caracterizacion'))
            return this.parsedAI.tipoEstudio || this.oit.description || '';
        if (lower.includes('monitoreo_realizado_en'))
            return this.getCity();
        if (lower.includes('muestreo_preliminar'))
            return '';
        if (lower.includes('metodos_preliminares'))
            return '';
        return '';
    }
    // ==================== MAIN GENERATION ====================
    generateData() {
        var _a, _b;
        const data = {};
        const configFields = ((_a = this.templateConfig) === null || _a === void 0 ? void 0 : _a.fields) || {};
        // 1. Resolve every tag from the template
        for (const tag of this.templateFields) {
            if (configFields[tag]) {
                // Tag has an explicit mapping in the Master Dictionary
                data[tag] = this.resolveFromMapping(configFields[tag]);
            }
            else {
                // Tag NOT in dictionary — use inference
                data[tag] = this.inferValue(tag);
            }
        }
        // 2. Also resolve any config fields that might not be in templateFields
        for (const [tag, mapping] of Object.entries(configFields)) {
            if (!data[tag]) {
                data[tag] = this.resolveFromMapping(mapping);
            }
        }
        // 3. Common aliases
        data['Client'] = this.getClient();
        data['NIT'] = this.getNIT();
        data['Date'] = this.fullDate;
        data['Location'] = this.getCityDept();
        data['OIT'] = this.oit.oitNumber;
        data['analysis'] = this.aiAnalysis;
        data['narrative'] = this.aiAnalysis;
        // 4. Structured JSON (New Universal Standard)
        data['cliente'] = {
            nombre: this.getClient(),
            nit: this.getNIT(),
            direccion: ((_b = this.parsedAI.ubicacion) === null || _b === void 0 ? void 0 : _b.direccion) || '',
            ciudad: this.getCity(),
            departamento: this.getDepartment()
        };
        data['monitoreo'] = {
            fecha: this.fullDate,
            matriz: this.parsedAI.tipoMatriz || 'Agua',
            tipo_estudio: this.parsedAI.tipoEstudio || this.oit.description || 'Monitoreo Ambiental'
        };
        // Map puntos_monitoreo array
        const rawPuntos = this.parsedAI.puntos || this.parsedAI.estaciones || [];
        data['puntos_monitoreo'] = Array.isArray(rawPuntos) ? rawPuntos.map((p) => ({
            nombre: p.nombre || p.id || 'Punto',
            codigo: p.idMuestra || p.id || '',
            hora: p.hora || '08:00',
            latitud: p.latitud || '',
            longitud: p.longitud || '',
            norte: p.norte || '',
            este: p.este || ''
        })) : [];
        // Map resultados_laboratorio
        const rawResultados = this.parsedAI.resultados || [];
        data['resultados_laboratorio'] = Array.isArray(rawResultados) ? rawResultados.map((r) => ({
            parametro: r.parametro || '',
            unidad: r.unidad || '',
            metodo: r.metodo || 'SM',
            limite_cuantificacion: r.limite || 'N.A.',
            punto_1: r.punto_1 || r.valor || '',
            punto_2: r.punto_2 || '',
            punto_3: r.punto_3 || '',
            normativa: r.normativa || '',
            cumplimiento: r.cumple !== undefined ? (r.cumple ? 'Conforme' : 'No conforme') : 'N.A.'
        })) : [];
        // Lab info
        data['laboratorios'] = [
            {
                nombre: 'SERAMBIENTE S.A.S.',
                parametro: this.parsedAI.parametrosAnalizados || 'Según OIT',
                resolucion: 'Resolución 1262 del 18 de junio de 2021'
            }
        ];
        // Narratives
        data['narrativa_conclusiones_ia'] = this.aiAnalysis;
        data['narrativa_descripcion_puntos'] = this.parsedAI.descripcionPuntos || 'Monitoreo realizado en los puntos indicados.';
        data['narrativa_analisis_normativo'] = this.aiAnalysis;
        // Conditions
        const hasWaterParams = this.templateType === 'ASUB' || this.templateType === 'PUNTO_SECO';
        const hasMicrobiologia = Array.isArray(rawResultados) && rawResultados.some((r) => (r.parametro || '').toLowerCase().includes('coli') || (r.parametro || '').toLowerCase().includes('microbio'));
        data['condiciones'] = {
            incluye_icos: hasWaterParams,
            incluye_microbiologia: hasMicrobiologia,
            incluye_comparacion_normativa: true
        };
        // For direct boolean queries like {#incluye_icos}
        data['incluye_icos'] = hasWaterParams;
        data['incluye_microbiologia'] = hasMicrobiologia;
        data['incluye_comparacion_normativa'] = true;
        data['es_agua_marina'] = this.templateType === 'ASUB' && (this.oit.description || '').toLowerCase().includes('marina');
        // ===== V2 loop builders (tags semánticos: Biota, Suelo, y futuras plantillas) =====
        const rawResultadosForLabs = this.parsedAI.resultados || [];
        data['laboratorios_parametros'] = rawResultadosForLabs.length > 0
            ? rawResultadosForLabs.map((r) => ({
                laboratorio_nombre: 'SERAMBIENTE S.A.S.',
                parametro_nombre: r.parametro || '',
                resolucion_numero_fecha: 'Resolución 1262 del 18 de junio de 2021'
            }))
            : [{ laboratorio_nombre: 'SERAMBIENTE S.A.S.', parametro_nombre: this.parsedAI.parametrosAnalizados || 'Según OIT', resolucion_numero_fecha: 'Resolución 1262 del 18 de junio de 2021' }];
        data['tiene_laboratorios_parametros'] = data['laboratorios_parametros'].length > 0;
        data['metodos_analiticos'] = rawResultadosForLabs.map((r) => ({
            parametro_nombre: r.parametro || '',
            metodo_analitico: r.metodo || 'Ver certificado de acreditación',
            parametro_unidad: r.unidad || '',
            equipo_nombre: '',
            rango_trabajo: '',
            limite_cuantificacion: r.limite || 'N.A.'
        }));
        data['tiene_metodos_analiticos'] = data['metodos_analiticos'].length > 0;
        data['resultados_laboratorio'] = (data['resultados_laboratorio'] || []).map((r) => (Object.assign(Object.assign({}, r), { parametro_nombre: r.parametro, parametro_unidad: r.unidad, resultado_valor: r.punto_1 || '' })));
        data['tiene_resultados_laboratorio'] = data['resultados_laboratorio'].length > 0;
        const infiltracionResults = rawResultadosForLabs.filter((r) => (r.parametro || '').toLowerCase().includes('infiltra'));
        data['pruebas_infiltracion'] = infiltracionResults.map((r) => ({ infiltracion_parametro: r.parametro, infiltracion_valor: r.valor }));
        data['tiene_pruebas_infiltracion'] = data['pruebas_infiltracion'].length > 0;
        // Esfuerzo de muestreo (Biota) -- sin fuente confiable de extracción todavía
        data['esfuerzo_muestreo'] = [];
        data['tiene_esfuerzo_muestreo'] = false;
        const anexosList = [];
        if (this.oit.oitFileUrl)
            anexosList.push({ anexo_nombre: 'OIT', anexo_laboratorio: 'SERAMBIENTE S.A.S.', anexo_archivo: 'Ver sistema ALS', anexo_paginas: 'N.A.' });
        if (this.oit.labResultsUrl)
            anexosList.push({ anexo_nombre: 'Resultados de laboratorio', anexo_laboratorio: 'SERAMBIENTE S.A.S.', anexo_archivo: 'Ver sistema ALS', anexo_paginas: 'N.A.' });
        data['anexos'] = anexosList;
        data['tiene_anexos'] = anexosList.length > 0;
        // Tablas de referencia científica (índices ecológicos, clasificación BMW/ASPT,
        // categorías de tamaño). El contenido de estas tablas ya está redactado como texto
        // fijo dentro de la plantilla (metodología Roldán 2003 / Moreno 2001 / Margalef 1969,
        // citada en la bibliografía del propio informe); los condicionales tiene_* solo
        // controlan si esa sección fija se muestra u oculta, por eso deben ir en true.
        // Los arreglos de loop quedan vacíos: son para filas EXTRA específicas de la muestra,
        // no para el contenido estándar (que ya está fijo en la plantilla).
        data['indices_biologicos'] = [];
        data['tiene_indices_biologicos'] = true;
        data['bmw_col'] = [];
        data['tiene_bmw_col'] = true;
        data['categorias_tamano'] = [];
        data['tiene_categorias_tamano'] = true;
        data['parametros_puntaje'] = [];
        data['tiene_parametros_puntaje'] = true;
        data['puntos_monitoreo'] = data['puntos_monitoreo'].map((p) => (Object.assign(Object.assign({}, p), { punto_descripcion: p.nombre, punto_hora: p.hora, punto_cota: 'N.A.', punto_latitud_gms: p.latitud, punto_longitud_gms: p.longitud, punto_norte_or: p.norte, punto_este_or: p.este })));
        data['tiene_puntos_monitoreo'] = data['puntos_monitoreo'].length > 0;
        console.log(`[TemplateMapper] Generated ${Object.keys(data).length} data keys (with structured layout)`);
        return data;
    }
    generateDataAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const data = this.generateData();
            // Water indices + chart
            if (this.templateType === 'ASUB' || this.templateType === 'PUNTO_SECO' ||
                ((_a = this.oit.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('agua')) ||
                this.templateFields.some(f => f.toLowerCase().includes('icomo') || f.toLowerCase().includes('chart'))) {
                const params = this.extractWaterParams();
                const indices = [];
                const icomo = water_indices_1.WaterIndicesService.calculateICOMO(params.dbo, params.coli, params.satOD);
                if (icomo) {
                    indices.push({ name: 'ICOMO', value: icomo.value });
                    data['ICOMO_val'] = icomo.value;
                    data['ICOMO_label'] = icomo.label;
                }
                const icomi = water_indices_1.WaterIndicesService.calculateICOMI(params.cond, params.hardness, params.alcalinity);
                if (icomi) {
                    indices.push({ name: 'ICOMI', value: icomi.value });
                    data['ICOMI_val'] = icomi.value;
                    data['ICOMI_label'] = icomi.label;
                }
                const icosus = water_indices_1.WaterIndicesService.calculateICOSUS(params.sst);
                if (icosus) {
                    indices.push({ name: 'ICOSUS', value: icosus.value });
                    data['ICOSUS_val'] = icosus.value;
                    data['ICOSUS_label'] = icosus.label;
                }
                if (indices.length > 0) {
                    const chartBuffer = yield chart_service_1.ChartService.generateIndicesChart(indices);
                    data['chart_indices'] = chartBuffer;
                    const chartTag = this.templateFields.find(f => f.toLowerCase().includes('chart') || f.toLowerCase().includes('grafico'));
                    if (chartTag)
                        data[chartTag] = chartBuffer;
                }
            }
            return data;
        });
    }
    extractWaterParams() {
        const results = this.parsedAI.resultados || [];
        const findVal = (names) => {
            const r = results.find((res) => names.some(n => res.parametro.toLowerCase().includes(n)));
            return r ? Number(r.valor) : undefined;
        };
        return {
            dbo: findVal(['dbo', 'demanda bioquímica']),
            coli: findVal(['coliformes']),
            satOD: findVal(['saturación', 'oxigeno', '%saturacion']),
            cond: findVal(['conductividad']),
            hardness: findVal(['dureza']),
            alcalinity: findVal(['alcalinidad']),
            sst: findVal(['sólidos suspendidos', 'sst'])
        };
    }
}
exports.TemplateDataMapper = TemplateDataMapper;
exports.default = TemplateDataMapper;
