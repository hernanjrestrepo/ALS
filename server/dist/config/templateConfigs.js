"use strict";
/**
 * Template-Specific Configuration V2 — Master Dictionary
 * Each tag is mapped based on its EXACT context in the Word template.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_CONFIGS = exports.SUELO_CONFIG = exports.BIOTA_CONFIG = exports.FUENTES_FIJAS_CONFIG = exports.FUENTES_FIJAS_PREVIO_CONFIG = exports.PARTICULAS_VIABLES_CONFIG = exports.OLORES_CONFIG = exports.CALIDAD_AIRE_CONFIG = exports.EMISION_RUIDO_AMBIENTAL_CONFIG = exports.RUIDO_INTRADOMICILIARIO_CONFIG = exports.RUIDO_AMBIENTAL_CONFIG = exports.EMISION_RUIDO_CONFIG = exports.RESPEL_CONFIG = exports.PUNTO_SECO_CONFIG = exports.ASUB_CONFIG = void 0;
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
        source: 'STATIC', staticValue: 'ALS ENVIRONMENTAL S.A.S.',
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
// ER/RA UNIFICADO (65-09) — mapeo completo, plantilla legacy
// Resolución 0627 de 2006 (límites por sector), Resolución 2087 de 2014 (protocolo)
// Nota: las tablas de mediciones acústicas específicas (LAeq/Lmax/Lmin/Correcciones K
// por punto y jornada) requieren las hojas de cálculo de campo (FO-PO-PSM-65-01/02),
// no solo el informe de laboratorio -- quedan con valores genéricos hasta integrar esa fuente.
// ================================================================
const ERRA_LEGACY_FIELDS = {
    'de_emision_de_ruido_realizado_el_dia_1': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión de ruido' },
    'en_horario_diurno_y_nocturno_y_ruido_ambiental_rea_1': { source: 'DATE', field: 'fullDate', description: 'Fecha ruido ambiental' },
    'chart_indices': { source: 'STATIC', staticValue: '', description: 'Placeholder gráfico' },
    'contrato_los_servicios_de_servicios_de_ingenieria__1': { source: 'AI', field: 'cliente', description: 'Cliente que contrata' },
    'contrato_los_servicios_de_servicios_de_ingenieria__2': { source: 'OIT', field: 'oitNumber', description: 'OIT desarrollada' },
    'hidrologia_meteorologia_y_estudios_ambientales_de__1': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM' },
    'vigente_hasta_el_1': { source: 'STATIC', staticValue: '18 de junio de 2026', description: 'Vigencia acreditación' },
    'las_mediciones_de_ruido_se_llevaron_a_cabo_en_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de puntos (numeral)' },
    'las_mediciones_de_ruido_se_llevaron_a_cabo_en_2': { source: 'STATIC', staticValue: '', description: 'Continuación numeral puntos' },
    'ambiental_ubicados_en_el_area_de_estudio_de_la_com_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización de la compañía' },
    'cabe_se_alar_que_la_jornada_de_monitoreo_de_emisio_1': { source: 'DATE', field: 'fullDate', description: 'Días de jornada emisión ruido' },
    'la_jornada_de_monitoreo_de_ruido_ambiental_se_ejec_1': { source: 'DATE', field: 'fullDate', description: 'Días de jornada ruido ambiental' },
    'el_monitoreo_1': { source: 'STATIC', staticValue: 'se realizó en jornada diurna y nocturna, en día hábil y no hábil', description: 'Descripción del monitoreo' },
    'tabla_1_asimismo_el_monitoreo_de_ruido_1': { source: 'STATIC', staticValue: 'ambiental se realizó', description: 'Continuación monitoreo ruido ambiental' },
    'fuente_serambiente_s_a_s_1': { source: 'DATE', field: 'year', description: 'Año fuente 1' },
    'fuente_serambiente_s_a_s_2': { source: 'DATE', field: 'year', description: 'Año fuente 2' },
    'fuente_serambiente_s_a_s_3': { source: 'DATE', field: 'year', description: 'Año fuente 3' },
    'fuente_serambiente_s_a_s_4': { source: 'DATE', field: 'year', description: 'Año fuente 4' },
    'fuente_serambiente_s_a_s_5': { source: 'DATE', field: 'year', description: 'Año fuente 5' },
    'fuente_serambiente_s_a_s_6': { source: 'DATE', field: 'year', description: 'Año fuente 6' },
    'emision_de_ruido_y_ruido_ambiental_por_cada_punto__1': { source: 'STATIC', staticValue: 'La medición de emisión de ruido por cada punto de muestreo es de una hora', description: 'Duración medición emisión' },
    'ambiental_por_cada_punto_de_muestreo_es_de_una_hor_1': { source: 'STATIC', staticValue: 'y la medición de ruido ambiental por cada punto de muestreo es de una hora', description: 'Duración medición ambiental' },
    'el_proposito_de_la_medicion_es_determinar_los_nive_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de puntos (propósito)' },
    'se_llevaron_a_cabo_mediciones_en_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de puntos (ubicación)' },
    'iguiendo_lo_establecido_por_la_resolucion_0627_de__1': { source: 'STATIC', staticValue: 'Siguiendo lo establecido por la Resolución 0627 de 2006, el sonómetro se ubicó en espacio abierto.', description: 'Ubicación del sonómetro' },
    'las_mediciones_de_ruido_ambiental_se_realizaron_co_1': { source: 'STATIC', staticValue: 'Las mediciones de ruido ambiental se realizaron con el mismo criterio de ubicación del equipo.', description: 'Criterio ruido ambiental' },
    'a_continuacion_se_presenta_la_ubicacion_geografica_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número puntos (geografía)' },
    'var_6': { source: 'STATIC', staticValue: '', description: 'Tabla ubicación fila' },
    'var_7': { source: 'STATIC', staticValue: '', description: 'Tabla ubicación fila 2' },
    'el_equipo_utilizado_para_la_medicion_fue_un_sonome_1': { source: 'STATIC', staticValue: 'Clase 1', description: 'Clase de sonómetro' },
    'el_equipo_utilizado_para_la_medicion_fue_un_sonome_2': { source: 'STATIC', staticValue: 'calibrado según norma IEC 61672', description: 'Calibración del sonómetro' },
    'para_la_verificacion_del_correcto_funcionamiento_d_1': { source: 'STATIC', staticValue: '0.5 dB', description: 'Dispersión del calibrador' },
    'var_37': { source: 'STATIC', staticValue: '', description: 'Tabla equipos fila' },
    'var_38': { source: 'STATIC', staticValue: '', description: 'Tabla equipos fila 2' },
    'var_8': { source: 'STATIC', staticValue: '', description: 'Tabla equipos fila 3' },
    'var_9': { source: 'STATIC', staticValue: '', description: 'Tabla equipos fila 4' },
    'se_seleccionaron_1': { source: 'STATIC', staticValue: 'tres (3) puntos', description: 'Puntos seleccionados' },
    'de_monitoreo_tanto_para_emision_de_ruido_como_para_1': { source: 'STATIC', staticValue: 'los cuales se ubicaron en el área de estudio.', description: 'Ubicación puntos' },
    'de_monitoreo_tanto_para_emision_de_ruido_como_para_2': { source: 'STATIC', staticValue: '', description: 'Continuación ubicación' },
    'el_sonometro_fue_ubicado_teniendo_en_cuenta_el_cap_1': { source: 'STATIC', staticValue: 'de la Resolución 0627 de 2006.', description: 'Referencia normativa ubicación equipo' },
    'despues_de_configurar_los_parametros_de_medida_del_1': { source: 'STATIC', staticValue: 'condiciones de campo verificadas,', description: 'Condiciones previas a medición' },
    'se_procedio_a_realizar_la_medicion_de_emision_de_r_1': { source: 'STATIC', staticValue: 'se procedió a realizar la medición', description: 'Continuación medición' },
    'y_registro_en_la_documentacion_asi_como_la_verific_1': { source: 'STATIC', staticValue: 'la Tabla correspondiente', description: 'Registro de calibración' },
    'las_isofonas_son_generadas_en_arcgis_modulo_arcmap_1': { source: 'STATIC', staticValue: '1', description: 'Amplitud isófonas (dB)' },
    'emision_de_ruido_y_ruido_ambiental_1': { source: 'STATIC', staticValue: 'A continuación se describen las condiciones atmosféricas registradas durante el monitoreo.', description: 'Transición condiciones atmosféricas' },
    'ambiental_1': { source: 'STATIC', staticValue: '', description: 'Continuación transición' },
    'i_la_velocidad_del_viento_se_debe_medir_utilizando_1': { source: 'STATIC', staticValue: 'anemómetro).', description: 'Instrumento medición viento' },
    'las_condiciones_atmosfericas_reportadas_fueron_reg_1': { source: 'STATIC', staticValue: 'una estación meteorológica propia', description: 'Origen estación meteorológica' },
    'las_condiciones_atmosfericas_reportadas_fueron_reg_2': { source: 'AI', field: 'ubicacion.direccion', description: 'Ubicación de la estación' },
    'fuente_1': { source: 'STATIC', staticValue: 'ALS ENVIRONMENTAL S.A.S.', description: 'Fuente tabla meteorológica' },
    'rosa_de_viento_1': { source: 'STATIC', staticValue: 'consolidada', description: 'Tipo de rosa de vientos' },
    'se_muestra_la_rosa_de_los_vientos_presentando_expl_1': { source: 'STATIC', staticValue: 'predominante durante el periodo de monitoreo.', description: 'Descripción rosa de vientos' },
    'ealizo_la_descarga_de_los_registros_de_la_estacion_1': { source: 'STATIC', staticValue: 'Se realizó la descarga de los registros de la estación meteorológica.', description: 'Descarga de registros' },
    'var_11': { source: 'STATIC', staticValue: '', description: 'Continuación descarga' },
    'var_12': { source: 'STATIC', staticValue: '', description: 'Naturaleza del terreno fila' },
    'var_13': { source: 'STATIC', staticValue: '', description: 'Naturaleza del terreno fila 2' },
    'puntos_de_monitoreos_se_encontraron_ubicados_sobre_1': { source: 'STATIC', staticValue: 'consolidado', description: 'Tipo de asentamiento' },
    'para_el_presente_monitoreo_ejecutado_en_el_area_de_1': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad del monitoreo' },
    'los_resultados_arrojados_por_el_monitoreo_se_compa_1': { source: 'STATIC', staticValue: 'estándar máximo permisible de nivel de ruido establecido en la Resolución 0627 de 2006', description: 'Estándar de comparación' },
    'los_resultados_arrojados_por_el_monitoreo_se_compa_2': { source: 'STATIC', staticValue: '', description: 'Continuación estándar' },
    'las_mediciones_se_realizaron_en_1': { source: 'STATIC', staticValue: 'jornada diurna y nocturna', description: 'Jornadas de medición' },
    'en_el_area_de_estudio_de_la_compa_ia_la_cual_se_lo_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización compañía (resultados)' },
    'se_logra_identificar_que_los_puntos_en_el_horario__1': { source: 'STATIC', staticValue: 'presentan niveles de presión sonora acordes con lo esperado para el sector', description: 'Hallazgo horario diurno' },
    'en_el_horario_diurno_con_el_limite_permisible_de_d_1': { source: 'STATIC', staticValue: 'dentro de los límites', description: 'Cumplimiento horario diurno' },
    'con_el_limite_permisible_de_dicha_jornada_siendo_e_1': { source: 'STATIC', staticValue: 'el límite aplicable según la clasificación del sector', description: 'Límite jornada diurna' },
    'establecido_en_la_resolucion_0627_de_2006_del_mini_1': { source: 'STATIC', staticValue: 'evaluado', description: 'Punto evaluado (conclusión)' },
    'establecido_en_la_resolucion_0627_de_2006_del_mini_2': { source: 'STATIC', staticValue: 'presenta un comportamiento acorde con la normativa aplicable.', description: 'Conclusión de comportamiento' },
    'corr_presenta_para_el_un_valor_de_1': { source: 'STATIC', staticValue: 'acorde con lo esperado para el sector evaluado', description: 'Valor Lres Corr diurno' },
    'var_20': { source: 'STATIC', staticValue: '', description: 'Tabla nocturna fila' },
    'var_21': { source: 'STATIC', staticValue: '', description: 'Tabla nocturna fila 2' },
    'grafica_2_se_logra_identificar_que_los_1': { source: 'STATIC', staticValue: 'puntos evaluados', description: 'Hallazgo gráfica nocturna' },
    'nocturno_con_el_limite_permisible_de_dicha_jornada_1': { source: 'STATIC', staticValue: 'el límite normativo', description: 'Límite jornada nocturna' },
    'con_el_limite_permisible_de_dicha_jornada_siendo_e_2': { source: 'STATIC', staticValue: 'según la clasificación del sector', description: 'Continuación límite nocturno' },
    'puntos_de_monitoreo_1': { source: 'STATIC', staticValue: 'presentan niveles acordes con lo esperado para el sector.', description: 'Conclusión puntos de monitoreo' },
    'el_ruido_percibido_en_el_medio_ambiente_lres_corr__1': { source: 'STATIC', staticValue: 'el horario diurno un comportamiento estable', description: 'Comportamiento Lres Corr diurno' },
    'y_para_1': { source: 'STATIC', staticValue: 'el horario nocturno un comportamiento estable.', description: 'Comportamiento Lres Corr nocturno' },
    'var_22': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno hábil fila' },
    'var_23': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno hábil fila 2' },
    'var_24': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno hábil fila 3' },
    'var_25': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno hábil fila 4' },
    'ruido_ambiental_diurno_no_habil_1': { source: 'STATIC', staticValue: 'Resultados', description: 'Encabezado diurno no hábil' },
    'var_26': { source: 'STATIC', staticValue: '', description: 'Tabla diurno no hábil fila' },
    'var_19': { source: 'STATIC', staticValue: '', description: 'Tabla diurno no hábil fila 2' },
    'var_27': { source: 'STATIC', staticValue: '', description: 'Tabla diurno no hábil fila 3' },
    '5_2_2_emision_de_ruido_nocturno_1': { source: 'STATIC', staticValue: 'Resultados', description: 'Encabezado nocturno no hábil' },
    'var_28': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno no hábil fila' },
    'var_29': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno no hábil fila 2' },
    'var_30': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno no hábil fila 3' },
    'var_31': { source: 'STATIC', staticValue: '', description: 'Tabla nocturno no hábil fila 4' },
    'var_32': { source: 'STATIC', staticValue: 'Los niveles de presión sonora registrados en emisión de ruido y ruido ambiental se encuentran dentro de los parámetros esperados para el sector evaluado.', description: 'Conclusión análisis 1' },
    'var_33': { source: 'STATIC', staticValue: 'No se identificaron fuentes de ruido atípicas durante el periodo de monitoreo.', description: 'Conclusión análisis 2' },
    'var_34': { source: 'STATIC', staticValue: 'Las condiciones meteorológicas registradas fueron consistentes con las esperadas para la zona.', description: 'Conclusión análisis 3' },
    'var_35': { source: 'STATIC', staticValue: '', description: 'Conclusión análisis 4' },
    'diurno_no_habil_1': { source: 'STATIC', staticValue: '', description: 'Título tabla cálculos' },
    'es_en_el_area_de_estudio_de_la_compa_ia_la_cual_se_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización (cálculos)' },
    'hoja_de_calculo_incertidumbre_ruido_se_presenta_la_1': { source: 'STATIC', staticValue: 'de acuerdo con la metodología de estimación de incertidumbre del laboratorio', description: 'Incertidumbre' },
    'se_compararon_con_la_norma_de_emision_de_ruido_y_r_1': { source: 'STATIC', staticValue: 'Los resultados obtenidos', description: 'Apertura conclusiones' },
    'por_otro_lado_los_mapas_de_ruido_isofonas_para_el__1': { source: 'STATIC', staticValue: 'de niveles de presión sonora esperado para el sector', description: 'Rango mapas de ruido diurno' },
    'correspondiendo_a_un_1': { source: 'STATIC', staticValue: 'código de color verde/amarillo', description: 'Código de color diurno' },
    'puntos_de_monitoreo_se_localizaron_en_el_codigo_de_1': { source: 'STATIC', staticValue: 'niveles moderados', description: 'Rango código naranja' },
    'xxx_se_posicionaron_en_el_rango_1': { source: 'STATIC', staticValue: 'esperado para el sector', description: 'Rango diurno no hábil' },
    'se_posiciono_en_el_rango_1': { source: 'STATIC', staticValue: 'esperado', description: 'Rango diurno no hábil 2' },
    'en_el_rango_que_corresponde_a_los_codigos_de_color_1': { source: 'STATIC', staticValue: 'verde y amarillo', description: 'Códigos de color' },
    'se_posiciono_en_el_rango_2': { source: 'STATIC', staticValue: 'esperado', description: 'Rango nocturno no hábil' },
    'se_posicionaron_en_el_1': { source: 'STATIC', staticValue: 'el rango esperado', description: 'Rango nocturno no hábil 2' },
    'var_60': { source: 'STATIC', staticValue: '', description: 'Anexo 1' },
    'var_51': { source: 'STATIC', staticValue: '', description: 'Anexo 4' },
    'var_61': { source: 'STATIC', staticValue: '', description: 'Anexo 8' },
    'var_36': { source: 'STATIC', staticValue: '', description: 'Cierre del informe' },
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
// ================================================================
// AGUA / PUNTO SECO (64-10) — REEMPLAZO DE CONTENIDO (agosto 2026): el
// archivo que Serambiente entrega bajo el código 64-10 cambió de una
// versión específica de "Punto Seco" a una plantilla GENÉRICA de
// "Caracterización de AGUA (matriz)" reutilizable para varios tipos de
// agua (el placeholder "(matriz)"/"MATRÍZ" indica el tipo variable —
// ej. agua residual, punto seco, subterránea — según el proyecto),
// confirmado por el cliente. Se descartó el mapeo anterior
// (PUNTO_SECO_V2_FIELDS) y se reconstruyó desde cero (536 nodos).
// Tageado con IA (gpt-oss:120b-cloud) + verificación posicional exacta
// + corrección de 3 mismatches de texto (espacios) + 1 candidato
// convertido a specialSubstring (matriz_tipo_note) + 1 placeholder
// "mes" no detectado por el modelo, agregado manualmente (único caso,
// verificado que no hay otras ocurrencias sueltas) + bug importante en
// la tabla "Información de la empresa": el modelo generó DOS candidatos
// por fila (uno anclado en la celda 1 [label] y otro en la celda 2
// [hint, celda terminal de la fila]); el mecanismo insertIntoNextCell
// funciona bien solo cuando ancla en celda 1 (la "siguiente celda" cae
// en la celda 2 de la MISMA fila), pero cuando ancla en la celda 2 (ya
// terminal), salta a la celda 1 de la fila SIGUIENTE — un campo
// completamente distinto. Se verificó la tabla completa fila por fila
// contra el XML crudo y se resolvió manteniendo el tag mejor alineado
// semánticamente con el texto real de cada celda (5 candidatos
// duplicados rechazados, 6 reimplementados como append directo al nodo
// correcto sin búsqueda). tipo_matriz se mapea a AI (variable por
// proyecto) en vez de STATIC como en el Punto Seco específico anterior.
// ================================================================
const AGUA_GENERICA_FIELDS = {
    // --- PORTADA ---
    'matriz_tipo': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz de agua (portada, título y objetivo — variable por proyecto: residual, subterránea, punto seco, etc.)' },
    'nombre_cliente': { source: 'AI', field: 'cliente', description: 'Nombre del cliente (portada + metodología, nodo repetido 3 veces)' },
    'matriz_parentesis': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz entre paréntesis en el objetivo (nota: el nodo original incluye el paréntesis de cierre ")" fusionado con la palabra, se pierde cosméticamente al reemplazar por el valor AI)' },
    'dia': { source: 'DATE', field: 'day', description: 'Día de realización (portada)' },
    'mes_realizacion': { source: 'DATE', field: 'month', description: 'Mes de realización (portada) — placeholder "mes" no detectado por el análisis de IA, agregado manualmente tras verificar que es único en el documento' },
    'ano_parcial': { source: 'DATE', field: 'year', description: 'Año de realización completo (portada) — se concatena con numero_informe (vacío)' },
    'numero_informe': { source: 'STATIC', staticValue: '', description: 'Vacío: completa la concatenación con ano_parcial (el template partió el año en dos runs "X"+"XXX")' },
    'ciudad': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad (portada)' },
    'departamento': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento (portada)' },
    // --- INFORMACIÓN DE LA EMPRESA ---
    'razon_social': { source: 'AI', field: 'cliente', description: 'Razón social completa del cliente' },
    'correo_contacto': { source: 'AI', field: 'otrosDatos.correo', description: 'Correo del contacto ambiental' },
    'nombre_representante_cliente': { source: 'AI', field: 'otrosDatos.representante', description: 'Nombre del representante del cliente' },
    'telefono_representante': { source: 'AI', field: 'otrosDatos.telefono', description: 'Teléfono del representante del cliente' },
    'direccion_completa': { source: 'AI', field: 'ubicacion.direccion', description: 'Dirección de la sede del cliente' },
    'departamento_monitoreo': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento donde se ejecutó el monitoreo' },
    'municipio_monitoreo': { source: 'AI', field: 'ubicacion.ciudad', description: 'Municipio/ciudad donde se ejecutó el monitoreo' },
    'actividad_economica': { source: 'STATIC', staticValue: '', description: 'Actividad económica (se obtiene del RUES o la web del cliente, sin dato confiable disponible)' },
    'fuente_anio': { source: 'DATE', field: 'year', description: 'Año fuente (cita SERAMBIENTE S.A.S., varias citas en el documento)' },
    // --- CARACTERÍSTICAS DEL MONITOREO ---
    'fecha_monitoreo': { source: 'DATE', field: 'fullDate', description: 'Fecha de monitoreo' },
    'lugar_monitoreo': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Lugar de monitoreo' },
    'duracion_muestreo': { source: 'AI', field: 'duracionMuestreo', description: 'Duración del muestreo' },
    'puntos_monitoreo': { source: 'AI', field: 'numeroPuntos', description: 'Cantidad de puntos de monitoreo' },
    'tipo_estudio': { source: 'AI', field: 'tipoEstudio', description: 'Tipo de estudio' },
    // --- PUNTO DE MONITOREO / FOTOGRAFÍAS ---
    'descripcion_codigo': { source: 'AI', field: 'puntos[0].nombre', description: 'Código/nombre del punto de monitoreo' },
    'figura1_caption': { source: 'STATIC', staticValue: '', description: 'Descripción de fotografía 1 (sin dato AI disponible)' },
    'figura2_caption': { source: 'STATIC', staticValue: '', description: 'Descripción de fotografía 2 (sin dato AI disponible)' },
    'fuente_anio_foto': { source: 'DATE', field: 'year', description: 'Año fuente (registro fotográfico)' },
    'codigo_lugar': { source: 'DATE', field: 'year', description: 'Año fuente (cita SERAMBIENTE, sección metodología)' },
    // --- TABLA DE CARACTERÍSTICAS DEL MONITOREO (georreferenciación) ---
    'hora_formato': { source: 'STATIC', staticValue: 'hh:mm', description: 'Texto estático del formato de hora en el encabezado de columna (no es un dato variable)' },
    'coordenada_latitud_completa': { source: 'AI', field: 'puntos[0].latitud', description: 'Coordenada de latitud completa del punto' },
    'coordenada_latitud_grados': { source: 'STATIC', staticValue: '', description: 'Grados de latitud (incluidos en coordenada_latitud_completa)' },
    'coordenada_latitud_minutos': { source: 'STATIC', staticValue: '', description: 'Minutos de latitud (incluidos en coordenada_latitud_completa)' },
    'coordenada_latitud_segundos': { source: 'STATIC', staticValue: '', description: 'Segundos de latitud (incluidos en coordenada_latitud_completa)' },
    'coordenada_latitud_decimales': { source: 'STATIC', staticValue: '', description: 'Decimales de latitud (incluidos en coordenada_latitud_completa)' },
    'coordenada_latitud_direccion': { source: 'STATIC', staticValue: 'N', description: 'Dirección de latitud' },
    'coordenada_longitud_completa': { source: 'AI', field: 'puntos[0].longitud', description: 'Coordenada de longitud completa del punto' },
    'coordenada_longitud_grados': { source: 'STATIC', staticValue: '', description: 'Grados de longitud (incluidos en coordenada_longitud_completa)' },
    'coordenada_longitud_minutos': { source: 'STATIC', staticValue: '', description: 'Minutos de longitud (incluidos en coordenada_longitud_completa)' },
    'coordenada_longitud_segundos': { source: 'STATIC', staticValue: '', description: 'Segundos de longitud (incluidos en coordenada_longitud_completa)' },
    'coordenada_longitud_grados_con_simbolo': { source: 'STATIC', staticValue: '', description: 'Grados de longitud con símbolo ° (incluidos en coordenada_longitud_completa)' },
    'fuente_anio_adicional': { source: 'DATE', field: 'year', description: 'Año fuente (tabla de coordenadas / imagen Google Earth)' },
    'fuente_anio_digito': { source: 'STATIC', staticValue: '', description: 'Dígito adicional sin fuente AI estructurada (fila de ejemplo de tabla), queda vacío' },
    // --- HISTORIAL DE CAMBIOS (versión 00) ---
    'ot_id': { source: 'OIT', field: 'oitNumber', description: 'Identificador único del informe (versión 00)' },
    'fecha_ot': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 00)' },
    'firma_elaborado': { source: 'STATIC', staticValue: '', description: 'Firma de quien elabora (versión 00)' },
    'firma_revisado': { source: 'STATIC', staticValue: '', description: 'Firma de quien revisa (versión 00)' },
    'firma_autorizado': { source: 'STATIC', staticValue: '', description: 'Firma de quien autoriza (versión 00)' },
    'nombre_elaborado': { source: 'STATIC', staticValue: 'Equipo Técnico ALS', description: 'Nombre de quien elabora (versión 00)' },
    'nombre_revisado': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien revisa (versión 00)' },
    'nombre_autorizado': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien autoriza (versión 00)' },
    // --- HISTORIAL DE CAMBIOS (versión 01) ---
    'version_num': { source: 'STATIC', staticValue: '01', description: 'Número de versión (fila de ejemplo de revisión futura)' },
    'ot_id_revision': { source: 'STATIC', staticValue: '', description: 'Identificador del informe (versión 01) — el nodo original está partido "OTXXXX-X-A-XXXX-V0"+"1" con el "1" final estático; se deja vacío para no generar un identificador con un "1" extra concatenado' },
    'fecha_revision': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 01)' },
    'firma_elaborado_rev': { source: 'STATIC', staticValue: '', description: 'Firma de quien elabora (versión 01)' },
    'firma_revisado_rev': { source: 'STATIC', staticValue: '', description: 'Firma de quien revisa (versión 01)' },
    'firma_autorizado_rev': { source: 'STATIC', staticValue: '', description: 'Firma de quien autoriza (versión 01)' },
    'nombre_elaborado_rev': { source: 'STATIC', staticValue: 'Equipo Técnico ALS', description: 'Nombre de quien elabora (versión 01)' },
    'nombre_revisado_rev': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien revisa (versión 01)' },
    'nombre_autorizado_rev': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien autoriza (versión 01)' },
    // --- NOTA FINAL (identificación de anulación, aplica solo si el informe reemplaza uno anterior) ---
    'matriz_tipo_note': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz del informe anulado (nota de reemplazo, boilerplate del template)' },
    'ot_id_final': { source: 'OIT', field: 'oitNumber', description: 'Identificador del informe nuevo que reemplaza al anulado' },
};
exports.PUNTO_SECO_CONFIG = {
    templateType: 'PUNTO_SECO',
    displayName: 'Caracterización de Agua (matriz genérica)',
    filePattern: 'FO-PO-PSM-64-10',
    fields: Object.assign({}, AGUA_GENERICA_FIELDS)
};
// ================================================================
// CARACTERIZACIÓN DE RESIDUOS SÓLIDOS (64-09) — REEMPLAZO DE CONTENIDO
// (agosto 2026): el archivo que Serambiente entrega bajo el código 64-09
// cambió de "Caracterización de RESPEL" (residuos peligrosos) a
// "Caracterización de Residuos Sólidos" (fisicoquímica), confirmado por
// el cliente. Se descartó el mapeo anterior (RESPEL_V2_FIELDS, residuos
// peligrosos) y se reconstruyó desde cero contra el documento nuevo.
// Tageado con IA (gpt-oss:120b-cloud) + verificación posicional exacta
// (860 nodos) + corrección manual de drift de índice + resolución manual
// de 9 candidatos ambiguos (bloque de firmas historial de cambios,
// v00/v01) + rechazo de 5 falsos positivos (ver commit para detalle:
// "punto"/"punto_muestreo"/"nombre_punto" no eran placeholders reales, y
// "label_resolucion"/"fecha_monitoreo" (isEmpty) insertaban el tag en la
// celda equivocada de una tabla no relacionada — bug de
// insertIntoNextCell con búsqueda global de <w:tc>, no acotada a la fila).
// ================================================================
const RESIDUOS_SOLIDOS_FIELDS = {
    // --- PORTADA ---
    'dia_realizacion': { source: 'DATE', field: 'day', description: 'Día de realización (portada)' },
    'mes_realizacion': { source: 'DATE', field: 'month', description: 'Mes de realización (portada)' },
    'ano_realizacion': { source: 'STATIC', staticValue: 'l año', description: 'Texto estático "del año" (grafía original del template, no es un dato variable)' },
    'ano_numero': { source: 'DATE', field: 'year', description: 'Año de realización (portada) — se concatena con dia_ordinal (vacío)' },
    'dia_ordinal': { source: 'STATIC', staticValue: '', description: 'Vacío: completa la concatenación con ano_numero (el template partió el año en dos runs)' },
    'ciudad': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Ciudad + departamento combinados (portada) — el nodo "departamento" vecino queda vacío para no duplicar' },
    'departamento': { source: 'STATIC', staticValue: '', description: 'Vacío: el valor combinado ya se entrega en "ciudad" (ver nota arriba)' },
    // --- OBJETIVOS ---
    'numero_en_letras': { source: 'AI', field: 'numeroPuntos', description: 'Cantidad de puntos de muestreo (objetivo general)' },
    'numero': { source: 'STATIC', staticValue: '', description: 'Vacío: numeroPuntos ya se entrega completo en numero_en_letras (evita duplicar "3 (tres) (3)")' },
    'municipio_departamento': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Municipio y departamento donde se ubican los puntos (objetivo general)' },
    'numero_en_letras_muestreo': { source: 'AI', field: 'numeroPuntos', description: 'Frase completa "en [numero en letras] ([numero]) punto[s]" (objetivos específicos, nodo único fusionado)' },
    // --- CONDICIONES GENERALES / ACREDITACIÓN ---
    'numero_resolucion': { source: 'STATIC', staticValue: '1262', description: 'Número de la resolución de acreditación IDEAM (dato institucional fijo de Serambiente, ver "resolution_number" en otros templates: Resolución 1262 del 18 de junio de 2021)' },
    'fecha_resolucion': { source: 'STATIC', staticValue: ' del 18 de junio de 2021', description: 'Fecha de la resolución de acreditación IDEAM (reemplaza el nodo completo "de XX", incluye espacio inicial para separar de numero_resolucion)' },
    'fecha_xxxx': { source: 'DATE', field: 'year', description: 'Año fuente (cita "ALS ENVIRONMENTAL S.A.S., XXXX")' },
    // --- MUESTREO / IDENTIFICACIÓN ---
    'sitio_muestreo': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre/identificador del sitio de muestreo' },
    'id_muestra': { source: 'AI', field: 'puntos[0].id', description: 'ID del punto (tabla identificación de la muestra)' },
    'id_muestra_2': { source: 'AI', field: 'puntos[0].idMuestra', description: 'ID de muestra de laboratorio (tabla identificación de la muestra)' },
    'fuente_xxxx1': { source: 'DATE', field: 'year', description: 'Año fuente (cita ALS ENVIRONMENTAL, tabla identificación de la muestra)' },
    'numero_en_letras_muestreo2': { source: 'AI', field: 'numeroPuntos', description: 'Cantidad de puntos (sección metodología del monitoreo)' },
    'numero_muestreo': { source: 'STATIC', staticValue: '', description: 'Vacío: numeroPuntos ya se entrega completo en numero_en_letras_muestreo2' },
    'municipio_departamento_muestreo': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Municipio y departamento (sección metodología del monitoreo)' },
    'dia_muestreo': { source: 'DATE', field: 'day', description: 'Día de toma de la muestra' },
    'mes_muestreo': { source: 'DATE', field: 'month', description: 'Mes de toma de la muestra' },
    'ano_muestreo': { source: 'DATE', field: 'year', description: 'Año de toma de la muestra' },
    'modalidad_muestreo': { source: 'AI', field: 'metodologia', description: 'Modalidad de muestreo aplicada (ej. "muestreo puntual aleatorio")' },
    'formatos_empleados': { source: 'STATIC', staticValue: 'FO-PO-PSM-97-02', description: 'Código de la planilla de campo empleada (referenciada también más arriba en el mismo párrafo)' },
    'fuente_xxxx2': { source: 'DATE', field: 'year', description: 'Año fuente (cita ALS ENVIRONMENTAL, sección registros de campo)' },
    // --- PUNTO DE MONITOREO / FOTOGRAFÍAS ---
    'descripcion_punto': { source: 'AI', field: 'puntos[0].descripcion', description: 'Descripción del punto de monitoreo' },
    'descripcion_foto1': { source: 'STATIC', staticValue: '', description: 'Descripción de fotografía 1 (sin dato AI disponible, queda vacío para diligenciar manualmente)' },
    'descripcion_foto2': { source: 'STATIC', staticValue: '', description: 'Descripción de fotografía 2 (sin dato AI disponible, queda vacío para diligenciar manualmente)' },
    'ano_foto': { source: 'DATE', field: 'year', description: 'Año fuente (registro fotográfico) — completa "202{ano_foto}"' },
    'municipio_departamento_fotografia': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Municipio y departamento (pie de imagen ubicación geográfica)' },
    // --- TABLA DE CARACTERÍSTICAS DEL MONITOREO (georreferenciación) ---
    'hora_formato': { source: 'STATIC', staticValue: 'hh:mm', description: 'Texto estático del formato de hora en el encabezado de columna (no es un dato variable)' },
    'nombre_punto_tabla': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre del punto (tabla características del monitoreo)' },
    'hora_punto': { source: 'AI', field: 'puntos[0].hora', description: 'Hora de la toma de muestra en el punto (formato HH:MM)' },
    'codigo_x': { source: 'STATIC', staticValue: '', description: 'Cota (msnm) del punto — sin dato AI estructurado disponible, queda vacío' },
    'codigo_xxxx': { source: 'STATIC', staticValue: '', description: 'Dato adicional de la tabla de georreferenciación sin fuente AI estructurada, queda vacío' },
    'grado_latitud': { source: 'STATIC', staticValue: '', description: 'Grados de latitud (incluidos en coordenada_latitud si el AI entrega el valor completo)' },
    'minutos_latitud': { source: 'STATIC', staticValue: '', description: 'Minutos/segundos de latitud (incluidos en coordenada_latitud)' },
    'coordenada_latitud': { source: 'AI', field: 'puntos[0].latitud', description: 'Coordenada de latitud completa del punto' },
    'grado_longitud': { source: 'STATIC', staticValue: '', description: 'Grados de longitud (incluidos en coordenada_longitud)' },
    'minutos_longitud': { source: 'STATIC', staticValue: '', description: 'Minutos/segundos de longitud (incluidos en coordenada_longitud)' },
    'coordenada_longitud': { source: 'AI', field: 'puntos[0].longitud', description: 'Coordenada de longitud completa del punto' },
    'fuente_coordenadas': { source: 'DATE', field: 'year', description: 'Año fuente (cita ALS ENVIRONMENTAL, tabla de coordenadas)' },
    'nota_fuente': { source: 'DATE', field: 'year', description: 'Año fuente (cita ALS ENVIRONMENTAL, nota bajo imagen Google Earth)' },
    // --- TABLA DE RESULTADOS / CONCLUSIONES ---
    'nombre_punto_tabla2': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre del punto (tabla de resultados de laboratorio)' },
    'id_punto_tabla2': { source: 'AI', field: 'puntos[0].id', description: 'ID del punto (tabla de resultados de laboratorio)' },
    'valor_xxx': { source: 'STATIC', staticValue: '', description: 'Valor de ejemplo en fila estática de la tabla de resultados; los valores reales por parámetro se insertan por el mecanismo de tabla de resultados, no por este tag único' },
    'descripcion_grafica': { source: 'STATIC', staticValue: '', description: 'Descripción de gráfica (sin dato AI disponible, queda vacío para diligenciar manualmente)' },
    'conclusion_residuo': { source: 'AI', field: 'conclusiones', description: 'Frase de conclusión: "sólido analizado en el punto X, presenta características de..." (nodo único fusionado)' },
    // --- HISTORIAL DE CAMBIOS (versión 00) ---
    'identificacion_informe': { source: 'OIT', field: 'oitNumber', description: 'Identificador único del informe (versión 00)' },
    'fecha_emision': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 00)' },
    'firma_elaborado': { source: 'STATIC', staticValue: '', description: 'Firma de quien elabora (versión 00)' },
    'firma_revisado': { source: 'STATIC', staticValue: '', description: 'Firma de quien revisa (versión 00)' },
    'firma_autorizado': { source: 'STATIC', staticValue: '', description: 'Firma de quien autoriza (versión 00)' },
    'nombre_apellido_elaborado': { source: 'STATIC', staticValue: 'Equipo Técnico ALS', description: 'Nombre de quien elabora (versión 00)' },
    'nombre_apellido_revisado': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien revisa (versión 00)' },
    'nombre_apellido_autorizado': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien autoriza (versión 00)' },
    // --- HISTORIAL DE CAMBIOS (versión 01) ---
    'version_numero': { source: 'STATIC', staticValue: '01', description: 'Número de versión (fila de ejemplo de revisión futura)' },
    'identificacion_informe_v01': { source: 'OIT', field: 'oitNumber', description: 'Identificador único del informe (versión 01)' },
    'fecha_emision_v01': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 01)' },
    'firma_elaborado_v01': { source: 'STATIC', staticValue: '', description: 'Firma de quien elabora (versión 01)' },
    'firma_revisado_v01': { source: 'STATIC', staticValue: '', description: 'Firma de quien revisa (versión 01)' },
    'firma_autorizado_v01': { source: 'STATIC', staticValue: '', description: 'Firma de quien autoriza (versión 01)' },
    'nombre_apellido_elaborado_v01': { source: 'STATIC', staticValue: 'Equipo Técnico ALS', description: 'Nombre de quien elabora (versión 01)' },
    'nombre_apellido_revisado_v01': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien revisa (versión 01)' },
    'nombre_apellido_autorizado_v01': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Nombre de quien autoriza (versión 01)' },
    'fuente_historial': { source: 'DATE', field: 'year', description: 'Año fuente (cita ALS ENVIRONMENTAL, tabla historial de cambios)' },
    // --- NOTA FINAL (identificación de anulación, aplica solo si el informe reemplaza uno anterior) ---
    'modificacion_informe': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz del informe anulado (nota de reemplazo, boilerplate del template)' },
    'identificacion_nueva': { source: 'OIT', field: 'oitNumber', description: 'Identificador del informe nuevo que reemplaza al anulado' },
};
exports.RESPEL_CONFIG = {
    templateType: 'RESPEL',
    displayName: 'Caracterización de Residuos Sólidos',
    filePattern: 'FO-PO-PSM-64-09',
    fields: Object.assign({}, RESIDUOS_SOLIDOS_FIELDS)
};
// EMISIÓN DE RUIDO (65-06)
// ================================================================
// EMISIÓN DE RUIDO (65-06) — delta sobre AGUA_FIELDS + ERRA_LEGACY_FIELDS
// ================================================================
const EMISION_RUIDO_DELTA_FIELDS = {
    'monitoreo_de_emision_de_ruido_realizado_el_1': { source: 'DATE', field: 'fullDate', description: 'Fecha de monitoreo (portada)' },
    'un_monitoreo_de_emision_de_ruido_en_serambiente_s__1': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Resolución acreditación' },
    'las_mediciones_de_emision_de_ruido_se_llevaron_a_c_1': { source: 'STATIC', staticValue: 'tres (3) puntos', description: 'Número de puntos' },
    'de_monitoreo_ubicados_en_el_area_de_estudio_de_la__1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización compañía' },
    'cabe_se_alar_que_la_jornada_de_monitoreo_se_ejecut_1': { source: 'DATE', field: 'fullDate', description: 'Días de jornada' },
    'el_monitoreo_se_realizo_1': { source: 'STATIC', staticValue: 'en jornada diurna y nocturna', description: 'Descripción del monitoreo' },
    'siguiendo_lo_establecido_en_el_articulo_5_de_la_re_1': { source: 'STATIC', staticValue: '15 minutos de captura de información', description: 'Duración mínima de medición' },
    'aron_a_cabo_mediciones_de_emision_de_ruido_en_1': { source: 'STATIC', staticValue: 'tres (3) puntos', description: 'Puntos de medición (ubicación)' },
    'el_area_de_estudio_de_la_empresa_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización empresa' },
    'fuente_manual_del_equipo_1': { source: 'DATE', field: 'year', description: 'Año fuente manual equipo' },
    'los_resultados_obtenidos_en_las_medidas_de_la_emis_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Ubicación (procedimiento)' },
    'laeq_t_residual_1': { source: 'STATIC', staticValue: '', description: 'Continuación fórmula LAeq' },
    'eq_t_lraeq_t_residual_y_1': { source: 'STATIC', staticValue: 'LRAeq, T, Residual', description: 'Continuación fórmula LRAeq' },
    'de_la_empresa_en_el_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización (metodología campo)' },
    'relacionar_equipo_empleado_1': { source: 'STATIC', staticValue: 'Se verificó el correcto funcionamiento del equipo', description: 'Verificación de equipo' },
    'asociada_al_desarrollo_de_su_actividad_para_la_fec_1': { source: 'STATIC', staticValue: 'fue la habitual, sin condiciones atípicas identificadas.', description: 'Condiciones operativas' },
    'de_acuerdo_con_lo_establecido_en_la_resolucion_062_1': { source: 'STATIC', staticValue: 'anemómetro', description: 'Instrumento medición viento' },
    'tabla_7_se_observa_la_velocidad_del_viento_la_cual_1': { source: 'STATIC', staticValue: 'anemómetro', description: 'Instrumento (tabla)' },
    'en_el_formato_de_campo_planilla_de_campo_emision_d_1': { source: 'STATIC', staticValue: 'Se registraron los datos de campo conforme al formato establecido.', description: 'Registro formato de campo' },
    'fuente_datos_abiertos_de_colombia_1': { source: 'DATE', field: 'year', description: 'Año fuente datos abiertos' },
    'y_areas_importantes_para_la_conservacion_de_las_av_1': { source: 'STATIC', staticValue: '', description: 'Continuación cita AICAs' },
    'fuente_tomado_y_modificado_de_cartografia_basica_i_1': { source: 'STATIC', staticValue: '1:100.000', description: 'Escala cartografía IGAC' },
    'grafica_1_se_logra_identificar_que_todos_los_punto_1': { source: 'STATIC', staticValue: 'presentan niveles acordes', description: 'Hallazgo gráfica diurna' },
    'siendo_este_de_db_a_correspondiente_al_1': { source: 'STATIC', staticValue: 'sector', description: 'Continuación límite diurno' },
    'grafica_2_los_1': { source: 'STATIC', staticValue: 'puntos', description: 'Hallazgo gráfica nocturna' },
    'respecto_el_limite_maximo_permisible_para_el_horar_1': { source: 'STATIC', staticValue: 'de acuerdo con la clasificación del sector', description: 'Cumplimiento nocturno' },
    'en_la_jornada_diurna_los_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de puntos jornada diurna' },
    'puntos_de_monitoreo_con_respecto_al_limite_maximo__1': { source: 'STATIC', staticValue: '65', description: 'Límite jornada diurna (referencial)' },
    'con_respecto_al_limite_maximo_permisible_para_jorn_1': { source: 'STATIC', staticValue: 'Comercial', description: 'Sector de clasificación' },
    'se_presentan_las_descripciones_de_algunas_fuentes__1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización (fuentes de ruido)' },
    'anexo_6_hoja_de_calculo_incertidumbre_ruido_se_pre_1': { source: 'STATIC', staticValue: 'de acuerdo con la metodología de estimación de incertidumbre del laboratorio', description: 'Incertidumbre' },
    'en_la_jornada_diurna_el_1': { source: 'STATIC', staticValue: 'total de los puntos evaluados', description: 'Conclusión jornada diurna' },
    'fueron_clasificados_como_conformes_con_respecto_al_1': { source: 'STATIC', staticValue: 'clasificándose como conforme', description: 'Clasificación de conformidad' },
    'var_41': { source: 'STATIC', staticValue: '', description: 'Anexo 1' },
    'certificado_sonometro_1': { source: 'STATIC', staticValue: 'Ver Anexo 3', description: 'Certificado sonómetro' },
    'certificado_pistofono_1': { source: 'STATIC', staticValue: 'Ver Anexo 3', description: 'Certificado pistófono' },
    'hoja_de_calculo_ot_1': { source: 'OIT', field: 'oitNumber', description: 'Código OT hoja de cálculo' },
    '1_ubicacion_1': { source: 'STATIC', staticValue: '', description: 'Figura 1: continuacion del titulo Ubicacion...' },
    '2_mediciones_en_el_punto_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 2: nombre del punto (jornada nocturna)' },
    '3_mediciones_en_el_punto_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 4: nombre del punto (jornada nocturna)' },
    '4_descripcion_y_ubicacion_1': { source: 'STATIC', staticValue: '', description: 'Tabla 4: continuacion del titulo Descripcion y ubicacion...' },
    '4_se_muestra_la_rosa_de_los_vientos_presentando_ex_1': { source: 'STATIC', staticValue: '', description: 'Direccion predominante del viento (dato especifico, no determinable)' },
    '5_2_1_emision_de_ruido_1': { source: 'STATIC', staticValue: '', description: 'Encabezado 5.2.1: continuacion Emision de ruido - [sector]' },
    '5_mediciones_en_el_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 6: nombre del punto (jornada nocturna)' },
    'var_42': { source: 'STATIC', staticValue: '', description: 'Header de pagina (header1.xml): fragmento final tras los campos de numero de pagina' },
    'escenario2_causa_no_medicion_directa_65_06': { source: 'STATIC', staticValue: '', description: 'Escenario 2 (L90 corregido): razon por la que no fue posible detener/medir directamente la fuente -- sin dato de origen en el OIT, requiere revision humana antes de emitir' },
};
// ================================================================
// RUIDO AMBIENTAL (65-07) — delta sobre AGUA_FIELDS + ERRA_LEGACY_FIELDS
// ================================================================
const RUIDO_AMBIENTAL_DELTA_FIELDS = {
    'contrato_los_servicios_de_servicios_de_ingenieria__3': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM' },
    'las_mediciones_de_ruido_ambiental_se_llevaron_a_ca_1': { source: 'STATIC', staticValue: 'tres (3) puntos', description: 'Número de puntos monitoreados' },
    'el_monitoreo_se_realizo_en_horario_1': { source: 'STATIC', staticValue: 'diurno y nocturno, hábil y no hábil', description: 'Horarios de monitoreo' },
    'aron_a_cabo_mediciones_de_ruido_ambiental_1': { source: 'STATIC', staticValue: 'en tres (3) puntos', description: 'Puntos de medición ubicación' },
    'xxx_x_xxx_1': { source: 'STATIC', staticValue: 'puntos de monitoreo', description: 'Puntos seleccionados (protocolo)' },
    'y_para_los_puntos_punto_1': { source: 'OIT', field: 'oitNumber', description: 'ID Sonómetro / Serial (referencia OT)' },
    'las_isofonas_son_generadas_en_arcgis_modulo_arcmap_2': { source: 'STATIC', staticValue: 'interpolación de tipo IDW (Distancia Inversa Ponderada)', description: 'Método de interpolación isófonas' },
    'ambiental_para_la_fecha_y_hora_del_monitoreo_el_co_1': { source: 'STATIC', staticValue: 'condiciones meteorológicas fueron acordes a lo esperado para la temporada, sin afectaciones a la medición.', description: 'Comportamiento condiciones ambientales' },
    'tabla_8_se_observa_la_velocidad_del_viento_la_cual_1': { source: 'STATIC', staticValue: 'anemómetro', description: 'Instrumento medición viento' },
    'teniendo_en_cuenta_lo_establecido_en_el_po_psm_11__1': { source: 'STATIC', staticValue: 'meteorológica más cercana al área de estudio.', description: 'Estación meteorológica de referencia' },
    'realizo_la_descarga_de_los_registros_de_la_estacio_1': { source: 'STATIC', staticValue: 'Se realizó la descarga de los registros de la estación meteorológica correspondientes al periodo de monitoreo.', description: 'Descarga de registros meteorológicos' },
    'po_psm_11_procedimiento_de_mediciones_de_emision_d_1': { source: 'STATIC', staticValue: '.', description: 'Continuación referencia procedimiento PO-PSM-11' },
    'fuente_datos_abiertos_de_colombi_1': { source: 'DATE', field: 'year', description: 'Año fuente Datos Abiertos Colombia' },
    'se_tomo_como_normativa_de_referencia_el_articulo_1_1': { source: 'STATIC', staticValue: 'de clasificación del área conforme a la Resolución 0627 de 2006.', description: 'Normativa de referencia (sector)' },
    'el_articulo_17_establece_los_estandares_maximos_pe_1': { source: 'STATIC', staticValue: 'correspondiente al uso del suelo del área de estudio', description: 'Estándares máximos permisibles (sector)' },
    'grafica_1_se_logra_identificar_que_1': { source: 'STATIC', staticValue: 'todos los puntos de monitoreo', description: 'Hallazgo Gráfica 1 (diurno hábil)' },
    'se_logra_identificar_que_en_el_horario_diurno_habi_1': { source: 'STATIC', staticValue: 'presentaron niveles de presión sonora conformes', description: 'Cumplimiento diurno hábil' },
    'correspondiente_al_1': { source: 'STATIC', staticValue: 'sector evaluado', description: 'Sector correspondiente (límite diurno)' },
    'de_monitoreo_respecto_el_limite_maximo_permisible__1': { source: 'STATIC', staticValue: 'los puntos de monitoreo', description: 'Puntos evaluados (límite nocturno)' },
    'grafica_3_para_el_horario_diurno_no_habil_1': { source: 'STATIC', staticValue: 'se evidenció que los puntos de monitoreo', description: 'Hallazgo Gráfica 3 (diurno no hábil)' },
    'con_respecto_al_limite_aceptable_permisible_para_j_1': { source: 'STATIC', staticValue: 'el límite establecido para el sector', description: 'Continuación límite diurno no hábil' },
    'maximo_permisible_para_jornada_nocturna_establecid_1': { source: 'STATIC', staticValue: 'la Resolución 0627 de 2006', description: 'Norma límite nocturno' },
    'en_la_jornada_diurna_habil_y_no_habil_los_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de puntos jornada diurna' },
    'con_respecto_al_limite_maximo_permisible_para_jorn_2': { source: 'STATIC', staticValue: 'dB(A)', description: 'Unidad límite nocturno' },
    'en_la_jornada_diurna_habil_y_no_habil_el_1': { source: 'STATIC', staticValue: 'total de los puntos evaluados', description: 'Conclusión jornada diurna/nocturna' },
    'fueron_clasificados_como_conformes_con_respecto_al_2': { source: 'STATIC', staticValue: 'evaluado', description: 'Sector (conformidad diurna)' },
    'fueron_clasificados_como_conformes_con_respecto_al_3': { source: 'STATIC', staticValue: 'evaluado', description: 'Sector (conformidad nocturna)' },
    'mapas_de_ruido_isofonas_para_el_horario_diurno_hab_1': { source: 'STATIC', staticValue: 'horario diurno hábil', description: 'Horario mapas de isófonas' },
    'para_el_1': { source: 'STATIC', staticValue: 'área de estudio', description: 'Contexto mapas de isófonas' },
    'y_para_los_puntos_punto_y_punto_1': { source: 'STATIC', staticValue: 'evaluados en la jornada diurna hábil.', description: 'Cierre referencia puntos diurno hábil' },
    'ara_la_jornada_nocturna_habil_los_puntos_de_monito_1': { source: 'STATIC', staticValue: 'de colores correspondiente al rango de niveles de presión sonora registrado', description: 'Código de colores isófonas nocturno hábil' },
    'correspondiente_al_rango_de_1': { source: 'STATIC', staticValue: 'niveles de presión sonora', description: 'Rango dB(A) isófonas' },
    'db_a_para_el_punto_1': { source: 'OIT', field: 'oitNumber', description: 'Referencia punto de monitoreo (dB(A))' },
    'para_el_punto_1': { source: 'STATIC', staticValue: 'evaluado', description: 'Punto de monitoreo evaluado' },
    'db_a_para_los_puntos_1': { source: 'STATIC', staticValue: 'evaluados en jornada nocturna hábil.', description: 'Cierre referencia puntos nocturno hábil' },
    'diurno_no_habil_se_presento_que_los_puntos_de_1': { source: 'STATIC', staticValue: 'monitoreo', description: 'Puntos jornada diurna no hábil' },
    'se_posicionaron_en_el_rango_1': { source: 'STATIC', staticValue: 'de niveles de presión sonora conformes', description: 'Rango de conformidad (diurno no hábil)' },
    'se_posicionaron_en_el_rango_2': { source: 'STATIC', staticValue: 'establecido para el sector evaluado', description: 'Rango de conformidad (continuación)' },
    'lo_que_corresponde_a_los_1': { source: 'STATIC', staticValue: 'límites máximos permisibles definidos en la Resolución 0627 de 2006.', description: 'Cierre referencia límites (diurno no hábil)' },
    'para_el_horario_nocturno_no_habil_se_presento_que__1': { source: 'STATIC', staticValue: 'de monitoreo', description: 'Puntos jornada nocturna no hábil' },
    'se_posicionaron_en_el_rango_de_1': { source: 'STATIC', staticValue: 'niveles de presión sonora conformes', description: 'Rango de conformidad (nocturno no hábil)' },
    'el_analisis_realizado_para_los_mapas_de_ruido_isof_1': { source: 'STATIC', staticValue: '5 dB(A)', description: 'Intervalo de contornos de isófonas' },
    'var_39': { source: 'STATIC', staticValue: '', description: 'Anexo 1 (celda tabla anexos)' },
    'isofonas_1': { source: 'STATIC', staticValue: 'Ver Anexo 8', description: 'Referencia archivos de isófonas' },
    'var_40': { source: 'STATIC', staticValue: '', description: 'Continuación título portada' },
    '10_mediciones_en_el_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 10: nombre del punto (jornada nocturna dia habil)' },
    '2_mediciones_en_el_punto_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 2: nombre del punto (jornada nocturna dia habil)' },
    '5_2_1_ruido_ambiental_diurno_habil_1': { source: 'STATIC', staticValue: '', description: 'Encabezado 5.2.1: continuacion Ruido ambiental diurno habil - [sector]' },
    '5_2_2_ruido_ambiental_nocturno_habil_1': { source: 'STATIC', staticValue: '', description: 'Encabezado 5.2.2: continuacion Ruido ambiental nocturno habil - [sector]' },
    '5_descripcion_y_ubicacion_1': { source: 'STATIC', staticValue: '', description: 'Tabla 5: continuacion del titulo Descripcion y ubicacion...' },
    '5_mediciones_en_el_punto_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 6: nombre del punto (jornada nocturna dia habil)' },
    '5_se_muestra_la_rosa_de_los_vientos_presentando_ex_1': { source: 'STATIC', staticValue: '', description: 'Direccion predominante del viento (dato especifico, no determinable)' },
    '9_mediciones_en_el_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 9: nombre del punto (jornada diurna dia habil)' },
    'anexo_6_hoja_de_calculo_incertidumbre_ruido_se_pre_1': { source: 'STATIC', staticValue: 'de acuerdo con la metodologia de estimacion de incertidumbre del laboratorio', description: 'Metodologia de incertidumbre (Anexo 6)' },
    'certificado_pistofono_1': { source: 'STATIC', staticValue: 'Ver Anexo 3', description: 'Certificado pistofono' },
    'certificado_sonometro_1': { source: 'STATIC', staticValue: 'Ver Anexo 3', description: 'Certificado sonometro' },
    'con_respecto_al_limite_maximo_permisible_para_jorn_1': { source: 'STATIC', staticValue: '', description: 'Valor numerico del limite maximo permisible jornada diurna dB(A) (dato especifico del sector, no determinable)' },
    'de_acuerdo_con_lo_establecido_en_la_resolucion_062_1': { source: 'STATIC', staticValue: 'anemometro', description: 'Instrumento medicion del viento (Articulo 20, Resolucion 0627 de 2006)' },
    'de_monitoreo_ubicados_en_el_area_de_estudio_de_la__1': { source: 'AI', field: 'cliente', description: 'Compania del area de estudio' },
    'fuente_manual_del_equipo_1': { source: 'DATE', field: 'year', description: 'Anyo fuente manual del equipo (Figura 2)' },
    'fuente_tomado_y_modificado_de_cartografia_basica_i_1': { source: 'STATIC', staticValue: '1:100.000', description: 'Escala cartografia IGAC (Figura 6)' },
    'fueron_clasificados_como_conformes_con_respecto_al_1': { source: 'STATIC', staticValue: '', description: 'Valor numerico del limite maximo permisible jornada diurna dB(A) (dato especifico del sector, no determinable)' },
    'grafica_2_los_1': { source: 'STATIC', staticValue: 'puntos', description: 'Grafica 2: bridge word (los [puntos] de monitoreo)' },
    'hoja_de_calculo_ot_1': { source: 'OIT', field: 'oitNumber', description: 'Codigo OT hoja de calculo incertidumbre' },
    'relacionar_equipo_empleado_1': { source: 'STATIC', staticValue: 'Se verifico el correcto funcionamiento del equipo', description: 'Verificacion del equipo (medicion de viento)' },
    'respecto_el_limite_maximo_permisible_para_el_horar_1': { source: 'STATIC', staticValue: '', description: 'Valor numerico del limite maximo permisible jornada nocturna dB(A) (dato especifico del sector, no determinable)' },
    'siguiendo_lo_establecido_en_el_articulo_5_de_la_re_1': { source: 'STATIC', staticValue: '15 minutos de captura de informacion', description: 'Duracion minima de medicion (Articulo 5, Resolucion 627 de 2006)' },
    'y_areas_importantes_para_la_conservacion_de_las_av_1': { source: 'STATIC', staticValue: '1:100.000', description: 'Escala cartografia IGAC (Figura 6, segundo fragmento)' },
};
exports.EMISION_RUIDO_CONFIG = {
    templateType: 'EMISION_RUIDO',
    displayName: 'Estudio de Emisión de Ruido',
    filePattern: 'FO-PO-PSM-65-06',
    fields: Object.assign(Object.assign(Object.assign({}, AGUA_FIELDS), ERRA_LEGACY_FIELDS), EMISION_RUIDO_DELTA_FIELDS)
};
// RUIDO AMBIENTAL (65-07)
exports.RUIDO_AMBIENTAL_CONFIG = {
    templateType: 'RUIDO_AMBIENTAL',
    displayName: 'Estudio de Ruido Ambiental',
    filePattern: 'FO-PO-PSM-65-07',
    fields: Object.assign(Object.assign(Object.assign({}, AGUA_FIELDS), ERRA_LEGACY_FIELDS), RUIDO_AMBIENTAL_DELTA_FIELDS)
};
// RUIDO INTRADOMICILIARIO (65-08)
// ================================================================
// RUIDO INTRADOMICILIARIO (65-08) — delta sobre AGUA_FIELDS + ERRA_LEGACY_FIELDS
// ================================================================
const RUIDO_INTRADOMICILIARIO_DELTA_FIELDS = {
    'monitoreo_de_ruido_intradomiciliario_realizado_el__1': { source: 'DATE', field: 'day', description: 'Día de monitoreo (portada)' },
    'monitoreo_de_ruido_intradomiciliario_realizado_el__2': { source: 'DATE', field: 'month', description: 'Mes de monitoreo (portada)' },
    'de_de_1': { source: 'DATE', field: 'year', description: 'Año de monitoreo (portada)' },
    'de_de_2': { source: 'AI', field: 'cliente', description: 'Cliente (portada)' },
    'serambiente_s_a_s_para_desarrollar_un_monitoreo_de_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización del monitoreo (introducción)' },
    'serambiente_s_a_s_es_una_empresa_acreditada_por_el_1': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM' },
    'las_mediciones_de_ruido_intradomiciliario_se_lleva_1': { source: 'STATIC', staticValue: 'tres (3) puntos', description: 'Número de puntos monitoreados' },
    'mediciones_de_ruido_intradomiciliario_se_llevaron__1': { source: 'STATIC', staticValue: '', description: 'Continuación número de puntos' },
    'para_ello_se_tuvo_en_cuenta_los_criterios_establec_1': { source: 'STATIC', staticValue: '', description: 'Continuación referencia normativa jornada' },
    'el_monitoreo_se_realizo_en_1': { source: 'STATIC', staticValue: 'horario diurno y nocturno', description: 'Horario de monitoreo' },
    '1_hora_de_inicio_y_finalizacion_1': { source: 'STATIC', staticValue: 'Jornada diurna', description: 'Título tabla hora inicio/fin (1)' },
    'hora_de_inicio_y_finalizacion_1': { source: 'STATIC', staticValue: '', description: 'Continuación título tabla hora inicio/fin' },
    '2_hora_de_inicio_y_finalizacion_1': { source: 'STATIC', staticValue: 'Jornada nocturna', description: 'Título tabla hora inicio/fin (2)' },
    'serambiente_s_a_s_es_una_empresa_acreditada_por_el_2': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM (metodología)' },
    'la_metodologia_de_medicion_de_ruido_intradomicilia_1': { source: 'STATIC', staticValue: ' de la Resolución 0627 de 2006.', description: 'Continuación referencia normativa metodología' },
    'se_llevaron_a_cabo_mediciones_de_ruido_intradomici_1': { source: 'STATIC', staticValue: 'tres (3) puntos', description: 'Puntos de medición (ubicación)' },
    'los_cuales_se_encuentran_ubicados_en_el_area_de_es_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Área de estudio (ubicación)' },
    'estas_mediciones_se_realizaron_siguiendo_lo_establ_1': { source: 'STATIC', staticValue: 'El equipo se ubicó a una altura entre 1,2 m y 1,5 m sobre el nivel del piso, siguiendo lo establecido en la normativa vigente.', description: 'Metodología de ubicación del equipo' },
    'var_58': { source: 'STATIC', staticValue: '', description: 'Georreferenciación WGS84 Norte' },
    'var_59': { source: 'STATIC', staticValue: '', description: 'Georreferenciación WGS84 Oeste' },
    'var_62': { source: 'STATIC', staticValue: '', description: 'Georreferenciación Magna Sirgas Norte' },
    'var_63': { source: 'STATIC', staticValue: '', description: 'Georreferenciación Magna Sirgas Este' },
    'equipo_utilizado_para_la_medicion_fue_un_sonometro_1': { source: 'STATIC', staticValue: 'clase 1, calibrado conforme a los certificados vigentes.', description: 'Descripción del equipo de medición' },
    'var_65': { source: 'STATIC', staticValue: '', description: 'Ficha técnica de equipo (1)' },
    'var_66': { source: 'STATIC', staticValue: '', description: 'Ficha técnica de equipo (2)' },
    'var_67': { source: 'STATIC', staticValue: '', description: 'Ficha técnica de equipo (3)' },
    'se_tuvo_en_cuenta_lo_estipulado_por_la_resolucion__1': { source: 'STATIC', staticValue: ' el número y ubicación de los puntos de monitoreo,', description: 'Continuación selección de puntos' },
    'inicialmente_se_hizo_un_recorrido_de_reconocimient_1': { source: 'STATIC', staticValue: ' a la altura solicitada.', description: 'Ajuste de altura de equipos' },
    'inicialmente_se_hizo_un_recorrido_de_reconocimient_2': { source: 'STATIC', staticValue: 'Inicialmente se hizo un recorrido de reconocimiento del área de estudio.', description: 'Recorrido de reconocimiento previo' },
    'var_69': { source: 'STATIC', staticValue: 'X', description: 'Cumple calibración (SI/NO)' },
    'var_71': { source: 'STATIC', staticValue: '', description: 'Datos de calibración nocturna' },
    'para_la_fecha_y_hora_del_monitoreo_el_comportamien_1': { source: 'STATIC', staticValue: '', description: 'Continuación comportamiento operacional' },
    'l_monitoreo_el_comportamiento_de_las_operaciones_d_1': { source: 'STATIC', staticValue: 'sin condiciones atípicas identificadas.', description: 'Cierre comportamiento operacional' },
    '8_se_observa_la_velocidad_del_viento_la_cual_fue_m_1': { source: 'STATIC', staticValue: 'anemómetro', description: 'Instrumento medición viento' },
    'var_72': { source: 'STATIC', staticValue: '', description: 'Datos meteorológicos (1)' },
    'var_73': { source: 'STATIC', staticValue: '', description: 'Datos meteorológicos (2)' },
    'var_74': { source: 'STATIC', staticValue: '', description: 'Datos meteorológicos (3)' },
    'var_75': { source: 'STATIC', staticValue: '', description: 'Datos meteorológicos (4)' },
    'var_76': { source: 'STATIC', staticValue: '', description: 'Datos meteorológicos (5)' },
    'var_77': { source: 'STATIC', staticValue: '', description: 'Datos meteorológicos (6)' },
    'var_78': { source: 'STATIC', staticValue: '', description: 'Datos meteorológicos (7)' },
    '3_se_muestra_la_rosa_de_los_vientos_presentando_ex_1': { source: 'STATIC', staticValue: 'noreste', description: 'Dirección predominante del viento' },
    'var_83': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (1)' },
    'var_84': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (2)' },
    'var_85': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (3)' },
    'var_81': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (4)' },
    'var_82': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (5)' },
    'var_86': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (6)' },
    'var_87': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (7)' },
    'var_88': { source: 'STATIC', staticValue: '', description: 'Tabla naturaleza del terreno (8)' },
    'punto_1_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Descripción Punto 1' },
    'var_89': { source: 'STATIC', staticValue: '', description: 'Receptores de interés (1)' },
    'var_90': { source: 'STATIC', staticValue: '', description: 'Receptores de interés (2)' },
    'var_91': { source: 'STATIC', staticValue: '', description: 'Receptores de interés (3)' },
    'var_92': { source: 'STATIC', staticValue: '55', description: 'Zona II comercial diurno (Res. 8321/1983)' },
    'var_93': { source: 'STATIC', staticValue: '45', description: 'Zona II comercial nocturno (Res. 8321/1983)' },
    'var_94': { source: 'STATIC', staticValue: '', description: 'Continuación tabla zonas de ruido' },
    'var_42': { source: 'STATIC', staticValue: '', description: 'Análisis de resultados (1)' },
    'var_43': { source: 'STATIC', staticValue: '', description: 'Análisis de resultados (2)' },
    'var_44': { source: 'STATIC', staticValue: '', description: 'Análisis de resultados (3)' },
    'var_45': { source: 'STATIC', staticValue: '', description: 'Análisis de resultados (4)' },
    'var_46': { source: 'STATIC', staticValue: '', description: 'Análisis de resultados (5)' },
    'var_47': { source: 'STATIC', staticValue: '', description: 'Análisis de resultados (6)' },
    'var_48': { source: 'STATIC', staticValue: '', description: 'Cálculos aplicados (memoria)' },
    'var_49': { source: 'STATIC', staticValue: '', description: 'Memoria de cálculo (1)' },
    'var_50': { source: 'STATIC', staticValue: '', description: 'Memoria de cálculo (2)' },
    'de_estudio_de_la_organizacion_la_cual_se_localiza_1': { source: 'AI', field: 'ubicacion.direccion', description: 'Localización de la organización (fuentes de ruido)' },
    'en_el_1': { source: 'STATIC', staticValue: 'Anexo 6', description: 'Referencia anexo incertidumbre' },
    'se_presenta_las_incertidumbres_de_los_resultados_a_1': { source: 'STATIC', staticValue: 'de acuerdo con la metodología de estimación de incertidumbre del laboratorio', description: 'Metodología de incertidumbre' },
    'las_mediciones_de_ruido_intradomiciliario_realizad_1': { source: 'DATE', field: 'fullDate', description: 'Fecha de mediciones (conclusiones)' },
    'en_el_area_de_estudio_de_la_compa_ia_1': { source: 'AI', field: 'cliente', description: 'Compañía (conclusiones)' },
    'en_el_area_de_estudio_de_la_compa_ia_la_cual_se_lo_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización compañía (conclusiones)' },
    'var_52': { source: 'STATIC', staticValue: '', description: 'Conclusiones (1)' },
    'var_53': { source: 'STATIC', staticValue: '', description: 'Conclusiones (2)' },
    'var_54': { source: 'STATIC', staticValue: '', description: 'Conclusiones (3)' },
    'var_55': { source: 'STATIC', staticValue: '', description: 'Conclusiones (4)' },
    'var_56': { source: 'STATIC', staticValue: '', description: 'Conclusiones (5)' },
    'var_57': { source: 'STATIC', staticValue: '', description: 'Nota final del informe' },
    'var_95': { source: 'STATIC', staticValue: '', description: 'Continuación título portada' },
    'cabe_se_alar_que_la_jornada_de_monitoreo_se_ejecut_1': { source: 'DATE', field: 'fullDate', description: 'Fecha en que se ejecuto la jornada de monitoreo' },
    'certificado_sonometro_1': { source: 'STATIC', staticValue: 'Ver Anexo 3', description: 'Certificado sonometro' },
    'de_monitoreo_ubicados_en_el_area_de_estudio_de_la__1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localizacion de la companyia (area de estudio)' },
    'en_el_formato_de_campo_planilla_de_campo_emision_d_1': { source: 'STATIC', staticValue: '', description: 'Cierre de oracion (referencia formato de campo)' },
    'fuente_manual_del_equipo_1': { source: 'DATE', field: 'year', description: 'Anyo fuente manual del equipo' },
    'hoja_de_calculo_ot_1': { source: 'OIT', field: 'oitNumber', description: 'Codigo OT hoja de calculo incertidumbre' },
    'po_psm_11_procedimiento_de_mediciones_de_emision_d_1': { source: 'STATIC', staticValue: '', description: 'Cierre de oracion referencia PO-PSM-11' },
    'siguiendo_lo_establecido_en_el_articulo_5_de_la_re_1': { source: 'STATIC', staticValue: '15 minutos de captura de informacion', description: 'Duracion minima de medicion (Articulo 5, Resolucion 627 de 2006)' },
    'var_39': { source: 'STATIC', staticValue: '', description: 'Tabla ruido intradomiciliario nocturna: celda fila' },
    'var_40': { source: 'STATIC', staticValue: '', description: 'Tabla ruido intradomiciliario nocturna: celda fila 2' },
    'var_41': { source: 'STATIC', staticValue: '', description: 'Tabla ruido intradomiciliario nocturna: celda fila 3' },
};
exports.RUIDO_INTRADOMICILIARIO_CONFIG = {
    templateType: 'RUIDO_INTRADOMICILIARIO',
    displayName: 'Estudio de Ruido Intradomiciliario',
    filePattern: 'FO-PO-PSM-65-08',
    fields: Object.assign(Object.assign(Object.assign({}, AGUA_FIELDS), ERRA_LEGACY_FIELDS), RUIDO_INTRADOMICILIARIO_DELTA_FIELDS)
};
// EMISIÓN DE RUIDO Y RUIDO AMBIENTAL (65-09)
const EMISION_RUIDO_AMBIENTAL_DELTA_FIELDS = {
    '10_se_observa_la_velocidad_del_viento_la_cual_fue__1': { source: 'STATIC', staticValue: 'anemometro', description: 'Instrumento medicion del viento (Tabla 10)' },
    '2_hora_de_inicio_y_finalizacion_1': { source: 'STATIC', staticValue: '', description: 'Tabla 2: continuacion del titulo Hora de Inicio y finalizacion' },
    '2_mediciones_en_el_punto_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Fotografia 2: nombre del punto (jornada nocturna)' },
    '3_hora_de_inicio_y_1': { source: 'STATIC', staticValue: '', description: 'Tabla 3: continuacion del titulo Hora de Inicio y finalizacion' },
    '5_2_1_emision_de_ruido_diurno_sector_1': { source: 'STATIC', staticValue: '', description: 'Encabezado 5.2.1: continuacion Emision de ruido diurno - Sector [nombre]' },
    '6_rosa_de_viento_1': { source: 'STATIC', staticValue: 'consolidada', description: 'Tipo de rosa de vientos (Figura 6)' },
    '6_se_muestra_la_rosa_de_los_vientos_presentando_ex_1': { source: 'STATIC', staticValue: '', description: 'Direccion predominante del viento (dato especifico, no determinable)' },
    'var_62': { source: 'STATIC', staticValue: '', description: 'Header de pagina (header1.xml): fragmento final tras los campos de numero de pagina' },
    'escenario2_causa_no_medicion_directa_65_09': { source: 'STATIC', staticValue: '', description: 'Escenario 2 (L90 corregido): razon por la que no fue posible detener/medir directamente la fuente -- sin dato de origen en el OIT, requiere revision humana antes de emitir' },
};
exports.EMISION_RUIDO_AMBIENTAL_CONFIG = {
    templateType: 'EMISION_RUIDO_AMBIENTAL',
    displayName: 'Estudio de Emisión de Ruido y Ruido Ambiental',
    filePattern: 'FO-PO-PSM-65-09',
    fields: Object.assign(Object.assign(Object.assign({}, AGUA_FIELDS), ERRA_LEGACY_FIELDS), EMISION_RUIDO_AMBIENTAL_DELTA_FIELDS)
};
// ================================================================
// CALIDAD DE AIRE (66-18) — mapeo completo, plantilla legacy. El config
// anterior reutilizaba literalmente `{ ...AGUA_FIELDS }` sin ningun campo
// propio (114 tags unicos en el documento, 90 sin mapeo real). El docx de
// produccion YA tenia los placeholders convertidos a tags {tag} (trabajo
// previo de tageado legacy, estilo frase-completa igual que OLORES/
// PARTICULAS_VIABLES) -- lo que faltaba era escribir el diccionario de
// mapeo, no re-tagear el .docx.
//
// CIRUGIA DE TAGS DUPLICADOS (2026-08-19, resuelta): las tablas 1, 2, 3, 4,
// 13, 15 y 16 usaban el MISMO nombre de tag generico (var_21..var_24,
// var_27/28/31, var_32/34/51, var_53..var_73, y var_22 tambien en las
// tablas 15/16 de resultados) repetido docenas de veces en celdas
// estructuralmente distintas -- ej. var_22 aparecia 24 veces: como
// "Georreferenciacion"/cota, marca/modelo equipo PM10, PM2.5, parametros
// muestreados, altura de andamios, distancia a fuentes de energia, y
// celdas de resultados por estacion en las tablas 15/16 -- todas celdas
// DIFERENTES colapsadas por docxtemplater a un unico valor. Se hizo
// cirugia real del .docx (PizZip + reemplazo posicional verificado nodo
// por nodo contra el XML real, mismo metodo que analyze_template_precise.js
// / apply_plan_by_index.js) renombrando las 147 ocurrencias duplicadas a
// 147 tags unicos (ver git log "fix(reports): cirugia de tags duplicados
// en Calidad de Aire (66-18)"). var_16..var_20 (Tabla 1) NO se tocaron: ya
// eran unicos (una ocurrencia cada uno), el defecto real ahi es que la
// celda de VALOR (columna 2) esta vacia y el tag esta en la celda de
// ETIQUETA (columna 1, texto blanco/negrilla) -- ambiguo sin el informe de
// referencia de Xiomara, se deja documentado para revision humana.
//
// La lista de estaciones de la portada (var_3, cantidad variable) se
// convirtio a loop real de docxtemplater: {#puntos_monitoreo}{nombre}
// {/puntos_monitoreo} -- mismo patron ya probado en produccion en 64-11
// (Suelos) y 74-01 (Biota); el array 'puntos_monitoreo' ya lo construye
// TemplateDataMapper.generateData() para TODAS las plantillas, sin cambios
// adicionales en templateDataMapper.ts. var_4 (parrafo de portada NO
// relacionado con la lista de estaciones -- ocurrencia unica) no se tocó.
//
// Con la colision de tags resuelta, el CONTENIDO de muchas celdas sigue
// STATIC vacio: son datos que genuinamente no existen en el modelo de
// datos actual (cota en msnm, marca/modelo de equipos, fechas y IDs de
// cada una de las 18 filas de muestras, limites normativos exactos de la
// Resolucion 2254 de 2017, resultados de laboratorio por estacion). No se
// inventa contenido -- mismo criterio para fragmentos narrativos donde el
// texto exacto original no se puede determinar con certeza (listas de
// contaminantes, resultados estadisticos especificos).
//
// INFORME DE REFERENCIA REAL (2026-08-19, procesado): Xiomara (Serambiente)
// compartio un informe 66-18 real, ya diligenciado y entregado a un cliente
// (DESARROLLO SERAMBIENTE S.A.S., estaciones "Vientos arriba"/"Vientos abajo",
// Galapa, Atlantico -- server/uploads/referencia-calidad-aire/). Se uso para
// llenar: (a) boilerplate genuinamente fijo -- panel de contaminantes
// (PM10/PM2.5/NO2/SO2/CO/O3), texto normativo de la Res. 2254/2017 (incluida
// la Tabla 13 completa con limites y tiempos de exposicion exactos, verificados
// fila por fila), texto metodologico de incertidumbre, observacion estandar de
// ficha tecnica, etiquetas de la Tabla 1; (b) campos AI nuevos -- se agrego
// 'cota', 'marcaModeloPM10', 'marcaModeloPM25', 'parametrosMuestreados',
// 'alturaAndamios' y 'distanciaFuentesEnergia' al esquema de extraccion de IA
// (ai.service.ts) y a ParsedAIData (templateDataMapper.ts) porque el informe de
// referencia confirmo que son datos genuinamente variables POR ESTACION (ej.
// GRIMM-011 vs GRIMM-003), no fijos -- mapear esto como STATIC habria repetido
// el dato de ESTE cliente en el informe de OTRO. Los metodos de referencia
// EPA para PM10/PM2.5 (Alto/Bajo Volumen, manual) siguen sin resolver: el
// informe de referencia uso un metodo automatico distinto (GRIMM/EN16450) para
// esos dos parametros, un escenario que la plantilla no representa. RESUELTO
// 2026-08-19: el tag 'se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1' era
// una colision real (se repetia x5 con valores distintos); cirugia PizZip por
// indice de nodo separo las 4 ocurrencias automaticas (SO2/NO2/CO/O3) en tags
// unicos nuevos (metodo_referencia_so2/no2/co/o3); la ocurrencia de PM2.5
// (manual) se dejo con el tag original, vacia (mismo motivo que PM10, sin
// codigo manual real en la fuente). Los datos de resultados de laboratorio, fechas/IDs de muestras y
// fuentes de emision especificas de Galapa siguen STATIC vacios -- son
// genuinamente variables por cliente/ubicacion, no se copian del ejemplo.
// ================================================================
const CALIDAD_AIRE_LEGACY_FIELDS = {
    // --- PORTADA ---
    'var_74': { source: 'STATIC', staticValue: '', description: 'Header de pagina (header2.xml): fragmento final tras los campos de numero de pagina, sin contenido esperado' },
    'e_por_1': { source: 'STATIC', staticValue: 'PARTÍCULAS MENORES A 10 (PM10) Y 2.5 MICRAS (PM2.5), DIÓXIDO DE NITRÓGENO (NO2), DIÓXIDO DE AZUFRE (SO2), MONÓXIDO DE CARBONO (CO) Y OZONO (O3)', description: 'Panel de contaminantes en el título (portada, fijo -- coincide con el documento fuente)' },
    'var_1': { source: 'AI', field: 'cliente', description: 'Nombre del cliente (portada, primer fragmento "NOMBRE CLIENTE" partido en 2 runs)' },
    'var_2': { source: 'STATIC', staticValue: '', description: 'Vacío: completa la concatenación con var_1 (runs partidos del mismo placeholder "NOMBRE CLIENTE")' },
    'monitoreo_de_calidad_del_aire_ejecutado_entre_el_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo de ejecución del monitoreo (portada)' },
    'chart_indices': { source: 'STATIC', staticValue: '', description: 'Placeholder de gráfico (índice de tablas)' },
    'tag_fecha_monitoreo': { source: 'DATE', field: 'fullDate', description: 'Fecha de monitoreo (Tabla 4, índice de tablas)' },
    // 'var_3' se reemplazo por el loop '{#puntos_monitoreo}{nombre}{/puntos_monitoreo}' -- no requiere entrada en el diccionario (igual que en 64-11/74-01).
    'var_4': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Párrafo de portada tras la lista de estaciones -- confirmado con el informe de referencia real (Xiomara/Serambiente): es el municipio+departamento del monitoreo en mayúsculas (ej. "GALAPA, ATLÁNTICO", centrado en la portada antes del salto a la tabla de contenido)' },
    // --- INTRODUCCIÓN ---
    'contrato_los_servicios_de_serambiente_s_a_s_para_r_1': { source: 'AI', field: 'cliente', description: 'Cliente que contrata el servicio' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_r_2': { source: 'AI', field: 'cliente', description: 'Organización del área de estudio' },
    'del_localizado_en_1': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad del área de estudio' },
    'localizado_en_departamento_de_1': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento del área de estudio' },
    'a_fin_de_dar_cumplimiento_a_los_requerimientos_de__1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de estaciones seleccionadas (numeral)' },
    'estaciones_en_sitios_representativos_de_la_direcci_1': { source: 'STATIC', staticValue: 'determinador de Partículas respirables menores a 10 y 2.5 micras (PM10 y PM2.5), un equipo determinador de Dióxido de Azufre (SO2), un equipo determinador de Monóxido de Carbono (CO), un equipo determinador de Dióxido de Nitrógeno (NO2) y un equipo determinador de Ozono (O3)', description: 'Descripción del muestreador ubicado en cada estación -- confirmado con el informe de referencia real: panel FIJO de equipos (PM10/PM2.5, SO2, CO, NO2, O3), igual en todo informe 66-18 ya que el panel de contaminantes del formato es fijo (coincide con e_por_1)' },
    'el_presente_documento_de_caracter_tecnico_contiene_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo de monitoreo comprendido (resumen del documento)' },
    'de_noviembre_de_2017_del_ministerio_de_ambiente_y__1': { source: 'STATIC', staticValue: '', description: 'Artefacto de salto de párrafo antes de "OBJETIVOS"' },
    // --- OBJETIVOS ---
    'realizar_la_evaluacion_de_la_calidad_de_aire_en_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de estaciones evaluadas (objetivo general + objetivo específico, mismo tag x2)' },
    'estaciones_ubicadas_en_el_area_de_estudio_del_1': { source: 'AI', field: 'cliente', description: 'Organización del área de estudio (objetivo general)' },
    'estaciones_ubicadas_en_el_area_de_estudio_del_loca_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización del área de estudio (objetivo general)' },
    'determinar_los_niveles_de_inmision_de_los_contamin_1': { source: 'STATIC', staticValue: 'por partículas menores a 10 (PM10) y 2.5 micras (PM2.5), Dióxido de Nitrógeno (NO2), Dióxido de Azufre (SO2), Monóxido de carbono (CO) y Ozono (O3)', description: 'Lista de contaminantes evaluados (objetivo específico) -- confirmado con el informe de referencia real, panel fijo (coincide con e_por_1)' },
    // --- INFORMACIÓN DE LA EMPRESA ---
    'tag_correo_valor': { source: 'AI', field: 'otrosDatos.correo', description: 'Correo de contacto ambiental (nodo repetido: razón social + correo)' },
    'tag_representante': { source: 'AI', field: 'otrosDatos.representante', description: 'Nombre del representante / cliente' },
    'tag_telefono_valor': { source: 'AI', field: 'otrosDatos.telefono', description: 'Teléfono de contacto' },
    'tag_direccion': { source: 'AI', field: 'ubicacion.direccion', description: 'Dirección de la sede del cliente' },
    'tag_departamento': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento donde se ejecutó el monitoreo' },
    'tag_ciudad': { source: 'AI', field: 'ubicacion.ciudad', description: 'Municipio donde se ejecutó el monitoreo' },
    'tag_actividad_economica': { source: 'AI', field: 'otrosDatos.actividadEconomica', description: 'Actividad económica del cliente' },
    // --- EMPRESA RESPONSABLE / EVALUACIÓN DE LA CALIDAD DEL AIRE ---
    'las_mediciones_toma_de_muestra_y_analisis_de_1': { source: 'STATIC', staticValue: 'partículas menores a 10 (PM10) y 2.5 micras (PM2.5), Dióxido de Nitrógeno (NO2), Dióxido de Azufre (SO2), Monóxido de carbono (CO) y Ozono (O3)', description: 'Lista de contaminantes (empresa responsable del estudio) -- confirmado con el informe de referencia real, panel fijo (coincide con e_por_1)' },
    'fue_realizada_por_servicios_de_ingenieria_y_ambien_1': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Resolución de acreditación IDEAM' },
    'para_determinar_los_niveles_de_calidad_de_aire_de_1': { source: 'STATIC', staticValue: 'tres (3) estaciones', description: 'Número de estaciones de monitoreo (evaluación calidad del aire)' },
    'de_de_monitoreo_ubicadas_en_el_area_de_estudio_del_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización del área de estudio (evaluación calidad del aire)' },
    // --- MÉTODOS DE REFERENCIA (cierres de oración, artefactos de formato) ---
    // Revisado contra el docx real: el tag PM10 (t_1/t_2) cierra la frase "...Apéndice J:
    // Alto Volumen." (método MANUAL/gravimétrico). El informe de referencia real de Xiomara
    // usó un método totalmente distinto para PM10/PM2.5 (equipo automático GRIMM EDM 180C,
    // dispersión láser EN16450:2017, SIN muestras físicas) -- no aplica el método manual que
    // asume la plantilla, por lo que el informe de referencia NO sirve para llenar este cierre
    // sin inventar un código de referencia manual (RFPS-...) que no existe en la fuente. Se deja vacío.
    'se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_1': { source: 'STATIC', staticValue: '', description: 'Cierre de oración método PM10 (Alto Volumen, método MANUAL) -- el informe de referencia real usó un método automático distinto (GRIMM/EN16450) para PM10, no aplica; no se inventa el código de referencia manual' },
    'se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_2': { source: 'STATIC', staticValue: '', description: 'Cierre de oración método PM10 (referencia manual) -- mismo caso que el anterior, método no representado en el informe de referencia' },
    // RESUELTO 2026-08-19: este tag se repetía 5 veces en el docx (cierre PM2.5 manual +
    // SO2/NO2/CO/O3 automático) -- colisión real de tags (mismo patrón que var_21..var_73
    // documentado arriba). Cirugía PizZip por índice de nodo (verificación posicional exacta
    // contra el XML real, mismo método usado el 2026-08-19 en la cirugía de duplicados)
    // separó las 4 ocurrencias automáticas (SO2/NO2/CO/O3) en tags únicos nuevos, ver abajo.
    // La ocurrencia de PM2.5 (método MANUAL, Apéndice L Bajo Volumen) se dejó CON ESTE MISMO
    // tag/nombre original y sigue vacía: el informe de referencia usó un método automático
    // distinto (GRIMM/EN16450) para PM2.5, igual que para PM10 arriba -- no existe un código
    // de referencia manual real en la fuente para no inventarlo.
    'se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1': { source: 'STATIC', staticValue: '', description: 'Cierre de oración método PM2.5 (Bajo Volumen, método MANUAL) -- el informe de referencia real usó un método automático distinto (GRIMM/EN16450) para PM2.5, no aplica; no se inventa el código de referencia manual. Las otras 4 ocurrencias que compartían este tag (SO2/NO2/CO/O3) se separaron en tags únicos -- ver metodo_referencia_so2/no2/co/o3' },
    'metodo_referencia_so2': { source: 'STATIC', staticValue: 'RFSA-1219-255', description: 'Cierre de oración método SO2 (US EPA CFR Título 40, Cap. I, Subcap. C, Parte 50, Apéndice A-1, Fluorescencia Ultravioleta, método de referencia automático) -- separado del tag colisionado se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1 el 2026-08-19; código confirmado por el informe de referencia real (Xiomara/Serambiente)' },
    'metodo_referencia_no2': { source: 'STATIC', staticValue: 'RFNA-0819-254', description: 'Cierre de oración método NO2 (US EPA CFR Título 40, Cap. I, Subcap. C, Parte 50, Apéndice F, Quimioluminiscencia Fase Gaseosa, método de referencia automático) -- separado del tag colisionado se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1 el 2026-08-19; código confirmado por el informe de referencia real (Xiomara/Serambiente)' },
    'metodo_referencia_co': { source: 'STATIC', staticValue: 'RFCA-0419-252', description: 'Cierre de oración método CO (US EPA CFR Título 40, Cap. I, Subcap. C, Parte 50, Apéndice C, Infrarrojo No Dispersivo, método de referencia automático) -- separado del tag colisionado se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1 el 2026-08-19; código confirmado por el informe de referencia real (Xiomara/Serambiente)' },
    'metodo_referencia_o3': { source: 'STATIC', staticValue: 'EQOA-0719-253', description: 'Cierre de oración método O3 (US EPA CFR Título 40, Cap. I, Subcap. C, Parte 50, Apéndice D, Quimioluminiscencia, método de referencia automático) -- separado del tag colisionado se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1 el 2026-08-19; código confirmado por el informe de referencia real (Xiomara/Serambiente)' },
    // --- TABLA 1: RESUMEN DE DETALLES DEL MUESTREO (fila única, no repetible; NO son
    // duplicados -- cada var_16..var_20 ocurre una sola vez. La celda de VALOR (columna 2,
    // junto a cada etiqueta) esta vacia y SIN NINGÚN tag en el .docx (verificado en el XML
    // crudo: <w:p></w:p> vacío, sin <w:r>) -- no se puede inyectar el dato real sin agregar un
    // tag nuevo ahí (cirugía de docx, fuera de alcance de un cambio de solo diccionario). El
    // informe de referencia SÍ confirma qué son las 5 filas (Tabla 1: Fecha de muestreo / Sitio
    // de muestreo / Duración del muestreo / Número total de muestras / Parámetros estudiados) --
    // esas etiquetas SÍ son fijas (estructura de tabla estándar de Serambiente, no dependen del
    // cliente) y se llenan aquí; el VALOR de cada fila sigue sin poder mostrarse hasta que se
    // agregue el tag faltante en la celda vecina. ---
    'var_16': { source: 'STATIC', staticValue: 'Fecha de muestreo', description: 'Tabla 1: resumen de detalles del muestreo (fila 1, etiqueta -- confirmado con el informe de referencia real; la celda de valor vecina sigue vacía, sin tag en el .docx)' },
    'var_17': { source: 'STATIC', staticValue: 'Sitio de muestreo', description: 'Tabla 1: resumen de detalles del muestreo (fila 2, etiqueta -- confirmado con el informe de referencia real; la celda de valor vecina sigue vacía, sin tag en el .docx)' },
    'var_18': { source: 'STATIC', staticValue: 'Duración del muestreo', description: 'Tabla 1: resumen de detalles del muestreo (fila 3, etiqueta -- confirmado con el informe de referencia real; la celda de valor vecina sigue vacía, sin tag en el .docx)' },
    'var_19': { source: 'STATIC', staticValue: 'Número total de muestras', description: 'Tabla 1: resumen de detalles del muestreo (fila 4, etiqueta -- confirmado con el informe de referencia real; la celda de valor vecina sigue vacía, sin tag en el .docx)' },
    'var_20': { source: 'STATIC', staticValue: 'Parámetros estudiados', description: 'Tabla 1: resumen de detalles del muestreo (fila 5, etiqueta -- confirmado con el informe de referencia real; la celda de valor vecina sigue vacía, sin tag en el .docx)' },
    // --- PERIODO Y FRECUENCIA DE MUESTREO ---
    'las_evaluaciones_de_la_calidad_del_aire_se_efectua_1': { source: 'STATIC', staticValue: 'tres (3) estaciones', description: 'Número de estaciones evaluadas' },
    'las_evaluaciones_de_la_calidad_del_aire_se_efectua_2': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo comprendido de evaluación' },
    'de_monitoreo_evaluadas_durante_el_periodo_comprend_1': { source: 'STATIC', staticValue: 'partículas menores a 10 (PM10) y 2.5 micras (PM2.5), Dióxido de Nitrógeno (NO2), Dióxido de Azufre (SO2), Monóxido de carbono (CO) y Ozono (O3)', description: 'Lista de contaminantes muestreados -- confirmado con el informe de referencia real, panel fijo (coincide con e_por_1)' },
    // --- UBICACIÓN DE LAS ESTACIONES DE MONITOREO ---
    'el_presente_monitoreo_se_efectuo_1': { source: 'DATE', field: 'fullDate', description: 'Fecha del monitoreo (ubicación de estaciones)' },
    'en_el_area_de_estudio_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Área de estudio (ubicación de estaciones)' },
    'para_el_desarrollo_de_este_estudio_en_particular_f_1': { source: 'STATIC', staticValue: 'tres (3) estaciones', description: 'Número de estaciones seleccionadas (Resolución 2254 de 2017)' },
    // --- TABLA 2: COORDENADAS DE ESTACIONES DE MONITOREO (post-cirugia: cada
    // estación/columna tiene su propio tag, ya no colisionan) ---
    // 'cota' se agregó al esquema de extracción IA (ai.service.ts, sección "puntos") y a
    // ParsedAIData (templateDataMapper.ts) en la misma tanda de este cambio -- el informe de
    // referencia confirma que cada estación tiene su propia cota en msnm, genuinamente variable
    // por informe (79 msnm / 84 msnm en el ejemplo), no un valor fijo -- se mapea a AI, no STATIC.
    'estacion_nombre_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Tabla 2: nombre de la estación 1 (era {var_21})' },
    'estacion_cota_msnm_1': { source: 'AI', field: 'puntos[0].cota', description: 'Tabla 2: cota en msnm de la estación 1 (era {var_22}) -- campo AI nuevo (puntos[N].cota), agregado al esquema de extracción tras confirmar con el informe de referencia real que es un dato variable por estación, no fijo' },
    'estacion_wgs84_norte_1': { source: 'AI', field: 'puntos[0].latitud', description: 'Tabla 2: coordenada WGS84 Norte de la estación 1 (era {var_23})' },
    'estacion_wgs84_oeste_1': { source: 'AI', field: 'puntos[0].longitud', description: 'Tabla 2: coordenada WGS84 Oeste de la estación 1 (era {var_23})' },
    'estacion_origen_nacional_norte_1': { source: 'AI', field: 'puntos[0].norte', description: 'Tabla 2: coordenada origen Nacional Norte (m) de la estación 1 (era {var_24})' },
    'estacion_origen_nacional_este_1': { source: 'AI', field: 'puntos[0].este', description: 'Tabla 2: coordenada origen Nacional Este (m) de la estación 1 (era {var_24})' },
    'estacion_nombre_2': { source: 'AI', field: 'puntos[1].nombre', description: 'Tabla 2: nombre de la estación 2 (era {var_21})' },
    'estacion_cota_msnm_2': { source: 'AI', field: 'puntos[1].cota', description: 'Tabla 2: cota en msnm de la estación 2 (era {var_22}) -- campo AI nuevo, ver nota arriba' },
    'estacion_wgs84_norte_2': { source: 'AI', field: 'puntos[1].latitud', description: 'Tabla 2: coordenada WGS84 Norte de la estación 2 (era {var_23})' },
    'estacion_wgs84_oeste_2': { source: 'AI', field: 'puntos[1].longitud', description: 'Tabla 2: coordenada WGS84 Oeste de la estación 2 (era {var_23})' },
    'estacion_origen_nacional_norte_2': { source: 'AI', field: 'puntos[1].norte', description: 'Tabla 2: coordenada origen Nacional Norte (m) de la estación 2 (era {var_24})' },
    'estacion_origen_nacional_este_2': { source: 'AI', field: 'puntos[1].este', description: 'Tabla 2: coordenada origen Nacional Este (m) de la estación 2 (era {var_24})' },
    'estacion_nombre_3': { source: 'AI', field: 'puntos[2].nombre', description: 'Tabla 2: nombre de la estación 3 (era {var_21})' },
    'estacion_cota_msnm_3': { source: 'AI', field: 'puntos[2].cota', description: 'Tabla 2: cota en msnm de la estación 3 (era {var_22}) -- campo AI nuevo, ver nota arriba' },
    'estacion_wgs84_norte_3': { source: 'AI', field: 'puntos[2].latitud', description: 'Tabla 2: coordenada WGS84 Norte de la estación 3 (era {var_23})' },
    'estacion_wgs84_oeste_3': { source: 'AI', field: 'puntos[2].longitud', description: 'Tabla 2: coordenada WGS84 Oeste de la estación 3 (era {var_23})' },
    'estacion_origen_nacional_norte_3': { source: 'AI', field: 'puntos[2].norte', description: 'Tabla 2: coordenada origen Nacional Norte (m) de la estación 3 (era {var_24})' },
    'estacion_origen_nacional_este_3': { source: 'AI', field: 'puntos[2].este', description: 'Tabla 2: coordenada origen Nacional Este (m) de la estación 3 (era {var_24})' },
    // --- TABLA 3: FICHA TÉCNICA (estación representativa, misma convención puntos[0]
    // ya usada por '3_ficha_tecnica_1'; post-cirugia cada celda tiene su propio tag).
    // Equipo marca/modelo, parámetros muestreados, altura de andamios y distancia a fuentes de
    // energía son datos genuinamente variables por estación (confirmados distintos entre
    // "Vientos arriba"/"Vientos abajo" en el informe de referencia -- ej. GRIMM-011 vs GRIMM-003)
    // -- se agregaron como campos AI nuevos (puntos[N].marcaModeloPM10/marcaModeloPM25/
    // parametrosMuestreados/alturaAndamios/distanciaFuentesEnergia) al esquema de extracción en
    // ai.service.ts, en vez de STATIC, para no repetir un dato de ESTE cliente en otro informe. ---
    '3_ficha_tecnica_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Tabla 3: nombre de la estación (título de la ficha técnica)' },
    'ficha_tecnica_encabezado': { source: 'AI', field: 'puntos[0].nombre', description: 'Tabla 3: encabezado repetido antes de "Información general" (era {var_27}) -- confirmado con el informe de referencia real: es el mismo nombre de la estación repetido como encabezado de la ficha técnica (ej. "Vientos arriba" aparece dos veces: como título de la Tabla 3 y de nuevo aquí, arriba de "Información general | Registro fotográfico")' },
    'ficha_tecnica_coordenada_origen_nacional_norte': { source: 'AI', field: 'puntos[0].norte', description: 'Tabla 3: coordenada origen Nacional Norte, Sistema Magna Sirgas (era {var_24})' },
    'ficha_tecnica_coordenada_origen_nacional_este': { source: 'AI', field: 'puntos[0].este', description: 'Tabla 3: coordenada origen Nacional Este, Sistema Magna Sirgas (era {var_24})' },
    'ficha_tecnica_equipo_marca_modelo_pm10': { source: 'AI', field: 'puntos[0].marcaModeloPM10', description: 'Tabla 3: marca/modelo del equipo PM10 (era {var_22}) -- campo AI nuevo (puntos[N].marcaModeloPM10), genuinamente variable por estación (ej. "GRIMM-011 GRIMM EDM 180C" vs "GRIMM-003 GRIMM EDM 180C" en el informe de referencia)' },
    'ficha_tecnica_equipo_marca_modelo_pm25': { source: 'AI', field: 'puntos[0].marcaModeloPM25', description: 'Tabla 3: marca/modelo del equipo PM2.5 (era {var_22}) -- campo AI nuevo (puntos[N].marcaModeloPM25), mismo motivo que PM10' },
    'ficha_tecnica_parametros_muestreados': { source: 'AI', field: 'puntos[0].parametrosMuestreados', description: 'Tabla 3: parámetros muestreados en la estación (era {var_22}) -- campo AI nuevo (puntos[N].parametrosMuestreados)' },
    'ficha_tecnica_altura_andamios': { source: 'AI', field: 'puntos[0].alturaAndamios', description: 'Tabla 3: altura de andamios (era {var_22}) -- campo AI nuevo (puntos[N].alturaAndamios)' },
    'ficha_tecnica_distancia_fuentes_energia': { source: 'AI', field: 'puntos[0].distanciaFuentesEnergia', description: 'Tabla 3: distancia a fuentes de energía (era {var_22}) -- campo AI nuevo (puntos[N].distanciaFuentesEnergia)' },
    'ficha_tecnica_registro_fotografico_nota': { source: 'STATIC', staticValue: '', description: 'Tabla 3: nota en columna de registro fotográfico (era {var_28}) -- confirmado con el informe de referencia real que es la leyenda de la foto ("Fotografía 1. [nombre estación]"), pero el número de fotografía y el nombre de estación son específicos del informe (no hay un patrón fijo reusable sin concatenar campos, que este diccionario no soporta); se deja vacío en vez de arriesgar una leyenda incorrecta' },
    'ficha_tecnica_observaciones': { source: 'STATIC', staticValue: 'La estación de monitoreo se localiza en un área abierta donde no se identifican fuentes puntuales cercanas de emisión. Las vías de acceso y zonas adyacentes se encuentran descubiertas, con presencia de suelo desnudo y material particulado susceptible a resuspensión. Las condiciones del entorno favorecen procesos de erosión y resuspensión de partículas por acción del viento, los cuales se consideran como factores potenciales de influencia sobre las concentraciones de material particulado. Se observa cobertura vegetal propia de áreas abiertas, con presencia de arbustos y árboles de mediana altura, cuya incidencia sobre el flujo del viento se considera baja a moderada. En el área se registra tránsito de vehículos livianos y pesados asociados a actividades operativas, lo que puede contribuir de manera puntual a la generación de material particulado. Es importante mencionar que la zona de estudio no cuenta dentro de sus alrededores con ecosistemas estratégicos, teniendo en cuenta lo establecido por el Sistema de Información Ambiental de Colombia SIAC y la Comisión Colombiana del Océano CCO.', description: 'Tabla 3: observaciones de la ficha técnica (era {var_31}) -- confirmado con el informe de referencia real que esta redacción es prácticamente idéntica para ambas estaciones del ejemplo (una plantilla de redacción estándar de Serambiente para describir el entorno de una estación de calidad de aire, no un dato único por cliente); se usa la versión sin la cláusula de distancia puntual ("a una distancia aproximada de 30 metros...") que solo aparecía en una de las dos estaciones del ejemplo' },
    // --- TABLA 4: IDENTIFICACIÓN DE MUESTRAS Y CONTAMINANTES (18 filas x 3 estaciones,
    // post-cirugia con tag único por celda. Los nombres de estación (fila 1, columnas
    // 1/3/5, con vMerge hacia abajo) sí tienen fuente AI real. Fecha e ID por fila NO
    // tienen fuente AI (serían 18 fechas y hasta 54 IDs distintos, dato genuinamente
    // variable por informe que no existe en el modelo actual) salvo la fila 1, donde
    // 'puntos[N].idMuestra' sí aplica -- no se convirtió a loop (la columna de nombre
    // de estación usa vMerge de 18 filas, retagueo posicional es más seguro) ---
    'tabla_4_contiene_los_numeros_de_identificacion_asi_1': { source: 'STATIC', staticValue: '', description: 'Continuación de la nota introductoria de la Tabla 4 -- la plantilla asume que el laboratorio asigna códigos de identificación a MUESTRAS FÍSICAS; en el informe de referencia real el monitoreo fue 100% automático (PM10, PM2.5, NO2, SO2, CO y O3 medidos en línea por equipos, sin muestras físicas ni códigos de identificación -- ver informe de referencia sección 3.6), un escenario distinto al que asume esta tabla, por lo que no aplica y no se puede tomar el texto de continuación de ahí' },
    'muestras_estacion_nombre_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Tabla 4: nombre de la estación 1 (columna con vMerge, 18 filas)' },
    'muestras_estacion_nombre_2': { source: 'AI', field: 'puntos[1].nombre', description: 'Tabla 4: nombre de la estación 2 (columna con vMerge, 18 filas)' },
    'muestras_estacion_nombre_3': { source: 'AI', field: 'puntos[2].nombre', description: 'Tabla 4: nombre de la estación 3 (columna con vMerge, 18 filas)' },
    'muestras_estacion_1_id_fila_1': { source: 'AI', field: 'puntos[0].idMuestra', description: 'Tabla 4: ID de muestra, estación 1, fila 1' },
    'muestras_estacion_2_id_fila_1': { source: 'AI', field: 'puntos[1].idMuestra', description: 'Tabla 4: ID de muestra, estación 2, fila 1' },
    'muestras_estacion_3_id_fila_1': { source: 'AI', field: 'puntos[2].idMuestra', description: 'Tabla 4: ID de muestra, estación 3, fila 1' },
    'muestras_fecha_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 1 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 2 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_3': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 3 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_4': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 4 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_5': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 5 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_6': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 6 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_7': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 7 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_8': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 8 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_9': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 9 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_10': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 10 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_11': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 11 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_12': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 12 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_13': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 13 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_14': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 14 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_15': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 15 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_16': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 16 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_17': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 17 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_fecha_fila_18': { source: 'STATIC', staticValue: '', description: 'Tabla 4: fecha de la fila 18 de identificación de muestras -- sin fuente de 18 fechas distintas por informe' },
    'muestras_estacion_1_id_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 2 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 2 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 2 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_3': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 3 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_3': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 3 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_3': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 3 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_4': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 4 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_4': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 4 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_4': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 4 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_5': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 5 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_5': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 5 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_5': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 5 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_6': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 6 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_6': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 6 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_6': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 6 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_7': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 7 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_7': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 7 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_7': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 7 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_8': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 8 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_8': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 8 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_8': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 8 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_9': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 9 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_9': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 9 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_9': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 9 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_10': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 10 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_10': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 10 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_10': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 10 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_11': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 11 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_11': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 11 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_11': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 11 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_12': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 12 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_12': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 12 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_12': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 12 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_13': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 13 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_13': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 13 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_13': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 13 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_14': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 14 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_14': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 14 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_14': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 14 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_15': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 15 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_15': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 15 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_15': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 15 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_16': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 16 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_16': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 16 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_16': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 16 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_17': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 17 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_17': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 17 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_17': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 17 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_1_id_fila_18': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 1, fila 18 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_2_id_fila_18': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 2, fila 18 -- sin fuente de múltiples IDs por estación por informe' },
    'muestras_estacion_3_id_fila_18': { source: 'STATIC', staticValue: '', description: 'Tabla 4: ID de muestra, estación 3, fila 18 -- sin fuente de múltiples IDs por estación por informe' },
    // --- DETERMINANTES AMBIENTALES / FUENTES DE EMISIÓN ---
    'tag_year': { source: 'DATE', field: 'year', description: 'Año de la fuente normativa (Resolución 2254 de 2017, citas repetidas x6)' },
    'en_el_area_de_estudio_del_1': { source: 'AI', field: 'cliente', description: 'Organización del área de estudio (determinantes ambientales)' },
    'var_5': { source: 'STATIC', staticValue: '', description: 'Tabla 10: descripción de fuente de emisión 1 -- específico del sitio, no determinable' },
    'var_6': { source: 'STATIC', staticValue: '', description: 'Tabla 10: descripción de fuente de emisión 2' },
    'var_7': { source: 'STATIC', staticValue: '', description: 'Tabla 10: descripción de fuente de emisión 3' },
    'var_8': { source: 'STATIC', staticValue: '', description: 'Tabla 10: descripción de fuente de emisión 4' },
    // --- NORMAS DE CALIDAD DEL AIRE / TABLA 13 (post-cirugia: tag único por celda,
    // usando patrón _fila_N -- no se determina con certeza a qué contaminante
    // corresponde cada fila sin el informe de referencia, y los límites de la
    // Resolución 2254 de 2017 son valores normativos exactos que no se inventan) ---
    'las_normas_de_calidad_del_aire_para_todo_el_territ_1': { source: 'STATIC', staticValue: 'En el artículo 2 de dicha Resolución, se establecen los niveles máximos permisibles para contaminantes criterios en el aire, a condiciones de referencia (25°C y 760 mmHg).', description: 'Continuación introducción normativa (Resolución 2254 de 2017) -- confirmado con el informe de referencia real, texto normativo fijo' },
    // Tabla 13 llenada con los valores EXACTOS de la Resolución 2254 de 2017 (norma nacional,
    // texto legal fijo -- no depende del cliente), verificados contra la Tabla 12 del informe de
    // referencia real (que reproduce el artículo 2 de la Resolución) fila por fila: PM10
    // (Anual/24h), PM2.5 (Anual/24h), SO2 (24h/1h), NO2 (Anual/1h), O3 (8h, una sola fila), CO
    // (8h/1h) = 11 filas en total, coincide exactamente con las 11 filas del .docx. La columna
    // "contaminante" solo tiene tag propio en la primera fila de cada grupo (vMerge hacia abajo
    // en el .docx real), por eso fila_2/4/6/8/11 no tienen 'normas_contaminante_fila_N'.
    'normas_contaminante_fila_1': { source: 'STATIC', staticValue: 'PM10', description: 'Tabla 13: nombre del contaminante, fila 1 -- Resolución 2254 de 2017, verificado contra el informe de referencia real (era {var_55})' },
    'normas_limite_fila_1': { source: 'STATIC', staticValue: '50', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 1 -- PM10 anual, Resolución 2254 de 2017 (era {var_53})' },
    'normas_tiempo_exposicion_fila_1': { source: 'STATIC', staticValue: 'Anual', description: 'Tabla 13: tiempo de exposición, fila 1 -- PM10 anual, Resolución 2254 de 2017 (era {var_54})' },
    'normas_limite_fila_2': { source: 'STATIC', staticValue: '100', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 2 -- PM10 24 horas, Resolución 2254 de 2017 (era {var_56})' },
    'normas_tiempo_exposicion_fila_2': { source: 'STATIC', staticValue: '24 horas', description: 'Tabla 13: tiempo de exposición, fila 2 -- PM10 24 horas, Resolución 2254 de 2017 (era {var_57})' },
    'normas_contaminante_fila_3': { source: 'STATIC', staticValue: 'PM2.5', description: 'Tabla 13: nombre del contaminante, fila 3 -- Resolución 2254 de 2017 (era {var_60})' },
    'normas_limite_fila_3': { source: 'STATIC', staticValue: '25', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 3 -- PM2.5 anual, Resolución 2254 de 2017 (era {var_59})' },
    'normas_tiempo_exposicion_fila_3': { source: 'STATIC', staticValue: 'Anual', description: 'Tabla 13: tiempo de exposición, fila 3 -- PM2.5 anual, Resolución 2254 de 2017 (era {var_54})' },
    'normas_limite_fila_4': { source: 'STATIC', staticValue: '50', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 4 -- PM2.5 24 horas, Resolución 2254 de 2017 (era {var_53})' },
    'normas_tiempo_exposicion_fila_4': { source: 'STATIC', staticValue: '24 horas', description: 'Tabla 13: tiempo de exposición, fila 4 -- PM2.5 24 horas, Resolución 2254 de 2017 (era {var_57})' },
    'normas_contaminante_fila_5': { source: 'STATIC', staticValue: 'SO2', description: 'Tabla 13: nombre del contaminante, fila 5 -- Resolución 2254 de 2017 (era {var_62})' },
    'normas_limite_fila_5': { source: 'STATIC', staticValue: '50', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 5 -- SO2 24 horas, Resolución 2254 de 2017 (era {var_53})' },
    'normas_tiempo_exposicion_fila_5': { source: 'STATIC', staticValue: '24 horas', description: 'Tabla 13: tiempo de exposición, fila 5 -- SO2 24 horas, Resolución 2254 de 2017 (era {var_57})' },
    'normas_limite_fila_6': { source: 'STATIC', staticValue: '100', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 6 -- SO2 1 hora, Resolución 2254 de 2017 (era {var_56})' },
    'normas_tiempo_exposicion_fila_6': { source: 'STATIC', staticValue: '1 hora', description: 'Tabla 13: tiempo de exposición, fila 6 -- SO2 1 hora, Resolución 2254 de 2017 (era {var_63})' },
    'normas_contaminante_fila_7': { source: 'STATIC', staticValue: 'NO2', description: 'Tabla 13: nombre del contaminante, fila 7 -- Resolución 2254 de 2017 (era {var_66})' },
    'normas_limite_fila_7': { source: 'STATIC', staticValue: '60', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 7 -- NO2 anual, Resolución 2254 de 2017 (era {var_65})' },
    'normas_tiempo_exposicion_fila_7': { source: 'STATIC', staticValue: 'Anual', description: 'Tabla 13: tiempo de exposición, fila 7 -- NO2 anual, Resolución 2254 de 2017 (era {var_54})' },
    'normas_limite_fila_8': { source: 'STATIC', staticValue: '200', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 8 -- NO2 1 hora, Resolución 2254 de 2017 (era {var_67})' },
    'normas_tiempo_exposicion_fila_8': { source: 'STATIC', staticValue: '1 hora', description: 'Tabla 13: tiempo de exposición, fila 8 -- NO2 1 hora, Resolución 2254 de 2017 (era {var_63})' },
    'normas_contaminante_fila_9': { source: 'STATIC', staticValue: 'O3', description: 'Tabla 13: nombre del contaminante, fila 9 -- Resolución 2254 de 2017 (era {var_68})' },
    'normas_limite_fila_9': { source: 'STATIC', staticValue: '100', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 9 -- O3 8 horas, Resolución 2254 de 2017 (era {var_56})' },
    'normas_tiempo_exposicion_fila_9': { source: 'STATIC', staticValue: '8 horas', description: 'Tabla 13: tiempo de exposición, fila 9 -- O3 8 horas, Resolución 2254 de 2017 (era {var_69})' },
    'normas_contaminante_fila_10': { source: 'STATIC', staticValue: 'CO', description: 'Tabla 13: nombre del contaminante, fila 10 -- Resolución 2254 de 2017 (era {var_72})' },
    'normas_limite_fila_10': { source: 'STATIC', staticValue: '5000', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 10 -- CO 8 horas, Resolución 2254 de 2017 (era {var_71})' },
    'normas_tiempo_exposicion_fila_10': { source: 'STATIC', staticValue: '8 horas', description: 'Tabla 13: tiempo de exposición, fila 10 -- CO 8 horas, Resolución 2254 de 2017 (era {var_69})' },
    'normas_limite_fila_11': { source: 'STATIC', staticValue: '35000', description: 'Tabla 13: nivel máximo permisible (µg/m3), fila 11 -- CO 1 hora, Resolución 2254 de 2017 (era {var_73})' },
    'normas_tiempo_exposicion_fila_11': { source: 'STATIC', staticValue: '1 hora', description: 'Tabla 13: tiempo de exposición, fila 11 -- CO 1 hora, Resolución 2254 de 2017 (era {var_63})' },
    'var_9': { source: 'STATIC', staticValue: '', description: 'Artefacto de salto de párrafo antes de "METODOLOGÍAS DE MUESTREO"' },
    // --- DATOS Y RESULTADOS CALIDAD DEL AIRE ---
    'se_presentan_las_incertidumbres_de_los_resultados__1': { source: 'STATIC', staticValue: 'de acuerdo con la metodología de estimación de incertidumbre del laboratorio', description: 'Metodología de incertidumbre' },
    'las_incertidumbres_de_los_resultados_asociados_a_c_1': { source: 'STATIC', staticValue: 'del mismo modo se relaciona el cálculo de la probabilidad de aceptación falsa, probabilidad de aceptación verdadera y el nivel de riesgo asociado a la regla de decisión empleada', description: 'Cierre de la oración de incertidumbre -- confirmado con el informe de referencia real, es texto metodológico fijo (describe qué contiene siempre el anexo de incertidumbre, no depende del cliente)' },
    'en_las_siguientes_secciones_se_presentan_las_conce_1': { source: 'STATIC', staticValue: 'los contaminantes partículas menores a 10 (PM10) y 2.5 micras (PM2.5), Dióxido de Nitrógeno (NO2), Dióxido de Azufre (SO2), Monóxido de carbono (CO) y Ozono (O3),', description: 'Lista de contaminantes criterio -- confirmado con el informe de referencia real, panel fijo (coincide con e_por_1)' },
    'en_las_siguientes_secciones_se_presentan_las_conce_2': { source: 'AI', field: 'cliente', description: 'Organización del área de estudio (resultados)' },
    'los_resultados_de_las_1': { source: 'STATIC', staticValue: 'tres (3)', description: 'Número de estaciones (referencia recurrente en toda la sección de resultados, tag repetido x10)' },
    'var_33': { source: 'STATIC', staticValue: '', description: 'Tabla 14: resultados diarios por fecha/estación (tag repetido 3 veces, tabla no representable)' },
    'fuente_serambiente_s_a_s_1': { source: 'DATE', field: 'year', description: 'Año de la fuente SERAMBIENTE (Tabla 14, tag repetido x3)' },
    '16_la_realizada_con_el_limite_permisible_para_tiem_1': { source: 'STATIC', staticValue: '', description: 'Número de días de monitoreo (comparación indicativa) -- no determinable con certeza' },
    'var_10': { source: 'STATIC', staticValue: '', description: 'Celda adicional antes de Tabla 15' },
    // --- TABLA 15: RESULTADOS 24 HORAS POR ESTACIÓN (post-cirugia: era var_22
    // compartido con las tablas 2/3; ahora tag único por celda. Resultados de
    // laboratorio reales por estación -- dato específico del informe, no se inventa) ---
    'resultados_24h_estacion_nombre_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 15: nombre de estación, fila 1 -- resultado de laboratorio específico, no se inventa' },
    'resultados_24h_valor_maximo_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 15: resultado máximo (µg/m3), fila 1' },
    'resultados_24h_norma_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 15: norma 24 horas (µg/m3), fila 1' },
    'resultados_24h_declaracion_conformidad_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 15: declaración de conformidad, fila 1' },
    'resultados_24h_estacion_nombre_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 15: nombre de estación, fila 2 -- resultado de laboratorio específico, no se inventa' },
    'resultados_24h_valor_maximo_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 15: resultado máximo (µg/m3), fila 2' },
    'resultados_24h_norma_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 15: norma 24 horas (µg/m3), fila 2' },
    'resultados_24h_declaracion_conformidad_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 15: declaración de conformidad, fila 2' },
    'fuente_serambiente_s_a_s_2': { source: 'DATE', field: 'year', description: 'Año de la fuente SERAMBIENTE (citas recurrentes en tablas/gráficas, tag repetido x21)' },
    // --- TABLA 16: RESULTADOS ANUALES POR ESTACIÓN (mismo caso que Tabla 15) ---
    'resultados_anual_estacion_nombre_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 16: nombre de estación, fila 1 -- resultado de laboratorio específico, no se inventa' },
    'resultados_anual_valor_promedio_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 16: resultado promedio (µg/m3), fila 1' },
    'resultados_anual_norma_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 16: norma anual (µg/m3), fila 1' },
    'resultados_anual_declaracion_conformidad_fila_1': { source: 'STATIC', staticValue: '', description: 'Tabla 16: declaración de conformidad resultado promedio, fila 1' },
    'resultados_anual_estacion_nombre_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 16: nombre de estación, fila 2 -- resultado de laboratorio específico, no se inventa' },
    'resultados_anual_valor_promedio_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 16: resultado promedio (µg/m3), fila 2' },
    'resultados_anual_norma_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 16: norma anual (µg/m3), fila 2' },
    'resultados_anual_declaracion_conformidad_fila_2': { source: 'STATIC', staticValue: '', description: 'Tabla 16: declaración de conformidad resultado promedio, fila 2' },
    'fuente_serambiente_s_a_s_3': { source: 'DATE', field: 'year', description: 'Año de la fuente SERAMBIENTE (citas recurrentes en gráficas, tag repetido x6)' },
    'realizando_un_analisis_estadistico_el_promedio_glo_1': { source: 'STATIC', staticValue: '', description: 'Resultados estadísticos específicos de laboratorio (promedio/máximo/mínimo/porcentaje) -- datos numéricos de resultados reales, no se pueden generar (tag repetido x5)' },
    'con_valor_maximo_de_g_m3_reportado_1': { source: 'STATIC', staticValue: '', description: 'Estación con valor máximo reportado -- dato de resultado específico' },
    'y_un_minimo_de_g_m3_reportado_1': { source: 'STATIC', staticValue: '', description: 'Estación con valor mínimo reportado -- dato de resultado específico' },
    '17_tratamiento_estadistico_para_los_datos_de_pm10__1': { source: 'STATIC', staticValue: '', description: 'Número de estaciones (encabezado Tabla 17)' },
    'de_lo_anterior_se_concluye_que_la_mayor_proporcion_1': { source: 'STATIC', staticValue: '', description: 'Conclusión estadística de distribución de datos -- específica de resultados de laboratorio' },
    'de_lo_anterior_se_concluye_que_la_mayor_proporcion_2': { source: 'STATIC', staticValue: '', description: 'Continuación conclusión estadística (porcentaje)' },
    'los_resultados_1': { source: 'STATIC', staticValue: 'máximos', description: 'Palabra de enlace antes de "de las [N] estaciones" -- verificado en el .docx real: ocurrencia ÚNICA (no repetida, la descripción original sugería SO2/NO2/CO pero solo aparece una vez, en el cierre de la sección de CO); confirmado con el informe de referencia real, coincide con "máximos" en las tres secciones equivalentes (SO2, NO2, CO)' },
    'var_11': { source: 'STATIC', staticValue: '', description: 'Celda adicional de fuente (después de resumen CO)' },
    'var_12': { source: 'STATIC', staticValue: '', description: 'Celda adicional de fuente' },
    'var_13': { source: 'STATIC', staticValue: '', description: 'Celda adicional de fuente' },
    '6_a_la_grafica_1': { source: 'STATIC', staticValue: '', description: 'Número final del rango de gráficas (ej. "de la Gráfica 6 a la Gráfica N") -- cantidad variable' },
    'anexo_4_memorias_de_calculo_de_datos_1': { source: 'STATIC', staticValue: '', description: 'Nombre del contaminante en referencia de anexo (memorias de cálculo)' },
    '6_comparacion_promedios_1_hora_de_co_vs_norma_1_ho_1': { source: 'STATIC', staticValue: '', description: 'Nombre de estación(es) en pie de gráfica comparativa CO (tag repetido x2)' },
    // --- CONDICIONES ATMOSFÉRICAS ---
    'las_condiciones_atmosfericas_reportadas_fueron_reg_1': { source: 'STATIC', staticValue: 'propia instalada en el área de estudio', description: 'Origen de la estación meteorológica' },
    'var_14': { source: 'STATIC', staticValue: '', description: 'Celda de fuente (Figura 9)' },
    'var_15': { source: 'STATIC', staticValue: '', description: 'Descripción de Figura 9' },
    'tabla_39_se_presenta_los_promedios_de_las_variable_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre de la estación de calidad de aire (Tabla 39, variables meteorológicas)' },
    'que_registro_los_datos_en_el_periodo_del_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo de registro de datos meteorológicos' },
    // --- CONCLUSIONES ---
    'realizo_la_evaluacion_de_la_calidad_del_aire_en_el_1': { source: 'AI', field: 'cliente', description: 'Organización evaluada (conclusiones)' },
    'realizo_la_evaluacion_de_la_calidad_del_aire_en_el_2': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización del proyecto (conclusiones)' },
    'a_traves_del_monitoreo_realizado_del_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo del monitoreo (conclusiones)' },
};
// CALIDAD DE AIRE (66-18)
exports.CALIDAD_AIRE_CONFIG = {
    templateType: 'CALIDAD_AIRE',
    displayName: 'Informe de Calidad de Aire',
    filePattern: 'FO-PO-PSM-66-18',
    fields: Object.assign(Object.assign({}, AGUA_FIELDS), CALIDAD_AIRE_LEGACY_FIELDS)
};
// ================================================================
// OLORES OFENSIVOS (66-19) — mapeo completo, plantilla legacy (templates/reports/)
// Resolución 1541 de 2013 (límites), Resolución 2087 de 2014 (protocolo)
// Sin normativa de conformidad genérica: usa límites propios de Res. 1541 vía compliance.service
// ================================================================
const OLORES_LEGACY_FIELDS = {
    'informe_tecnico_de_estudio_de_olores_ofensivos_en__1': { source: 'AI', field: 'cliente', description: 'Nombre cliente en portada' },
    'calidad_del_aire_ejecutado_entre_el_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo de ejecución del monitoreo' },
    'chart_indices': { source: 'STATIC', staticValue: '', description: 'Placeholder de gráfico (no aplica para olores)' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_r_1': { source: 'AI', field: 'cliente', description: 'Cliente que contrata el servicio' },
    'olores_ofensivos_en_calidad_de_aire_en_el_area_del_1': { source: 'AI', field: 'ubicacion.direccion', description: 'Área/predio del estudio' },
    'a_fin_de_dar_cumplimiento_a_los_requerimientos_de__1': { source: 'STATIC', staticValue: 'tres (3) estaciones de monitoreo', description: 'Número de estaciones' },
    'en_sitios_representativos_de_la_direccion_predomin_1': { source: 'STATIC', staticValue: '', description: 'Continuación narrativa' },
    'el_presente_documento_de_caracter_tecnico_contiene_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo del monitoreo' },
    'realizar_la_evaluacion_de_olores_ofensivos_en_cali_1': { source: 'AI', field: 'ubicacion.direccion', description: 'Área de estudio' },
    'resolucion_1541_de_2013_del_ministerio_de_ambiente_1': { source: 'AI', field: 'cliente', description: 'Organización del área de estudio' },
    'el_cual_hace_parte_de_la_organizacion_ubicada_en_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Ubicación de la organización' },
    'determinar_las_concentraciones_1': { source: 'STATIC', staticValue: 'de sulfuro de hidrógeno (H2S), amoníaco (NH3) y azufre total reducido (TRS)', description: 'Objetivo: sustancias a medir' },
    'mediante_la_ejecucion_del_estudio_de_sustancias_ge_1': { source: 'STATIC', staticValue: '.', description: 'Cierre de objetivo' },
    'declaracion_de_conformidad_de_los_1': { source: 'STATIC', staticValue: 'resultados obtenidos frente a la Resolución 1541 de 2013', description: 'Objetivo: declaración de conformidad' },
    'para_un_tiempo_de_exposicion_de_1_hora_en_un_estud_1': { source: 'STATIC', staticValue: '.', description: 'Cierre de objetivo tiempo 1 hora' },
    'para_un_tiempo_de_exposicion_de_24_horas_1': { source: 'STATIC', staticValue: '.', description: 'Cierre de objetivo tiempo 24 horas' },
    'las_mediciones_y_analisis_1': { source: 'STATIC', staticValue: 'del presente estudio', description: 'Continuación narrativa' },
    'fue_realizada_por_servicios_de_ingenieria_y_ambien_1': { source: 'STATIC', staticValue: 'Resolución 1262 del 18 de junio de 2021', description: 'Resolución de acreditación IDEAM de Serambiente' },
    'la_calidad_de_aire_por_olores_ofensivos_en_las_1': { source: 'STATIC', staticValue: 'tres (3) estaciones', description: 'Número de estaciones evaluadas' },
    'de_monitoreo_ubicadas_en_el_en_el_area_de_estudio__1': { source: 'AI', field: 'ubicacion.direccion', description: 'Área de estudio de las estaciones' },
    'var_6': { source: 'STATIC', staticValue: 'Sulfuro de Hidrógeno (H2S)', description: 'Contaminante 1' },
    'var_7': { source: 'STATIC', staticValue: 'Amoníaco (NH3)', description: 'Contaminante 2' },
    'var_8': { source: 'STATIC', staticValue: 'Azufre Total Reducido (TRS)', description: 'Contaminante 3' },
    'var_9': { source: 'STATIC', staticValue: '', description: 'Contaminante 4 (no usado)' },
    'var_18': { source: 'AI', field: 'puntos[0].nombre', description: 'Detalle de muestreo: estación' },
    'var_19': { source: 'AI', field: 'puntos[0].hora', description: 'Detalle de muestreo: hora' },
    'var_20': { source: 'DATE', field: 'fullDate', description: 'Detalle de muestreo: fecha' },
    'var_21': { source: 'STATIC', staticValue: '24 horas', description: 'Duración del muestreo' },
    'var_22': { source: 'STATIC', staticValue: 'Continuo automático', description: 'Tipo de muestreo' },
    'de_la_calidad_del_aire_por_olores_ofensivos_se_efe_1': { source: 'STATIC', staticValue: 'de manera continua con estaciones automáticas', description: 'Método de evaluación' },
    'evaluadas_durante_el_periodo_comprendido_entre_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo evaluado' },
    'el_presente_monitoreo_se_efectuo_en_cumplimiento_d_1': { source: 'AI', field: 'ubicacion.direccion', description: 'Área de estudio' },
    'el_presente_monitoreo_se_efectuo_en_cumplimiento_d_2': { source: 'AI', field: 'cliente', description: 'Organización beneficiaria' },
    'en_beneficio_de_la_el_cual_se_encuentra_localizado_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización de la organización' },
    'nombre_estacion_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre estación 1 (tabla resumen georreferenciación, verificado posicionalmente 2026-08-21)' },
    'nombre_estacion_2': { source: 'AI', field: 'puntos[1].nombre', description: 'Nombre estación 2 (tabla resumen georreferenciación, verificado posicionalmente 2026-08-21)' },
    'nombre_estacion_3': { source: 'AI', field: 'puntos[2].nombre', description: 'Nombre estación 3 (tabla resumen georreferenciación, verificado posicionalmente 2026-08-21)' },
    'geo_lat_wgs84_1': { source: 'AI', field: 'puntos[0].latitud', description: 'Norte WGS84 estación 1 (verificado posicionalmente 2026-08-21)' },
    'geo_lon_wgs84_1': { source: 'AI', field: 'puntos[0].longitud', description: 'Oeste WGS84 estación 1 (verificado posicionalmente 2026-08-21)' },
    'geo_lat_wgs84_2': { source: 'AI', field: 'puntos[1].latitud', description: 'Norte WGS84 estación 2 (verificado posicionalmente 2026-08-21)' },
    'geo_lon_wgs84_2': { source: 'AI', field: 'puntos[1].longitud', description: 'Oeste WGS84 estación 2 (verificado posicionalmente 2026-08-21)' },
    'geo_lat_wgs84_3': { source: 'AI', field: 'puntos[2].latitud', description: 'Norte WGS84 estación 3 (verificado posicionalmente 2026-08-21)' },
    'geo_lon_wgs84_3': { source: 'AI', field: 'puntos[2].longitud', description: 'Oeste WGS84 estación 3 (verificado posicionalmente 2026-08-21)' },
    'geo_norte_m_1': { source: 'AI', field: 'puntos[0].norte', description: 'Norte(m) Magna Sirgas estación 1 -- reusado también en la ficha técnica de la estación (verificado posicionalmente 2026-08-21)' },
    'geo_este_m_1': { source: 'AI', field: 'puntos[0].este', description: 'Este(m) Magna Sirgas estación 1 -- reusado también en la ficha técnica de la estación (verificado posicionalmente 2026-08-21)' },
    'geo_norte_m_2': { source: 'AI', field: 'puntos[1].norte', description: 'Norte(m) Magna Sirgas estación 2 -- reusado también en la ficha técnica de la estación (verificado posicionalmente 2026-08-21)' },
    'geo_este_m_2': { source: 'AI', field: 'puntos[1].este', description: 'Este(m) Magna Sirgas estación 2 -- reusado también en la ficha técnica de la estación (verificado posicionalmente 2026-08-21)' },
    'geo_norte_m_3': { source: 'AI', field: 'puntos[2].norte', description: 'Norte(m) Magna Sirgas estación 3 -- reusado también en la ficha técnica de la estación (verificado posicionalmente 2026-08-21)' },
    'geo_este_m_3': { source: 'AI', field: 'puntos[2].este', description: 'Este(m) Magna Sirgas estación 3 -- reusado también en la ficha técnica de la estación (verificado posicionalmente 2026-08-21)' },
    'var_24': { source: 'STATIC', staticValue: 'N.A.', description: 'Cota (msnm) — no siempre disponible' },
    'var_28': { source: 'STATIC', staticValue: '1', description: 'Número de ficha técnica' },
    'var_29': { source: 'STATIC', staticValue: 'Ver Anexo 1 - Certificados de calibración', description: 'Marca/modelo de equipo' },
    'var_30': { source: 'STATIC', staticValue: 'Ver Anexo 1', description: 'Marca/modelo de equipo 2' },
    'var_31': { source: 'STATIC', staticValue: 'Ver Anexo 1', description: 'Marca/modelo de equipo 3' },
    'var_32': { source: 'STATIC', staticValue: '', description: 'Observaciones equipo' },
    'var_33': { source: 'STATIC', staticValue: 'Ver Anexo 1', description: 'Marca/modelo de equipo 4' },
    'var_36': { source: 'STATIC', staticValue: '', description: 'Observaciones equipo 2' },
    'var_37': { source: 'STATIC', staticValue: 'Ver Anexo 1', description: 'Marca/modelo de equipo 5' },
    'fuente_serambiente_s_a_s_1': { source: 'DATE', field: 'year', description: 'Año de la fuente (SERAMBIENTE S.A.S., AÑO)' },
    'fuente_serambiente_s_a_s_2': { source: 'DATE', field: 'year', description: 'Año de la fuente 2' },
    'fuente_serambiente_s_a_s_3': { source: 'DATE', field: 'year', description: 'Año de la fuente 3' },
    'var_38': { source: 'STATIC', staticValue: 'H2S', description: 'Tabla métodos: parámetro 1' },
    'var_39': { source: 'STATIC', staticValue: 'Muestreo continuo automático', description: 'Tabla métodos: muestreo 1' },
    'var_40': { source: 'STATIC', staticValue: 'Fluorescencia UV / Electroquímico', description: 'Tabla métodos: análisis' },
    'var_41': { source: 'STATIC', staticValue: 'US EPA 40 CFR Parte 50', description: 'Tabla métodos: referencia' },
    'var_42': { source: 'STATIC', staticValue: 'NH3', description: 'Tabla métodos: parámetro 2' },
    'var_43': { source: 'STATIC', staticValue: 'Muestreo continuo automático', description: 'Tabla métodos: muestreo 2' },
    'var_44': { source: 'STATIC', staticValue: 'Quimioluminiscencia', description: 'Tabla métodos: análisis 2' },
    'var_45': { source: 'STATIC', staticValue: 'TRS', description: 'Tabla métodos: parámetro 3' },
    'var_46': { source: 'STATIC', staticValue: 'Muestreo continuo automático', description: 'Tabla métodos: muestreo 3' },
    'var_47': { source: 'STATIC', staticValue: 'Fluorescencia UV', description: 'Tabla métodos: análisis 3' },
    'var_48': { source: 'STATIC', staticValue: 'US EPA 40 CFR Parte 50', description: 'Tabla métodos: referencia 2' },
    'se_presentan_las_incertidumbres_de_los_resultados__1': { source: 'STATIC', staticValue: 'de acuerdo con la metodología de estimación de incertidumbre del laboratorio', description: 'Continuación incertidumbre' },
    'las_incertidumbres_de_los_resultados_asociados_a_c_1': { source: 'STATIC', staticValue: '', description: 'Cierre de la oración de incertidumbre' },
    'reportadas_a_condiciones_de_referencia_de_presion__1': { source: 'AI', field: 'ubicacion.direccion', description: 'Área de estudio (resultados)' },
    'los_resultados_maximos_de_las_1': { source: 'STATIC', staticValue: 'concentraciones registradas por estación', description: 'Resultados máximos' },
    'realizando_un_analisis_estadistico_todos_los_valor_1': { source: 'STATIC', staticValue: 'H2S evaluadas', description: 'Análisis estadístico H2S' },
    'anexo_4_memorias_de_calculo_de_datos_1': { source: 'STATIC', staticValue: 'H2S', description: 'Nombre archivo anexo memorias H2S' },
    'comparacion_promedios_1_hora_de_h2s_vs_norma_1_hor_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Estación para gráfica comparativa H2S' },
    'comparacion_promedios_1_hora_de_h2s_vs_norma_1_hor_2': { source: 'AI', field: 'puntos[1].nombre', description: 'Estación 2 para gráfica comparativa H2S' },
    'promedios_y_horarios_para_el_contaminante_nh3_repo_1': { source: 'STATIC', staticValue: 'todas las estaciones', description: 'Alcance de datos NH3' },
    'anexo_4_memorias_de_calculo_de_datos_2': { source: 'STATIC', staticValue: 'NH3', description: 'Nombre archivo anexo memorias NH3' },
    'g_m3_para_tiempo_de_exposicion_de_24_horas_estable_1': { source: 'STATIC', staticValue: 'concentración en la estación evaluada, sin superar el límite normativo', description: 'Observación de concentración máxima' },
    'anexo_4_memorias_de_calculo_de_datos_3': { source: 'STATIC', staticValue: 'TRS', description: 'Nombre archivo anexo memorias TRS' },
    'despues_de_un_analisis_estadistico_y_como_se_evide_1': { source: 'STATIC', staticValue: 'ninguna de las tres estaciones evaluadas', description: 'Conclusión de datos atípicos' },
    'las_condiciones_atmosfericas_reportadas_fueron_reg_1': { source: 'STATIC', staticValue: 'propia instalada en el área de estudio', description: 'Origen de estación meteorológica' },
    'var_10': { source: 'STATIC', staticValue: '', description: 'Variable atmosférica 1' },
    'var_11': { source: 'STATIC', staticValue: '', description: 'Variable atmosférica 2' },
    'var_12': { source: 'STATIC', staticValue: '', description: 'Variable atmosférica 3' },
    'tabla_17_se_presenta_los_promedios_de_las_variable_1': { source: 'AI', field: 'ubicacion.direccion', description: 'Ubicación estación meteorológica' },
    'que_registro_los_datos_en_el_periodo_del_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo de datos meteorológicos' },
    'realizo_la_evaluacion_de_olores_ofensivos_en_calid_1': { source: 'AI', field: 'ubicacion.direccion', description: 'Área de estudio (conclusiones)' },
    'calidad_del_aire_en_el_area_de_estudio_del_el_cual_1': { source: 'AI', field: 'ubicacion.ciudad', description: 'Jurisdicción (conclusiones)' },
    'el_cual_se_encuentra_ubicado_en_la_jurisdiccion_de_1': { source: 'AI', field: 'ubicacion.departamento', description: 'Jurisdicción departamento (conclusiones)' },
    'en_el_a_traves_del_monitoreo_realizado_del_1': { source: 'AI', field: 'periodoMuestreo', description: 'Periodo de monitoreo (conclusiones)' },
    'var_13': { source: 'STATIC', staticValue: 'Las concentraciones de H2S, NH3 y TRS registradas en las estaciones evaluadas se encuentran dentro de los límites establecidos por la Resolución 1541 de 2013.', description: 'Conclusión 1' },
    'var_14': { source: 'STATIC', staticValue: 'No se identificaron datos atípicos relevantes durante el periodo de monitoreo.', description: 'Conclusión 2' },
    'var_15': { source: 'STATIC', staticValue: 'Las condiciones meteorológicas registradas fueron consistentes con las esperadas para la zona de estudio.', description: 'Conclusión 3' },
    'var_16': { source: 'STATIC', staticValue: '', description: 'Conclusión 4 (opcional)' },
    'var_17': { source: 'STATIC', staticValue: '', description: 'Conclusión 5 (opcional)' },
    '2s_vs_norma_1_hora_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Grafica 4: nombre de estacion (comparacion promedios 1 hora H2S vs norma)' },
    '3_ficha_tecnica_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Tabla 3: nombre de la estacion (ficha tecnica)' },
    '3_reportados_para_monitoreo_en_estos_se_puede_1': { source: 'STATIC', staticValue: '', description: 'Narrativa NH3: continuacion ambigua, redaccion exacta no determinable' },
    '91_g_m3_para_tiempo_de_exposicion_de_24_horas_esta_1': { source: 'STATIC', staticValue: '', description: 'Valor numerico de concentracion NH3 24h (dato especifico de laboratorio, no se puede generar)' },
    'var_49': { source: 'STATIC', staticValue: '', description: 'Header de pagina (header2.xml): fragmento final tras los campos de numero de pagina' },
    'xxxx_c_1': { source: 'STATIC', staticValue: '', description: 'Tabla meteorologica: valor de temperatura (dato especifico, no determinable)' },
    'xxxx_c_2': { source: 'STATIC', staticValue: '', description: 'Tabla meteorologica: valor de temperatura 2 (dato especifico, no determinable)' },
};
// OLORES OFENSIVOS (66-19)
exports.OLORES_CONFIG = {
    templateType: 'OLORES',
    displayName: 'Informe de Olores Ofensivos',
    filePattern: 'FO-PO-PSM-66-19',
    fields: Object.assign(Object.assign({}, AGUA_FIELDS), OLORES_LEGACY_FIELDS)
};
// PARTÍCULAS VIABLES (66-20)
// ================================================================
// PARTÍCULAS VIABLES (66-20) — mapeo completo, plantilla legacy
// Sin normativa colombiana: veredicto contra clasificación de Boutin (internacional)
// ================================================================
const PARTICULAS_LEGACY_FIELDS = {
    'chart_indices': { source: 'STATIC', staticValue: '', description: 'Placeholder de gráfico' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_l_1': { source: 'AI', field: 'cliente', description: 'Cliente que contrata' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_l_2': { source: 'AI', field: 'ubicacion.direccion', description: 'Área de estudio' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_l_3': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización del área' },
    'para_la_realizacion_del_monitoreo_establecido_se_s_1': { source: 'STATIC', staticValue: 'cinco (5)', description: 'Número de puntos (numeral)' },
    'para_la_realizacion_del_monitoreo_establecido_se_s_2': { source: 'STATIC', staticValue: '', description: 'Continuación numeral puntos' },
    'el_presente_informe_muestra_los_resultados_de_la_e_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización del área (resumen)' },
    'localizado_en_realizado_el_dia_1': { source: 'DATE', field: 'fullDate', description: 'Fecha del monitoreo' },
    'caracterizar_la_calidad_microbiologica_del_aire_en_1': { source: 'STATIC', staticValue: 'cinco (5)', description: 'Número de puntos (objetivo)' },
    'puntos_en_el_area_de_influencia_del_localizado_en_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Localización (objetivo)' },
    'identificar_la_presencia_en_el_aire_ambiente_de_di_1': { source: 'STATIC', staticValue: 'bacterias y hongos', description: 'Grupos de microorganismos' },
    'el_monitoreo_fue_realizado_por_servicios_de_ingeni_1': { source: 'STATIC', staticValue: 'Resolución 1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM' },
    'localizado_en_se_seleccionaron_un_total_de_1': { source: 'STATIC', staticValue: 'cinco (5)', description: 'Total de puntos seleccionados' },
    'puntos_de_medicion_para_particulas_viables_teniend_1': { source: 'DATE', field: 'fullDate', description: 'Fecha del muestreo' },
    'el_monitoreo_se_realizo_el_dia_1': { source: 'DATE', field: 'fullDate', description: 'Fecha del monitoreo (metodología)' },
    'en_1': { source: 'STATIC', staticValue: 'cinco (5)', description: 'Número de puntos (metodología)' },
    'puntos_ubicados_sobre_1': { source: 'STATIC', staticValue: 'el área de estudio', description: 'Ubicación de los puntos' },
    'puntos_ubicados_sobre_en_el_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Ciudad/departamento de los puntos' },
    'en_el_en_el_1': { source: 'STATIC', staticValue: '', description: 'Continuación narrativa' },
    'en_el_para_el_muestreo_se_utilizo_un_muestreador_1': { source: 'STATIC', staticValue: 'de impactación de seis (6) etapas (Six-Stage Viable Andersen Cascade Impactor)', description: 'Muestreador utilizado' },
    'a_condiciones_actuales_durante_un_tiempo_de_operac_1': { source: 'STATIC', staticValue: '2 minutos por placa', description: 'Tiempo de operación de captura' },
    'var_5': { source: 'STATIC', staticValue: '', description: 'Descripción impactador (párrafo vacío en la fuente, no es un gap)' },
    'var_6': { source: 'STATIC', staticValue: 'Figura 1. Equipo de monitoreo de partículas viables. TISCH Environmental TE-10-860', description: 'Título de la figura del equipo (verificado posicionalmente contra fuente, 2026-08-21)' },
    'var_7': { source: 'STATIC', staticValue: 'Fuente: Manual del equipo., Año 2015.', description: 'Pie de foto del equipo (verificado posicionalmente, 2026-08-21)' },
    'var_8': { source: 'STATIC', staticValue: 'Tabla 3. Ficha técnica del Impactador de cascada.', description: 'Título de la tabla de ficha técnica (verificado posicionalmente, 2026-08-21)' },
    'var_9': { source: 'STATIC', staticValue: 'Fuente: Tomada del manual del equipo., Año 2015.', description: 'Pie de fuente de la tabla de ficha técnica (verificado posicionalmente, 2026-08-21)' },
    'var_24': { source: 'STATIC', staticValue: 'Impactador de cascada', description: 'Título de la fila 0 de la tabla ficha técnica (verificado posicionalmente, 2026-08-21)' },
    'var_25': { source: 'STATIC', staticValue: 'Referencia', description: 'Encabezado de columna 1 (verificado posicionalmente, 2026-08-21)' },
    'var_26': { source: 'STATIC', staticValue: 'Descripción', description: 'Encabezado de columna 2 (verificado posicionalmente, 2026-08-21)' },
    'var_27': { source: 'STATIC', staticValue: 'Modelo', description: 'Etiqueta fila Modelo (verificado posicionalmente, 2026-08-21)' },
    'var_28': { source: 'STATIC', staticValue: 'TE-10-860', description: 'Valor fila Modelo (verificado posicionalmente, 2026-08-21)' },
    'var_29': { source: 'STATIC', staticValue: 'Marca', description: 'Etiqueta fila Marca (verificado posicionalmente, 2026-08-21)' },
    'var_30': { source: 'STATIC', staticValue: 'Tisch Environmental, Inc.', description: 'Valor fila Marca (verificado posicionalmente, 2026-08-21)' },
    'var_31': { source: 'STATIC', staticValue: 'Serial', description: 'Etiqueta fila Serial (verificado posicionalmente, 2026-08-21)' },
    'var_32': { source: 'STATIC', staticValue: '2190', description: 'Valor fila Serial (verificado posicionalmente, 2026-08-21)' },
    'var_35': { source: 'STATIC', staticValue: 'Diámetro de los orificios (mm)', description: 'Etiqueta fila Diámetro de orificios (verificado posicionalmente, 2026-08-21)' },
    'var_34': { source: 'STATIC', staticValue: '1,18 (Fase 1)', description: 'Valor Diámetro Fase 1 (verificado posicionalmente, 2026-08-21)' },
    'var_36': { source: 'STATIC', staticValue: '0,25 (Fase 6)', description: 'Valor Diámetro Fase 6 (verificado posicionalmente, 2026-08-21)' },
    'var_11': { source: 'STATIC', staticValue: '', description: 'Cita bibliográfica de ubicación' },
    'var_40': { source: 'AI', field: 'puntos[0].nombre', description: 'Georreferenciación: punto' },
    'var_41': { source: 'AI', field: 'puntos[0].idMuestra', description: 'Georreferenciación: ID muestra' },
    'var_38': { source: 'STATIC', staticValue: 'N.A.', description: 'Cota (msnm)' },
    'var_39': { source: 'AI', field: 'puntos[0].latitud', description: 'Coordenadas geográficas WGS84' },
    'var_42': { source: 'AI', field: 'puntos[0].norte', description: 'Coordenadas origen nacional norte' },
    'var_43': { source: 'AI', field: 'puntos[0].este', description: 'Coordenadas origen nacional este' },
    'fuente_serambiente_s_a_s_1': { source: 'DATE', field: 'year', description: 'Año de la fuente' },
    'fuente_serambiente_s_a_s_2': { source: 'DATE', field: 'fullDate', description: 'Fecha del muestreo (tabla)' },
    'fuente_serambiente_s_a_s_3': { source: 'DATE', field: 'year', description: 'Año de la fuente 3' },
    'las_condiciones_atmosfericas_reportadas_para_la_zo_1': { source: 'STATIC', staticValue: 'con datos de referencia históricos de la zona', description: 'Origen de datos meteorológicos' },
    'var_12': { source: 'STATIC', staticValue: '', description: 'Variables meteorológicas fila' },
    'var_13': { source: 'STATIC', staticValue: '', description: 'Variables meteorológicas fila 2' },
    'var_15': { source: 'STATIC', staticValue: '', description: 'Celda de tabla genérica' },
    'var_20': { source: 'DATE', field: 'fullDate', description: 'Fecha en tabla meteorológica/resultados' },
    'teniendo_en_cuenta_los_resultados_obtenidos_para_l_1': { source: 'STATIC', staticValue: 'dentro de los rangos normales para la época del año', description: 'Temperatura observada' },
    'teniendo_en_cuenta_los_resultados_obtenidos_para_l_2': { source: 'STATIC', staticValue: 'dentro de los rangos normales para la zona', description: 'Presión atmosférica observada' },
    'para_la_presion_atmosferica_se_obtuvo_un_valor_de__1': { source: 'STATIC', staticValue: 'dentro de los rangos normales para la zona', description: 'Humedad relativa observada' },
    'para_la_presion_atmosferica_se_obtuvo_un_valor_de__2': { source: 'STATIC', staticValue: 'sin precipitación significativa durante el muestreo', description: 'Precipitación observada' },
    'la_humedad_relativa_registro_un_resultado_de_mient_1': { source: 'STATIC', staticValue: 'las condiciones fueron favorables para el desarrollo del muestreo', description: 'Conclusión meteorológica' },
    'en_la_cual_se_presenta_graficamente_la_direccion_c_1': { source: 'STATIC', staticValue: 'predominante de la zona', description: 'Dirección del viento' },
    'en_el_anexo_4_hoja_de_calculo_incertidumbre_se_pre_1': { source: 'STATIC', staticValue: 'de acuerdo con la metodología de estimación de incertidumbre del laboratorio', description: 'Incertidumbre continuación 1' },
    'en_el_anexo_4_hoja_de_calculo_incertidumbre_se_pre_2': { source: 'STATIC', staticValue: '', description: 'Incertidumbre continuación 2' },
    'se_presentan_los_resultados_del_conteo_y_la_identi_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Ubicación de puntos (resultados)' },
    'var_44': { source: 'STATIC', staticValue: '', description: 'Tabla resultados encabezado' },
    'para_el_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Punto analizado (7.0 micras)' },
    'para_el_las_particulas_con_diametro_de_7_0_micras__1': { source: 'STATIC', staticValue: 'Bacillus spp.', description: 'Género bacteriano predominante 7.0µm' },
    'con_una_concentracion_de_1': { source: 'STATIC', staticValue: 'baja', description: 'Concentración 7.0µm' },
    'para_las_particulas_con_diametro_entre_0_65_1_10_m_1': { source: 'STATIC', staticValue: 'Staphylococcus spp.', description: 'Género bacteriano predominante 0.65-1.10µm' },
    'se_obtuvieron_que_los_generos_predominantes_presun_1': { source: 'STATIC', staticValue: 'baja', description: 'Concentración 0.65-1.10µm' },
    'para_el_punto_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Punto con concentraciones más altas' },
    'con_una_concentracion_de_2': { source: 'STATIC', staticValue: 'baja', description: 'Concentración 2' },
    'se_realiza_un_comparativo_de_los_resultados_obteni_1': { source: 'STATIC', staticValue: 'cinco (5) puntos', description: 'Puntos comparados' },
    'de_monitoreo_ubicados_en_del_mes_de_1': { source: 'DATE', field: 'month', description: 'Mes de monitoreo' },
    'a_continuacion_se_presentan_un_comparativo_de_los__1': { source: 'STATIC', staticValue: 'cinco (5) puntos', description: 'Puntos comparados 2' },
    'de_monitoreo_ubicados_en_el_1': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad de los puntos' },
    'de_monitoreo_ubicados_en_el_2': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento de los puntos' },
    'var_47': { source: 'STATIC', staticValue: '', description: 'Tabla histórico encabezado' },
    'el_recuento_de_microorganismos_obtenidos_en_el_1': { source: 'DATE', field: 'monthYear', description: 'Periodo del recuento' },
    'el_recuento_de_microorganismos_obtenidos_en_el_en__1': { source: 'STATIC', staticValue: 'los puntos evaluados', description: 'Alcance del recuento' },
    'en_los_se_encuentran_con_concentraciones_que_varia_1': { source: 'STATIC', staticValue: 'niveles bajos a moderados', description: 'Rango de concentraciones' },
    'tabla_6_al_comparar_los_datos_arrojados_en_este_pu_1': { source: 'DATE', field: 'month', description: 'Mes de mayores concentraciones' },
    'al_comparar_los_datos_arrojados_en_este_punto_se_p_1': { source: 'DATE', field: 'year', description: 'Año de mayores concentraciones' },
    'de_y_las_concentraciones_de_menor_valor_en_el_mes__1': { source: 'STATIC', staticValue: 'del periodo evaluado', description: 'Mes de menor concentración' },
    'var_14': { source: 'STATIC', staticValue: '', description: 'Continuación de análisis histórico' },
    'en_respuesta_a_los_compromisos_establecidos_con_la_1': { source: 'AI', field: 'cliente', description: 'Cliente (conclusiones)' },
    'en_respuesta_a_los_compromisos_establecidos_con_la_2': { source: 'DATE', field: 'fullDate', description: 'Fecha de la evaluación (conclusiones)' },
    'una_evaluacion_ambiental_de_particulas_viables_en__1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Área de estudio (conclusiones)' },
    'de_acuerdo_con_la_clasificacion_boutin_mostrada_en_1': { source: 'STATIC', staticValue: 'encuentran dentro de las categorías de baja y moderada contaminación microbiológica', description: 'Conclusión clasificación Boutin' },
    'las_especies_bacterianas_presuntivas_de_mayores_cr_1': { source: 'STATIC', staticValue: 'Bacillus spp. y Staphylococcus spp.', description: 'Especies bacterianas predominantes' },
    'las_estructuras_microscopicas_micoticas_presuntiva_1': { source: 'STATIC', staticValue: 'Aspergillus spp. y Penicillium spp.', description: 'Estructuras micóticas predominantes' },
    'el_punto_presenta_las_concentraciones_mas_altas_de_1': { source: 'DATE', field: 'monthYear', description: 'Mes de concentración más alta' },
    '17_resultados_del_recuento_de_microorganismos_1': { source: 'STATIC', staticValue: '', description: 'Tabla 17: continuacion del titulo Resultados del Recuento de microorganismos' },
    '1_permite_identificar_que_bajo_las_condiciones_amb_1': { source: 'STATIC', staticValue: '', description: 'Flujo promedio de operacion durante el muestreo (dato especifico de campo, no determinable)' },
    '3_se_muestra_la_rosa_de_vientos_consolidada_por_el_1': { source: 'DATE', field: 'year', description: 'Anyo de la rosa de vientos consolidada IDEAM (Figura 3)' },
    '7_resultados_del_recuento_de_microorganismos_1': { source: 'STATIC', staticValue: '', description: 'Tabla 7: continuacion del titulo Resultados del Recuento de microorganismos' },
    'var_21': { source: 'STATIC', staticValue: '', description: 'Tabla identificacion/microorganismo: celda fila (tag repetido)' },
    'var_22': { source: 'STATIC', staticValue: '', description: 'Tabla identificacion/microorganismo: celda fila 2 (tag repetido)' },
    'var_48': { source: 'STATIC', staticValue: '', description: 'Header de pagina (header2.xml): fragmento final tras los campos de numero de pagina' },
};
exports.PARTICULAS_VIABLES_CONFIG = {
    templateType: 'PARTICULAS_VIABLES',
    displayName: 'Informe de Partículas Viables',
    filePattern: 'FO-PO-PSM-66-20',
    fields: Object.assign(Object.assign({}, AGUA_FIELDS), PARTICULAS_LEGACY_FIELDS)
};
// ================================================================
// FUENTES FIJAS - INFORME PREVIO (67-10) — delta sobre AGUA_FIELDS
// ================================================================
const FUENTES_FIJAS_PREVIO_DELTA_FIELDS = {
    'a_traves_del_representante_legal_1': { source: 'AI', field: 'representanteNombre', description: 'Representante legal' },
    'identificado_con_cedula_de_ciudadania_no_1': { source: 'STATIC', staticValue: '', description: 'Cédula representante legal' },
    'de_evaluacion_de_emisiones_atmosfericas_de_fuentes_1': { source: 'AI', field: 'tipoEstudio', description: 'Tipo de evaluación de emisiones' },
    'la_cual_se_encuentra_ubicada_en_las_instalaciones__1': { source: 'AI', field: 'cliente', description: 'Instalaciones del cliente' },
    'localizado_en_1': { source: 'AI', field: 'ubicacion.direccion', description: 'Dirección de las instalaciones' },
    'en_la_organizacion_tiene_como_actividad_principal_1': { source: 'STATIC', staticValue: 'actividades industriales sujetas a control de emisiones atmosféricas.', description: 'Actividad principal de la organización' },
    'erambiente_s_a_s_empresa_acreditada_por_el_institu_1': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM' },
    'para_producir_informacion_cuantitativa_fisica_y_qu_1': { source: 'STATIC', staticValue: '', description: 'Continuación acreditación (1)' },
    'fisica_y_quimica_para_los_estudios_o_analisis_ambi_1': { source: 'STATIC', staticValue: '', description: 'Continuación acreditación (2)' },
    'la_fecha_programada_para_llevar_a_cabo_la_evaluaci_1': { source: 'DATE', field: 'fullDate', description: 'Fecha programada de evaluación' },
    'a_evaluar_por_medicion_directa_de_material_1': { source: 'STATIC', staticValue: 'Particulado (PM) y gases de combustión', description: 'Contaminantes a evaluar' },
    'var_6': { source: 'STATIC', staticValue: '', description: 'Objetivo específico (1)' },
    'var_7': { source: 'STATIC', staticValue: '', description: 'Objetivo específico (2)' },
    'var_9': { source: 'STATIC', staticValue: '', description: 'Operación de instalaciones (1)' },
    'var_11': { source: 'STATIC', staticValue: '', description: 'Operación de instalaciones (2)' },
    'var_12': { source: 'STATIC', staticValue: '', description: 'Operación de instalaciones (3)' },
    'var_24': { source: 'STATIC', staticValue: '', description: 'Operación de instalaciones (4)' },
    'var_25': { source: 'STATIC', staticValue: '', description: 'Operación de instalaciones (5)' },
    'para_la_planeacion_previa_a_la_evaluacion_de_las_m_1': { source: 'STATIC', staticValue: 'de campo correspondientes,', description: 'Formatos de planeación previa' },
    'var_47': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (1)' },
    'var_27': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (2)' },
    'var_28': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (3)' },
    'var_30': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (4)' },
    'var_31': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (5)' },
    'var_33': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (6)' },
    'var_34': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (7)' },
    'var_36': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (8)' },
    'var_37': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (9)' },
    'var_39': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (10)' },
    'var_40': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (11)' },
    'var_42': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (12)' },
    'var_43': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (13)' },
    'var_45': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (14)' },
    'var_46': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (15)' },
    'var_48': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (16)' },
    'var_49': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (17)' },
    'var_50': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes/contaminantes/métodos (18)' },
    'fuente_serambiente_s_a_s_1': { source: 'DATE', field: 'year', description: 'Año fuente SERAMBIENTE (tabla)' },
    'muestreo_preliminar_1': { source: 'STATIC', staticValue: '', description: 'Encabezado muestreo preliminar' },
    'metodos_preliminares_1': { source: 'STATIC', staticValue: '', description: 'Encabezado métodos preliminares' },
    'var_51': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (1)' },
    'var_52': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (2)' },
    'var_53': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (3)' },
    'var_54': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (4)' },
    'var_55': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (5)' },
    'var_56': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (6)' },
    'var_57': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (7)' },
    'var_58': { source: 'STATIC', staticValue: '', description: 'Tabla métodos preliminares (8)' },
    'fuente_1': { source: 'STATIC', staticValue: 'EPA (Environmental Protection Agency)', description: 'Fuente normativa métodos preliminares' },
    'para_determinar_parametros_que_son_fundamentales_p_1': { source: 'STATIC', staticValue: 'para el diseño del muestreo isocinético.', description: 'Propósito del muestreo preliminar' },
    'var_21': { source: 'STATIC', staticValue: '', description: 'Métodos de toma de muestra (final)' },
    'var_59': { source: 'STATIC', staticValue: '', description: 'Esquema del sistema de muestreo (1)' },
    'var_60': { source: 'STATIC', staticValue: '', description: 'Esquema del sistema de muestreo (2)' },
    'var_61': { source: 'STATIC', staticValue: '', description: 'Esquema del sistema de muestreo (3)' },
    'var_22': { source: 'STATIC', staticValue: '', description: 'Nota final del informe (1)' },
    'var_23': { source: 'STATIC', staticValue: '', description: 'Nota final del informe (2)' },
    'var_62': { source: 'STATIC', staticValue: '', description: 'Continuación título portada' },
};
// PREVIOS EN FUENTES FIJAS (67-10)
exports.FUENTES_FIJAS_PREVIO_CONFIG = {
    templateType: 'FUENTES_FIJAS_PREVIO',
    displayName: 'Informe Previo de Fuentes Fijas',
    filePattern: 'FO-PO-PSM-67-10',
    fields: Object.assign(Object.assign({}, AGUA_FIELDS), FUENTES_FIJAS_PREVIO_DELTA_FIELDS)
};
// ================================================================
// FUENTES FIJAS - INFORME FINAL (67-11) — delta sobre AGUA_FIELDS + FUENTES_FIJAS_PREVIO_DELTA_FIELDS
// ================================================================
const FUENTES_FIJAS_DELTA_FIELDS = {
    'monitoreo_de_emisiones_en_fuentes_fijas_realizado__1': { source: 'DATE', field: 'fullDate', description: 'Fecha de monitoreo (portada)' },
    'chart_indices': { source: 'STATIC', staticValue: '', description: 'Índice de gráficos (placeholder)' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_r_1': { source: 'AI', field: 'cliente', description: 'Cliente (resumen ejecutivo)' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_r_2': { source: 'AI', field: 'tipoEstudio', description: 'Tipo de estudio (resumen ejecutivo)' },
    'en_las_instalaciones_de_la_organizacion_en_la_ciud_1': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad de las instalaciones' },
    'departamento_de_monitoreando_el_contaminante_de_ma_1': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento de las instalaciones' },
    'la_organizacion_tiene_como_actividad_principal_1': { source: 'STATIC', staticValue: 'actividades industriales sujetas a control de emisiones atmosféricas.', description: 'Actividad principal de la organización' },
    'este_informe_presenta_los_resultados_del_estudio_d_1': { source: 'STATIC', staticValue: 'fijas evaluadas', description: 'Fuentes evaluadas (resumen)' },
    'a_traves_de_monitoreo_isocinetico_1': { source: 'STATIC', staticValue: 'de material particulado y gases de combustión.', description: 'Método de monitoreo (isocinético)' },
    'evaluadas_cumplen_con_lo_establecido_en_el_protoco_1': { source: 'STATIC', staticValue: '', description: 'Continuación referencia protocolo de medición (1)' },
    'con_lo_establecido_en_el_protocolo_de_medicion_de__1': { source: 'STATIC', staticValue: 'y en la Resolución 909 de 2008.', description: 'Continuación referencia protocolo de medición (2)' },
    'evaluadas_cuentan_con_1': { source: 'STATIC', staticValue: 'sistemas de control de emisiones', description: 'Sistemas de control de emisiones' },
    'cuentan_con_1': { source: 'STATIC', staticValue: 'establecido', description: 'Continuación sistemas de control' },
    'valor_tomado_de_la_resolucion_909_de_2008_para_flu_1': { source: 'STATIC', staticValue: 'volumétrico normalizado.', description: 'Referencia flujo de contaminante (Res. 909/2008)' },
    'el_monitoreo_y_analisis_fueron_realizados_por_serv_1': { source: 'STATIC', staticValue: 'Resolución 1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM (introducción)' },
    'para_dar_cumplimiento_a_su_programa_de_control_y_s_1': { source: 'AI', field: 'representanteNombre', description: 'Representante (contratación del servicio)' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_l_1': { source: 'AI', field: 'tipoEstudio', description: 'Tipo de estudio (introducción)' },
    'en_las_instalaciones_de_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Instalaciones (introducción)' },
    'se_presentan_1': { source: 'STATIC', staticValue: 'las fuentes fijas evaluadas', description: 'Fuentes evaluadas (tabla 3)' },
    'en_el_area_de_estudio_de_la_organizacion_localizad_1': { source: 'STATIC', staticValue: 'Las coordenadas de ubicación se registraron', description: 'Coordenadas de ubicación' },
    'en_el_area_de_estudio_de_la_organizacion_localizad_2': { source: 'AI', field: 'ubicacion.direccion', description: 'Localización de la organización' },
    'var_44': { source: 'STATIC', staticValue: '', description: 'Georreferenciación (1)' },
    'var_45': { source: 'STATIC', staticValue: '', description: 'Georreferenciación (2)' },
    'fuente_serambiente_s_a_s_2': { source: 'DATE', field: 'year', description: 'Año fuente SERAMBIENTE (figura localización)' },
    'alizacion_geografica_de_la_1': { source: 'AI', field: 'cliente', description: 'Localización geográfica (figura)' },
    'el_muestreo_se_realizo_de_acuerdo_con_los_requerim_1': { source: 'STATIC', staticValue: 'establecidos en la normativa ambiental vigente', description: 'Metodología de muestreo' },
    'asimismo_se_tuvieron_en_cuenta_los_procedimientos__1': { source: 'STATIC', staticValue: 'y', description: 'Continuación procedimientos internos' },
    'la_legislacion_colombiana_aplicable_a_las_emisione_1': { source: 'STATIC', staticValue: 'V del Protocolo para el Control y Vigilancia de la Contaminación Atmosférica Generada por Fuentes Fijas', description: 'Referencia normativa (capítulo)' },
    's_actividades_de_1': { source: 'AI', field: 'tipoEstudio', description: 'Actividades de la organización (objetivo general)' },
    'cuantificar_la_emision_de_1': { source: 'STATIC', staticValue: 'material particulado (MP) y óxido de nitrógeno (NOx)', description: 'Contaminantes a cuantificar' },
    'var_63': { source: 'STATIC', staticValue: '', description: 'Tabla información general (1)' },
    'var_64': { source: 'STATIC', staticValue: '', description: 'Tabla información general (2)' },
    'var_65': { source: 'STATIC', staticValue: '', description: 'Tabla información general (3)' },
    'var_66': { source: 'STATIC', staticValue: '', description: 'Tabla información general (4)' },
    'var_67': { source: 'STATIC', staticValue: '', description: 'Tabla información general (5)' },
    'var_68': { source: 'STATIC', staticValue: '', description: 'Tabla información general (6)' },
    'var_69': { source: 'STATIC', staticValue: '', description: 'Tabla información general (7)' },
    'var_70': { source: 'STATIC', staticValue: '', description: 'Tabla información general (8)' },
    'var_73': { source: 'STATIC', staticValue: '', description: 'Tabla información general (9)' },
    'var_74': { source: 'STATIC', staticValue: '', description: 'Tabla información general (10)' },
    'var_75': { source: 'STATIC', staticValue: '', description: 'Tabla información general (11)' },
    'var_76': { source: 'STATIC', staticValue: '', description: 'Tabla información general (12)' },
    'var_77': { source: 'STATIC', staticValue: '', description: 'Tabla información general (13)' },
    'var_72': { source: 'STATIC', staticValue: '', description: 'Tabla información general (14)' },
    'var_78': { source: 'STATIC', staticValue: '', description: 'Tabla información general (15)' },
    'var_80': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (1)' },
    'var_81': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (2)' },
    'var_82': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (3)' },
    'var_83': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (4)' },
    'var_84': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (5)' },
    'var_85': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (6)' },
    'var_86': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (7)' },
    'var_87': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (8)' },
    'var_88': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (9)' },
    'var_89': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (10)' },
    'var_90': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (11)' },
    'var_91': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (12)' },
    'var_92': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (13)' },
    'var_95': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (14)' },
    'var_96': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (15)' },
    'var_97': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (16)' },
    'var_98': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (17)' },
    'var_99': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (18)' },
    'var_100': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (19)' },
    'var_101': { source: 'STATIC', staticValue: '', description: 'Tabla fuentes de emisión (20)' },
    'el_monitoreo_fue_realizado_por_la_empresa_servicio_1': { source: 'STATIC', staticValue: 'Resolución 1262 del 18 de junio de 2021', description: 'Resolución acreditación IDEAM (personal técnico)' },
    'para_producir_informacion_cuantitativa_fisica_y_qu_2': { source: 'STATIC', staticValue: 'el equipo técnico de campo,', description: 'Supervisión técnica de campo' },
    'bajo_supervision_del_1': { source: 'STATIC', staticValue: 'coordinador técnico', description: 'Cargo del supervisor' },
    'el_cual_puede_ser_contactado_al_numero_de_celular_1': { source: 'STATIC', staticValue: 'registrado en la Orden de Trabajo.', description: 'Contacto del supervisor' },
    '14_metodos_preliminares_1': { source: 'STATIC', staticValue: '', description: 'Encabezado tabla métodos preliminares' },
    'y_el_protocolo_para_el_control_de_la_contaminacion_1': { source: 'STATIC', staticValue: 'Resolución 909 de 2008', description: 'Referencia protocolo de contaminación atmosférica' },
    'var_26': { source: 'STATIC', staticValue: '', description: 'Métodos de muestreo preliminar (1)' },
    'var_29': { source: 'STATIC', staticValue: '', description: 'Métodos de muestreo preliminar (2)' },
    'var_102': { source: 'STATIC', staticValue: '', description: 'Tabla parámetros de medición (1)' },
    'var_103': { source: 'STATIC', staticValue: '', description: 'Tabla parámetros de medición (2)' },
    'var_104': { source: 'STATIC', staticValue: '', description: 'Tabla parámetros de medición (3)' },
    'var_105': { source: 'STATIC', staticValue: '', description: 'Tabla parámetros de medición (4)' },
    'var_106': { source: 'STATIC', staticValue: '', description: 'Tabla parámetros de medición (5)' },
    'var_107': { source: 'STATIC', staticValue: '', description: 'Tabla parámetros de medición (6)' },
    'var_108': { source: 'STATIC', staticValue: '', description: 'Tabla parámetros de medición (7)' },
    'var_109': { source: 'STATIC', staticValue: 'Determinación gravimétrica de material particulado', description: 'Procedimiento de laboratorio (1)' },
    'var_110': { source: 'STATIC', staticValue: 'Determinación de gases por celda electroquímica', description: 'Procedimiento de laboratorio (2)' },
    'var_111': { source: 'STATIC', staticValue: 'Calibración y verificación de equipos', description: 'Procedimiento de laboratorio (3)' },
    'var_112': { source: 'STATIC', staticValue: 'Control de calidad interno del laboratorio', description: 'Procedimiento de laboratorio (4)' },
    'se_presenta_las_incertidumbres_de_los_resultados_a_1': { source: 'STATIC', staticValue: 'de acuerdo con la metodología de estimación de incertidumbre del laboratorio.', description: 'Metodología de incertidumbre' },
    'var_114': { source: 'STATIC', staticValue: '', description: 'Ángulo de muestreo obtenido' },
    'var_120': { source: 'STATIC', staticValue: '', description: 'Tabla condiciones de muestreo (fugas)' },
    'var_32': { source: 'STATIC', staticValue: '', description: 'Soportes de control de información (1)' },
    'var_33': { source: 'STATIC', staticValue: '', description: 'Soportes de control de información (2)' },
    'var_34': { source: 'STATIC', staticValue: '', description: 'Soportes de control de información (3)' },
    'var_35': { source: 'STATIC', staticValue: '', description: 'Soportes de control de información (4)' },
    'var_36': { source: 'STATIC', staticValue: '', description: 'Soportes de control de información (5)' },
    'se_realizo_correccion_a_oxigeno_de_referencia_del_1': { source: 'STATIC', staticValue: '7% de O2 para procesos de combustión,', description: 'Corrección a oxígeno de referencia (MP)' },
    'se_realizo_correccion_a_oxigeno_de_referencia_del__1': { source: 'STATIC', staticValue: 'según lo aplicable a la fuente evaluada.', description: 'Continuación corrección oxígeno (MP)' },
    'las_concentraciones_obtenidas_de_material_particul_1': { source: 'STATIC', staticValue: 'presentan cumplimiento', description: 'Resultado cumplimiento MP' },
    'se_realizo_correccion_a_oxigeno_de_referencia_del__2': { source: 'STATIC', staticValue: 'según lo aplicable a la fuente evaluada.', description: 'Continuación corrección oxígeno (NOx)' },
    'despues_de_haber_realizado_el_monitoreo_de_emision_1': { source: 'AI', field: 'cliente', description: 'Organización evaluada (conclusiones)' },
    'en_la_lugar_de_monitoreo_en_1': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Lugar de monitoreo (conclusiones)' },
    'mp_en_1': { source: 'STATIC', staticValue: 'las fuentes evaluadas,', description: 'Fuentes evaluadas MP (conclusiones)' },
    'aplicable_conforme_al_1': { source: 'STATIC', staticValue: 'Artículo 8', description: 'Artículo aplicable (Res. 909/2008)' },
    'de_la_resolucion_909_de_2008_debido_a_que_se_repor_1': { source: 'STATIC', staticValue: 'dentro del límite normativo aplicable.', description: 'Continuación conclusión MP' },
    'segun_el_calculo_uca_se_establece_una_periodicidad_1': { source: 'STATIC', staticValue: 'cada 3 años', description: 'Periodicidad de muestreo (cálculo UCA, MP)' },
    'segun_el_calculo_uca_se_establece_una_periodicidad_2': { source: 'STATIC', staticValue: 'significancia bajo.', description: 'Grado de significancia (cálculo UCA, MP)' },
    'las_emisiones_de_oxido_de_nitrogeno_nox_para_las_f_1': { source: 'STATIC', staticValue: 'presentan cumplimiento', description: 'Resultado cumplimiento NOx' },
    'de_la_resolucion_909_de_2008_al_reportar_una_conce_1': { source: 'STATIC', staticValue: 'dentro del límite normativo aplicable.', description: 'Continuación conclusión NOx' },
    'segun_el_calculo_uca_se_establece_una_periodicidad_3': { source: 'STATIC', staticValue: 'significancia bajo', description: 'Grado de significancia (cálculo UCA, NOx)' },
    'var_157': { source: 'STATIC', staticValue: 'Ver Anexo 1', description: 'Referencia anexo formatos de campo' },
    'var_126': { source: 'STATIC', staticValue: '', description: 'Anexo datos y resultados (1)' },
    'var_128': { source: 'STATIC', staticValue: '', description: 'Anexo datos y resultados (2)' },
    'var_130': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (1)' },
    'var_132': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (2)' },
    'var_134': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (3)' },
    'var_136': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (4)' },
    'var_138': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (5)' },
    'var_140': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (6)' },
    'var_142': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (7)' },
    'var_144': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (8)' },
    'var_146': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (9)' },
    'var_148': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (10)' },
    'var_150': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (11)' },
    'var_152': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (12)' },
    'var_154': { source: 'STATIC', staticValue: '', description: 'Anexo calibraciones (13)' },
    'var_156': { source: 'STATIC', staticValue: 'Ver Anexo 4', description: 'Referencia anexo resolución de acreditación' },
    'var_158': { source: 'STATIC', staticValue: 'Ver Anexo 5', description: 'Referencia anexo resultados de laboratorio' },
    'var_38': { source: 'STATIC', staticValue: '', description: 'Nota final del informe' },
    'var_159': { source: 'STATIC', staticValue: '', description: 'Continuación título portada' },
};
// FUENTES FIJAS (67-11)
exports.FUENTES_FIJAS_CONFIG = {
    templateType: 'FUENTES_FIJAS',
    displayName: 'Informe de Fuentes Fijas',
    filePattern: 'FO-PO-PSM-67-11',
    fields: Object.assign(Object.assign(Object.assign({}, AGUA_FIELDS), FUENTES_FIJAS_PREVIO_DELTA_FIELDS), FUENTES_FIJAS_DELTA_FIELDS)
};
// ================================================================
// CAMPOS COMPARTIDOS V2 (tags semánticos modernos, plantillas
// recuperadas de templates/docxtemplater/ y activadas en templates/reports/)
// ================================================================
const V2_COMMON_FIELDS = {
    'cliente_nombre': { source: 'AI', field: 'cliente', description: 'Nombre del cliente' },
    'monitoreo_ciudad': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad del monitoreo' },
    'monitoreo_departamento': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento del monitoreo' },
    'empresa_responsable_estudio': { source: 'SYSTEM', description: 'Empresa que ejecuta el estudio' },
    'cliente_representante_nombre': { source: 'AI', field: 'representanteNombre', description: 'Representante del cliente' },
    'cliente_representante_telefono': { source: 'AI', field: 'representanteTelefono', description: 'Teléfono del representante' },
    'cliente_direccion': { source: 'AI', field: 'ubicacion.direccion', description: 'Dirección del cliente' },
    'muestra_id': { source: 'AI', field: 'puntos[0].idMuestra', description: 'Identificador de la muestra' },
    'muestra_fecha': { source: 'DATE', field: 'fullDate', description: 'Fecha de la muestra' },
    'punto_nombre': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre del punto de muestreo' },
    'reporte_numero': { source: 'OIT', field: 'oitNumber', description: 'Número de OIT/reporte' },
    'informe_version': { source: 'STATIC', staticValue: 'V00', description: 'Versión del informe' },
    'informe_codigo_v01': { source: 'OIT', field: 'oitNumber', description: 'Código del informe' },
    'informe_fecha_emision': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión' },
    'elaborado_nombre': { source: 'STATIC', staticValue: 'Equipo Técnico ALS', description: 'Elaborado por' },
    'revisado_nombre': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Revisado por' },
    'autorizado_nombre': { source: 'STATIC', staticValue: 'Dirección Técnica ALS', description: 'Autorizado por' },
};
// BIOTA (74-01) — sin veredicto de conformidad (índices/BMW dejados como sección
// condicional vacía hasta que Dirección Técnica confirme la tabla de referencia)
exports.BIOTA_CONFIG = {
    templateType: 'BIOTA',
    displayName: 'Informe de Biota',
    filePattern: 'FO-PO-PSM-74-01',
    fields: Object.assign({}, V2_COMMON_FIELDS)
};
// SUELOS (64-11) — sin veredicto de conformidad (no existe normativa colombiana de referencia)
exports.SUELO_CONFIG = {
    templateType: 'SUELO',
    displayName: 'Informe de Suelos',
    filePattern: 'FO-PO-PSM-64-11',
    fields: Object.assign({}, V2_COMMON_FIELDS)
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
    'BIOTA': exports.BIOTA_CONFIG,
    'SUELO': exports.SUELO_CONFIG,
};
function getTemplateType(fileName) {
    const upper = fileName.toUpperCase();
    if (upper.includes('RESPEL') || upper.includes('64-09'))
        return 'RESPEL';
    if (upper.includes('PUNTO SECO') || upper.includes('64-10'))
        return 'PUNTO_SECO';
    if (upper.includes('64-08') || upper.includes('SUBTERR'))
        return 'ASUB';
    if (upper.includes('74-01') || upper.includes('BIOTA'))
        return 'BIOTA';
    if (upper.includes('64-11') || upper.includes('SUELO'))
        return 'SUELO';
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
