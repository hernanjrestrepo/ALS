/**
 * Template Data Mapper V4 — Master Dictionary Approach
 * 
 * Each tag in the Word templates is resolved via:
 * 1. Explicit mapping from templateConfigs.ts (source + field)
 * 2. Fallback inference for unmapped tags
 */

import * as fs from 'fs';
import * as path from 'path';
import TEMPLATE_CONFIGS, { getTemplateType, FieldMapping, TemplateConfig } from './templateConfigs';
import { docxService } from '../services/docx.service';
import { WaterIndicesService } from '../services/water-indices';
import { ChartService } from '../services/chart.service';

interface OITData {
    oitNumber: string;
    description?: string | null;
    location?: string | null;
    scheduledDate?: Date | null;
    serviceName?: string | null;
    aiData?: string | null;
    quotation?: { clientName?: string };
    [key: string]: any;
}

interface ParsedAIData {
    cliente?: string;
    nit?: string;
    contrato?: string;
    tituloInforme?: string;
    tipoEstudio?: string;
    tipoMatriz?: string;
    metodologia?: string;
    objetivos?: string | string[];
    ubicacion?: {
        ciudad?: string;
        departamento?: string;
        direccion?: string;
        ciudadDepartamento?: string;
    };
    clima?: {
        temperatura?: string;
        humedad?: string;
        clasificacion?: string;
    };
    puntos?: Array<{
        id?: string;
        nombre?: string;
        descripcion?: string;
        idMuestra?: string;
        hora?: string;
        latitud?: string;
        longitud?: string;
        norte?: string;
        este?: string;
    }>;
    estaciones?: any[];
    resultados?: Array<{
        parametro: string;
        valor: any;
        unidad?: string;
    }>;
    otrosDatos?: Record<string, any>;
    [key: string]: any;
}

export class TemplateDataMapper {
    private oit: OITData;
    private templateType: string;
    private templateConfig: TemplateConfig | null;
    private aiAnalysis: string;
    private parsedAI: ParsedAIData;
    private templateFields: string[];

    // Date components
    private day: string;
    private month: string;
    private year: string;
    private fullDate: string;
    private monthYear: string;

    constructor(templateFileName: string, oit: OITData, aiAnalysis: string) {
        this.oit = oit;
        this.aiAnalysis = (aiAnalysis || '').replace(/[#*`]/g, '');
        this.templateType = getTemplateType(templateFileName);
        this.templateConfig = TEMPLATE_CONFIGS[this.templateType] || null;
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
        (this as any).headerDate = `${dd}/${mm}/${this.year}`;

        console.log(`[TemplateMapper] Type: ${this.templateType}, Fields: ${this.templateFields.length}, Config fields: ${this.templateConfig ? Object.keys(this.templateConfig.fields).length : 0}`);
    }

    // ==================== PARSING ====================

    private parseAIData(): ParsedAIData {
        if (!this.oit.aiData) return {};
        try {
            const parsed = JSON.parse(this.oit.aiData);
            const data = parsed.parsedData || parsed;
            // Ensure ciudadDepartamento is set
            if (data.ubicacion) {
                data.ubicacion.ciudadDepartamento = `${data.ubicacion.ciudad || 'Barranquilla'}, ${data.ubicacion.departamento || 'Atlántico'}`;
            }
            return data;
        } catch { return {}; }
    }

    private getTemplateFieldsList(fileName: string): string[] {
        try { return docxService.getTemplateFields(fileName); }
        catch { return []; }
    }

    // ==================== DATA ACCESSORS ====================

    private getClient(): string {
        return this.parsedAI.cliente
            || this.oit.quotation?.clientName
            || this.oit.description?.split(':')[0]?.trim()
            || 'NOMBRE CLIENTE';
    }

    private getNIT(): string {
        return this.parsedAI.nit || 'NIT No Especificado';
    }

    private getCity(): string {
        return this.parsedAI.ubicacion?.ciudad
            || this.oit.location?.split(',')[0]?.trim()
            || 'Barranquilla';
    }

    private getDepartment(): string {
        return this.parsedAI.ubicacion?.departamento
            || this.oit.location?.split(',')[1]?.trim()
            || 'Atlántico';
    }

    private getCityDept(): string {
        return `${this.getCity()}, ${this.getDepartment()}`;
    }

    /** Navigate a dotted path like "puntos[0].nombre" on an object */
    private getNestedValue(obj: any, pathStr: string): any {
        if (!pathStr || !obj) return undefined;
        const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.');
        let val = obj;
        for (const p of parts) {
            val = val?.[p];
            if (val === undefined) return undefined;
        }
        return val;
    }

    // ==================== FIELD RESOLUTION ====================

    /**
     * Resolve a single tag's value using the Master Dictionary mapping.
     */
    private resolveFromMapping(mapping: FieldMapping): string {
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
                    case 'headerDate': return (this as any).headerDate || this.fullDate;
                    default: return this.fullDate;
                }

            case 'AI':
                const aiVal = this.getNestedValue(this.parsedAI, mapping.field || '');
                if (aiVal !== undefined && aiVal !== null) return String(aiVal);
                // Fallback for common AI fields
                if (mapping.field === 'cliente') return this.getClient();
                if (mapping.field === 'ubicacion.ciudad') return this.getCity();
                if (mapping.field === 'ubicacion.departamento') return this.getDepartment();
                if (mapping.field === 'ubicacion.ciudadDepartamento') return this.getCityDept();
                if (mapping.field === 'tipoEstudio') return this.parsedAI.tipoEstudio || this.oit.description || 'Monitoreo Ambiental';
                if (mapping.field === 'tipoMatriz') return this.parsedAI.tipoMatriz || 'Agua';
                if (mapping.field === 'duracionMuestreo') return this.parsedAI.duracionMuestreo || '8 horas';
                if (mapping.field === 'numeroPuntos') return this.parsedAI.numeroPuntos || '1 (uno)';
                if (mapping.field === 'parametrosAnalizados') return this.parsedAI.parametrosAnalizados || 'Según OIT';
                return '';

            case 'OIT':
                const oitVal = this.getNestedValue(this.oit, mapping.field || '');
                if (oitVal !== undefined && oitVal !== null) return String(oitVal);
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
    private inferValue(tagName: string): string {
        const lower = tagName.toLowerCase();

        // var_N patterns
        if (tagName.startsWith('var_')) {
            const num = parseInt(tagName.split('_')[1]);
            if (num === 1) return this.getClient();
            if (num === 2) return this.year;
            if (num === 3) return this.getClient();
            if (num === 4) return this.parsedAI.tipoMatriz || 'Agua';
            if (num === 5) return this.parsedAI.puntos?.[0]?.nombre || 'Punto 1';
            if (num === 6) return this.getNIT();
            if (num === 7) return this.getCity();
            if (num === 8) return this.parsedAI.puntos?.[0]?.nombre || 'PM-01';
            if (num === 9) return this.getDepartment();
            if (num === 10) return this.parsedAI.puntos?.[0]?.descripcion || 'Punto de monitoreo';
            if (num === 11) return this.day;
            if (num === 12) return this.month;
            if (num === 13) return this.parsedAI.puntos?.[0]?.latitud || '';
            if (num === 14) return this.parsedAI.puntos?.[0]?.longitud || '';
            if (num === 15) return this.parsedAI.puntos?.[0]?.id || 'V00';
            if (num === 16) return this.parsedAI.puntos?.[0]?.idMuestra || '';
            if (num === 17) return this.parsedAI.puntos?.[0]?.hora || '08:00';
            if (num === 18) return this.parsedAI.puntos?.[0]?.norte || '';
            if (num === 19) return this.parsedAI.puntos?.[0]?.este || '';
            if (num === 20) return '';
            return '';
        }

        // Keyword-based fallbacks
        if (lower.includes('cliente') || lower.includes('razon_social') || lower.includes('empresa')) return this.getClient();
        if (lower.includes('nit')) return this.getNIT();
        if (lower.includes('ciudad') || lower.includes('municipio')) return this.getCity();
        if (lower.includes('departamento')) return this.getDepartment();
        if (lower.includes('ubicacion') || lower.includes('localizado')) return this.getCityDept();
        if (lower.includes('fecha') || lower.includes('realizada_el_dia')) return this.fullDate;
        if (lower.includes('fuente_serambiente')) return 'SERAMBIENTE S.A.S.';
        if (lower.includes('fuente_1') || lower.includes('fuente_2')) return 'SERAMBIENTE S.A.S.';
        if (lower.includes('clima_tropical') || lower.includes('koppen')) return this.getCity();
        if (lower.includes('standard_methods')) return 'Standard Methods 24th Ed.';
        if (lower.includes('american_public')) return 'Standard Methods 24th Ed.';
        if (lower.includes('obtenido_de_www')) return 'www.es.climate-data.org';
        if (lower.includes('obtenido_de')) return 'IDEAM / Climate-Data.org';
        if (lower.includes('cumplimiento') || lower.includes('compromisos')) return this.getClient();
        if (lower.includes('informe_tecnico')) return this.parsedAI.tituloInforme || 'AGUA';
        if (lower.includes('estudio_de_caracterizacion')) return this.parsedAI.tipoEstudio || this.oit.description || '';
        if (lower.includes('monitoreo_realizado_en')) return this.getCity();
        if (lower.includes('muestreo_preliminar')) return '';
        if (lower.includes('metodos_preliminares')) return '';

        return '';
    }

    // ==================== MAIN GENERATION ====================

    public generateData(): Record<string, any> {
        const data: Record<string, any> = {};
        const configFields = this.templateConfig?.fields || {};

        // 1. Resolve every tag from the template
        for (const tag of this.templateFields) {
            if (configFields[tag]) {
                // Tag has an explicit mapping in the Master Dictionary
                data[tag] = this.resolveFromMapping(configFields[tag]);
            } else {
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
            direccion: this.parsedAI.ubicacion?.direccion || '',
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
        data['puntos_monitoreo'] = Array.isArray(rawPuntos) ? rawPuntos.map((p: any) => ({
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
        data['resultados_laboratorio'] = Array.isArray(rawResultados) ? rawResultados.map((r: any) => ({
            parametro: r.parametro || '',
            unidad: r.unidad || '',
            metodo: r.metodo || 'SM',
            limite_cuantificacion: r.limite || 'N.A.',
            punto_1: r.punto_1 || r.valor || '',
            punto_2: r.punto_2 || '',
            punto_3: r.punto_3 || '',
            normativa: r.normativa || '',
            cumplimiento: r.cumple !== undefined ? (r.cumple ? 'Cumple' : 'No cumple') : 'N.A.'
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
        const hasMicrobiologia = Array.isArray(rawResultados) && rawResultados.some((r: any) => 
            (r.parametro || '').toLowerCase().includes('coli') || (r.parametro || '').toLowerCase().includes('microbio')
        );

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

        console.log(`[TemplateMapper] Generated ${Object.keys(data).length} data keys (with structured layout)`);
        return data;
    }

    public async generateDataAsync(): Promise<Record<string, any>> {
        const data = this.generateData();

        // Water indices + chart
        if (this.templateType === 'ASUB' || this.templateType === 'PUNTO_SECO' ||
            this.oit.description?.toLowerCase().includes('agua') ||
            this.templateFields.some(f => f.toLowerCase().includes('icomo') || f.toLowerCase().includes('chart'))) {

            const params = this.extractWaterParams();
            const indices: { name: string; value: number }[] = [];

            const icomo = WaterIndicesService.calculateICOMO(params.dbo, params.coli, params.satOD);
            if (icomo) {
                indices.push({ name: 'ICOMO', value: icomo.value });
                data['ICOMO_val'] = icomo.value;
                data['ICOMO_label'] = icomo.label;
            }

            const icomi = WaterIndicesService.calculateICOMI(params.cond, params.hardness, params.alcalinity);
            if (icomi) {
                indices.push({ name: 'ICOMI', value: icomi.value });
                data['ICOMI_val'] = icomi.value;
                data['ICOMI_label'] = icomi.label;
            }

            const icosus = WaterIndicesService.calculateICOSUS(params.sst);
            if (icosus) {
                indices.push({ name: 'ICOSUS', value: icosus.value });
                data['ICOSUS_val'] = icosus.value;
                data['ICOSUS_label'] = icosus.label;
            }

            if (indices.length > 0) {
                const chartBuffer = await ChartService.generateIndicesChart(indices);
                data['chart_indices'] = chartBuffer;
                const chartTag = this.templateFields.find(f =>
                    f.toLowerCase().includes('chart') || f.toLowerCase().includes('grafico'));
                if (chartTag) data[chartTag] = chartBuffer;
            }
        }

        return data;
    }

    private extractWaterParams(): any {
        const results = this.parsedAI.resultados || [];
        const findVal = (names: string[]) => {
            const r = results.find((res: any) => names.some(n => res.parametro.toLowerCase().includes(n)));
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

export default TemplateDataMapper;
