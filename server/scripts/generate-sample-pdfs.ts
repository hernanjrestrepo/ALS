// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMPLATES_DIR = path.join(__dirname, '../templates/docxtemplater');
const OUTPUT_DIR = path.join(__dirname, '../templates/docxtemplater/pdf_samples');
const TEMP_DIR = path.join(__dirname, '../tmp_preview_gen');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const templates = [
  'PLANTILLA_AGUA_MARINA_DOCXTEMPLATER.docx',
  'PLANTILLA_BIOTA_DOCXTEMPLATER.docx',
  'PLANTILLA_CA_AUTOMATICOS_DOCXTEMPLATER.docx',
  'PLANTILLA_CA_CALIDAD_AIRE_DOCXTEMPLATER.docx',
  'PLANTILLA_CA_OLORES_DOCXTEMPLATER.docx',
  'PLANTILLA_EMISION_RUIDO_DOCXTEMPLATER.docx',
  'PLANTILLA_ER_RA_UNIFICADO_DOCXTEMPLATER.docx',
  'PLANTILLA_FF_DOCXTEMPLATER.docx',
  'PLANTILLA_PARTICULAS_VIABLES_DOCXTEMPLATER.docx',
  'PLANTILLA_PUNTO_SECO_DOCXTEMPLATER.docx',
  'PLANTILLA_RESPEL_DOCXTEMPLATER.docx',
  'PLANTILLA_RUIDO_AMBIENTAL_DOCXTEMPLATER.docx',
  'PLANTILLA_SUELO_DOCXTEMPLATER.docx',
];

// Dummy data that covers most common placeholders
function getDummyData(matrix: string): any {
  const base = {
    cliente_nombre: 'ALS SERAMBIENTE S.A.S.',
    cliente_nit: '900.XXX.XXX-1',
    cliente_proyecto_sede: 'Planta Industrial Barranquilla',
    cliente_razon_social: 'ALS SERAMBIENTE S.A.S.',
    cliente_correo: 'ambiental@als.com.co',
    cliente_direccion: 'Carrera 52 No. 79 - 367, Barranquilla, Atlántico',
    cliente_telefono: '(5) 385 0000',
    monitoreo_ciudad: 'Barranquilla',
    monitoreo_departamento: 'Atlántico',
    monitoreo_direccion: 'Km 4 Vía a Tubará, Barranquilla, Atlántico',
    monitoreo_fecha: '15 de marzo de 2026',
    monitoreo_fecha_corta: '15/03/2026',
    monitoreo_dia: '15',
    monitoreo_mes: 'marzo',
    monitoreo_año: '2026',
    monitoreo_hora_inicio: '07:30',
    monitoreo_hora_fin: '15:30',
    monitoreo_jornada: 'diurna',
    matriz_tipo: matrix,
    matriz_tipo_titulo: matrix.toUpperCase(),
    informe_codigo: 'OT-12345-1-A-2026-V01',
    informe_codigo_v01: 'OT-12345-1-A-2026-V01',
    informe_fecha_emision: '20/03/2026',
    informe_version: 'V01',
    informe_nota_version: 'Informe inicial',
    normativa_aplicable: 'Res. 631 de 2015, Decreto 1076 de 2015',
    normativa_resolucion: 'Res. 631 de 2015',
    oit_numero: 'OT-12345-1-A-2026',
    oit_codigo: 'OT-12345',
    oit_prefijo: 'OT-12345-1-A-2026-V01',
    proyecto_nombre: 'Programa de Monitoreo Ambiental 2026',
    proyecto_sector: 'Industrial',
    servicio_tipo: 'Monitoreo Ambiental',
    clima_temperatura: '32 °C',
    clima_humedad: '78 %',
    clima_direccion_viento: 'NE',
    clima_velocidad_viento: '12 km/h',
    clima_presion: '1013 hPa',
    clima_condiciones: 'Cielo parcialmente nublado, viento moderado',
    equipo_nombre: 'Equipo multiparamétrico Hach HQ40d',
    equipo_codigo: 'INS-001',
    equipo_marca: 'Hach',
    equipo_modelo: 'HQ40d',
    equipo_numero_serie: 'SN123456',
    tecnico_nombre: 'Ing. Carlos Martínez',
    tecnico_cargo: 'Ingeniero Ambiental',
    tecnico_registro: 'RETH-12345',
    responsable_nombre: 'Dra. María Elena Rojas',
    responsable_cargo: 'Directora Técnica',
    reviso_nombre: 'Ing. Pedro Gómez',
    reviso_cargo: 'Jefe de Laboratorio',
    aprobo_nombre: 'Dra. Ana Lucia Fernández',
    aprobo_cargo: 'Gerente Técnica',
    footer_pagina: '1',
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

  // Arrays for loops
  base.laboratorios_parametros = [
    { nombre: 'Laboratorio ALS Colombia S.A.S.', parametro: 'pH, Conductividad, TDS', resolucion: 'Res. 631 de 2015' },
    { nombre: 'Laboratorio Ambiental del Caribe', parametro: 'DQO, DBO5, Grasas y Aceites', resolucion: 'Res. 631 de 2015' },
    { nombre: 'LabCorp Barranquilla', parametro: 'Metales Pesados (As, Cd, Cr, Cu, Pb, Hg, Ni, Zn)', resolucion: 'Res. 631 de 2015' },
  ];

  base.puntos_monitoreo = [
    { id: 'PM-01', nombre: 'Punto de Vertimiento PTAR', descripcion: 'Descarga final del tratamiento', coordenadas: '10.9876°N, 74.7890°W', latitud: '10.9876', longitud: '-74.7890', ubicacion: '10°59\'15"N, 74°47\'20"W' },
    { id: 'PM-02', nombre: 'Pozo de Monitoreo PZ-01', descripcion: 'Pozo piezométrico agua subterránea', coordenadas: '10.9880°N, 74.7895°W', latitud: '10.9880', longitud: '-74.7895', ubicacion: '10°59\'17"N, 74°47\'22"W' },
  ];

  base.equipos_in_situ = [
    { nombre: 'Multiparamétrico Hach HQ40d', codigo: 'INS-001', serie: 'SN123456', calibracion: '15/02/2026', vigencia: '15/08/2026' },
    { nombre: 'GPS Garmin GPSMAP 64s', codigo: 'INS-015', serie: 'SN789012', calibracion: '10/01/2026', vigencia: '10/07/2026' },
  ];

  base.metodos_analiticos = [
    { parametro: 'pH', metodo: 'SM 4500-H+ B', equipo: 'Potenciómetro', limite: '0.01 pH unidades' },
    { parametro: 'Conductividad', metodo: 'SM 2510 B', equipo: 'Conductivímetro', limite: '1 μS/cm' },
    { parametro: 'DQO', metodo: 'SM 5220 D', equipo: 'Reactor digestión', limite: '5 mg/L' },
  ];

  base.resultados_campo = [
    { parametro: 'pH', unidad: 'Unidades pH', valor_pm1: '7.2', norma: '6.5 - 9.0', conformidad: 'Conforme' },
    { parametro: 'Temperatura', unidad: '°C', valor_pm1: '28.5', norma: '< 40', conformidad: 'Conforme' },
    { parametro: 'Conductividad', unidad: 'μS/cm', valor_pm1: '450', norma: '< 1200', conformidad: 'Conforme' },
  ];

  base.resultados_laboratorio = [
    { parametro: 'DQO', unidad: 'mg/L', valor_pm1: '85', norma: '< 120', conformidad: 'Conforme' },
    { parametro: 'DBO5', unidad: 'mg/L', valor_pm1: '42', norma: '< 60', conformidad: 'Conforme' },
    { parametro: 'Grasas y Aceites', unidad: 'mg/L', valor_pm1: '8.5', norma: '< 15', conformidad: 'Conforme' },
    { parametro: 'Cromo Total', unidad: 'mg/L', valor_pm1: '0.05', norma: '< 0.5', conformidad: 'Conforme' },
    { parametro: 'Plomo', unidad: 'mg/L', valor_pm1: '0.02', norma: '< 0.5', conformidad: 'Conforme' },
  ];

  base.anexos = [
    { nombre: 'Planilla de toma de muestras', archivo: 'Anexo_1_Planilla.pdf', laboratorio: 'N/A', paginas: '3' },
    { nombre: 'Cadena de custodia', archivo: 'Anexo_2_Cadena.pdf', laboratorio: 'N/A', paginas: '2' },
    { nombre: 'Certificado de calibración equipo multiparamétrico', archivo: 'Anexo_3_Cert_Calibracion.pdf', laboratorio: 'ALS Metrología', paginas: '2' },
    { nombre: 'Resultados de laboratorio', archivo: 'Anexo_4_Resultados_Lab.pdf', laboratorio: 'ALS Colombia S.A.S.', paginas: '12' },
    { nombre: 'Fotografías del monitoreo', archivo: 'Anexo_5_Fotos.zip', laboratorio: 'N/A', paginas: '8' },
  ];

  // Narrativas IA
  base.narrativa_objetivos = 'El presente informe técnico tiene como objetivo documentar los resultados obtenidos durante el monitoreo ambiental realizado en la planta industrial de ALS Serambiente S.A.S., con el fin de evaluar el cumplimiento de la normativa ambiental colombiana aplicable al vertimiento de aguas residuales industriales.';
  base.narrativa_metodologia = 'La metodología empleada para la ejecución del monitoreo ambiental se basó en los protocolos establecidos por el IDEAM y las resoluciones vigentes del Ministerio de Ambiente y Desarrollo Sostenible. Se utilizaron equipos multiparamétricos calibrados para la determinación in situ de pH, temperatura, conductividad y oxígeno disuelto.';
  base.narrativa_resultados = 'Los resultados obtenidos durante el monitoreo indican que los parámetros evaluados se encuentran dentro de los límites máximos permisibles establecidos en la Resolución 631 de 2015 para vertimientos puntuales a cuerpos de agua dulce. No se detectaron valores anómalos que requieran acciones correctivas inmediatas.';
  base.narrativa_conclusiones = 'Con base en los resultados del análisis, se concluye que el vertimiento evaluado cumple con la normativa ambiental colombiana vigente. Se recomienda continuar con el programa de monitoreo semestral y mantener los equipos de tratamiento en óptimas condiciones operativas.';
  base.narrativa_recomendaciones = 'Se recomienda: (1) Mantener la frecuencia de monitoreo semestral, (2) Realizar mantenimiento preventivo de la PTAR, (3) Calibrar equipos de medición antes de cada campaña, (4) Documentar cualquier variación en las condiciones operativas que pueda afectar la calidad del vertimiento.';

  return base;
}

async function main() {
  const { docxService } = require('../src/services/docx.service');

  for (const tpl of templates) {
    const matrix = tpl.replace('PLANTILLA_', '').replace('_DOCXTEMPLATER.docx', '').replace(/_/g, ' ');
    const data = getDummyData(matrix);
    const outDocx = path.join(TEMP_DIR, tpl.replace('.docx', '_SAMPLE.docx'));
    const outPdf = path.join(OUTPUT_DIR, tpl.replace('.docx', '.pdf'));

    try {
      console.log(`[GEN] ${tpl} ...`);
      const buf = await docxService.generateDocument(tpl, data);
      fs.writeFileSync(outDocx, buf);

      console.log(`[PDF] Converting ${path.basename(outDocx)} ...`);
      execSync(
        `soffice --headless --convert-to pdf --outdir "${OUTPUT_DIR}" "${outDocx}"`,
        { stdio: 'ignore', timeout: 30000 }
      );

      // LibreOffice names output same as input but with .pdf extension
      const generatedPdf = path.join(OUTPUT_DIR, path.basename(outDocx).replace('.docx', '.pdf'));
      if (fs.existsSync(generatedPdf)) {
        // Rename to final name if needed
        if (generatedPdf !== outPdf) {
          fs.renameSync(generatedPdf, outPdf);
        }
        console.log(`[OK] ${path.basename(outPdf)}`);
      } else {
        console.error(`[FAIL] PDF not generated for ${tpl}`);
      }
    } catch (err: any) {
      console.error(`[ERR] ${tpl}: ${err.message}`);
    }
  }

  // Clean temp DOCX files
  for (const f of fs.readdirSync(TEMP_DIR)) {
    fs.unlinkSync(path.join(TEMP_DIR, f));
  }
  fs.rmdirSync(TEMP_DIR);
  console.log('\nDone! PDFs in:', OUTPUT_DIR);
}

main();
