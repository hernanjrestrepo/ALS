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
    'fuente_1': { source: 'STATIC', staticValue: 'SERAMBIENTE S.A.S.', description: 'Fuente tabla meteorológica' },
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
// PUNTO SECO V2 (64-10) — formato actualizado Serambiente (agosto 2026)
// Tageado con IA (gpt-oss:120b-cloud) + verificacion posicional exacta,
// aplicado sobre el formato limpio entregado por Xiomara Quintero.
// ================================================================
const PUNTO_SECO_V2_FIELDS = {
    // --- HEADER ---
    'header_matriz': { source: 'STATIC', staticValue: 'AGUA - PUNTO SECO', description: 'Título del header repetido en cada página' },
    // --- PORTADA ---
    'nombre_cliente': { source: 'AI', field: 'cliente', description: 'Nombre del cliente (portada)' },
    'dia': { source: 'DATE', field: 'day', description: 'Día de la fecha del informe' },
    'ano': { source: 'DATE', field: 'year', description: 'Año de la fecha del informe' },
    'codigo_adicional': { source: 'STATIC', staticValue: '', description: 'Código adicional (portada, sin uso conocido)' },
    'ciudad': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad del monitoreo' },
    'departamento': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento del monitoreo' },
    // --- INFORMACIÓN DE LA EMPRESA ---
    'razon_social': { source: 'AI', field: 'cliente', description: 'Razón social completa del cliente' },
    'nombre_representante_cliente': { source: 'AI', field: 'representanteNombre', description: 'Nombre del representante del cliente' },
    'telefono_representante': { source: 'AI', field: 'representanteTelefono', description: 'Teléfono del representante del cliente' },
    'direccion_cliente': { source: 'AI', field: 'ubicacion.direccion', description: 'Dirección de la sede del cliente' },
    'departamento_monitoreo': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento donde se ejecutó el monitoreo' },
    'municipio_monitoreo': { source: 'AI', field: 'ubicacion.ciudad', description: 'Municipio/ciudad donde se ejecutó el monitoreo' },
    // --- LABORATORIO / METODOLOGÍA ---
    'referencia': { source: 'STATIC', staticValue: 'Resolución 1262 del 18 de junio de 2021', description: 'Resolución de acreditación IDEAM' },
    // --- TABLA 3: DATOS GENERALES (celdas insertadas) ---
    'fecha_monitoreo': { source: 'DATE', field: 'fullDate', description: 'Fecha del monitoreo' },
    'lugar_monitoreo': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Lugar del monitoreo' },
    'duracion_muestreo': { source: 'AI', field: 'duracionMuestreo', description: 'Duración del muestreo' },
    'puntos_monitoreo': { source: 'AI', field: 'numeroPuntos', description: 'Número de puntos de monitoreo' },
    'tipo_estudio': { source: 'AI', field: 'tipoEstudio', description: 'Tipo de estudio' },
    // --- TABLA 4: VISITA DE CAMPO (celdas insertadas) ---
    'fecha_visita_label': { source: 'DATE', field: 'fullDate', description: 'Fecha de la visita de campo' },
    'sitio_visita': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Sitio o lugar de la visita' },
    // --- TABLA 5: DESCRIPCIÓN DEL PUNTO ---
    'codigo_descripcion': { source: 'AI', field: 'puntos[0].descripcion', description: 'Descripción del punto de monitoreo' },
    'foto1_descripcion': { source: 'AI', field: 'puntos[0].fotoDescripcion', description: 'Descripción fotografía 1' },
    'foto2_descripcion': { source: 'AI', field: 'puntos[1].fotoDescripcion', description: 'Descripción fotografía 2' },
    'fuente_foto': { source: 'DATE', field: 'year', description: 'Año fuente registro fotográfico' },
    // --- UBICACIÓN Y CLIMA ---
    'municipio': { source: 'AI', field: 'ubicacion.ciudad', description: 'Municipio del punto de monitoreo' },
    'departamento_monitoreo_2': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento del punto de monitoreo' },
    'ciudad_repetido': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad (repetida en párrafo de clima)' },
    'codigo_clima': { source: 'STATIC', staticValue: 'Aw', description: 'Clasificación climática Köppen-Geiger' },
    'temperatura_media_anual': { source: 'AI', field: 'clima.temperatura', description: 'Temperatura media anual (°C)' },
    'precipitacion_anual': { source: 'AI', field: 'clima.precipitacion', description: 'Precipitación anual (mm)' },
    // --- TABLA 6: COORDENADAS ---
    'nombre_punto': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre del punto de monitoreo' },
    'coordenada_latitud_grados': { source: 'AI', field: 'puntos[0].latitud', description: 'Latitud del punto (formato grados/min/seg completo)' },
    'coordenada_latitud_minutos': { source: 'STATIC', staticValue: '', description: 'Minutos de latitud (incluido en coordenada_latitud_grados)' },
    'coordenada_latitud_segundos': { source: 'STATIC', staticValue: '', description: 'Segundos de latitud (incluido en coordenada_latitud_grados)' },
    'coordenada_latitud_dir': { source: 'STATIC', staticValue: 'N', description: 'Dirección de latitud' },
    'coordenada_longitud_grados': { source: 'AI', field: 'puntos[0].longitud', description: 'Longitud del punto (formato grados/min/seg completo)' },
    'coordenada_longitud_minutos': { source: 'STATIC', staticValue: '', description: 'Minutos de longitud (incluido en coordenada_longitud_grados)' },
    'fuente_imagen': { source: 'DATE', field: 'year', description: 'Año fuente tabla coordenadas' },
    'fuente_imagen_2': { source: 'DATE', field: 'year', description: 'Año fuente imagen Google Earth' },
    // --- CONCLUSIONES ---
    'nombre_empresa': { source: 'AI', field: 'cliente', description: 'Nombre de la empresa (conclusiones)' },
    'numero_puntos': { source: 'AI', field: 'numeroPuntos', description: 'Cantidad de puntos de monitoreo (conclusiones)' },
    'numero_puntos_detalle': { source: 'STATIC', staticValue: '', description: 'Detalle adicional del número de puntos' },
    // --- ANEXOS ---
    'fuente_anexos': { source: 'DATE', field: 'year', description: 'Año fuente tabla de anexos' },
    // --- HISTORIAL DE CAMBIOS (versión 00) ---
    'identificacion_informe': { source: 'OIT', field: 'oitNumber', description: 'Identificador único del informe (versión 00)' },
    'fecha_emision': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 00)' },
    'firma_autor1': { source: 'STATIC', staticValue: '', description: 'Firma del elaborador' },
    'firma_autor2': { source: 'STATIC', staticValue: '', description: 'Firma del revisor' },
    'firma_autor3': { source: 'STATIC', staticValue: '', description: 'Firma del aprobador' },
    'nombre_firmante1': { source: 'STATIC', staticValue: 'Equipo Técnico Serambiente', description: 'Nombre del elaborador' },
    'nombre_firmante2': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del revisor' },
    'nombre_firmante3': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del aprobador' },
    'fecha_emision_label': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (celda insertada, versión 01)' },
    // --- HISTORIAL DE CAMBIOS (versión 01) ---
    'identificacion_informe_version': { source: 'OIT', field: 'oitNumber', description: 'Identificador único del informe (versión 01)' },
    'fecha_version': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 01)' },
    'firma_version1': { source: 'STATIC', staticValue: '', description: 'Firma del elaborador (versión 01)' },
    'firma_version2': { source: 'STATIC', staticValue: '', description: 'Firma del revisor (versión 01)' },
    'firma_version3': { source: 'STATIC', staticValue: '', description: 'Firma del aprobador (versión 01)' },
    'nombre_firmante_version1': { source: 'STATIC', staticValue: 'Equipo Técnico Serambiente', description: 'Nombre del elaborador (versión 01)' },
    'nombre_firmante_version2': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del revisor (versión 01)' },
    'nombre_firmante_version3': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del aprobador (versión 01)' },
    'fuente_modificacion': { source: 'DATE', field: 'year', description: 'Año fuente historial de cambios' },
    // --- NOTA FINAL (identificación de anulación) ---
    'codigo_matriz_anulada': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz del informe anulado' },
    'identificacion_anulada': { source: 'OIT', field: 'oitNumber', description: 'Identificador del informe anulado' },
    'identificacion_nueva': { source: 'OIT', field: 'oitNumber', description: 'Identificador del informe nuevo (reemplazo)' },
};
exports.PUNTO_SECO_CONFIG = {
    templateType: 'PUNTO_SECO',
    displayName: 'Informe de Punto Seco (Agua)',
    filePattern: 'FO-PO-PSM-64-10',
    fields: Object.assign({}, PUNTO_SECO_V2_FIELDS)
};
// ================================================================
// RESPEL (64-09) — formato actualizado Serambiente (agosto 2026)
// Tageado con IA (gpt-oss:120b-cloud) + verificacion posicional exacta
// + correccion manual de drift de indice (documento de 753 nodos, mayor
// densidad de bloques repetidos que Punto Seco).
// ================================================================
const RESPEL_V2_FIELDS = {
    // --- HEADER / PORTADA ---
    'header_matriz': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz repetido en el header de cada página' },
    'matrix_name': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz (portada)' },
    'client_name': { source: 'AI', field: 'cliente', description: 'Nombre del cliente (portada)' },
    'site_location': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Sede/ubicación (portada)' },
    'matrix_type': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz (título del informe)' },
    'sampling_day': { source: 'DATE', field: 'day', description: 'Día del monitoreo' },
    'sampling_year': { source: 'DATE', field: 'year', description: 'Año del monitoreo' },
    'sampling_month': { source: 'DATE', field: 'month', description: 'Mes del monitoreo' },
    'department': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento (portada)' },
    'matrix_name_objective': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz (objetivo del estudio)' },
    'point_number_words': { source: 'AI', field: 'numeroPuntos', description: 'Número de puntos de monitoreo (en letras/número)' },
    'point_number': { source: 'AI', field: 'numeroPuntos', description: 'Número de puntos de monitoreo' },
    'municipality_department': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Municipio/departamento del monitoreo' },
    'matrix_name_sampling': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz (contexto de muestreo)' },
    'sampling_point_identifier': { source: 'AI', field: 'puntos[0].nombre', description: 'Identificador del punto de muestreo' },
    // --- INFORMACIÓN DE LA EMPRESA ---
    'company_full_name': { source: 'AI', field: 'cliente', description: 'Razón social completa del cliente' },
    'client_address': { source: 'AI', field: 'ubicacion.direccion', description: 'Dirección de la sede del cliente' },
    'monitoring_department': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento donde se ejecutó el monitoreo' },
    'monitoring_city': { source: 'AI', field: 'ubicacion.ciudad', description: 'Municipio/ciudad donde se ejecutó el monitoreo' },
    'client_name_repeat': { source: 'AI', field: 'cliente', description: 'Nombre del cliente (repetido en párrafo introductorio)' },
    'matrix_name_second': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz (párrafo introductorio)' },
    'resolution_number': { source: 'STATIC', staticValue: '1262 del 18 de junio de 2021', description: 'Número de resolución de acreditación IDEAM' },
    'resolution_date': { source: 'STATIC', staticValue: '18 de junio de 2021', description: 'Fecha de la resolución de acreditación IDEAM' },
    'placeholder_unknown_237': { source: 'DATE', field: 'year', description: 'Año fuente tabla de laboratorios acreditados' },
    'study_characterization_matrix': { source: 'AI', field: 'tipoMatriz', description: 'Descripción del tipo de estudio (matriz)' },
    // --- IDENTIFICACIÓN DE MUESTRAS ---
    'sample_id': { source: 'OIT', field: 'oitNumber', description: 'Identificación de la muestra / número de reporte' },
    'sample_id_secondary': { source: 'OIT', field: 'oitNumber', description: 'Identificación secundaria de la muestra' },
    'placeholder_unknown_263': { source: 'DATE', field: 'year', description: 'Año fuente tabla de identificación de muestras' },
    'location_X1': { source: 'STATIC', staticValue: '', description: 'Ubicación complementaria (sin dato confiable disponible)' },
    'location_X2': { source: 'STATIC', staticValue: '', description: 'Ubicación complementaria (sin dato confiable disponible)' },
    'municipality_department_2': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Municipio/departamento (metodología)' },
    'sampling_day_2': { source: 'DATE', field: 'day', description: 'Día de muestreo (metodología)' },
    'placeholder_unknown_359': { source: 'DATE', field: 'year', description: 'Año fuente tabla de métodos analíticos' },
    // --- PUNTOS DE MONITOREO / FOTOGRAFÍAS ---
    'monitoring_point_label': { source: 'AI', field: 'puntos[0].nombre', description: 'Etiqueta del punto de monitoreo' },
    'photo_description_1': { source: 'AI', field: 'puntos[0].fotoDescripcion', description: 'Descripción fotografía 1' },
    'photo_description_2': { source: 'AI', field: 'puntos[1].fotoDescripcion', description: 'Descripción fotografía 2' },
    'municipality_department_3': { source: 'AI', field: 'ubicacion.ciudadDepartamento', description: 'Municipio/departamento (ubicación geográfica)' },
    'point_name_id': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre/ID del punto de monitoreo' },
    'point_time': { source: 'STATIC', staticValue: '', description: 'Hora de toma del punto (sin dato confiable disponible)' },
    'point_elevation': { source: 'STATIC', staticValue: '', description: 'Elevación del punto (sin dato confiable disponible)' },
    'placeholder_unknown_500': { source: 'STATIC', staticValue: '', description: 'Fila de formato/ejemplo de la tabla de coordenadas (sin dato confiable disponible)' },
    'latitude_degrees': { source: 'AI', field: 'puntos[0].latitud', description: 'Latitud del punto de monitoreo' },
    'latitude_full': { source: 'AI', field: 'puntos[0].latitud', description: 'Latitud completa del punto de monitoreo' },
    'longitude_degrees': { source: 'AI', field: 'puntos[0].longitud', description: 'Longitud del punto de monitoreo' },
    'longitude_full': { source: 'AI', field: 'puntos[0].longitud', description: 'Longitud completa del punto de monitoreo' },
    'graph_source_year': { source: 'DATE', field: 'year', description: 'Año fuente imagen de localización geográfica' },
    'annex_source_year': { source: 'DATE', field: 'year', description: 'Año fuente anexos' },
    // --- CLIMA ---
    'average_annual_temperature': { source: 'AI', field: 'clima.temperatura', description: 'Temperatura media anual (°C)' },
    // --- RESULTADOS ---
    'result_point_name': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre del punto (tabla de resultados)' },
    'result_unknown_554': { source: 'STATIC', staticValue: '', description: 'Valor de resultado sin campo confiable disponible' },
    'source_year_509': { source: 'DATE', field: 'year', description: 'Año fuente imagen puntos de monitoreo' },
    'source_year_516': { source: 'DATE', field: 'year', description: 'Año fuente Google Earth' },
    'result_unknown_561': { source: 'STATIC', staticValue: '', description: 'Valor de resultado sin campo confiable disponible (tabla comparación)' },
    // --- PORTADA / IDENTIFICACIÓN DEL PROYECTO ---
    'project_name': { source: 'AI', field: 'cliente', description: 'Nombre del proyecto (portada)' },
    'city': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad (portada)' },
    'economic_activity': { source: 'STATIC', staticValue: '', description: 'Actividad económica (se obtiene del RUES o la web del cliente, sin dato confiable disponible)' },
    'sampling_site': { source: 'AI', field: 'puntos[0].nombre', description: 'Sitio de muestreo (tabla de identificación de muestras)' },
    'sampling_location_X3': { source: 'AI', field: 'numeroPuntos', description: 'Número de puntos de la ubicación de muestreo' },
    // --- HISTORIAL DE CAMBIOS (versión 00) ---
    'report_id_initial': { source: 'OIT', field: 'oitNumber', description: 'Identificador único del informe (versión 00)' },
    'report_date_initial': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 00)' },
    'signature_line_1': { source: 'STATIC', staticValue: '', description: 'Firma del elaborador' },
    'signature_line_2': { source: 'STATIC', staticValue: '', description: 'Firma del revisor' },
    'signature_line_3': { source: 'STATIC', staticValue: '', description: 'Firma del aprobador' },
    'signer_name_1': { source: 'STATIC', staticValue: 'Equipo Técnico Serambiente', description: 'Nombre del elaborador' },
    'signer_name_2': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del revisor' },
    'signer_name_3': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del aprobador' },
    // --- HISTORIAL DE CAMBIOS (versión 01) ---
    'version_number': { source: 'STATIC', staticValue: '01', description: 'Número de versión del informe' },
    'report_id_revision': { source: 'OIT', field: 'oitNumber', description: 'Identificador único del informe (versión 01)' },
    'report_date_revision': { source: 'DATE', field: 'fullDate', description: 'Fecha de emisión (versión 01)' },
    'signature_line_rev_1': { source: 'STATIC', staticValue: '', description: 'Firma del elaborador (versión 01)' },
    'signature_line_rev_2': { source: 'STATIC', staticValue: '', description: 'Firma del revisor (versión 01)' },
    'signature_line_rev_3': { source: 'STATIC', staticValue: '', description: 'Firma del aprobador (versión 01)' },
    'signer_name_rev_1': { source: 'STATIC', staticValue: 'Equipo Técnico Serambiente', description: 'Nombre del elaborador (versión 01)' },
    'signer_name_rev_2': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del revisor (versión 01)' },
    'signer_name_rev_3': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Nombre del aprobador (versión 01)' },
    // --- NOTA FINAL (identificación de anulación) ---
    'modification_year': { source: 'DATE', field: 'year', description: 'Año fuente historial de cambios' },
    'matrix_name_modification': { source: 'AI', field: 'tipoMatriz', description: 'Tipo de matriz del informe anulado' },
    'report_id_modification': { source: 'OIT', field: 'oitNumber', description: 'Identificador del informe anulado' },
    'report_id_final': { source: 'OIT', field: 'oitNumber', description: 'Identificador del informe nuevo (reemplazo)' },
};
exports.RESPEL_CONFIG = {
    templateType: 'RESPEL',
    displayName: 'Caracterización de Residuos Peligrosos',
    filePattern: 'FO-PO-PSM-64-09',
    fields: Object.assign({}, RESPEL_V2_FIELDS)
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
};
exports.RUIDO_INTRADOMICILIARIO_CONFIG = {
    templateType: 'RUIDO_INTRADOMICILIARIO',
    displayName: 'Estudio de Ruido Intradomiciliario',
    filePattern: 'FO-PO-PSM-65-08',
    fields: Object.assign(Object.assign(Object.assign({}, AGUA_FIELDS), ERRA_LEGACY_FIELDS), RUIDO_INTRADOMICILIARIO_DELTA_FIELDS)
};
// EMISIÓN DE RUIDO Y RUIDO AMBIENTAL (65-09)
exports.EMISION_RUIDO_AMBIENTAL_CONFIG = {
    templateType: 'EMISION_RUIDO_AMBIENTAL',
    displayName: 'Estudio de Emisión de Ruido y Ruido Ambiental',
    filePattern: 'FO-PO-PSM-65-09',
    fields: Object.assign(Object.assign({}, AGUA_FIELDS), ERRA_LEGACY_FIELDS)
};
// CALIDAD DE AIRE (66-18)
exports.CALIDAD_AIRE_CONFIG = {
    templateType: 'CALIDAD_AIRE',
    displayName: 'Informe de Calidad de Aire',
    filePattern: 'FO-PO-PSM-66-18',
    fields: Object.assign({}, AGUA_FIELDS)
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
    'var_23': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre de estación (tabla ubicación)' },
    'var_24': { source: 'STATIC', staticValue: 'N.A.', description: 'Cota (msnm) — no siempre disponible' },
    'var_25': { source: 'AI', field: 'puntos[0].latitud', description: 'Coordenada geográfica' },
    'var_26': { source: 'AI', field: 'puntos[0].norte', description: 'Coordenada origen nacional' },
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
    'var_5': { source: 'STATIC', staticValue: '', description: 'Descripción impactador' },
    'var_6': { source: 'STATIC', staticValue: '', description: 'Descripción impactador 2' },
    'var_7': { source: 'STATIC', staticValue: '', description: 'Descripción impactador 3' },
    'var_8': { source: 'STATIC', staticValue: '', description: 'Descripción impactador 4' },
    'var_9': { source: 'STATIC', staticValue: '', description: 'Descripción impactador 5' },
    'var_24': { source: 'STATIC', staticValue: '', description: 'Tabla equipo' },
    'var_25': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 2' },
    'var_26': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 3' },
    'var_27': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 4' },
    'var_28': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 5' },
    'var_29': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 6' },
    'var_30': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 7' },
    'var_31': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 8' },
    'var_32': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 9' },
    'var_35': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 10' },
    'var_34': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 11' },
    'var_36': { source: 'STATIC', staticValue: '', description: 'Tabla equipo 12' },
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
    'elaborado_nombre': { source: 'STATIC', staticValue: 'Equipo Técnico Serambiente', description: 'Elaborado por' },
    'revisado_nombre': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Revisado por' },
    'autorizado_nombre': { source: 'STATIC', staticValue: 'Dirección Técnica Serambiente', description: 'Autorizado por' },
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
