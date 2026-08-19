// Corrige automaticamente el drift de indice en un plan generado por
// analyze_template_precise.js: para cada candidato, busca en una ventana
// alrededor del nodeIndex reclamado el nodo REAL cuyo texto coincide EXACTO.
// Si encuentra exactamente UNA coincidencia en la ventana, corrige el indice.
// Si encuentra 0 o mas de 1 coincidencia (ambiguo), deja el candidato para
// revision manual (no adivina).
//
// Uso: node autocorrect_plan.js <docxLimpio> <planJson> <outputPlanCorregidoJson> [windowSize]

const fs = require('fs');
const PizZip = require('pizzip');

function extractTextNodes(xml) {
    const nodes = [];
    const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m, i = -1;
    while ((m = re.exec(xml)) !== null) {
        const decoded = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        if (decoded.trim().length > 0) {
            i++;
            nodes.push({ index: i, text: decoded });
        }
    }
    return nodes;
}

function main() {
    const [, , docxPath, planPath, outputPath, windowArg] = process.argv;
    const window = parseInt(windowArg || '15', 10);
    if (!docxPath || !planPath || !outputPath) {
        console.error('Uso: node autocorrect_plan.js <docx> <plan.json> <output.json> [windowSize]');
        process.exit(1);
    }

    const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    const candidates = plan.candidates || plan;

    const zip = new PizZip(fs.readFileSync(docxPath));
    const bodyXml = zip.file('word/document.xml').asText();
    const nodes = extractTextNodes(bodyXml);
    const nodeByIndex = new Map(nodes.map(n => [n.index, n.text]));

    let corrected = 0, alreadyOk = 0, ambiguous = 0, notFound = 0;
    const ambiguousList = [];
    const notFoundList = [];

    for (const c of candidates) {
        if (!c.nodeText || c.verified === false) continue;
        const currentText = nodeByIndex.get(c.nodeIndex);
        if (currentText === c.nodeText) {
            alreadyOk++;
            continue;
        }
        // Buscar en la ventana [nodeIndex - window, nodeIndex + window]
        const matches = [];
        for (let offset = -window; offset <= window; offset++) {
            const idx = c.nodeIndex + offset;
            if (nodeByIndex.get(idx) === c.nodeText) matches.push(idx);
        }
        if (matches.length === 1) {
            c._originalIndex = c.nodeIndex;
            c.nodeIndex = matches[0];
            corrected++;
        } else if (matches.length > 1) {
            ambiguous++;
            ambiguousList.push({ tagName: c.tagName, nodeText: c.nodeText, claimedIndex: c._originalIndex || c.nodeIndex, matches });
        } else {
            notFound++;
            notFoundList.push({ tagName: c.tagName, nodeText: c.nodeText, claimedIndex: c.nodeIndex });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
    console.log(`Ya correctos: ${alreadyOk}, Corregidos automaticamente: ${corrected}, Ambiguos (necesitan revision): ${ambiguous}, No encontrados: ${notFound}`);
    if (ambiguousList.length) {
        console.log('--- AMBIGUOS ---');
        ambiguousList.forEach(a => console.log(JSON.stringify(a)));
    }
    if (notFoundList.length) {
        console.log('--- NO ENCONTRADOS ---');
        notFoundList.forEach(a => console.log(JSON.stringify(a)));
    }
}

main();
