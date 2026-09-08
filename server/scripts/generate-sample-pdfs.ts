// @ts-nocheck
/**
 * Sincroniza el sistema de pruebas/QA (TemplateTestsPage) con las plantillas
 * REALES de produccion (server/templates/reports/), que fueron retageadas por
 * completo el 2026-08-19 con nombres de tags nuevos (ver server/src/config/templateConfigs.ts).
 *
 * Reemplaza el flujo anterior (getDummyData con campos genericos tipo
 * cliente_nombre/oit_codigo/matriz_tipo) que ya no coincide con NINGUN tag real
 * de las plantillas actuales -- por eso TemplateTestsPage mostraba contenido
 * de mayo/2026.
 *
 * Para cada plantilla de QA (templates/docxtemplater/PLANTILLA_XXX_DOCXTEMPLATER.docx):
 *   1. Copia la plantilla de produccion actual (templates/reports/, localizada
 *      por su filePattern FO-PO-PSM-XX-XX) sobre el archivo de QA, con backup
 *      previo del archivo viejo.
 *   2. Genera datos de ejemplo usando el diccionario REAL de tags de
 *      templateConfigs.ts (TEMPLATE_CONFIGS[<tipo>].fields) en vez de nombres
 *      de campo inventados.
 *   3. Renderiza el .docx de muestra, lo convierte a PDF (soffice) y genera
 *      las imagenes de preview por pagina (pdftoppm) en uploads/preview_images/,
 *      que es lo que sirve /api/files/preview-images/:filename a TemplateTestsPage.tsx.
 *
 * NOTA: no se usa docxService.generateDocument aqui a proposito -- esa funcion
 * resuelve rutas SIEMPRE contra templates/reports/ (TEMPLATES_DIR hardcodeado en
 * docx.service.ts), no contra templates/docxtemplater/, asi que no sirve para
 * renderizar los archivos de QA por su nombre PLANTILLA_XXX_DOCXTEMPLATER.docx.
 * Se usa Docxtemplater/PizZip directamente con las mismas opciones que
 * docx.service.ts (delimiters {}, paragraphLoop, linebreaks, nullGetter vacio)
 * para mantener paridad exacta con el render de produccion.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const InspectModule = require('docxtemplater/js/inspect-module');
const { TEMPLATE_CONFIGS } = require('../src/config/templateConfigs');

const REPORTS_DIR = path.join(__dirname, '../templates/reports');
const TPL_DIR = path.join(__dirname, '../templates/docxtemplater');
const PDF_DIR = path.join(TPL_DIR, 'pdf_samples');
const PREVIEW_DIR = path.join(__dirname, '../uploads/preview_images');
const TMP_DIR = path.join(__dirname, '../tmp_sample_gen');
const BACKUP_DIR = path.join(TPL_DIR, `_backup_pre_sync_${new Date().toISOString().slice(0, 10)}`);

for (const d of [PDF_DIR, PREVIEW_DIR, TMP_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// ------------------------------------------------------------------
// Mapeo: archivo de QA (docxtemplater) -> clave en TEMPLATE_CONFIGS
// Cruzado a mano entre client/src/types/testing.ts (TEMPLATE_TEST_ITEMS) y
// server/src/config/templateConfigs.ts (filePattern FO-PO-PSM-XX-XX).
// ------------------------------------------------------------------
const QA_TO_CONFIG = {
    // "Agua Marina" no es una matriz de produccion separada: es una variante de
    // OIT dentro de ASUB (ver templateDataMapper.ts: es_agua_marina = templateType
    // === 'ASUB' && oit.description incluye "marina"). Se sincroniza contra ASUB.
    'PLANTILLA_AGUA_MARINA_DOCXTEMPLATER.docx': 'ASUB', // FO-PO-PSM-64-08
    'PLANTILLA_BIOTA_DOCXTEMPLATER.docx': 'BIOTA', // FO-PO-PSM-74-01
    'PLANTILLA_CA_CALIDAD_AIRE_DOCXTEMPLATER.docx': 'CALIDAD_AIRE', // FO-PO-PSM-66-18
    'PLANTILLA_CA_OLORES_DOCXTEMPLATER.docx': 'OLORES', // FO-PO-PSM-66-19
    'PLANTILLA_EMISION_RUIDO_DOCXTEMPLATER.docx': 'EMISION_RUIDO', // FO-PO-PSM-65-06
    'PLANTILLA_ER_RA_UNIFICADO_DOCXTEMPLATER.docx': 'EMISION_RUIDO_AMBIENTAL', // FO-PO-PSM-65-09
    'PLANTILLA_FF_DOCXTEMPLATER.docx': 'FUENTES_FIJAS', // FO-PO-PSM-67-11 ("FF" = Fuentes Fijas, no "previo")
    'PLANTILLA_PARTICULAS_VIABLES_DOCXTEMPLATER.docx': 'PARTICULAS_VIABLES', // FO-PO-PSM-66-20
    'PLANTILLA_PUNTO_SECO_DOCXTEMPLATER.docx': 'PUNTO_SECO', // FO-PO-PSM-64-10
    'PLANTILLA_RESPEL_DOCXTEMPLATER.docx': 'RESPEL', // FO-PO-PSM-64-09
    'PLANTILLA_RUIDO_AMBIENTAL_DOCXTEMPLATER.docx': 'RUIDO_AMBIENTAL', // FO-PO-PSM-65-07
    'PLANTILLA_SUELO_DOCXTEMPLATER.docx': 'SUELO', // FO-PO-PSM-64-11
    'PLANTILLA_RUIDO_INTRADOMICILIARIO_DOCXTEMPLATER.docx': 'RUIDO_INTRADOMICILIARIO', // FO-PO-PSM-65-08
    'PLANTILLA_FF_PREVIO_DOCXTEMPLATER.docx': 'FUENTES_FIJAS_PREVIO', // FO-PO-PSM-67-10
    // 'PLANTILLA_CA_AUTOMATICOS_DOCXTEMPLATER.docx' queda AFUERA a proposito:
    // no existe ninguna TemplateConfig ni plantilla en templates/reports/ para
    // una matriz de "CA Automaticos" (estaciones automaticas de calidad de aire)
    // entre las 14 plantillas de produccion actuales. No hay con que sincronizarla.
};

// Matrices de produccion sin item correspondiente en TEMPLATE_TEST_ITEMS
// (quedan fuera del alcance de esta sincronizacion, se documentan igual):
//   - RUIDO_INTRADOMICILIARIO (FO-PO-PSM-65-08)
//   - FUENTES_FIJAS_PREVIO (FO-PO-PSM-67-10)

function findReportsFile(filePattern) {
    const files = fs.readdirSync(REPORTS_DIR);
    const match = files.find(
        (f) => f.startsWith(filePattern) && f.endsWith('.docx') && !f.includes('.backup') && !f.includes('.pybak')
    );
    if (!match) throw new Error(`No se encontro plantilla de produccion para ${filePattern}`);
    return match;
}

// ------------------------------------------------------------------
// Datos de ejemplo plausibles, derivados del diccionario REAL de tags
// (TemplateConfig.fields) de cada matriz -- no de nombres inventados.
// ------------------------------------------------------------------
const CTX = {
    day: '15',
    month: 'marzo',
    year: '2026',
    fullDate: '15 de marzo de 2026',
    headerDate: '15/03/2026',
    oitNumber: 'OT-14265-1-A-9577-V01',
    cliente: 'ALS SERAMBIENTE S.A.S.',
    correo: 'ambiental@als.com.co',
    nit: '900.123.456-7',
    ciudad: 'Barranquilla',
    departamento: 'Atlantico',
    ciudadDepartamento: 'Barranquilla, Atlantico',
    direccion: 'Km 4 Via a Tubara, Zona Industrial, Barranquilla',
    puntoNombre: 'Punto de Monitoreo PM-01',
    puntoId: 'PM-01',
    idMuestra: 'M-2026-001',
    descripcionPunto: 'Punto representativo del area de estudio, de facil acceso y libre de interferencias.',
    latitud: '10 58\' 45.2" N',
    longitud: '74 47\' 12.8" W',
    hora: '08:30',
    numeroPuntosTexto: 'tres (3) puntos',
    metodologia: 'muestreo puntual aleatorio',
    conclusionCorta: 'cumple con los parametros establecidos en la normativa vigente',
    tipoMatriz: 'Caracterizacion Ambiental',
    periodoMuestreo: 'del 10 al 15 de marzo de 2026',
    version: 'V01',
    narrObjetivo:
        'El presente informe tecnico tiene como objetivo documentar los resultados obtenidos durante el monitoreo ambiental realizado por ALS Serambiente S.A.S., con el fin de evaluar el cumplimiento de la normativa ambiental colombiana vigente aplicable.',
    narrMetodologia:
        'La metodologia empleada se fundamento en los protocolos establecidos por el IDEAM y las resoluciones vigentes del Ministerio de Ambiente y Desarrollo Sostenible, utilizando equipos calibrados y trazables para la toma de muestras y mediciones in situ.',
    narrResultados:
        'Los resultados obtenidos indican que los parametros evaluados se encuentran dentro de los limites maximos permisibles establecidos en la normativa ambiental colombiana aplicable, sin registrarse valores anomalos.',
    narrConclusiones:
        'Con base en los resultados obtenidos, se concluye que las condiciones evaluadas cumplen con la normativa ambiental vigente, sin requerirse acciones correctivas inmediatas.',
    narrRecomendaciones:
        'Se recomienda mantener la frecuencia de monitoreo establecida, realizar mantenimiento preventivo de los equipos y documentar cualquier variacion en las condiciones operativas que pueda afectar los resultados.',
};

function genAIValue(mapping) {
    const field = (mapping.field || '').toLowerCase();
    const desc = (mapping.description || '').toLowerCase();

    if (field.includes('correo')) return CTX.correo;
    if (field.includes('nit')) return CTX.nit;
    if (field.includes('cliente')) return CTX.cliente;
    if (field.includes('ciudaddepartamento')) return CTX.ciudadDepartamento;
    if (field.includes('ciudad')) return CTX.ciudad;
    if (field.includes('departamento')) return CTX.departamento;
    if (field.includes('direccion')) return CTX.direccion;
    if (field.includes('idmuestra')) return CTX.idMuestra;
    if (field.includes('.id') || field.endsWith('id')) return CTX.puntoId;
    if (field.includes('nombre')) return CTX.puntoNombre;
    if (field.includes('descripcion')) return CTX.descripcionPunto;
    if (field.includes('latitud')) return CTX.latitud;
    if (field.includes('longitud')) return CTX.longitud;
    if (field.includes('hora')) return CTX.hora;
    if (field.includes('numeropuntos')) return CTX.numeroPuntosTexto;
    if (field.includes('metodologia')) return CTX.metodologia;
    if (field.includes('conclusiones')) return CTX.conclusionCorta;
    if (field.includes('tipomatriz') || field.includes('tipoestudio')) return CTX.tipoMatriz;
    if (field.includes('periodomuestreo')) return CTX.periodoMuestreo;
    if (field.includes('ubicacion')) return CTX.ciudadDepartamento;

    if (desc.includes('objetivo')) return CTX.narrObjetivo;
    if (desc.includes('metodolog')) return CTX.narrMetodologia;
    if (desc.includes('resultado')) return CTX.narrResultados;
    if (desc.includes('conclusion')) return CTX.narrConclusiones;
    if (desc.includes('recomendacion')) return CTX.narrRecomendaciones;
    if (desc.includes('titulo')) return 'Informe Tecnico Ambiental';
    if (desc.includes('cliente')) return CTX.cliente;
    if (desc.includes('cumpl')) return CTX.conclusionCorta;

    return 'Dato de ejemplo';
}

function genDateValue(mapping) {
    const field = (mapping.field || '').toLowerCase();
    if (field.includes('day')) return CTX.day;
    if (field.includes('month')) return CTX.month;
    if (field.includes('year')) return CTX.year;
    if (field.includes('headerdate')) return CTX.headerDate;
    if (field.includes('fulldate')) return CTX.fullDate;
    return CTX.fullDate;
}

function buildData(config) {
    const data = {};
    for (const [tag, mapping] of Object.entries(config.fields)) {
        switch (mapping.source) {
            case 'STATIC':
                data[tag] = mapping.staticValue !== undefined ? mapping.staticValue : 'Dato de ejemplo';
                break;
            case 'DATE':
                data[tag] = genDateValue(mapping);
                break;
            case 'OIT':
                data[tag] = CTX.oitNumber;
                break;
            case 'SYSTEM':
                data[tag] = CTX.version;
                break;
            case 'SAMPLING':
                data[tag] = CTX.puntoNombre;
                break;
            case 'AI':
                data[tag] = genAIValue(mapping);
                break;
            default:
                data[tag] = 'Dato de ejemplo';
        }
    }

    // Array de loop que TemplateDataMapper.generateData() construye para TODAS
    // las plantillas ({#puntos_monitoreo}{nombre}{/puntos_monitoreo}, usado hoy
    // en CALIDAD_AIRE/SUELO/BIOTA -- ver comentario en templateConfigs.ts).
    data.puntos_monitoreo = [
        { nombre: 'Estacion PM-01', id: 'PM-01', idMuestra: 'M-2026-001', descripcion: CTX.descripcionPunto, latitud: CTX.latitud, longitud: CTX.longitud, hora: CTX.hora },
        { nombre: 'Estacion PM-02', id: 'PM-02', idMuestra: 'M-2026-002', descripcion: CTX.descripcionPunto, latitud: CTX.latitud, longitud: CTX.longitud, hora: CTX.hora },
        { nombre: 'Estacion PM-03', id: 'PM-03', idMuestra: 'M-2026-003', descripcion: CTX.descripcionPunto, latitud: CTX.latitud, longitud: CTX.longitud, hora: CTX.hora },
    ];

    return data;
}

function getTemplateTags(templatePath) {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const inspectModule = new InspectModule();
    new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        modules: [inspectModule],
        nullGetter: () => '',
    });
    return Object.keys(inspectModule.getAllTags());
}

function base_safe(fileName) {
    return fileName.replace(/[^a-zA-Z0-9_-]/g, '');
}

function renderDocx(templatePath, data) {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        nullGetter: () => '',
    });
    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function main() {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const results = [];

    const only = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
    const entries = only.length
        ? Object.entries(QA_TO_CONFIG).filter(([f]) => only.includes(f))
        : Object.entries(QA_TO_CONFIG);

    for (const [qaFileName, configKey] of entries) {
        const config = TEMPLATE_CONFIGS[configKey];
        if (!config) {
            console.error(`[SKIP] ${qaFileName}: no existe TEMPLATE_CONFIGS['${configKey}']`);
            results.push({ qaFileName, status: 'SKIP', reason: `TEMPLATE_CONFIGS['${configKey}'] no existe` });
            continue;
        }

        try {
            // 1. localizar plantilla real de produccion por su filePattern
            const reportsFile = findReportsFile(config.filePattern);
            const reportsPath = path.join(REPORTS_DIR, reportsFile);

            // 2. backup del archivo viejo de QA + copiar la version de produccion actual
            const qaPath = path.join(TPL_DIR, qaFileName);
            if (fs.existsSync(qaPath)) {
                fs.copyFileSync(qaPath, path.join(BACKUP_DIR, qaFileName));
            }
            fs.copyFileSync(reportsPath, qaPath);
            console.log(`[SYNC] ${qaFileName} <- ${reportsFile}`);

            // 3. cobertura de tags (informativo): cuantos tags del .docx real
            // no tienen valor en el diccionario de config (quedaran vacios)
            const realTags = getTemplateTags(qaPath);
            const configuredTags = new Set(Object.keys(config.fields));
            const uncovered = realTags.filter((t) => !configuredTags.has(t) && t !== 'puntos_monitoreo' && !t.startsWith('#') && !t.startsWith('/'));

            // 4. generar datos de ejemplo con los tags REALES del diccionario
            const data = buildData(config);

            // 5. renderizar .docx de muestra
            const buf = renderDocx(qaPath, data);
            const tmpDocx = path.join(TMP_DIR, qaFileName.replace('.docx', '_SAMPLE.docx'));
            fs.writeFileSync(tmpDocx, buf);

            // 6. convertir a PDF (perfil de usuario dedicado por corrida para evitar
            // que una instancia headless de soffice todavia cerrando bloquee/no-opee
            // la siguiente conversion -- causa confirmada de fallos silenciosos
            // "PDF no generado" en la corrida inicial de este script con templates grandes)
            const outPdf = path.join(PDF_DIR, qaFileName.replace('.docx', '.pdf'));
            const userProfileDir = path.join(TMP_DIR, `sofficeprofile_${base_safe(qaFileName)}`);
            let pdfOk = false;
            for (let attempt = 1; attempt <= 3 && !pdfOk; attempt++) {
                try {
                    execSync(
                        `soffice --headless -env:UserInstallation=file://${userProfileDir} --convert-to pdf --outdir "${PDF_DIR}" "${tmpDocx}"`,
                        { stdio: 'ignore', timeout: 180000 }
                    );
                } catch (convErr) {
                    console.error(`[soffice attempt ${attempt}] ${convErr.message}`);
                }
                const generatedPdf = path.join(PDF_DIR, path.basename(tmpDocx).replace('.docx', '.pdf'));
                if (fs.existsSync(generatedPdf)) {
                    if (generatedPdf !== outPdf) fs.renameSync(generatedPdf, outPdf);
                    pdfOk = true;
                }
            }
            if (fs.existsSync(userProfileDir)) fs.rmSync(userProfileDir, { recursive: true, force: true });
            if (!pdfOk) {
                throw new Error('PDF no generado por soffice (3 intentos)');
            }

            // 7. imagenes de preview (page-N.png) -- limpia las viejas primero
            const base = qaFileName.replace('.docx', '');
            const imgDir = path.join(PREVIEW_DIR, base);
            if (fs.existsSync(imgDir)) {
                fs.rmSync(imgDir, { recursive: true, force: true });
            }
            fs.mkdirSync(imgDir, { recursive: true });
            execSync(`pdftoppm -png -r 150 -cropbox "${outPdf}" "${path.join(imgDir, 'page')}"`, {
                stdio: 'ignore',
                timeout: 120000,
            });
            const files = fs
                .readdirSync(imgDir)
                .filter((f) => f.startsWith('page-'))
                .sort((a, b) => {
                    const na = parseInt((a.match(/\d+/) || ['0'])[0], 10);
                    const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10);
                    return na - nb;
                });
            let c = 1;
            for (const f of files) {
                const nn = `page-${c}.png`;
                if (f !== nn) fs.renameSync(path.join(imgDir, f), path.join(imgDir, nn));
                c++;
            }

            console.log(`[OK] ${qaFileName} -> ${c - 1} paginas de preview (${uncovered.length} tags sin cubrir en diccionario)`);
            results.push({
                qaFileName,
                reportsFile,
                configKey,
                pages: c - 1,
                uncoveredTagCount: uncovered.length,
                uncoveredTags: uncovered.slice(0, 15),
                status: 'OK',
            });
        } catch (err) {
            console.error(`[ERR] ${qaFileName}: ${err.message}`);
            results.push({ qaFileName, status: 'ERROR', error: err.message });
        }
    }

    // limpiar temporales
    for (const f of fs.readdirSync(TMP_DIR)) fs.unlinkSync(path.join(TMP_DIR, f));
    fs.rmdirSync(TMP_DIR);

    console.log('\n=== RESUMEN ===');
    for (const r of results) console.log(JSON.stringify(r));
    console.log(
        '\nSIN SINCRONIZAR: PLANTILLA_CA_AUTOMATICOS_DOCXTEMPLATER.docx (sin TemplateConfig ni plantilla de produccion correspondiente entre las 14 actuales)'
    );
    console.log(
        '(2026-09-02: RUIDO_INTRADOMICILIARIO y FUENTES_FIJAS_PREVIO ya tienen cobertura completa en TESTING.TS)'
    );
}

main();
