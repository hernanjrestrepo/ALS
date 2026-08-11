/**
 * Template Modifier V3 — ALL templates, header dates, chart tag
 */
import PizZip from 'pizzip';
import * as fs from 'fs';
import * as path from 'path';

const TEMPLATES_DIR = path.join(__dirname, 'templates/reports');

function normalizeRuns(xml: string): string {
    xml = xml.replace(/<w:t xml:space="preserve">/g, '<w:t>');
    let prev = '';
    let i = 0;
    while (prev !== xml && i < 20) {
        prev = xml;
        xml = xml.replace(/<\/w:t>(<\/w:r><w:r>(?:<w:rPr>[^]*?<\/w:rPr>)?<w:t>)/g, '');
        i++;
    }
    return xml;
}

function removeFormatting(xml: string): [string, number] {
    let changes = 0;
    const before = xml;
    
    // Remove highlights (self-closing and block)
    xml = xml.replace(/<w:highlight[^>]*\/>/g, '');
    xml = xml.replace(/<w:highlight[^>]*>.*?<\/w:highlight>/g, '');
    
    // Remove underlines
    xml = xml.replace(/<w:u [^>]*\/>/g, '');
    xml = xml.replace(/<w:u [^>]*>.*?<\/w:u>/g, '');
    
    // Remove shading (shd)
    xml = xml.replace(/<w:shd [^>]*\/>/g, '');
    
    if (xml !== before) changes++;
    return [xml, changes];
}

function removeNotes(xml: string): [string, number] {
    let changes = 0;
    // Match paragraphs one by one using negative lookahead to prevent greedy multi-paragraph matching
    // Using [\s\S] instead of . with s flag for compatibility
    const paragraphs = xml.match(/<w:p\b(?:(?!<w:p\b)[\s\S])*?<\/w:p>/g) || [];
    
    for (const p of paragraphs) {
        // Strip tags to check text content
        const text = p.replace(/<[^>]+>/g, '');
        if (text.includes('Nota:') || text.includes('NOTA:') || text.includes('nota:') || text.includes('IMPORTANTE:')) {
            xml = xml.replace(p, '');
            changes++;
        }
    }
    return [xml, changes];
}

const REPLACEMENTS: [string, string][] = [
    // Company info
    ['Razón social completa', '{tag_razon_social}'],
    ['Relacionado en la OIT', '{tag_correo_valor}'],
    ['Nombre del representante del cliente', '{tag_representante}'],
    ['Teléfono del representante del cliente', '{tag_telefono_valor}'],
    ['Dirección donde se ubica la sede del cliente u oficinas principales', '{tag_direccion}'],
    ['Departamento donde se ejecutó el monitoreo', '{tag_departamento}'],
    ['Municipio/ciudad donde se ejecutó el monitoreo', '{tag_ciudad}'],
    ['Se obtiene del RUES o la página web del cliente', '{tag_actividad_economica}'],
    // Lab tables
    ['Nombre Laboratorio', '{tag_lab_nombre}'],
    ['Nombre parámetro', '{tag_lab_parametro}'],
    ['Número y fecha de Resolución', '{tag_lab_resolucion}'],
    // Tabla 3
    ['Fecha de monitoreo', '{tag_fecha_monitoreo}'],
    ['Lugar de monitoreo', '{tag_lugar_monitoreo}'],
    ['Duración del muestreo', '{tag_duracion_muestreo}'],
    ['Puntos de monitoreo', '{tag_puntos_monitoreo}'],
    ['Tipo de estudio', '{tag_tipo_estudio}'],
    // Methodology
    ['NOMBRE CLIENTE', '{tag_nombre_cliente_met}'],
    ['XXX (XX) puntos', '{tag_num_puntos} puntos'],
    ['ciudad/departamento,', '{tag_ciudad_dept_met},'],
    ['ciudad/departamento;', '{tag_ciudad_dept_concl};'],
    // Year
    ['SERAMBIENTE S.A.S., XXXX', 'SERAMBIENTE S.A.S., {tag_year}'],
    ['SERAMBIENTE S.A.S., 202X', 'SERAMBIENTE S.A.S., {tag_year}'],
    // Photos
    ['Fotografía 1. XXXX', 'Fotografía 1. {tag_foto1_desc}'],
    ['Fotografía 2. XXXX', 'Fotografía 2. {tag_foto2_desc}'],
    ['Aquí se adjuntan las fotos (georreferenciadas en el caso que aplique)', '{tag_foto_placeholder}'],
    // Conclusions
    ['x (xx) puntos', '{tag_num_puntos_concl} puntos'],
    // Google Earth
    ['Google Earth., XXXX', 'Google Earth., {tag_year_earth}'],
    // History
    ['OTXXXX-X-A-XXXX-V00', '{tag_ot_code_v00}'],
    ['OTXXXX-X-A-XXXX-V01', '{tag_ot_code_v01}'],
    ['OT XXXX-X-A-XXXX-VXX', '{tag_ot_code_ref}'],
    ['MATRIZ XXX', '{tag_matriz_hist}'],
    // Climate
    ['XX °C', '{tag_temperatura} °C'],
    ['XX mm', '{tag_precipitacion} mm'],
];

function processXml(xml: string, fileName: string): [string, number] {
    xml = normalizeRuns(xml);
    let changes = 0;
    for (const [search, replace] of REPLACEMENTS) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const before: string = xml;
        xml = xml.replace(new RegExp(escaped, 'g'), replace);
        if (xml !== before) {
            changes++;
            console.log(`  ✅ [${fileName}] "${search.substring(0, 45)}" → "${replace.substring(0, 45)}"`);
        }
    }
    return [xml, changes];
}

function fixHeaderDate(xml: string, fileName: string): [string, number] {
    // Replace hardcoded dates like "18/11/2025" or any DD/MM/YYYY in headers
    const before: string = xml;
    xml = xml.replace(/\d{2}\/\d{2}\/\d{4}/g, '{tag_header_date}');
    if (xml !== before) {
        console.log(`  ✅ [${fileName}] Fixed hardcoded date → {tag_header_date}`);
        return [xml, 1];
    }
    return [xml, 0];
}

function fixBodyAguaDuplicate(xml: string): string {
    // Remove "AGUA " right before the tag to avoid "AGUA AGUA SUBTERRÁNEA"
    return xml.replace(/AGUA\s*\{informe_tecnico_de_estudio_de_caracterizacion_de_a_1\}/g,
        '{informe_tecnico_de_estudio_de_caracterizacion_de_a_1}');
}

function addChartTag(xml: string, fileName: string): [string, number] {
    // Add chart placeholder before CONCLUSIONES section if not already present
    if (xml.includes('chart_indices')) return [xml, 0];
    
    // Find "CONCLUSIONES" and insert chart tag before it
    const conclusionIdx = xml.indexOf('CONCLUSIONES');
    if (conclusionIdx > 0) {
        // Find the paragraph start before CONCLUSIONES
        const beforeConclusion = xml.substring(0, conclusionIdx);
        const lastParaStart = beforeConclusion.lastIndexOf('<w:p ');
        if (lastParaStart > 0) {
            // Insert a new paragraph with the chart tag before CONCLUSIONES
            const chartParagraph = '<w:p><w:r><w:t>{%chart_indices}</w:t></w:r></w:p>';
            xml = xml.substring(0, lastParaStart) + chartParagraph + xml.substring(lastParaStart);
            console.log(`  ✅ [${fileName}] Added {%chart_indices} before CONCLUSIONES`);
            return [xml, 1];
        }
    }
    return [xml, 0];
}

function processTemplate(filePath: string) {
    const baseName = path.basename(filePath).substring(0, 65);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📝 ${baseName}`);
    console.log(`${'='.repeat(70)}`);

    const backupPath = filePath + '.backup';
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        console.log('  🔄 Restored from backup');
    } else {
        fs.copyFileSync(filePath, backupPath);
        console.log('  📦 Created backup');
    }

    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);
    let totalChanges = 0;

    // Process document.xml
    let docXml = zip.file('word/document.xml')?.asText() || '';
    let c: number;
    [docXml, c] = processXml(docXml, 'doc'); totalChanges += c;
    docXml = fixBodyAguaDuplicate(docXml);
    [docXml, c] = addChartTag(docXml, 'doc'); totalChanges += c;
    [docXml, c] = removeFormatting(docXml); totalChanges += c;
    [docXml, c] = removeNotes(docXml); totalChanges += c;
    zip.file('word/document.xml', docXml);

    // Process headers and footers
    const allFiles = Object.keys(zip.files);
    for (const f of allFiles) {
        if (f.match(/word\/(header|footer)\d+\.xml/)) {
            let hxml = zip.file(f)?.asText() || '';
            const shortName = f.split('/').pop() || f;
            [hxml, c] = processXml(hxml, shortName); totalChanges += c;
            [hxml, c] = fixHeaderDate(hxml, shortName); totalChanges += c;
            [hxml, c] = removeFormatting(hxml); totalChanges += c;
            zip.file(f, hxml);
        }
    }

    const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(filePath, output);
    console.log(`  💾 Saved with ${totalChanges} changes`);
}

// Process ALL templates
const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.docx') && !f.includes('.backup'));
console.log(`Found ${files.length} templates to process\n`);

for (const f of files) {
    processTemplate(path.join(TEMPLATES_DIR, f));
}

// Verify
console.log('\n📋 VERIFICATION');
import Docxtemplater from 'docxtemplater';
for (const f of files) {
    const content = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'binary');
    const zip2 = new PizZip(content);
    const doc = new Docxtemplater(zip2, { delimiters: { start: '{', end: '}' } });
    const fullText = doc.getFullText();
    const matches = fullText.match(/\{([^}]+)\}/g) || [];
    const tags = [...new Set(matches.map(m => m.replace(/[{}%]/g, '')))];
    const newTags = tags.filter(t => t.startsWith('tag_') || t === 'chart_indices');
    console.log(`  ${f.substring(0, 55)}: ${tags.length} tags (${newTags.length} new)`);
}

console.log('\n✅ ALL TEMPLATES PROCESSED');
