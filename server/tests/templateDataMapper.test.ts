import { describe, it, expect, vi, beforeEach } from 'vitest';

const getTemplateFields = vi.fn<(fileName: string) => string[]>();
const generateIndicesChart = vi.fn<(indices: { name: string; value: number }[]) => Promise<Buffer>>();

vi.mock('../src/services/docx.service', () => ({
    docxService: { getTemplateFields: (f: string) => getTemplateFields(f) },
    default: { getTemplateFields: (f: string) => getTemplateFields(f) }
}));

vi.mock('../src/services/chart.service', () => ({
    ChartService: { generateIndicesChart: (i: any) => generateIndicesChart(i) }
}));

import { TemplateDataMapper } from '../src/config/templateDataMapper';

const AGUA_TEMPLATE = 'FO-PO-PSM-64-08 Agua Subterranea.docx';

const baseOit = {
    oitNumber: 'OIT-2026-001',
    description: 'CLIENTE ACME: caracterización de agua residual',
    location: 'Cartagena, Bolívar',
    scheduledDate: new Date('2026-05-05T12:00:00Z')
};

const mapper = (fields: string[], oit: any = baseOit, analysis = '', template = AGUA_TEMPLATE) => {
    getTemplateFields.mockReturnValue(fields);
    return new TemplateDataMapper(template, oit, analysis);
};

beforeEach(() => {
    getTemplateFields.mockReset();
    generateIndicesChart.mockReset();
    getTemplateFields.mockReturnValue([]);
});

describe('TemplateDataMapper template fields', () => {
    it('falls back to an empty field list when the template cannot be inspected', () => {
        getTemplateFields.mockImplementation(() => {
            throw new Error('missing file');
        });
        expect(() => new TemplateDataMapper(AGUA_TEMPLATE, baseOit, '')).not.toThrow();
    });
});

describe('TemplateDataMapper client / location resolution', () => {
    it('prefers the client name extracted by the AI', () => {
        const data = mapper([], {
            ...baseOit,
            aiData: JSON.stringify({ parsedData: { cliente: 'ACME S.A.S.' } }),
            quotation: { clientName: 'Otro' }
        }).generateData();

        expect(data['Client']).toBe('ACME S.A.S.');
    });

    it('falls back to the quotation client, then the OIT description prefix', () => {
        expect(mapper([], { ...baseOit, quotation: { clientName: 'Cotización S.A.' } }).generateData()['Client'])
            .toBe('Cotización S.A.');

        expect(mapper([], baseOit).generateData()['Client']).toBe('CLIENTE ACME');

        expect(mapper([], { oitNumber: 'OIT-1' }).generateData()['Client']).toBe('NOMBRE CLIENTE');
    });

    it('derives city and department from the OIT location and defaults otherwise', () => {
        expect(mapper([], baseOit).generateData()['Location']).toBe('Cartagena, Bolívar');
        expect(mapper([], { oitNumber: 'OIT-1' }).generateData()['Location']).toBe('Barranquilla, Atlántico');
    });

    it('prefers AI location data and exposes ciudadDepartamento', () => {
        const data = mapper([], {
            ...baseOit,
            aiData: JSON.stringify({ ubicacion: { ciudad: 'Medellín', departamento: 'Antioquia' } })
        }).generateData();

        expect(data['Location']).toBe('Medellín, Antioquia');
        expect(data['cliente']).toMatchObject({ ciudad: 'Medellín', departamento: 'Antioquia' });
    });

    it('ignores malformed aiData', () => {
        const data = mapper([], { ...baseOit, aiData: '{not json' }).generateData();
        expect(data['Client']).toBe('CLIENTE ACME');
    });

    it('exposes the NIT with a placeholder when unknown', () => {
        expect(mapper([], baseOit).generateData()['NIT']).toBe('NIT No Especificado');
        expect(
            mapper([], { ...baseOit, aiData: JSON.stringify({ nit: '900.123-4' }) }).generateData()['NIT']
        ).toBe('900.123-4');
    });
});

describe('TemplateDataMapper dates', () => {
    it('formats the scheduled date in Spanish', () => {
        const data = mapper(['dia', 'mes_realizacion', 'ano_parcial', 'fecha_ot'], baseOit).generateData();

        expect(data['Date']).toBe('05 de mayo de 2026');
        expect(data['dia']).toBe('05');
        expect(data['mes_realizacion']).toBe('mayo');
        expect(data['ano_parcial']).toBe('2026');
        expect(data['fecha_ot']).toBe('05 de mayo de 2026');
    });

    it('uses today when the OIT has no scheduled date', () => {
        const data = mapper([], { oitNumber: 'OIT-1' }).generateData();
        expect(data['Date']).toContain(new Date().getFullYear().toString());
    });
});

describe('TemplateDataMapper mapped tags', () => {
    it('resolves STATIC, OIT and AI mappings from the master dictionary', () => {
        const data = mapper(['matriz_tipo_portada', 'ot_id', 'razon_social'], {
            ...baseOit,
            aiData: JSON.stringify({ cliente: 'ACME S.A.S.' })
        }).generateData();

        expect(data['matriz_tipo_portada']).toBe('SUBTERRÁNEA');
        expect(data['ot_id']).toBe('OIT-2026-001');
        expect(data['razon_social']).toBe('ACME S.A.S.');
    });

    it('resolves nested AI paths', () => {
        const data = mapper(['correo_contacto', 'direccion_completa', 'hora_punto_tabla6'], {
            ...baseOit,
            aiData: JSON.stringify({
                otrosDatos: { correo: 'ambiental@acme.com' },
                ubicacion: { direccion: 'Calle 1 #2-3' },
                puntos: [{ hora: '09:30' }]
            })
        }).generateData();

        expect(data['correo_contacto']).toBe('ambiental@acme.com');
        expect(data['direccion_completa']).toBe('Calle 1 #2-3');
        expect(data['hora_punto_tabla6']).toBe('09:30');
    });

    it('falls back to derived values for AI mappings without data', () => {
        const data = mapper(['razon_social', 'ciudad', 'departamento', 'numero_puntos_obj1'], baseOit).generateData();

        expect(data['razon_social']).toBe('CLIENTE ACME');
        expect(data['ciudad']).toBe('Cartagena');
        expect(data['departamento']).toBe('Bolívar');
        expect(data['numero_puntos_obj1']).toBe('1 (uno)');
    });

    it('leaves AI mappings without data or fallback blank', () => {
        const data = mapper(['nombre_representante_cliente'], baseOit).generateData();
        expect(data['nombre_representante_cliente']).toBe('');
    });

    it('also resolves dictionary tags that are absent from the document', () => {
        const data = mapper([], baseOit).generateData();
        expect(data['matriz_tipo_portada']).toBe('SUBTERRÁNEA');
        expect(data['ot_id']).toBe('OIT-2026-001');
    });
});

describe('TemplateDataMapper inference for unmapped tags', () => {
    const puntos = [
        {
            id: 'V01',
            nombre: 'Pozo norte',
            descripcion: 'Pozo de monitoreo',
            idMuestra: 'M-001',
            hora: '09:30',
            latitud: '10.39',
            longitud: '-75.51',
            norte: '1000',
            este: '2000'
        }
    ];

    it('infers var_N tags from AI points and dates', () => {
        const tags = Array.from({ length: 20 }, (_, i) => `var_${i + 1}`);
        const data = mapper(tags, {
            ...baseOit,
            aiData: JSON.stringify({ cliente: 'ACME', nit: '900', puntos, tipoMatriz: 'Agua residual' })
        }).generateData();

        expect(data['var_4']).toBe('Agua residual');
        expect(data['var_5']).toBe('Pozo norte');
        expect(data['var_6']).toBe('900');
        expect(data['var_7']).toBe('Cartagena');
        expect(data['var_9']).toBe('Bolívar');
        expect(data['var_10']).toBe('Pozo de monitoreo');
        expect(data['var_11']).toBe('05');
        expect(data['var_12']).toBe('mayo');
        expect(data['var_13']).toBe('10.39');
        expect(data['var_14']).toBe('-75.51');
        expect(data['var_15']).toBe('V01');
        expect(data['var_16']).toBe('M-001');
        expect(data['var_17']).toBe('09:30');
        expect(data['var_18']).toBe('1000');
        expect(data['var_19']).toBe('2000');
        expect(data['var_20']).toBe('');
    });

    it('uses placeholders for var_N tags with no AI point data', () => {
        const data = mapper(['var_5', 'var_8', 'var_10', 'var_15', 'var_17', 'var_99'], baseOit).generateData();

        expect(data['var_5']).toBe('Punto 1');
        expect(data['var_8']).toBe('PM-01');
        expect(data['var_10']).toBe('Punto de monitoreo');
        expect(data['var_15']).toBe('V00');
        expect(data['var_17']).toBe('08:00');
        expect(data['var_99']).toBe('');
    });

    it('checks the nit keyword before the other keywords of a tag name', () => {
        // "nit" is a substring of "monitoreo" and its branch is evaluated first
        const data = mapper(['tag_monitoreo_realizado_en'], baseOit).generateData();
        expect(data['tag_monitoreo_realizado_en']).toBe('NIT No Especificado');
    });

    it('infers unmapped tags from keywords in the tag name', () => {
        const data = mapper(
            [
                'tag_nombre_empresa',
                'tag_municipio',
                'tag_localizado_en',
                'tag_fecha_muestreo',
                'tag_fuente_serambiente',
                'tag_fuente_1',
                'tag_clima_tropical_koppen',
                'tag_standard_methods',
                'tag_american_public_health',
                'tag_obtenido_de_www',
                'tag_obtenido_de',
                'tag_compromisos',
                'tag_muestreo_preliminar',
                'tag_desconocido'
            ],
            baseOit
        ).generateData();

        expect(data['tag_nombre_empresa']).toBe('CLIENTE ACME');
        expect(data['tag_municipio']).toBe('Cartagena');
        expect(data['tag_localizado_en']).toBe('Cartagena, Bolívar');
        expect(data['tag_fecha_muestreo']).toBe('05 de mayo de 2026');
        expect(data['tag_fuente_serambiente']).toBe('ALS ENVIRONMENTAL S.A.S.');
        expect(data['tag_fuente_1']).toBe('ALS ENVIRONMENTAL S.A.S.');
        expect(data['tag_clima_tropical_koppen']).toBe('Cartagena');
        expect(data['tag_standard_methods']).toBe('Standard Methods 24th Ed.');
        expect(data['tag_american_public_health']).toBe('Standard Methods 24th Ed.');
        expect(data['tag_obtenido_de_www']).toBe('www.es.climate-data.org');
        expect(data['tag_obtenido_de']).toBe('IDEAM / Climate-Data.org');
        expect(data['tag_compromisos']).toBe('CLIENTE ACME');
        expect(data['tag_muestreo_preliminar']).toBe('');
        expect(data['tag_desconocido']).toBe('');
    });
});

describe('TemplateDataMapper structured payload', () => {
    it('strips markdown noise from the AI narrative', () => {
        const data = mapper([], baseOit, '# Título **importante** con `código`').generateData();
        expect(data['analysis']).toBe(' Título importante con código');
        expect(data['narrativa_conclusiones_ia']).toBe(data['analysis']);
    });

    it('maps monitoring points from either puntos or estaciones', () => {
        const fromEstaciones = mapper([], {
            ...baseOit,
            aiData: JSON.stringify({ estaciones: [{ id: 'E1' }] })
        }).generateData();

        expect(fromEstaciones['puntos_monitoreo']).toHaveLength(1);
        expect(fromEstaciones['puntos_monitoreo'][0]).toMatchObject({
            nombre: 'E1',
            codigo: 'E1',
            hora: '08:00',
            punto_cota: 'N.A.'
        });
        expect(fromEstaciones['tiene_puntos_monitoreo']).toBe(true);

        const empty = mapper([], baseOit).generateData();
        expect(empty['puntos_monitoreo']).toEqual([]);
        expect(empty['tiene_puntos_monitoreo']).toBe(false);
    });

    it('maps lab results, compliance verdicts and derived methods tables', () => {
        const data = mapper([], {
            ...baseOit,
            aiData: JSON.stringify({
                resultados: [
                    { parametro: 'DBO5', valor: '25', unidad: 'mg/L', cumple: true, metodo: 'SM 5210' },
                    { parametro: 'Coliformes totales', valor: '1200', cumple: false },
                    { parametro: 'pH', valor: '7.1' }
                ]
            })
        }).generateData();

        expect(data['resultados_laboratorio'].map((r: any) => r.cumplimiento)).toEqual([
            'Conforme',
            'No conforme',
            'N.A.'
        ]);
        expect(data['resultados_laboratorio'][0]).toMatchObject({
            parametro_nombre: 'DBO5',
            parametro_unidad: 'mg/L',
            resultado_valor: '25',
            metodo: 'SM 5210',
            limite_cuantificacion: 'N.A.'
        });
        expect(data['tiene_resultados_laboratorio']).toBe(true);
        expect(data['metodos_analiticos']).toHaveLength(3);
        expect(data['metodos_analiticos'][1].metodo_analitico).toBe('Ver certificado de acreditación');
        expect(data['laboratorios_parametros']).toHaveLength(3);
        expect(data['incluye_microbiologia']).toBe(true);
    });

    it('emits a single default laboratory row when there are no results', () => {
        const data = mapper([], baseOit).generateData();

        expect(data['laboratorios_parametros']).toEqual([
            {
                laboratorio_nombre: 'ALS ENVIRONMENTAL S.A.S.',
                parametro_nombre: 'Según OIT',
                resolucion_numero_fecha: 'Resolución 1262 del 18 de junio de 2021'
            }
        ]);
        expect(data['tiene_metodos_analiticos']).toBe(false);
        expect(data['incluye_microbiologia']).toBe(false);
    });

    it('flags water indices only for water templates', () => {
        expect(mapper([], baseOit).generateData()['incluye_icos']).toBe(true);
        expect(
            mapper([], baseOit, '', 'FO-PO-PSM-66-18 Calidad Aire.docx').generateData()['incluye_icos']
        ).toBe(false);
    });

    it('detects marine water from the OIT description', () => {
        expect(
            mapper([], { ...baseOit, description: 'Monitoreo de agua marina' }).generateData()['es_agua_marina']
        ).toBe(true);
        expect(mapper([], baseOit).generateData()['es_agua_marina']).toBe(false);
    });

    it('collects infiltration tests into their own loop', () => {
        const data = mapper([], {
            ...baseOit,
            aiData: JSON.stringify({ resultados: [{ parametro: 'Prueba de infiltración', valor: '12' }] })
        }).generateData();

        expect(data['pruebas_infiltracion']).toEqual([
            { infiltracion_parametro: 'Prueba de infiltración', infiltracion_valor: '12' }
        ]);
        expect(data['tiene_pruebas_infiltracion']).toBe(true);
    });

    it('lists annexes based on the uploaded OIT files', () => {
        const none = mapper([], baseOit).generateData();
        expect(none['anexos']).toEqual([]);
        expect(none['tiene_anexos']).toBe(false);

        const both = mapper([], {
            ...baseOit,
            oitFileUrl: '/uploads/oit.pdf',
            labResultsUrl: '/uploads/lab.pdf'
        }).generateData();
        expect(both['anexos'].map((a: any) => a.anexo_nombre)).toEqual(['OIT', 'Resultados de laboratorio']);
        expect(both['tiene_anexos']).toBe(true);
    });
});

describe('TemplateDataMapper.generateDataAsync', () => {
    const waterOit = {
        ...baseOit,
        aiData: JSON.stringify({
            resultados: [
                { parametro: 'DBO5', valor: 10 },
                { parametro: 'Coliformes fecales', valor: 5000 },
                { parametro: '% Saturación de oxigeno', valor: 60 },
                { parametro: 'Conductividad', valor: 100 },
                { parametro: 'Dureza total', valor: 200 },
                { parametro: 'Alcalinidad', valor: 200 },
                { parametro: 'Sólidos suspendidos totales', valor: 100 }
            ]
        })
    };

    it('computes the water indices and attaches the chart to the chart tag', async () => {
        const buffer = Buffer.from('png');
        generateIndicesChart.mockResolvedValue(buffer);

        const data = await mapper(['grafico_indices'], waterOit).generateDataAsync();

        expect(data['ICOMO_label']).toBe('Medio');
        expect(data['ICOMI_val']).toBeGreaterThan(0);
        expect(data['ICOSUS_val']).toBe(0.28);
        expect(data['chart_indices']).toBe(buffer);
        expect(data['grafico_indices']).toBe(buffer);
        expect(generateIndicesChart.mock.calls[0][0].map(i => i.name)).toEqual(['ICOMO', 'ICOMI', 'ICOSUS']);
    });

    it('skips chart generation when no index can be computed', async () => {
        const data = await mapper([], baseOit).generateDataAsync();

        expect(generateIndicesChart).not.toHaveBeenCalled();
        expect(data['chart_indices']).toBeUndefined();
    });

    it('computes indices for non-water templates when the description mentions water', async () => {
        generateIndicesChart.mockResolvedValue(Buffer.from('png'));

        const data = await mapper(
            [],
            { ...waterOit, description: 'Monitoreo de agua superficial' },
            '',
            'FO-PO-PSM-66-18 Calidad Aire.docx'
        ).generateDataAsync();

        expect(data['ICOSUS_val']).toBe(0.28);
    });
});
