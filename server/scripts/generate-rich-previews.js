const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const { Jimp } = require('jimp');

const TPL_DIR = path.join(__dirname, '../templates/docxtemplater');
const OUT_DIR = path.join(__dirname, '../templates/docxtemplater/pdf_samples');
const PREVIEW_DIR = path.join(__dirname, '../uploads/preview_images');
const TMP_DIR = path.join(__dirname, '../tmp_rich_gen');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true });
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/*  Generate rich dummy images                                        */
/* ------------------------------------------------------------------ */

  const imgDir = path.join(TMP_DIR, 'images');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  const configs = [
    { name: 'foto_punto', w: 600, h: 400, bg: 0x87CEEB, text: 'Fotografía\nPunto de Muestreo', color: 0x000000 },
    { name: 'foto_punto2', w: 600, h: 400, bg: 0x98D8C8, text: 'Fotografía\nEquipo in Situ', color: 0x000000 },
    { name: 'mapa', w: 600, h: 400, bg: 0x90EE90, text: 'Mapa de Ubicación\nGoogle Earth', color: 0x004400 },
    { name: 'grafica_barras', w: 600, h: 350, bg: 0xFFFFFF, text: 'Gráfica de Resultados\n(ppm)', color: 0x333333 },
    { name: 'grafica_lineas', w: 600, h: 350, bg: 0xFFFFFF, text: 'Tendencia Temporal\nÍndices', color: 0x333333 },
    { name: 'logo_als', w: 300, h: 120, bg: 0xFFFFFF, text: 'ALS SERAMBIENTE', color: 0x0047AB },
  ];

  for (const cfg of configs) {
    const img = new Jimp({ width: cfg.w, height: cfg.h, color: cfg.bg });
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    fontJimp = Jimp.loadFont(await fontJimp; { text: cfg.text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, cfg.w, cfg.h);
    const outPath = path.join(imgDir, `${cfg.name}.png`);
    await img.writeAsync(outPath);
  }

  return imgDir;
}

/* ------------------------------------------------------------------ */
/*  Rich dummy data                                                   */
/* ------------------------------------------------------------------ */
function getRichData(matrix) {
  const imgDir = path.join(TMP_DIR, 'images');

  const base = {
    cliente_nombre: 'ALS SERAMBIENTE S.A.S.',
    cliente_nit: '900.123.456-7',
    cliente_razon_social: 'ALS SERAMBIENTE S.A.S.',
    cliente_direccion: 'Calle 123 # 45 - 67, Barranquilla, Atlántico',
    cliente_telefono: '+57 (5) 385 0000',
    cliente_correo: 'ambiental@als.com.co',
    cliente_proyecto_sede: 'Planta Industrial Barranquilla',

    monitoreo_ciudad: 'Barranquilla',
    monitoreo_departamento: 'Atlántico',
    monitoreo_direccion: 'Km 4 Vía a Tubará, Zona Industrial',
    monitoreo_fecha: '15 de marzo de 2026',
    monitoreo_fecha_corta: '15/03/2026',
    monitoreo_dia: '15',
    monitoreo_mes: 'marzo',
    monitoreo_año: '2026',
    monitoreo_hora_inicio: '06:30',
    monitoreo_hora_fin: '14:45',
    monitoreo_jornada: 'Diurna',

    matriz_tipo: matrix,
    matriz_tipo_titulo: matrix.toUpperCase(),

    informe_codigo: 'OT-14265-1-A-9577-V01',
    informe_codigo_v01: 'OT-14265-1-A-9577-V01',
    informe_fecha_emision: '20/03/2026',
    informe_version: 'V01',
    informe_nota_version: 'Informe inicial. Documenta resultados del primer monitoreo semestral 2026.',

    oit_numero: 'OT-14265-1-A-9577',
    oit_codigo: 'OT-14265',
    oit_prefijo: 'OT-14265-1-A-9577-V01',

    proyecto_nombre: 'Programa de Monitoreo Ambiental Semestral 2026',
    proyecto_sector: 'Industrial - Petróleo y Gas',
    servicio_tipo: 'Monitoreo Ambiental de Vertimientos',

    normativa_aplicable: 'Resolución 631 de 2015, Decreto 1076 de 2015 (Libro VI), Resolución 1207 de 2014',
    normativa_resolucion: 'Resolución 631 de 2015',

    clima_temperatura: '32.5 °C',
    clima_humedad: '78 %',
    clima_direccion_viento: 'NE',
    clima_velocidad_viento: '12 km/h',
    clima_presion: '1013 hPa',
    clima_condiciones: 'Cielo parcialmente nublado, viento moderado, sin precipitaciones',

    tecnico_nombre: 'Ing. Carlos Martínez López',
    tecnico_cargo: 'Ingeniero Ambiental Senior',
    tecnico_registro: 'RETH-12345',

    responsable_nombre: 'Dra. María Elena Rojas Pinzón',
    responsable_cargo: 'Directora Técnica de Operaciones',

    reviso_nombre: 'Ing. Pedro Gómez Torres',
    reviso_cargo: 'Jefe de Laboratorio Ambiental',

    aprobo_nombre: 'Dra. Ana Lucia Fernández Vega',
    aprobo_cargo: 'Gerente Técnica y de Calidad',

    header_fecha: '20/03/2026',

    tiene_fotografias: true,
    tiene_resultados_campo: true,
    tiene_resultados_laboratorio: true,
    tiene_anexos: true,
    tiene_graficas: true,
    es_agua_superficial: true,
    es_agua_subterranea: false,
    es_sedimento: false,
    es_suelo: false,
    tiene_icos: true,
    nota_modificacion: false,
    nota_responsabilidad_cliente: true,
  };

  // Narrativas largas y detalladas
  base.narrativa_objetivos = `El presente informe técnico tiene como objetivo principal documentar y evaluar los resultados obtenidos durante la ejecución del Programa de Monitoreo Ambiental Semestral 2026 en la planta industrial de ALS SERAMBIENTE S.A.S., ubicada en el municipio de Barranquilla, departamento del Atlántico.

Este estudio se realizó con el fin de evaluar el cumplimiento de la normativa ambiental colombiana aplicable a los vertimientos puntuales de aguas residuales industriales, conforme a lo establecido en la Resolución 631 de 2015 del Ministerio de Ambiente y Desarrollo Sostenible, el Decreto 1076 de 2015 (Libro VI) y las resoluciones aplicables del IDEAM.

Adicionalmente, el informe busca establecer una línea base actualizada de la calidad de los vertimientos, identificar posibles tendencias temporales en los parámetros evaluados, y proporcionar recomendaciones técnicas orientadas al mejoramiento continuo del sistema de tratamiento de aguas residuales (PTAR) y al cumplimiento de las obligaciones ambientales de la empresa.`;

  base.narrativa_metodologia = `La metodología empleada para la ejecución del monitoreo ambiental se fundamentó en los protocolos establecidos por el Instituto de Hidrología, Meteorología y Estudios Ambientales (IDEAM), las guías de la Agencia de Protección Ambiental de los Estados Unidos (US-EPA) y las resoluciones vigentes del Ministerio de Ambiente y Desarrollo Sostenible de Colombia.

Para la determinación de parámetros in situ se utilizaron equipos multiparamétricos calibrados (Hach HQ40d y YSI ProDSS) para la medición de pH, temperatura, conductividad eléctrica, oxígeno disuelto, potencial de hidrógeno y sólidos disueltos totales. La calibración de equipos se realizó antes y después de cada jornada de muestreo con soluciones patrón trazables al NIST.

La toma de muestras compuestas y simples se realizó siguiendo el protocolo del IDEAM para aguas residuales (Protocolo IDEAM 2017). Las muestras fueron preservadas refrigeradas a 4 °C y transportadas en neveras isotérmicas al laboratorio en un tiempo inferior a 6 horas, garantizando la cadena de custodia documentada.

Los análisis de laboratorio se ejecutaron en las instalaciones de ALS Colombia S.A.S. en Barranquilla, acreditado ante el IDEAM con código LAC-001-2024. Los métodos analíticos empleados incluyen espectrofotometría UV-Vis, cromatografía de gases acoplada a espectrometría de masas (GC-MS), cromatografía iónica y voltamperometría de stripping anódico para metales pesados.`;

  base.narrativa_resultados = `Los resultados obtenidos durante el monitoreo realizado el 15 de marzo de 2026 indican que la totalidad de los parámetros evaluados se encuentran dentro de los límites máximos permisibles establecidos en la Resolución 631 de 2015 para vertimientos puntuales a cuerpos de agua dulce de uso categoría 2 (ríos y quebradas).

El parámetro pH registró un valor promedio de 7.2 (rango 6.8 - 7.5), dentro del rango permisible de 6.0 a 9.0 unidades. La Demanda Química de Oxígeno (DQO) presentó un valor de 85 mg/L, por debajo del límite de 120 mg/L establecido. La Demanda Bioquímica de Oxígeno a 5 días (DBO5) fue de 42 mg/L, también dentro del límite de 60 mg/L.

Los metales pesados evaluados (Arsénico, Cadmio, Cromo total, Cobre, Plomo, Mercurio, Níquel y Zinc) se encontraron en concentraciones inferiores a los límites de detección del método o significativamente por debajo de los límites máximos permisibles. El Cromo Hexavalente no fue detectado en ninguna de las muestras analizadas (límite de detección: 0.01 mg/L).

Las grasas y aceites totales registraron un valor de 8.5 mg/L, dentro del límite de 15 mg/L. Los sólidos suspendidos totales fueron de 45 mg/L, por debajo del límite de 100 mg/L. No se detectaron coliformes fecales en las muestras analizadas.`;

  base.narrativa_conclusiones = `Con base en los resultados del análisis integral realizado durante el monitoreo ambiental del 15 de marzo de 2026, se concluye que el vertimiento evaluado de la planta industrial de ALS SERAMBIENTE S.A.S. cumple en su totalidad con la normativa ambiental colombiana vigente, específicamente con los límites máximos permisibles establecidos en la Resolución 631 de 2015 del Ministerio de Ambiente y Desarrollo Sostenible.

La operación del sistema de tratamiento de aguas residuales (PTAR) se encuentra en condiciones óptimas, demostrando una eficiencia de remoción superior al 85 % para los parámetros indicadores de carga orgánica (DQO y DBO5). La estabilidad en los valores de pH y conductividad eléctrica durante las 8 horas de monitoreo continuo indica un proceso de tratamiento bien controlado y homogéneo.

No se identificaron valores anómalos, tendencias de deterioro o parámetros en riesgo de incumplimiento que requieran la implementación de acciones correctivas inmediatas. El programa de monitoreo semestral vigente ha demostrado ser efectivo para el control y seguimiento de la calidad del vertimiento.`;

  base.narrativa_recomendaciones = `Con el fin de mantener el cumplimiento normativo y mejorar continuamente el desempeño ambiental de la planta industrial, se formulan las siguientes recomendaciones técnicas:

1. Continuar con la frecuencia de monitoreo semestral establecida en el Plan de Manejo Ambiental (PMA) vigente, manteniendo la cobertura de todos los parámetros establecidos en la Resolución 631 de 2015.

2. Realizar el mantenimiento preventivo trimestral del sistema de tratamiento de aguas residuales (PTAR), incluyendo la limpieza de sedimentadores, revisión de aireadores y calibración de sistemas de dosificación de reactivos.

3. Calibrar todos los equipos de medición in situ (multiparamétricos, conductivímetros, oxímetros) antes de cada campaña de monitoreo, utilizando soluciones patrón trazables certificadas.

4. Documentar sistemáticamente cualquier variación en las condiciones operativas de la planta (cambios de producción, aumento de caudales, modificaciones en procesos) que pueda afectar la calidad del vertimiento, y comunicarlas al área ambiental con anticipación.

5. Implementar un programa de capacitación anual para el personal operativo de la PTAR, enfocado en la operación óptima del sistema, identificación de fallas y procedimientos de contingencia.`;

  // Arrays completos
  base.laboratorios_parametros = [
    { nombre: 'ALS Colombia S.A.S.', parametro: 'pH, Conductividad, TDS, DQO, DBO5', resolucion: 'Res. 631 de 2015' },
    { nombre: 'Laboratorio Ambiental del Caribe Ltda.', parametro: 'Grasas y Aceites, Fenoles, Color, Turbidez', resolucion: 'Res. 631 de 2015' },
    { nombre: 'LabCorp Barranquilla', parametro: 'Metales Pesados (As, Cd, Cr, Cu, Pb, Hg, Ni, Zn)', resolucion: 'Res. 631 de 2015' },
    { nombre: 'IDEAM - Laboratorio Nacional', parametro: 'Coliformes Fecales, E. coli, Enterococos', resolucion: 'Res. 1207 de 2014' },
  ];

  base.puntos_monitoreo = [
    { id: 'PM-01', nombre: 'Vertimiento PTAR - Descarga Final', descripcion: 'Punto de descarga del efluente tratado al cuerpo receptor (caño)', coordenadas: '10°58\'45.2"N  74°47\'12.8"W', latitud: '10.9792', longitud: '-74.7869', ubicacion: '10°58\'45.2"N, 74°47\'12.8"W' },
    { id: 'PM-02', nombre: 'Pozo Piezométrico PZ-01', descripcion: 'Pozo de monitoreo de agua subterránea aguas abajo de la PTAR', coordenadas: '10°58\'52.1"N  74°47\'18.5"W', latitud: '10.9811', longitud: '-74.7885', ubicacion: '10°58\'52.1"N, 74°47\'18.5"W' },
    { id: 'PM-03', nombre: 'Afluente PTAR - Entrada', descripcion: 'Muestra del agua residual antes del tratamiento', coordenadas: '10°58\'38.7"N  74°47\'08.3"W', latitud: '10.9774', longitud: '-74.7856', ubicacion: '10°58\'38.7"N, 74°47\'08.3"W' },
  ];

  base.equipos_in_situ = [
    { nombre: 'Multiparamétrico Hach HQ40d', codigo: 'INS-001', serie: 'SN123456-2024', calibracion: '10/02/2026', vigencia: '10/08/2026' },
    { nombre: 'GPS Garmin GPSMAP 64sx', codigo: 'INS-015', serie: 'SN789012-2023', calibracion: '05/01/2026', vigencia: '05/07/2026' },
    { nombre: 'Termómetro Digital Hanna HI98501', codigo: 'INS-022', serie: 'SN456789-2025', calibracion: '20/02/2026', vigencia: '20/08/2026' },
  ];

  base.metodos_analiticos = [
    { parametro: 'pH', metodo: 'SM 4500-H+ B (Electrométrico)', equipo: 'Potenciómetro multiparamétrico', limite: '0.01 unidades pH' },
    { parametro: 'Conductividad', metodo: 'SM 2510 B (Conductimétrico)', equipo: 'Conductivímetro', limite: '1 μS/cm' },
    { parametro: 'DQO', metodo: 'SM 5220 D (Método del Dicromato)', equipo: 'Reactor de digestión Hach DRB200', limite: '5 mg/L' },
    { parametro: 'DBO5', metodo: 'SM 5210 B (Método de la Winkler)', equipo: 'Oxímetro dissolvede YSI Pro20', limite: '2 mg/L' },
    { parametro: 'Grasas y Aceites', metodo: 'SM 5520 B (Extracción gravimétrica)', equipo: 'Balanza analítica Sartorius', limite: '1 mg/L' },
    { parametro: 'Metales (As, Cd, Cr, Cu, Pb, Hg, Ni, Zn)', metodo: 'EPA 6020B (ICP-MS)', equipo: 'Espectrómetro ICP-MS PerkinElmer', limite: '0.001 mg/L' },
  ];

  base.resultados_campo = [
    { parametro: 'pH', unidad: 'Unidades pH', valor_pm1: '7.2', norma: '6.0 - 9.0', conformidad: 'Conforme' },
    { parametro: 'Temperatura', unidad: '°C', valor_pm1: '28.5', norma: '< 40', conformidad: 'Conforme' },
    { parametro: 'Conductividad', unidad: 'μS/cm', valor_pm1: '450', norma: '< 1200', conformidad: 'Conforme' },
    { parametro: 'Oxígeno Disuelto', unidad: 'mg/L', valor_pm1: '5.8', norma: '> 4.0', conformidad: 'Conforme' },
    { parametro: 'Potencial Redox', unidad: 'mV', valor_pm1: '-185', norma: '-200 a -100', conformidad: 'Conforme' },
  ];

  base.resultados_laboratorio = [
    { parametro: 'DQO', unidad: 'mg/L', valor_pm1: '85', norma: '< 120', conformidad: 'Conforme' },
    { parametro: 'DBO5', unidad: 'mg/L', valor_pm1: '42', norma: '< 60', conformidad: 'Conforme' },
    { parametro: 'Grasas y Aceites', unidad: 'mg/L', valor_pm1: '8.5', norma: '< 15', conformidad: 'Conforme' },
    { parametro: 'Sólidos Suspendidos Totales', unidad: 'mg/L', valor_pm1: '45', norma: '< 100', conformidad: 'Conforme' },
    { parametro: 'Sólidos Sedimentables', unidad: 'mL/L', valor_pm1: '0.8', norma: '< 1.0', conformidad: 'Conforme' },
    { parametro: 'Cromo Total', unidad: 'mg/L', valor_pm1: '0.05', norma: '< 0.5', conformidad: 'Conforme' },
    { parametro: 'Cromo Hexavalente', unidad: 'mg/L', valor_pm1: '< 0.01', norma: '< 0.1', conformidad: 'Conforme' },
    { parametro: 'Plomo', unidad: 'mg/L', valor_pm1: '0.02', norma: '< 0.5', conformidad: 'Conforme' },
    { parametro: 'Mercurio', unidad: 'mg/L', valor_pm1: '< 0.001', norma: '< 0.01', conformidad: 'Conforme' },
    { parametro: 'Arsénico', unidad: 'mg/L', valor_pm1: '0.015', norma: '< 0.1', conformidad: 'Conforme' },
    { parametro: 'Cadmio', unidad: 'mg/L', valor_pm1: '< 0.005', norma: '< 0.05', conformidad: 'Conforme' },
    { parametro: 'Fenoles Totales', unidad: 'mg/L', valor_pm1: '0.12', norma: '< 0.5', conformidad: 'Conforme' },
    { parametro: 'Coliformes Fecales', unidad: 'NMP/100mL', valor_pm1: '< 2', norma: '< 1000', conformidad: 'Conforme' },
  ];

  base.anexos = [
    { nombre: 'Planilla de toma de muestras - Campaña Marzo 2026', archivo: 'Anexo_1_Planilla_Muestreo.pdf', laboratorio: 'N/A', paginas: '4' },
    { nombre: 'Cadena de custodia completa', archivo: 'Anexo_2_Cadena_Custodia.pdf', laboratorio: 'N/A', paginas: '3' },
    { nombre: 'Certificado de calibración - Multiparamétrico Hach HQ40d', archivo: 'Anexo_3_Cert_HQ40d.pdf', laboratorio: 'ALS Metrología', paginas: '2' },
    { nombre: 'Certificado de calibración - GPS Garmin 64sx', archivo: 'Anexo_4_Cert_GPS.pdf', laboratorio: 'ALS Metrología', paginas: '2' },
    { nombre: 'Hojas de vida equipos de campo', archivo: 'Anexo_5_Hojas_Vida.pdf', laboratorio: 'N/A', paginas: '6' },
    { nombre: 'Resultados de laboratorio - ALS Colombia S.A.S.', archivo: 'Anexo_6_Resultados_Lab.pdf', laboratorio: 'ALS Colombia S.A.S.', paginas: '15' },
    { nombre: 'Fotografías del monitoreo (15 imágenes)', archivo: 'Anexo_7_Fotografias.zip', laboratorio: 'N/A', paginas: '16' },
    { nombre: 'Mapa de ubicación de puntos de monitoreo', archivo: 'Anexo_8_Mapa.pdf', laboratorio: 'N/A', paginas: '2' },
  ];

  // Images as buffers (for image module)
  try {
    
    
    
    
    
  } catch (e) {
    // if images not generated yet, skip
  }

  return base;
}

/* ------------------------------------------------------------------ */
/*  Main generation loop                                               */
/* ------------------------------------------------------------------ */
async function main() {
  const imgDir = console.log("[SKIP] Image generation disabled");
  console.log('[IMG] Dummy images generated in', imgDir);

  const templates = fs.readdirSync(TPL_DIR).filter(f => f.endsWith('.docx'));

  for (const tpl of templates) {
    const matrix = tpl.replace('PLANTILLA_', '').replace('_DOCXTEMPLATER.docx', '').replace(/_/g, ' ');
    const data = getRichData(matrix);
    const tplPath = path.join(TPL_DIR, tpl);
    const tmpDocx = path.join(TMP_DIR, tpl.replace('.docx', '_RICH.docx'));
    const outPdf = path.join(OUT_DIR, tpl.replace('.docx', '.pdf'));

    try {
      console.log(`[GEN] ${tpl} ...`);
      const content = fs.readFileSync(tplPath, 'binary');
      const zip = new PizZip(content);

      // Image module config
      let modules = []; // Image module disabled - no jimp
      try {
          centered: false,
          getImage: (tagValue) => tagValue,
          getSize: () => [500, 320],
        };
      }

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        modules,
        nullGetter: () => '',
      });

      doc.render(data);
      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      fs.writeFileSync(tmpDocx, buf);

      console.log(`[PDF] Converting ${path.basename(tmpDocx)} ...`);
      execSync(
        `soffice --headless --convert-to pdf --outdir "${OUT_DIR}" "${tmpDocx}"`,
        { stdio: 'ignore', timeout: 60000 }
      );

      const generated = path.join(OUT_DIR, path.basename(tmpDocx).replace('.docx', '.pdf'));
      if (fs.existsSync(generated)) {
        if (generated !== outPdf) fs.renameSync(generated, outPdf);
        console.log(`[OK] ${path.basename(outPdf)}`);
      } else {
        console.error(`[FAIL] PDF not generated for ${tpl}`);
      }
    } catch (err) {
      console.error(`[ERR] ${tpl}: ${err.message}`);
    }
  }

  // Clean temp DOCX
  for (const f of fs.readdirSync(TMP_DIR)) {
    if (f.endsWith('.docx')) fs.unlinkSync(path.join(TMP_DIR, f));
  }

  // Generate preview images
  console.log('\n[PREVIEW] Generando imágenes de preview...');
  const pdfs = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.pdf'));
  for (const pdf of pdfs) {
    const base = pdf.replace('.pdf', '');
    const imgDirOut = path.join(PREVIEW_DIR, base);
    if (!fs.existsSync(imgDirOut)) fs.mkdirSync(imgDirOut, { recursive: true });
    try {
      execSync(
        `pdftoppm -png -r 150 -cropbox "${path.join(OUT_DIR, pdf)}" "${path.join(imgDirOut, 'page')}"`,
        { stdio: 'ignore', timeout: 60000 }
      );
      const files = fs.readdirSync(imgDirOut).sort();
      let c = 1;
      for (const f of files) {
        if (f.startsWith('page-')) {
          const nn = `page-${c}.png`;
          if (f !== nn) fs.renameSync(path.join(imgDirOut, f), path.join(imgDirOut, nn));
          c++;
        }
      }
      console.log(`[PREVIEW OK] ${base} - ${c - 1} páginas`);
    } catch (e) {
      console.error(`[PREVIEW ERR] ${pdf}: ${e.message}`);
    }
  }

  // Clean tmp images
    fs.unlinkSync(path.join(TMP_DIR, 'images', f));
  }
  fs.rmdirSync(TMP_DIR);

  console.log('\nDone! PDFs:', OUT_DIR, '| Images:', PREVIEW_DIR);
}

main().catch(console.error);
