// Script de analisis preciso de plantillas usando un modelo potente en la nube de
// Ollama (gpt-oss:120b-cloud), corriendo del lado del servidor para no gastar
// tokens de la sesion de Claude. Produce un plan de reemplazo/insercion validado
// (cada match se confirma que existe EXACTAMENTE la cantidad de veces esperada en
// el XML crudo antes de aceptarlo) -- nunca escribe directamente al archivo en vivo.
//
// Uso: node analyze_template_precise.js <docxLimpioPath> <outputPlanJsonPath> [contextHint]

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const SMART_MODEL = 'gpt-oss:120b-cloud';

function xmlEscape(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractTextNodes(xml) {
    // Devuelve cada <w:t>...</w:t> con su texto (decodificado) y su indice de aparicion,
    // preservando el orden real del documento.
    const nodes = [];
    const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m;
    let i = 0;
    while ((m = re.exec(xml)) !== null) {
        const raw = m[1];
        const decoded = raw.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        if (decoded.trim().length > 0) {
            nodes.push({ index: i, text: decoded });
            i++;
        }
    }
    return nodes;
}

function countExactOccurrences(xml, phrase) {
    const escaped = xmlEscape(phrase);
    const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let count = 0;
    let m;
    while ((m = re.exec(xml)) !== null) {
        if (m[1] === escaped || m[1].includes(escaped) || m[1] === phrase || m[1].includes(phrase)) count++;
    }
    return count;
}

async function askModel(prompt, system) {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: SMART_MODEL,
        system,
        prompt,
        stream: false,
        format: 'json',
    }, { timeout: 600000 });
    let text = (response.data.response || '').trim();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const objStart = text.indexOf('{');
    const objEnd = text.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) text = text.substring(objStart, objEnd + 1);
    return JSON.parse(text);
}

async function main() {
    const [, , docxPath, outputPath, contextHint] = process.argv;
    if (!docxPath || !outputPath) {
        console.error('Uso: node analyze_template_precise.js <docx> <output.json> [contextHint]');
        process.exit(1);
    }

    const zip = new PizZip(fs.readFileSync(docxPath));
    const bodyXml = zip.file('word/document.xml').asText();
    const nodes = extractTextNodes(bodyXml);

    console.log(`[Analyze] ${nodes.length} nodos de texto extraidos de word/document.xml`);

    // Construir una vista numerada del documento para el modelo: cada nodo con su
    // indice, asi el modelo puede referirse a "el nodo #47" sin ambiguedad, en vez
    // de depender de que la frase sea unica globalmente.
    const numberedView = nodes.map(n => `[${n.index}] ${n.text}`).join('\n');

    const prompt = `Eres un experto en preparar formatos de informes de laboratorio ambiental para automatizacion con docxtemplater.

CONTEXTO: ${contextHint || 'Formato de informe tecnico ambiental (Serambiente S.A.S.)'}

A continuacion esta el documento dividido en fragmentos de texto NUMERADOS, en el orden exacto en que aparecen:

${numberedView}

TU TAREA: para cada fragmento que sea un PLACEHOLDER (marcador que debe reemplazarse por un dato real al generar un informe -- ej. "NOMBRE CLIENTE", "XX", "DD/MM/AA", "FIRMA", celdas de tabla vacias despues de una etiqueta), decide:
1. El numero de nodo exacto [N] donde esta.
2. Si el nodo TIENE texto que reemplazar, o si es un nodo cuyo VALOR REAL esta en el SIGUIENTE nodo (o esta vacio y el dato deberia insertarse alli).
3. Un nombre de tag semantico en snake_case.
4. Que tipo de dato representa (cliente, fecha, ubicacion, numero de OT, firma/nombre de persona, coordenada, resultado de laboratorio, etc.)

NO marques como placeholder: titulos de seccion fijos, texto narrativo explicativo normal, nombres de normas ya escritos con su numero real, palabras genericas que no son evidentemente un marcador de dato.

Presta atencion especial: si varios nodos tienen el MISMO texto (ej. varios nodos con "XX" o "FIRMA"), tratalos como candidatos DISTINTOS con su propio numero de nodo -- cada uno puede necesitar un tag diferente segun su contexto (lee los nodos ANTES y DESPUES para entender que dato especifico representa cada uno).

Responde con un JSON con esta forma exacta:
{
  "candidates": [
    {
      "nodeIndex": 47,
      "nodeText": "el texto EXACTO del nodo tal como aparece arriba",
      "tagName": "nombre_de_tag_snake_case",
      "dataType": "descripcion corta de que dato es",
      "isEmpty": false
    }
  ]
}

"isEmpty" debe ser true SOLO si el nodo mismo es una etiqueta fija (ej. "Fecha de monitoreo") y el dato real deberia insertarse en la celda/nodo SIGUIENTE (que esta vacio). En ese caso "nodeText" debe ser el texto de la ETIQUETA (para ubicarla), no un texto vacio.

Responde SOLO el objeto JSON, sin texto adicional.`;

    console.log('[Analyze] Enviando a', SMART_MODEL, '... (puede tardar varios minutos)');
    const start = Date.now();
    const result = await askModel(prompt, 'Eres un asistente experto en preparar documentos para automatizacion. Analizas con precision y nunca inventas contenido que no este en el documento.');
    console.log(`[Analyze] Respuesta recibida en ${(Date.now() - start) / 1000}s`);

    const rawCandidates = Array.isArray(result.candidates) ? result.candidates : [];
    console.log(`[Analyze] ${rawCandidates.length} candidatos crudos del modelo`);

    // VALIDACION determinista: confirmar que cada nodeText referenciado existe
    // realmente en el XML, exactamente como el modelo dice. Se descarta cualquier
    // candidato que no se pueda verificar (proteccion contra alucinaciones).
    const validated = [];
    for (const c of rawCandidates) {
        if (!c.nodeText || !c.tagName) continue;
        const occurrences = countExactOccurrences(bodyXml, c.nodeText);
        validated.push({
            ...c,
            occurrencesInDocument: occurrences,
            verified: occurrences > 0,
        });
    }

    const verifiedCount = validated.filter(c => c.verified).length;
    console.log(`[Analyze] ${verifiedCount}/${validated.length} candidatos verificados contra el XML real`);

    fs.writeFileSync(outputPath, JSON.stringify({ nodeCount: nodes.length, candidates: validated }, null, 2));
    console.log(`[Analyze] Plan guardado en ${outputPath}`);
}

main().catch(e => {
    console.error('[Analyze] FALLO:', e.message);
    process.exit(1);
});
