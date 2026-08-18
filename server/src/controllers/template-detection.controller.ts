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

// Aplica los reemplazos (ya revisados/editados por el usuario) sobre el archivo subido
// en el paso anterior. Reemplazo determinista de texto exacto dentro de <w:t>, no edicion
// de la IA sobre el documento.
export const applyTemplateTags = async (req: Request, res: Response) => {
    try {
        const { filename, replacements, outputName } = req.body as {
            filename: string;
            replacements: Array<{ phrase: string; tagName: string }>;
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
        let xml = zip.file('word/document.xml')!.asText();

        const report: Array<{ phrase: string; tagName: string; occurrencesReplaced: number }> = [];

        for (const { phrase, tagName } of replacements) {
            if (!phrase || !tagName) continue;
            const escapedPhrase = xmlEscape(phrase);
            const tagLiteral = `{${tagName}}`;
            let occurrencesReplaced = 0;

            xml = xml.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (full, attrs, textContent) => {
                if (textContent.includes(escapedPhrase)) {
                    occurrencesReplaced++;
                    const newText = textContent.split(escapedPhrase).join(tagLiteral);
                    return `<w:t${attrs}>${newText}</w:t>`;
                }
                if (textContent.includes(phrase)) {
                    occurrencesReplaced++;
                    const newText = textContent.split(phrase).join(tagLiteral);
                    return `<w:t${attrs}>${newText}</w:t>`;
                }
                return full;
            });

            report.push({ phrase, tagName, occurrencesReplaced });
        }

        zip.file('word/document.xml', xml);
        const outputBuffer = zip.generate({ type: 'nodebuffer' });

        const safeOutputName = (outputName || `plantilla-tagged-${Date.now()}.docx`).replace(/[^a-zA-Z0-9_\-. ]/g, '_');
        const outputPath = path.join(uploadsDir, safeOutputName);
        fs.writeFileSync(outputPath, outputBuffer);

        res.json({
            outputFilename: safeOutputName,
            report,
            totalReplaced: report.filter(r => r.occurrencesReplaced > 0).length,
            totalFailed: report.filter(r => r.occurrencesReplaced === 0).length,
        });
    } catch (error: any) {
        console.error('[TemplateDetection] applyTemplateTags error:', error.message);
        res.status(500).json({ error: 'Error al aplicar los tags', details: error.message });
    }
};
