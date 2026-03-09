/**
 * Enhanced Template Data Mapper V3
 * Uses template-specific configurations to dynamically fill all placeholders
 */

import * as fs from 'fs';
import * as path from 'path';
import TEMPLATE_CONFIGS, { getTemplateType, FieldMapping, TemplateConfig } from './templateConfigs';

// Load all template fields for reference
const allFieldsPath = path.join(__dirname, 'allTemplateFields.json');
let ALL_TEMPLATE_FIELDS: any = {};
try {
    ALL_TEMPLATE_FIELDS = JSON.parse(fs.readFileSync(allFieldsPath, 'utf-8'));
} catch (e) {
    console.warn('[TemplateMapper] Could not load allTemplateFields.json');
}

interface OITData {
    oitNumber: string;
    description?: string | null;
    location?: string | null;
    scheduledDate?: Date | null;
    serviceName?: string | null;
    aiData?: string | null;
    samplingData?: string | null;
    stepValidations?: string | null;
    planningProposal?: string | null;
}

interface ParsedAIData {
    cliente?: string;
    nit?: string;
    contrato?: string;
    interventor?: string;
    sede?: string;
    tituloInforme?: string;
    tipoEstudio?: string;
    metodologia?: string;
    objetivos?: string | string[];
    alcance?: string;
    equipos?: any[];
    parametros?: string[];
    normativas?: string[];
    ubicacion?: {
        ciudad?: string;
        departamento?: string;
        direccion?: string;
        ubicacionDetalle?: string;
    };
    clima?: {
        temperatura?: string;
        humedad?: string;
        presion?: string;
        precipitacion?: string;
        vientoVelocidad?: string;
        vientoDireccion?: string;
        rosaVientos?: string;
        clasificacion?: string;
    };
    jornada?: string;
    jornadaMonitoreo?: string;
    areaEstudio?: string;
    sectorCategoria?: string;
    numeroPuntos?: string | number;
    numeroEstaciones?: string | number;
    estaciones?: any[];
    puntos?: any[];
    parametrosAnalizados?: string;
    resultadosResumen?: string;
    cumplimiento?: string;
    razonCumplimiento?: string;
    recomendaciones?: string;
    metodologiaDetalle?: string;
    otrosDatos?: Record<string, any>;
    [key: string]: any;
}

interface SamplingResults {
    dateRange?: string;
    ruido?: Record<string, any>;
    condiciones?: Record<string, any>;
    resultados?: Record<string, any>;
    [key: string]: any;
}

export class TemplateDataMapper {
    private oit: OITData;
    private templateType: string;
    private templateConfig: TemplateConfig | null;
    private aiAnalysis: string;
    private parsedAI: ParsedAIData;
    private samplingResults: SamplingResults;
    private templateFields: string[];

    // Date components
    private today: Date;
    private day: string;
    private month: string;
    private year: string;
    private fullDate: string;
    private monthYear: string;
    private dateRange: string;

    constructor(templateFileName: string, oit: OITData, aiAnalysis: string) {
        this.oit = oit;
        this.aiAnalysis = aiAnalysis.replace(/[#*`]/g, '');
        this.templateType = getTemplateType(templateFileName);
        this.templateConfig = TEMPLATE_CONFIGS[this.templateType] || null;

        this.parsedAI = this.parseAIData();
        this.samplingResults = this.parseSamplingData();
        this.templateFields = this.getTemplateFieldsList(templateFileName);

        // Initialize date components
        this.today = new Date();
        this.day = this.today.getDate().toString().padStart(2, '0');
        this.month = this.today.toLocaleDateString('es-CO', { month: 'long' });
        this.year = this.today.getFullYear().toString();
        this.fullDate = this.today.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
        this.monthYear = `${this.month} de ${this.year}`;
        this.dateRange = this.calculateDateRange();

        console.log(`[TemplateMapper] Initialized for ${this.templateType} with ${this.templateFields.length} fields`);
    }

    private parseAIData(): ParsedAIData {
        if (!this.oit.aiData) return {};
        try {
            const parsed = JSON.parse(this.oit.aiData);
            return parsed;
        } catch {
            return {};
        }
    }

    private parseSamplingData(): SamplingResults {
        const results: SamplingResults = { dateRange: this.dateRange };

        if (this.oit.stepValidations) {
            try {
                const validations = JSON.parse(this.oit.stepValidations);
                Object.entries(validations).forEach(([idx, step]: [string, any]) => {
                    if (step?.data) {
                        results[`step_${idx}`] = step.data;
                        if (step.data.temperatura) results.condiciones = { ...results.condiciones, temperatura: step.data.temperatura };
                        if (step.data.humedad) results.condiciones = { ...results.condiciones, humedad: step.data.humedad };
                        if (step.data.presion) results.condiciones = { ...results.condiciones, presion: step.data.presion };
                        if (step.data.laeq) results.ruido = { ...results.ruido, [`laeq${idx}`]: step.data.laeq };
                        if (step.data.resultado) results.resultados = { ...results.resultados, [idx]: step.data.resultado };
                    }
                });
            } catch { }
        }

        return results;
    }

    private getTemplateFieldsList(fileName: string): string[] {
        const template = ALL_TEMPLATE_FIELDS.templates?.find((t: any) =>
            t.fileName === fileName || fileName.includes(t.shortName)
        );
        return template?.fields || [];
    }

    private calculateDateRange(): string {
        if (this.oit.scheduledDate) {
            const scheduled = new Date(this.oit.scheduledDate);
            const endDate = new Date(scheduled.getTime() + 7 * 24 * 60 * 60 * 1000);
            return `${scheduled.toLocaleDateString('es-CO')} y ${endDate.toLocaleDateString('es-CO')}`;
        }
        const lastWeek = new Date(this.today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `${lastWeek.toLocaleDateString('es-CO')} y ${this.today.toLocaleDateString('es-CO')}`;
    }

    // ========== DATA EXTRACTION METHODS ==========

    private getClient(): string {
        return this.parsedAI.cliente ||
            this.oit.description?.split(':')[0]?.trim() ||
            'Cliente';
    }

    private getLocation(): string {
        if (this.oit.location) return this.oit.location;
        if (this.parsedAI.ubicacion?.ciudad) {
            return `${this.parsedAI.ubicacion.ciudad}, ${this.parsedAI.ubicacion.departamento || 'Colombia'}`;
        }
        return 'Barranquilla, Atlántico';
    }

    private getCity(): string {
        return this.parsedAI.ubicacion?.ciudad ||
            this.oit.location?.split(',')[0]?.trim() ||
            'Barranquilla';
    }

    private getDepartment(): string {
        return this.parsedAI.ubicacion?.departamento ||
            this.oit.location?.split(',')[1]?.trim() ||
            'Atlántico';
    }

    private getStationCount(): number {
        return parseInt(String(this.parsedAI.numeroEstaciones || this.parsedAI.numeroPuntos || this.parsedAI.estaciones?.length || this.parsedAI.puntos?.length || 3));
    }

    private getStationCountText(): string {
        const count = this.getStationCount();
        const nums: Record<number, string> = {
            1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
            6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez'
        };
        if (count === 1) return '(1) una estación';
        return `(${count}) ${nums[count] || count} estaciones`;
    }

    private getParameters(): string {
        if (this.parsedAI.parametros?.length) {
            return this.parsedAI.parametros.join(', ');
        }
        switch (this.templateType) {
            case 'CALIDAD_AIRE': return 'PM10, PM2.5, SO2, NO2, O3';
            case 'EMISION_RUIDO': case 'RUIDO_AMBIENTAL': return 'LAeq, Lmin, Lmax';
            case 'FUENTES_FIJAS': return 'MP, NOx, SO2, CO';
            case 'OLORES': return 'H2S, NH3';
            default: return 'parámetros ambientales';
        }
    }

    private getEquipment(): string {
        if (this.parsedAI.equipos?.length) {
            return this.parsedAI.equipos.map((e: any) =>
                typeof e === 'string' ? e : e.nombre || e.name || e.codigo
            ).join(', ');
        }
        switch (this.templateType) {
            case 'CALIDAD_AIRE': return 'Muestreador de Alto Volumen BGI PQ200';
            case 'EMISION_RUIDO': case 'RUIDO_AMBIENTAL': return 'Sonómetro integrador tipo 1';
            case 'FUENTES_FIJAS': return 'Equipo de muestreo isocinético';
            default: return 'Equipos de monitoreo ambiental';
        }
    }

    private getNestedValue(obj: any, path: string): any {
        if (!path) return undefined;
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let value = obj;
        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) break;
        }
        return value;
    }

    // ========== FIELD VALUE RESOLUTION ==========

    private resolveFieldValue(fieldName: string, mapping?: FieldMapping): string {
        if (!mapping) {
            return this.inferFieldValue(fieldName);
        }

        let value: any;

        switch (mapping.source) {
            case 'OIT':
                value = this.getNestedValue(this.oit, mapping.field || '');
                break;

            case 'AI':
                value = this.getNestedValue(this.parsedAI, mapping.field || '');
                if (!value) {
                    if (mapping.field === 'cliente') value = this.getClient();
                    if (mapping.field === 'ubicacion.ciudad') value = this.getCity();
                    if (mapping.field === 'ubicacion.departamento') value = this.getDepartment();
                    if (mapping.field === 'parametros') value = this.getParameters();
                    if (mapping.field === 'equipos') value = this.getEquipment();
                    if (mapping.field === 'numeroEstaciones') value = this.getStationCountText();
                    if (mapping.field?.startsWith('estaciones[')) {
                        const idx = parseInt(mapping.field.match(/\[(\d+)\]/)?.[1] || '0');
                        const station = this.parsedAI.estaciones?.[idx];
                        if (station) {
                            const subField = mapping.field.split('.')[1] || 'codigo';
                            value = station[subField] || station.codigo || station.nombre || `EST-0${idx + 1}`;
                        }
                    }
                }
                break;

            case 'STATIC':
                value = mapping.staticValue || '';
                break;

            case 'SAMPLING':
                value = this.getNestedValue(this.samplingResults, mapping.field || '');
                if (mapping.field === 'dateRange') value = this.dateRange;
                break;

            case 'DATE':
                switch (mapping.field) {
                    case 'day': value = this.day; break;
                    case 'month': value = this.month; break;
                    case 'year': value = this.year; break;
                    case 'fullDate': value = this.fullDate; break;
                    case 'monthYear': value = this.monthYear; break;
                    case 'dateRange': value = this.dateRange; break;
                    default: value = this.fullDate;
                }
                break;

            case 'SYSTEM':
                value = 'SERAMBIENTE S.A.S.';
                break;
        }

        if (value !== undefined && value !== null) {
            if (mapping.format === 'number') {
                value = typeof value === 'number' ? value.toFixed(2) : value;
            }
            return String(value);
        }

        return '';
    }

    private inferFieldValue(fieldName: string): string {
        // Handle var_N indices specifically based on common patterns found in example PDFs
        if (fieldName.startsWith('var_')) {
            const num = parseInt(fieldName.split('_')[1]);

            // General patterns (Portadas)
            if (num === 1) return this.oit.oitNumber;
            if (num === 2) return this.year;
            if (num === 3) return this.parsedAI.tituloInforme || this.oit.description || 'INFORME TÉCNICO';

            // Client/Company patterns (var 5-10)
            if (num === 5) return this.getClient();
            if (num === 6) return this.parsedAI.nit || '900.000.000-1';
            if (num === 7) return this.getCity();
            if (num === 8) return this.getDepartment();

            // Results summary patterns (var 20-40)
            if (num >= 21 && num <= 30) {
                const station = this.parsedAI.estaciones?.[num - 21] || this.parsedAI.puntos?.[num - 21] || {};
                if (station.codigo || station.nombre) return station.codigo || station.nombre;
            }

            return '';
        }

        const lowerField = fieldName.toLowerCase();

        // Comprehensive string matching
        if (lowerField.includes('cliente') || lowerField.includes('razon_social') || lowerField.includes('contrato_los_servicios')) {
            return this.getClient();
        }
        if (lowerField.includes('nit')) return this.parsedAI.nit || '900.XXX.XXX-X';
        if (lowerField.includes('ciudad') || lowerField.includes('municipio')) return this.getCity();
        if (lowerField.includes('departamento')) return this.getDepartment();
        if (lowerField.includes('direccion')) return this.parsedAI.ubicacion?.direccion || this.oit.location || 'Calle 16 # 21-04';

        if (lowerField.includes('titulo_informe')) return this.parsedAI.tituloInforme || 'INFORME TÉCNICO';
        if (lowerField.includes('objetivo')) return typeof this.parsedAI.objetivos === 'string' ? this.parsedAI.objetivos : (this.parsedAI.objetivos?.[0] || 'Evaluar parámetros ambientales');

        if (lowerField.includes('realizada_el_dia_1')) return this.day;
        if (lowerField.includes('de_del_a_o') || lowerField.includes('de_de_')) return this.year;
        if (lowerField.includes('monitoreo_se_efectuo') || lowerField.includes('ejecutado_entre')) return this.dateRange;

        if (lowerField.includes('puntos_de_monitoreo') || lowerField.includes('numero_estaciones')) return this.getStationCountText();
        if (lowerField.includes('parametros')) return this.getParameters();
        if (lowerField.includes('equipo')) return this.getEquipment();

        // Climate
        if (lowerField.includes('clima') || lowerField.includes('tropical') || lowerField.includes('koppen')) {
            return this.parsedAI.clima?.clasificacion || 'Tropical';
        }
        if (lowerField.includes('temperatura')) return this.parsedAI.clima?.temperatura || '28 °C';

        return '';
    }

    public generateData(): Record<string, any> {
        const data: Record<string, any> = {};

        if (this.templateConfig) {
            for (const [fieldName, mapping] of Object.entries(this.templateConfig.fields)) {
                data[fieldName] = this.resolveFieldValue(fieldName, mapping);
            }
        }

        for (const fieldName of this.templateFields) {
            if (!data[fieldName]) {
                data[fieldName] = this.resolveFieldValue(fieldName);
            }
        }

        for (let i = 1; i <= 200; i++) {
            const key = `var_${i}`;
            if (!data[key]) {
                data[key] = this.inferFieldValue(key);
            }
        }

        // Aliases for common keys
        data['Client'] = this.getClient();
        data['NIT'] = this.parsedAI.nit || '900.XXX.XXX-1';
        data['Date'] = this.fullDate;
        data['Location'] = this.getLocation();
        data['OIT'] = this.oit.oitNumber;
        data['analysis'] = this.aiAnalysis;
        data['narrative'] = this.aiAnalysis;

        console.log(`[TemplateMapper] Generated ${Object.keys(data).length} data keys`);
        return data;
    }
}

export default TemplateDataMapper;
