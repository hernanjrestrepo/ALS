"use strict";
/**
 * Template-Specific Configuration V2 — Master Dictionary
 * Each tag is mapped based on its EXACT context in the Word template.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_CONFIGS = exports.FUENTES_FIJAS_CONFIG = exports.FUENTES_FIJAS_PREVIO_CONFIG = exports.PARTICULAS_VIABLES_CONFIG = exports.OLORES_CONFIG = exports.CALIDAD_AIRE_CONFIG = exports.EMISION_RUIDO_AMBIENTAL_CONFIG = exports.RUIDO_INTRADOMICILIARIO_CONFIG = exports.RUIDO_AMBIENTAL_CONFIG = exports.EMISION_RUIDO_CONFIG = exports.RESPEL_CONFIG = exports.PUNTO_SECO_CONFIG = exports.ASUB_CONFIG = void 0;
exports.getTemplateType = getTemplateType;
// ================================================================
// AGUA SUBTERRÁNEA / LIXIVIADOS — 64-08 (32 tags)
// Also used for PUNTO SECO — 64-10 (same 32 tags)
// ================================================================
const AGUA_FIELDS = {
    // --- HEADER (repeated on every page) ---
    'informe_tecnico_de_estudio_de_caracterizacion_de_a_1': {
        source: 'STATIC', staticValue: 'AGUA SUBTERRÁNEA',
        description: 'Header + body title (body AGUA prefix removed from template)'
    },
    'var_20': {
        source: 'STATIC', staticValue: '',
        description: 'No usado en este template (header code area)'
    },
    'tag_header_date': {
        source: 'DATE', field: 'headerDate',
        description: 'Fecha en el header de cada página (DD/MM/YYYY)'
    },
    // --- PORTADA ---
    'var_1': {
        source: 'AI', field: 'cliente',
        description: '"...calidad del agua de la organización {var_1}, con el fin de..."'
    },
    'estudio_de_caracterizacion_1': {
        source: 'AI', field: 'tipoEstudio',
        description: '"Estudio de caracterización {tag} de {var_2}..." — tipo de agua (ej: "de Agua Residual Doméstica")'
    },
    'var_2': {
        source: 'DATE', field: 'year',
        description: 'Año en portada: "...de 2026 realizada el día..."'
    },
    'realizada_el_dia_1': {
        source: 'DATE', field: 'day',
        description: '"realizada el día {tag} de..." — número del día (ej: "05")'
    },
    'realizada_el_dia_de_1': {
        source: 'DATE', field: 'month',
        description: '"...el día 05 de {tag} del año..." — mes en texto (ej: "mayo")'
    },
    'de_del_a_o_1': {
        source: 'DATE', field: 'year',
        description: '"...de mayo del año {tag}" — año (ej: "2026")'
    },
    'var_3': {
        source: 'AI', field: 'cliente',
        description: 'Subtítulo portada — nombre del cliente'
    },
    // --- SECCIÓN 2.1: INFORMACIÓN DE LA EMPRESA (new tags from template modification) ---
    'tag_razon_social': {
        source: 'AI', field: 'cliente',
        description: 'Razón social completa del cliente'
    },
    'tag_correo': {
        source: 'AI', field: 'otrosDatos.correo',
        description: 'Correo del contacto ambiental'
    },
    'tag_correo_valor': {
        source: 'AI', field: 'otrosDatos.correo',
        description: 'Valor del correo contacto'
    },
    'tag_representante': {
        source: 'AI', field: 'otrosDatos.representante',
        description: 'Nombre del representante del cliente'
    },
    'tag_telefono_valor': {
        source: 'AI', field: 'otrosDatos.telefono',
        description: 'Teléfono del representante'
    },
    'tag_direccion': {
        source: 'AI', field: 'ubicacion.direccion',
        description: 'Dirección de la sede del cliente'
    },
    'tag_departamento': {
        source: 'AI', field: 'ubicacion.departamento',
        description: 'Departamento donde se ejecutó el monitoreo'
    },
    'tag_ciudad': {
        source: 'AI', field: 'ubicacion.ciudad',
        description: 'Ciudad/municipio donde se ejecutó el monitoreo'
    },
    'tag_actividad_economica': {
        source: 'AI', field: 'otrosDatos.actividadEconomica',
        description: 'Actividad económica del cliente'
    },
    // --- TABLA 1: LABORATORIOS ---
    'tag_lab_nombre': {
        source: 'STATIC', staticValue: 'SERAMBIENTE S.A.S.',
        description: 'Nombre del laboratorio responsable'
    },
    'tag_lab_parametro': {
        source: 'AI', field: 'parametrosAnalizados',
        description: 'Parámetros analizados por el laboratorio'
    },
    'tag_lab_resolucion': {
        source: 'STATIC', staticValue: 'Resolución 1262 del 18 de junio de 2021',
        description: 'Número y fecha de resolución de acreditación'
    },
    // --- METODOLOGÍA (new tags) ---
    'tag_nombre_cliente_met': {
        source: 'AI', field: 'cliente',
        description: '"...requerimientos de {tag}, los cuales contemplaban..."'
    },
    'tag_num_puntos': {
        source: 'AI', field: 'numeroPuntos',
        description: 'Número de puntos de monitoreo: "en {tag} puntos..."'
    },
    'tag_ciudad_dept_met': {
        source: 'AI', field: 'ubicacion.ciudadDepartamento',
        description: 'Ciudad/departamento en metodología'
    },
    // --- CONCLUSIONES (new tags) ---
    'tag_ciudad_dept_concl': {
        source: 'AI', field: 'ubicacion.ciudadDepartamento',
        description: 'Ciudad/departamento en conclusiones'
    },
    'tag_num_puntos_concl': {
        source: 'AI', field: 'numeroPuntos',
        description: 'Número de puntos en conclusiones'
    },
    // --- FOTOGRAFÍAS ---
    'tag_foto1_desc': {
        source: 'AI', field: 'puntos[0].fotoDescripcion',
        description: 'Descripción de la fotografía 1'
    },
    'tag_foto2_desc': {
        source: 'AI', field: 'puntos[1].fotoDescripcion',
        description: 'Descripción de la fotografía 2'
    },
    // --- FUENTE AÑO ---
    'tag_year': {
        source: 'DATE', field: 'year',
        description: 'Año en "Fuente: SERAMBIENTE S.A.S., {tag}"'
    },
    'tag_year_earth': {
        source: 'DATE', field: 'year',
        description: 'Año en "Google Earth., {tag}"'
    },
    // --- HISTORIAL DE CAMBIOS ---
    'tag_ot_code_v00': {
        source: 'OIT', field: 'oitNumber',
        description: 'Código OT versión 00'
    },
    'tag_ot_code_v01': {
        source: 'OIT', field: 'oitNumber',
        description: 'Código OT versión 01'
    },
    'tag_ot_code_ref': {
        source: 'OIT', field: 'oitNumber',
        description: 'Código OT referencia en nota'
    },
    'tag_matriz_hist': {
        source: 'AI', field: 'tipoMatriz',
        description: 'Tipo de matriz en historial de cambios'
    },
    // --- TABLA 3: DATOS GENERALES ---
    'tag_fecha_monitoreo': {
        source: 'DATE', field: 'fullDate',
        description: 'Fecha del monitoreo en Tabla 3'
    },
    'tag_lugar_monitoreo': {
        source: 'AI', field: 'ubicacion.ciudadDepartamento',
        description: 'Lugar del monitoreo en Tabla 3'
    },
    'tag_duracion_muestreo': {
        source: 'AI', field: 'duracionMuestreo',
        description: 'Duración del muestreo en Tabla 3'
    },
    'tag_puntos_monitoreo': {
        source: 'AI', field: 'numeroPuntos',
        description: 'Puntos de monitoreo en Tabla 3'
    },
    'tag_tipo_estudio': {
        source: 'AI', field: 'tipoEstudio',
        description: 'Tipo de estudio en Tabla 3'
    },
    // --- FOTOS PLACEHOLDER ---
    'tag_foto_placeholder': {
        source: 'STATIC', staticValue: '(Ver registro fotográfico en Anexo 1)',
        description: 'Placeholder donde van las fotos georreferenciadas'
    },
    // --- CLIMA ---
    'tag_temperatura': {
        source: 'AI', field: 'clima.temperatura',
        description: 'Temperatura media anual en °C'
    },
    'tag_precipitacion': {
        source: 'AI', field: 'clima.precipitacion',
        description: 'Precipitación anual en mm'
    },
    'nombre_cliente_los_cuales_contemplaban_la_toma_de__1': {
        source: 'AI', field: 'cliente',
        description: '"...características fisicoquímicas {tag}. No obstante..." — nombre del cliente'
    },
    'en_xxx_xx_puntos_de_monitoreo_ubicados_en_la_ciuda_1': {
        source: 'DATE', field: 'fullDate',
        description: '"...realizada el {tag}, no fue posible..." — fecha completa de la visita'
    },
    'en_xxx_xx_puntos_de_monitoreo_ubicados_en_la_ciuda_2': {
        source: 'AI', field: 'ubicacion.ciudad',
        description: '"...los puntos se {tag}. A continuación..." — ciudad o estado de los puntos'
    },
    'var_4': {
        source: 'AI', field: 'tipoMatriz',
        description: 'Tabla 4 — tipo de matriz (ej: "Agua subterránea")'
    },
    'en_el_anexo_2_formatos_de_campo_p_1': {
        source: 'STATIC', staticValue: 'ág. 15',
        description: '"...formatos de campo (p{tag})" — páginas del anexo'
    },
    // --- SECCIÓN 3.2: PUNTO DE MUESTREO ---
    'var_8': {
        source: 'AI', field: 'puntos[0].nombre',
        description: 'Tabla 5 — nombre/ID del punto de monitoreo'
    },
    'var_10': {
        source: 'AI', field: 'puntos[0].descripcion',
        description: 'Tabla 5 — descripción del punto de muestreo'
    },
    // --- SECCIÓN 3.3: UBICACIÓN Y CLIMA ---
    'de_monitoreo_realizado_en_el_1': {
        source: 'AI', field: 'ubicacion.ciudad',
        description: '"...realizado en el {tag}" — municipio/ciudad (ej: "municipio de Barranquilla")'
    },
    'tiene_un_clima_tropical_en_comparacion_con_el_invi_1': {
        source: 'AI', field: 'ubicacion.ciudad',
        description: '"{tag} tiene un clima tropical..." — nombre de la ciudad'
    },
    'tiene_un_clima_tropical_en_comparacion_con_el_invi_2': {
        source: 'AI', field: 'ubicacion.ciudad',
        description: '"En {tag} la temperatura media anual..." — nombre de la ciudad'
    },
    // --- TABLA 6: COORDENADAS ---
    'var_15': {
        source: 'AI', field: 'puntos[0].id',
        description: 'Tabla 6 — Punto ID (ej: "V00")'
    },
    'var_16': {
        source: 'AI', field: 'puntos[0].idMuestra',
        description: 'Tabla 6 — ID de la muestra'
    },
    'var_17': {
        source: 'AI', field: 'puntos[0].hora',
        description: 'Tabla 6 — Hora del muestreo (ej: "08:30")'
    },
    'var_13': {
        source: 'AI', field: 'puntos[0].latitud',
        description: 'Tabla 6 — Latitud WGS84'
    },
    'var_14': {
        source: 'AI', field: 'puntos[0].longitud',
        description: 'Tabla 6 — Longitud WGS84'
    },
    'var_18': {
        source: 'AI', field: 'puntos[0].norte',
        description: 'Tabla 6 — Norte (Magna Sirgas)'
    },
    'var_19': {
        source: 'AI', field: 'puntos[0].este',
        description: 'Tabla 6 — Este (Magna Sirgas)'
    },
    // --- FIGURA 1 ---
    'var_5': {
        source: 'AI', field: 'puntos[0].nombre',
        description: 'Nombre del punto debajo de la tabla 6, antes de Figura 1'
    },
    '1_ubicacion_geografica_1': {
        source: 'AI', field: 'ubicacion.ciudadDepartamento',
        description: '"Ubicación geográfica {tag} de monitoreo" — Ciudad, Departamento'
    },
    // --- SECCIÓN 4: CONCLUSIONES ---
    'en_cumplimiento_de_los_compromisos_establecidos_co_1': {
        source: 'AI', field: 'cliente',
        description: '"{tag} en cumplimiento de los compromisos..." — nombre del cliente'
    },
    // --- SECCIÓN 5: BIBLIOGRAFÍA ---
    'american_public_healt_association_apha_1': {
        source: 'STATIC', staticValue: 'Standard Methods 24th Ed.',
        description: '"APHA. {tag}. Standard Methods..." — edición del Standard Methods'
    },
    'standard_methods_for_the_examination_of_water_and__1': {
        source: 'STATIC', staticValue: 'Standard Methods 24th Ed.',
        description: '"...Wastewater. {tag}. Amer. Pub..." — edición'
    },
    'obtenido_de_1': {
        source: 'STATIC', staticValue: 'IDEAM / Climate-Data.org',
        description: '"{tag}{obtenido_de_www...}. Obtenido de:..." — fuente de datos climáticos'
    },
    'obtenido_de_www_es_climate_data_org_1': {
        source: 'STATIC', staticValue: 'www.es.climate-data.org',
        description: '"...Obtenido de: www.es.climate-data.org/" — URL fuente clima'
    },
};
// ================================================================
// TEMPLATE CONFIGS
// ================================================================
exports.ASUB_CONFIG = {
    templateType: 'ASUB',
    displayName: 'Informe de Agua Subterránea / Lixiviados',
    filePattern: 'FO-PO-PSM-64-08',
    fields: Object.assign({}, AGUA_FIELDS)
};
exports.PUNTO_SECO_CONFIG = {
    templateType: 'PUNTO_SECO',
    displayName: 'Informe de Punto Seco (Agua)',
    filePattern: 'FO-PO-PSM-64-10',
    fields: Object.assign(Object.assign({}, AGUA_FIELDS), { 'informe_tecnico_de_estudio_de_caracterizacion_de_a_1': {
            source: 'STATIC', staticValue: 'AGUA - PUNTO SECO',
            description: 'Título header para punto seco'
        }, 'en_xxx_xx_puntos_de_monitoreo_ubicados_en_la_ciuda_2': {
            source: 'STATIC', staticValue: 'encontraban secos',
            description: '"...los puntos se {tag}." — estado de los puntos (secos)'
        } })
};
// RESPEL (64-09) — placeholder, uses mostly AGUA_FIELDS + extras
exports.RESPEL_CONFIG = {
    templateType: 'RESPEL',
    displayName: 'Caracterización de Residuos Peligrosos',
    filePattern: 'FO-PO-PSM-64-09',
    fields: Object.assign({}, AGUA_FIELDS)
};
// EMISIÓN DE RUIDO (65-06)
exports.EMISION_RUIDO_CONFIG = {
    templateType: 'EMISION_RUIDO',
    displayName: 'Estudio de Emisión de Ruido',
    filePattern: 'FO-PO-PSM-65-06',
    fields: Object.assign({}, AGUA_FIELDS)
};
// RUIDO AMBIENTAL (65-07)
exports.RUIDO_AMBIENTAL_CONFIG = {
    templateType: 'RUIDO_AMBIENTAL',
    displayName: 'Estudio de Ruido Ambiental',
    filePattern: 'FO-PO-PSM-65-07',
    fields: Object.assign({}, AGUA_FIELDS)
};
// RUIDO INTRADOMICILIARIO (65-08)
exports.RUIDO_INTRADOMICILIARIO_CONFIG = {
    templateType: 'RUIDO_INTRADOMICILIARIO',
    displayName: 'Estudio de Ruido Intradomiciliario',
    filePattern: 'FO-PO-PSM-65-08',
    fields: Object.assign({}, AGUA_FIELDS)
};
// EMISIÓN DE RUIDO Y RUIDO AMBIENTAL (65-09)
exports.EMISION_RUIDO_AMBIENTAL_CONFIG = {
    templateType: 'EMISION_RUIDO_AMBIENTAL',
    displayName: 'Estudio de Emisión de Ruido y Ruido Ambiental',
    filePattern: 'FO-PO-PSM-65-09',
    fields: Object.assign({}, AGUA_FIELDS)
};
// CALIDAD DE AIRE (66-18)
exports.CALIDAD_AIRE_CONFIG = {
    templateType: 'CALIDAD_AIRE',
    displayName: 'Informe de Calidad de Aire',
    filePattern: 'FO-PO-PSM-66-18',
    fields: Object.assign({}, AGUA_FIELDS)
};
// OLORES OFENSIVOS (66-19)
exports.OLORES_CONFIG = {
    templateType: 'OLORES',
    displayName: 'Informe de Olores Ofensivos',
    filePattern: 'FO-PO-PSM-66-19',
    fields: Object.assign({}, AGUA_FIELDS)
};
// PARTÍCULAS VIABLES (66-20)
exports.PARTICULAS_VIABLES_CONFIG = {
    templateType: 'PARTICULAS_VIABLES',
    displayName: 'Informe de Partículas Viables',
    filePattern: 'FO-PO-PSM-66-20',
    fields: Object.assign({}, AGUA_FIELDS)
};
// PREVIOS EN FUENTES FIJAS (67-10)
exports.FUENTES_FIJAS_PREVIO_CONFIG = {
    templateType: 'FUENTES_FIJAS_PREVIO',
    displayName: 'Informe Previo de Fuentes Fijas',
    filePattern: 'FO-PO-PSM-67-10',
    fields: Object.assign({}, AGUA_FIELDS)
};
// FUENTES FIJAS (67-11)
exports.FUENTES_FIJAS_CONFIG = {
    templateType: 'FUENTES_FIJAS',
    displayName: 'Informe de Fuentes Fijas',
    filePattern: 'FO-PO-PSM-67-11',
    fields: Object.assign({}, AGUA_FIELDS)
};
// ================================================================
// REGISTRY
// ================================================================
exports.TEMPLATE_CONFIGS = {
    'ASUB': exports.ASUB_CONFIG,
    'PUNTO_SECO': exports.PUNTO_SECO_CONFIG,
    'RESPEL': exports.RESPEL_CONFIG,
    'EMISION_RUIDO': exports.EMISION_RUIDO_CONFIG,
    'RUIDO_AMBIENTAL': exports.RUIDO_AMBIENTAL_CONFIG,
    'RUIDO_INTRADOMICILIARIO': exports.RUIDO_INTRADOMICILIARIO_CONFIG,
    'EMISION_RUIDO_AMBIENTAL': exports.EMISION_RUIDO_AMBIENTAL_CONFIG,
    'CALIDAD_AIRE': exports.CALIDAD_AIRE_CONFIG,
    'OLORES': exports.OLORES_CONFIG,
    'PARTICULAS_VIABLES': exports.PARTICULAS_VIABLES_CONFIG,
    'FUENTES_FIJAS': exports.FUENTES_FIJAS_CONFIG,
    'FUENTES_FIJAS_PREVIO': exports.FUENTES_FIJAS_PREVIO_CONFIG,
};
function getTemplateType(fileName) {
    const upper = fileName.toUpperCase();
    if (upper.includes('RESPEL') || upper.includes('64-09'))
        return 'RESPEL';
    if (upper.includes('PUNTO SECO') || upper.includes('64-10'))
        return 'PUNTO_SECO';
    if (upper.includes('64-08') || upper.includes('SUBTERR'))
        return 'ASUB';
    if (upper.includes('65-09'))
        return 'EMISION_RUIDO_AMBIENTAL';
    if (upper.includes('65-06'))
        return 'EMISION_RUIDO';
    if (upper.includes('65-08'))
        return 'RUIDO_INTRADOMICILIARIO';
    if (upper.includes('65-07'))
        return 'RUIDO_AMBIENTAL';
    if (upper.includes('66-18'))
        return 'CALIDAD_AIRE';
    if (upper.includes('66-19'))
        return 'OLORES';
    if (upper.includes('66-20'))
        return 'PARTICULAS_VIABLES';
    if (upper.includes('67-10'))
        return 'FUENTES_FIJAS_PREVIO';
    if (upper.includes('67-11'))
        return 'FUENTES_FIJAS';
    return 'ASUB'; // Default to AGUA
}
exports.default = exports.TEMPLATE_CONFIGS;
