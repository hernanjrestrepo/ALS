import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { AIService } from '../services/ai.service';

const aiService = new AIService();
const uploadsDir = path.join(__dirname, '../../uploads');

function xmlEscape(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function extractPlainText(xml: string): string {
    return xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Cuenta cuantas veces aparece una frase dentro de un unico nodo <w:t>...</w:t> del XML.
// Solo cuenta coincidencias que el paso de reemplazo real podra manejar (frases partidas
// entre varios <w:t> por Word NO se cuentan aqui -- se reportan como no encontradas).
function countReplaceableOccurrences(xml: string, phrase: string): number {
    const escapedPhrase = xmlEscape(phrase);
    const textNodeRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let count = 0;
    let match;
    while ((match = textNodeRegex.exec(xml)) !== null) {
        if (match[1].includes(escapedPhrase) || match[1].includes(phrase)) count++;
    }
    return count;
}

// Analiza un docx SIN tags y sugiere candidatos a tag via IA. No modifica el archivo.
export const analyzeTemplateTags = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const filePath = req.file.path;
        const zip = new PizZip(fs.readFileSync(filePath));
        const xmlFile = zip.file('word/document.xml');
        if (!xmlFile) {
            return res.status(400).json({ error: 'El archivo no parece ser un .docx válido' });
        }
        const xml = xmlFile.asText();
        const plainText = extractPlainText(xml);

        const rawCandidates = await aiService.detectTemplateTags(plainText);

        // Validacion: solo se aceptan candidatos cuya frase EXISTE literalmente y de forma
        // reemplazable en el XML. Se filtran alucinaciones de la IA aqui.
        const candidates = rawCandidates
            .filter(c => c.phrase && c.suggestedTagName)
            .map(c => ({
                id: `${c.suggestedTagName}_${Math.random().toString(36).slice(2, 8)}`,
                phrase: c.phrase,
                occurrences: countReplaceableOccurrences(xml, c.phrase),
                suggestedTagName: c.suggestedTagName,
                suggestedSource: c.suggestedSource || 'STATIC',
                suggestedField: c.suggestedField || '',
                suggestedDescription: c.suggestedDescription || '',
            }))
            .filter(c => c.occurrences > 0);

        res.json({
            filename: req.file.filename,
            originalName: req.file.originalname,
            totalCandidatesFromAI: rawCandidates.length,
            validCandidates: candidates.length,
            candidates,
        });
    } catch (error: any) {
        console.error('[TemplateDetection] analyzeTemplateTags error:', error.message);
        res.status(500).json({ error: 'Error al analizar la plantilla', details: error.message });
    }
};

// Inserta un tag en la SIGUIENTE celda de tabla despues de la celda que contiene
// labelText (busca <w:tc> etiqueta -> </w:tc> -> siguiente <w:tc> -> inserta un
// <w:r><w:t>{tag}</w:t></w:r> antes de su ultimo </w:p>). Se usa cuando la celda de
// VALOR esta genuinamente vacia (sin texto que reemplazar) en el formato limpio --
// comun en tablas tipo "Etiqueta | (vacio)".
function insertIntoNextCell(xml: string, labelText: string, tagName: string): { success: boolean; xml: string } {
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

// Aplica los reemplazos (ya revisados/editados por el usuario) sobre el archivo subido
// en el paso anterior. Reemplazo determinista de texto exacto dentro de <w:t>, no edicion
// de la IA sobre el documento. "insertions" cubre celdas de tabla genuinamente vacias
// (sin texto que reemplazar): inserta el tag en la celda siguiente a labelText.
export const applyTemplateTags = async (req: Request, res: Response) => {
    try {
        const { filename, replacements, insertions, outputName } = req.body as {
            filename: string;
            replacements: Array<{ phrase: string; tagName: string }>;
            insertions?: Array<{ afterLabel: string; tagName: string }>;
            outputName?: string;
        };

        if (!filename || !Array.isArray(replacements)) {
            return res.status(400).json({ error: 'Se requiere filename y replacements' });
        }

        const filePath = path.join(uploadsDir, path.basename(filename));
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado. Vuelve a subirlo.' });
        }

        const zip = new PizZip(fs.readFileSync(filePath));

        // Tags pueden vivir en el cuerpo O en header/footer (encabezado repetido,
        // pie de pagina). Se procesan todas las partes XML relevantes que existan
        // en el docx.
        const candidateParts = [
            'word/document.xml',
            'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
            'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
        ];
        const parts = candidateParts.filter(p => zip.file(p) !== null);
        const partsXml: Record<string, string> = {};
        for (const p of parts) partsXml[p] = zip.file(p)!.asText();

        const report: Array<{ phrase: string; tagName: string; occurrencesReplaced: number; part?: string }> = [];

        // Reemplazo SECUENCIAL: cada candidato reemplaza solo la PRIMERA ocurrencia
        // restante de su frase (no todas), buscando primero en document.xml y luego
        // en header/footer en orden. Esto es critico cuando la misma frase (ej.
        // "NOMBRE CLIENTE") aparece varias veces pero cada aparicion necesita un tag
        // distinto -- el orden de "replacements" debe coincidir con el orden en que
        // aparecen en el documento.
        for (const { phrase, tagName } of replacements) {
            if (!phrase || !tagName) continue;
            const escapedPhrase = xmlEscape(phrase);
            const tagLiteral = `{${tagName}}`;
            let occurrencesReplaced = 0;
            let matchedPart: string | undefined;

            for (const part of parts) {
                let didReplace = false;
                partsXml[part] = partsXml[part].replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (full, attrs, textContent) => {
                    if (didReplace) return full;
                    let matchPhrase: string | null = null;
                    if (textContent.includes(escapedPhrase)) matchPhrase = escapedPhrase;
                    else if (textContent.includes(phrase)) matchPhrase = phrase;
                    if (matchPhrase) {
                        didReplace = true;
                        const idx = textContent.indexOf(matchPhrase);
                        const newText = textContent.slice(0, idx) + tagLiteral + textContent.slice(idx + matchPhrase.length);
                        return `<w:t${attrs}>${newText}</w:t>`;
                    }
                    return full;
                });
                if (didReplace) {
                    occurrencesReplaced = 1;
                    matchedPart = part;
                    break;
                }
            }

            report.push({ phrase, tagName, occurrencesReplaced, part: matchedPart });
        }

        const insertionReport: Array<{ afterLabel: string; tagName: string; inserted: boolean; part?: string }> = [];
        for (const { afterLabel, tagName } of (insertions || [])) {
            if (!afterLabel || !tagName) continue;
            let inserted = false;
            let matchedPart: string | undefined;
            for (const part of parts) {
                const result = insertIntoNextCell(partsXml[part], afterLabel, tagName);
                if (result.success) {
                    partsXml[part] = result.xml;
                    inserted = true;
                    matchedPart = part;
                    break;
                }
            }
            insertionReport.push({ afterLabel, tagName, inserted, part: matchedPart });
        }

        for (const part of parts) zip.file(part, partsXml[part]);
        const outputBuffer = zip.generate({ type: 'nodebuffer' });

        const safeOutputName = (outputName || `plantilla-tagged-${Date.now()}.docx`).replace(/[^a-zA-Z0-9_\-. ]/g, '_');
        const outputPath = path.join(uploadsDir, safeOutputName);
        fs.writeFileSync(outputPath, outputBuffer);

        res.json({
            outputFilename: safeOutputName,
            report,
            insertionReport,
            totalReplaced: report.filter(r => r.occurrencesReplaced > 0).length,
            totalFailed: report.filter(r => r.occurrencesReplaced === 0).length,
            totalInserted: insertionReport.filter(r => r.inserted).length,
            totalInsertFailed: insertionReport.filter(r => !r.inserted).length,
        });
    } catch (error: any) {
        console.error('[TemplateDetection] applyTemplateTags error:', error.message);
        res.status(500).json({ error: 'Error al aplicar los tags', details: error.message });
    }
};
