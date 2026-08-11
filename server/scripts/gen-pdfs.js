const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');

const TPL_DIR = path.join(__dirname, '../templates/docxtemplater');
const OUT_DIR = path.join(__dirname, '../templates/docxtemplater/pdf_samples');
const TMP_DIR = path.join(__dirname, '../tmp_preview_gen');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const templates = fs.readdirSync(TPL_DIR).filter(f => f.endsWith('.docx'));

const data = {
  cliente_nombre: 'ALS SERAMBIENTE S.A.S.',
  monitoreo_ciudad: 'Barranquilla',
  monitoreo_departamento: 'Atlántico',
  monitoreo_fecha: '15 de marzo de 2026',
  informe_codigo: 'OT-12345-1-A-2026-V01',
  matriz_tipo_titulo: 'AGUA',
  normativa_aplicable: 'Res. 631 de 2015',
  laboratorios_parametros: [{ nombre: 'ALS Colombia', parametro: 'pH, DQO', resolucion: 'Res. 631' }],
  puntos_monitoreo: [{ id: 'PM-01', nombre: 'Vertimiento PTAR', descripcion: 'Descarga final', latitud: '10.9876', longitud: '-74.7890' }],
  resultados_campo: [{ parametro: 'pH', unidad: 'unidades', valor_pm1: '7.2', norma: '6.5-9.0', conformidad: 'Conforme' }],
  resultados_laboratorio: [{ parametro: 'DQO', unidad: 'mg/L', valor_pm1: '85', norma: '<120', conformidad: 'Conforme' }],
  anexos: [{ nombre: 'Planilla', archivo: 'Anexo_1.pdf', laboratorio: 'N/A', paginas: '2' }],
  narrativa_objetivos: 'Documentar resultados del monitoreo ambiental.',
  narrativa_metodologia: 'Protocolos IDEAM y Res. 631 de 2015.',
  narrativa_resultados: 'Dentro de límites permisibles.',
  narrativa_conclusiones: 'Cumple normativa vigente.',
  narrativa_recomendaciones: 'Continuar monitoreo semestral.',
  tiene_fotografias: true,
  tiene_resultados_campo: true,
  tiene_resultados_laboratorio: true,
  tiene_anexos: true,
  es_agua_superficial: true,
};

for (const tpl of templates) {
  try {
    const tplPath = path.join(TPL_DIR, tpl);
    const tmpDocx = path.join(TMP_DIR, tpl.replace('.docx', '_SAMPLE.docx'));
    const outPdf = path.join(OUT_DIR, tpl.replace('.docx', '.pdf'));

    console.log('[GEN]', tpl);
    const content = fs.readFileSync(tplPath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{', end: '}' } });
    doc.render(data);
    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    fs.writeFileSync(tmpDocx, buf);

    console.log('[PDF] converting...');
    execSync(`soffice --headless --convert-to pdf --outdir ${OUT_DIR} ${tmpDocx}`, { stdio: 'ignore', timeout: 30000 });

    const generated = path.join(OUT_DIR, path.basename(tmpDocx).replace('.docx', '.pdf'));
    if (fs.existsSync(generated)) {
      if (generated !== outPdf) fs.renameSync(generated, outPdf);
      console.log('[OK]', path.basename(outPdf));
    } else {
      console.error('[FAIL] PDF not generated for', tpl);
    }
  } catch (err) {
    console.error('[ERR]', tpl, err.message);
  }
}

// cleanup tmp
for (const f of fs.readdirSync(TMP_DIR)) fs.unlinkSync(path.join(TMP_DIR, f));
fs.rmdirSync(TMP_DIR);
console.log('Done! PDFs in', OUT_DIR);
