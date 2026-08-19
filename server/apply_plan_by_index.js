// Aplica un plan de tags (generado por analyze_template_precise.js) usando POSICION
// DE NODO exacta, no busqueda de texto. Esto elimina el riesgo de que un placeholder
// corto como "XX" coincida por accidente dentro de uno mas largo como "XXXX".
//
// Cada entrada del plan indica el nodeIndex exacto (posicion del nodo de texto en el
// documento, contando solo nodos no vacios, en orden). Antes de aplicar, se verifica
// que el texto en esa posicion coincida con lo que el analisis esperaba -- si no
// coincide (el documento cambio entre analisis y aplicacion), esa entrada se rechaza
// en vez de aplicarse a ciegas.
//
// Uso: node apply_plan_by_index.js <docxLimpioPath> <planJsonPath> <outputDocxPath> <reportJsonPath>

const fs = require('fs');
const PizZip = require('pizzip');

function xmlEscape(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Pasada UNICA que maneja los 3 tipos de operacion (reemplazo completo de nodo,
// reemplazo de subcadena dentro de un nodo, y limpieza de texto sobrante) usando
// UN SOLO contador de indice. Critico: si se hicieran en pasadas separadas, una
// operacion que vacia un nodo (CLEAR) desincroniza el conteo de las pasadas
// siguientes -- por eso todo pasa por aqui junto.
function applyUnifiedByIndex(xml, wholeEntries, substringEntries) {
    const wholeByIndex = new Map(wholeEntries.map(e => [e.nodeIndex, e]));
    const substringByIndex = new Map(substringEntries.map(e => [e.nodeIndex, e]));

    const report = [];
    const substringReport = [];
    let currentIndex = -1;

    const newXml = xml.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (full, attrs, textContent) => {
        const decoded = textContent.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        if (decoded.trim().length === 0) {
            return full; // nodos vacios no cuentan (igual que en extractTextNodes)
        }
        currentIndex++;

        const subEntry = substringByIndex.get(currentIndex);
        if (subEntry) {
            if (decoded !== subEntry.fullNodeText) {
                substringReport.push({ nodeIndex: currentIndex, tagName: subEntry.tagName, status: 'REJECTED_TEXT_MISMATCH', expected: subEntry.fullNodeText, actual: decoded });
                return full;
            }
            const idx = decoded.indexOf(subEntry.matchWithin);
            if (idx === -1) {
                substringReport.push({ nodeIndex: currentIndex, tagName: subEntry.tagName, status: 'REJECTED_SUBSTRING_NOT_FOUND' });
                return full;
            }
            const before = xmlEscape(decoded.slice(0, idx));
            const after = xmlEscape(decoded.slice(idx + subEntry.matchWithin.length));
            substringReport.push({ nodeIndex: currentIndex, tagName: subEntry.tagName, status: 'APPLIED_SUBSTRING', text: decoded });
            return `<w:t${attrs}>${before}{${subEntry.tagName}}${after}</w:t>`;
        }

        const entry = wholeByIndex.get(currentIndex);
        if (!entry) return full;

        if (decoded !== entry.nodeText) {
            report.push({ nodeIndex: currentIndex, tagName: entry.tagName, status: 'REJECTED_TEXT_MISMATCH', expected: entry.nodeText, actual: decoded });
            return full;
        }

        if (entry.isEmpty) {
            report.push({ nodeIndex: currentIndex, tagName: entry.tagName, status: 'SKIPPED_MARKED_EMPTY' });
            return full;
        }

        if (entry.tagName === '___CLEAR___') {
            report.push({ nodeIndex: currentIndex, tagName: '___CLEAR___', status: 'CLEARED', text: decoded });
            return `<w:t${attrs}></w:t>`;
        }

        report.push({ nodeIndex: currentIndex, tagName: entry.tagName, status: 'APPLIED', text: decoded });
        return `<w:t${attrs}>{${entry.tagName}}</w:t>`;
    });

    return { xml: newXml, report, substringReport };
}

// Para candidatos isEmpty=true: la ETIQUETA esta en nodeText/nodeIndex, y el valor
// real se inserta en la celda de tabla SIGUIENTE (misma logica que
// template-detection.controller.ts insertIntoNextCell).
function insertIntoNextCell(xml, labelText, tagName) {
    const escapedLabel = xmlEscape(labelText);
    let labelIdx = xml.indexOf(`>${escapedLabel}<`);
    if (labelIdx === -1) labelIdx = xml.indexOf(`>${labelText}<`);
    if (labelIdx === -1) return { success: false, xml };

    const tcEndAfterLabel = xml.indexOf('</w:tc>', labelIdx);
    if (tcEndAfterLabel === -1) return { success: false, xml };
    const nextTcStart = xml.indexOf('<w:tc>', tcEndAfterLabel);
    if (nextTcStart === -1) return { success: false, xml };
    const nextTcEnd = xml.indexOf('</w:tc>', nextTcStart);
    if (nextTcEnd === -1) return { success: false, xml };

    const cellContent = xml.slice(nextTcStart, nextTcEnd);
    const lastPClose = cellContent.lastIndexOf('</w:p>');
    if (lastPClose === -1) return { success: false, xml };

    const runXml = `<w:r><w:t>{${tagName}}</w:t></w:r>`;
    const newCellContent = cellContent.slice(0, lastPClose) + runXml + cellContent.slice(lastPClose);
    const newXml = xml.slice(0, nextTcStart) + newCellContent + xml.slice(nextTcEnd);
    return { success: true, xml: newXml };
}

function main() {
    const [, , docxPath, planPath, outputPath, reportPath] = process.argv;
    if (!docxPath || !planPath || !outputPath || !reportPath) {
        console.error('Uso: node apply_plan_by_index.js <docx> <plan.json> <output.docx> <report.json>');
        process.exit(1);
    }

    const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    const candidates = (plan.candidates || plan).filter(c => c.verified !== false && c.tagName);

    const zip = new PizZip(fs.readFileSync(docxPath));
    let bodyXml = zip.file('word/document.xml').asText();

    const nonEmpty = candidates.filter(c => !c.isEmpty);
    const emptyOnes = candidates.filter(c => c.isEmpty);

    const substringEntries = plan.specialSubstring || [];
    const { xml: newBodyXml, report: replaceReport, substringReport } = applyUnifiedByIndex(bodyXml, nonEmpty, substringEntries);
    bodyXml = newBodyXml;

    const insertReport = [];
    for (const c of emptyOnes) {
        const result = insertIntoNextCell(bodyXml, c.nodeText, c.tagName);
        bodyXml = result.xml;
        insertReport.push({ afterLabel: c.nodeText, tagName: c.tagName, inserted: result.success });
    }

    zip.file('word/document.xml', bodyXml);
    const outputBuffer = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(outputPath, outputBuffer);

    const fullReport = {
        totalCandidates: candidates.length,
        applied: replaceReport.filter(r => r.status === 'APPLIED').length,
        cleared: replaceReport.filter(r => r.status === 'CLEARED').length,
        rejected: replaceReport.filter(r => r.status === 'REJECTED_TEXT_MISMATCH').length,
        substringApplied: substringReport.filter(r => r.status === 'APPLIED_SUBSTRING').length,
        substringRejected: substringReport.filter(r => r.status.startsWith('REJECTED')).length,
        inserted: insertReport.filter(r => r.inserted).length,
        insertFailed: insertReport.filter(r => !r.inserted).length,
        replaceDetails: replaceReport,
        substringDetails: substringReport,
        insertDetails: insertReport,
    };
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));

    console.log(`Aplicados: ${fullReport.applied}, Limpiados: ${fullReport.cleared}, Rechazados: ${fullReport.rejected}, Substring aplicados: ${fullReport.substringApplied}, Substring rechazados: ${fullReport.substringRejected}, Insertados: ${fullReport.inserted}, Insercion fallida: ${fullReport.insertFailed}`);
    console.log(`Documento guardado en: ${outputPath}`);
    console.log(`Reporte guardado en: ${reportPath}`);
}

main();
