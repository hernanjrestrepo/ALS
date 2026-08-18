"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTemplateTags = exports.analyzeTemplateTags = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pizzip_1 = __importDefault(require("pizzip"));
const ai_service_1 = require("../services/ai.service");
const aiService = new ai_service_1.AIService();
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
function xmlEscape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function extractPlainText(xml) {
    return xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
// Cuenta cuantas veces aparece una frase dentro de un unico nodo <w:t>...</w:t> del XML.
// Solo cuenta coincidencias que el paso de reemplazo real podra manejar (frases partidas
// entre varios <w:t> por Word NO se cuentan aqui -- se reportan como no encontradas).
function countReplaceableOccurrences(xml, phrase) {
    const escapedPhrase = xmlEscape(phrase);
    const textNodeRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let count = 0;
    let match;
    while ((match = textNodeRegex.exec(xml)) !== null) {
        if (match[1].includes(escapedPhrase) || match[1].includes(phrase))
            count++;
    }
    return count;
}
// Analiza un docx SIN tags y sugiere candidatos a tag via IA. No modifica el archivo.
const analyzeTemplateTags = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }
        const filePath = req.file.path;
        const zip = new pizzip_1.default(fs_1.default.readFileSync(filePath));
        const xmlFile = zip.file('word/document.xml');
        if (!xmlFile) {
            return res.status(400).json({ error: 'El archivo no parece ser un .docx válido' });
        }
        const xml = xmlFile.asText();
        const plainText = extractPlainText(xml);
        const rawCandidates = yield aiService.detectTemplateTags(plainText);
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
    }
    catch (error) {
        console.error('[TemplateDetection] analyzeTemplateTags error:', error.message);
        res.status(500).json({ error: 'Error al analizar la plantilla', details: error.message });
    }
});
exports.analyzeTemplateTags = analyzeTemplateTags;
// Aplica los reemplazos (ya revisados/editados por el usuario) sobre el archivo subido
// en el paso anterior. Reemplazo determinista de texto exacto dentro de <w:t>, no edicion
// de la IA sobre el documento.
const applyTemplateTags = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename, replacements, outputName } = req.body;
        if (!filename || !Array.isArray(replacements)) {
            return res.status(400).json({ error: 'Se requiere filename y replacements' });
        }
        const filePath = path_1.default.join(uploadsDir, path_1.default.basename(filename));
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado. Vuelve a subirlo.' });
        }
        const zip = new pizzip_1.default(fs_1.default.readFileSync(filePath));
        let xml = zip.file('word/document.xml').asText();
        const report = [];
        for (const { phrase, tagName } of replacements) {
            if (!phrase || !tagName)
                continue;
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
        const outputPath = path_1.default.join(uploadsDir, safeOutputName);
        fs_1.default.writeFileSync(outputPath, outputBuffer);
        res.json({
            outputFilename: safeOutputName,
            report,
            totalReplaced: report.filter(r => r.occurrencesReplaced > 0).length,
            totalFailed: report.filter(r => r.occurrencesReplaced === 0).length,
        });
    }
    catch (error) {
        console.error('[TemplateDetection] applyTemplateTags error:', error.message);
        res.status(500).json({ error: 'Error al aplicar los tags', details: error.message });
    }
});
exports.applyTemplateTags = applyTemplateTags;
