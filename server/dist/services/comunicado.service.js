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
exports.comunicadoService = void 0;
const docx_1 = require("docx");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const COMUNICADO_DIR = path_1.default.join(__dirname, '../../templates/comunicado');
const UPLOADS_DIR = path_1.default.join(__dirname, '../../uploads');
// Static boilerplate paragraphs (from real comunicados)
const BOILERPLATE_PARAGRAPHS = [
    'Un laboratorio que cuente dentro de sus certificaciones con una acreditación por parte del Instituto de Hidrología, Meteorología y Estudios Ambientales (IDEAM) en la norma ISO/IEC 17025, es un prestador de servicios de ensayo que opera de forma competente, imparcial y coherente y que tiene la capacidad de generar resultados válidos, identificando los factores que afectan al resultado de la medición y que asegura la calidad en cada paso de sus procedimientos establecidos.',
    'Cada una de las determinaciones realizadas por un laboratorio de ensayo deben pasar por un proceso de verificación, el cual consiste en la aportación de evidencia objetiva de que un ítem dado satisface los requisitos especificados. Todo laboratorio debe demostrar que tiene la capacidad para emitir resultados que sean coherentes.',
    'Con base a lo anterior, los métodos utilizados son aplicables a las matrices descritas y su rango de operación dependerá de aspectos relevantes para cada método como por ejemplo, la cantidad de muestra, el proceso de pretratamiento utilizado y la presencia de interferencias que no permitan la emisión de resultados confiables, razón por la cual el laboratorio, de acuerdo con la NTC-ISO/IEC 17025, desarrolló su aplicación a través de la verificación y/o validación para asegurar el desempeño del Método, validado y acreditado por el IDEAM y/o el ente acreditador aplicable.',
    'Los siguientes comentarios representan una posible interpretación de los resultados, con base a la experticia y respaldo técnico del laboratorio:'
];
const DISCLAIMER = 'Estas hipótesis parten solo de teoría y podrían verificarse revisando las condiciones operativas del punto y los productos químicos utilizados, cosas que son más ampliamente conocidas por el cliente directamente, por lo que, NO representan un concepto definitivo por parte del laboratorio.';
/**
 * Parse AI-generated comunicado text into paragraphs with bold markers.
 * The AI returns text with **bold** markers. We split by lines and parse bold runs.
 */
function parseTextToRuns(text) {
    const runs = [];
    // Split by **bold** markers
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new docx_1.TextRun({
                text: part.slice(2, -2),
                bold: true,
                size: 22, // 11pt
                font: 'Calibri'
            }));
        }
        else if (part.trim()) {
            runs.push(new docx_1.TextRun({
                text: part,
                size: 22,
                font: 'Calibri'
            }));
        }
    }
    return runs;
}
/**
 * Parse multi-line AI content into Paragraph objects
 */
function parseContentToParagraphs(content) {
    const paragraphs = [];
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            paragraphs.push(new docx_1.Paragraph({ spacing: { after: 100 } }));
            continue;
        }
        // Numbered section headers like "1. Alcalinidad..."
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numberedMatch) {
            paragraphs.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: `${numberedMatch[1]}. ${numberedMatch[2]}`,
                        bold: true,
                        size: 22,
                        font: 'Calibri'
                    })
                ],
                spacing: { before: 200, after: 100 }
            }));
            continue;
        }
        // Lines that are entirely bold headers (no ** markers but short and title-like)
        const runs = parseTextToRuns(trimmed);
        paragraphs.push(new docx_1.Paragraph({
            children: runs.length > 0 ? runs : [new docx_1.TextRun({ text: trimmed, size: 22, font: 'Calibri' })],
            spacing: { after: 100 }
        }));
    }
    return paragraphs;
}
exports.comunicadoService = {
    /**
     * Generate a comunicado .docx for a specific service
     */
    generateComunicado(oit, comunicadoContent, serviceName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Date formatting
            const now = new Date();
            const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const dateStr = `Barranquilla, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
            const dateShort = `${String(now.getDate()).padStart(2, '0')} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
            // Load header logo if available
            let headerImage = null;
            const logoPath = path_1.default.join(COMUNICADO_DIR, 'header_logo.png');
            if (fs_1.default.existsSync(logoPath)) {
                const imageData = fs_1.default.readFileSync(logoPath);
                headerImage = new docx_1.ImageRun({
                    data: imageData,
                    transformation: { width: 180, height: 60 },
                    type: 'png'
                });
            }
            // Build the document
            const children = [];
            // Date
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: dateStr, size: 22, font: 'Calibri' })],
                spacing: { after: 200 }
            }));
            // Empty line
            children.push(new docx_1.Paragraph({ spacing: { after: 100 } }));
            // Title: COMUNICADO TÉCNICO
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'COMUNICADO TÉCNICO', bold: true, size: 22, font: 'Calibri' })],
                spacing: { after: 100 }
            }));
            // Empty line
            children.push(new docx_1.Paragraph({ spacing: { after: 100 } }));
            // REF / Service subtitle
            const refText = (options === null || options === void 0 ? void 0 : options.reportRef) || `${serviceName} – OIT ${oit.oitNumber}`;
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: refText, bold: true, size: 22, font: 'Calibri' })],
                spacing: { after: 80 }
            }));
            // Metadata: Fecha del informe
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: `Fecha del informe: ${dateShort}`, bold: true, size: 22, font: 'Calibri' })],
                spacing: { after: 60 }
            }));
            // Metadata: Lugar de muestreo
            const location = (options === null || options === void 0 ? void 0 : options.location) || oit.location || oit.description || 'No especificado';
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: `Lugar de muestreo: ${location}`, bold: true, size: 22, font: 'Calibri' })],
                spacing: { after: 60 }
            }));
            // Metadata: Normatividad
            if (options === null || options === void 0 ? void 0 : options.norms) {
                children.push(new docx_1.Paragraph({
                    children: [new docx_1.TextRun({ text: `Normatividad de referencia: ${options.norms}`, bold: true, size: 22, font: 'Calibri' })],
                    spacing: { after: 60 }
                }));
            }
            // Empty line
            children.push(new docx_1.Paragraph({ spacing: { after: 200 } }));
            // Greeting
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'Estimados, ', size: 22, font: 'Calibri' })],
                spacing: { after: 100 }
            }));
            // Boilerplate paragraphs
            for (const bp of BOILERPLATE_PARAGRAPHS) {
                children.push(new docx_1.Paragraph({
                    children: [new docx_1.TextRun({ text: bp, size: 22, font: 'Calibri' })],
                    spacing: { after: 100 }
                }));
            }
            // AI-generated body
            const contentParagraphs = parseContentToParagraphs(comunicadoContent);
            children.push(...contentParagraphs);
            // Empty line before disclaimer
            children.push(new docx_1.Paragraph({ spacing: { after: 100 } }));
            // Disclaimer
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: DISCLAIMER, size: 22, font: 'Calibri' })],
                spacing: { after: 200 }
            }));
            // Empty line
            children.push(new docx_1.Paragraph({ spacing: { after: 100 } }));
            // Closing
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'Agradecemos su comprensión y confianza.', size: 22, font: 'Calibri' })],
                spacing: { after: 200 }
            }));
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'Cordialmente,', size: 22, font: 'Calibri' })],
                spacing: { after: 200 }
            }));
            // Empty line for signature space
            children.push(new docx_1.Paragraph({ spacing: { after: 100 } }));
            // Signature block
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'Juan Bustamante R.', bold: true, size: 22, font: 'Calibri' })],
                spacing: { after: 40 }
            }));
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'Coordinador I+D Laboratorio', size: 22, font: 'Calibri' })],
                spacing: { after: 40 }
            }));
            children.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'ALS ENVIRONMENTAL S.A.S.', bold: true, size: 22, font: 'Calibri' })],
                spacing: { after: 100 }
            }));
            // Build header
            const headerChildren = [];
            if (headerImage) {
                headerChildren.push(new docx_1.Paragraph({ children: [headerImage] }));
            }
            headerChildren.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'ALS Environmental S.A.S.', size: 16, font: 'Calibri', color: '666666' })],
                spacing: { after: 20 }
            }));
            headerChildren.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'Carrera 41 No. 73B-72', size: 16, font: 'Calibri', color: '666666' })],
                spacing: { after: 20 }
            }));
            headerChildren.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: '+57 6053858220', size: 16, font: 'Calibri', color: '666666' })],
                spacing: { after: 20 }
            }));
            headerChildren.push(new docx_1.Paragraph({
                children: [new docx_1.TextRun({ text: 'Barranquilla, Atlántico', size: 16, font: 'Calibri', color: '666666' })],
                spacing: { after: 40 }
            }));
            const doc = new docx_1.Document({
                sections: [{
                        properties: {
                            page: {
                                margin: {
                                    top: 1440, // 1 inch
                                    bottom: 1440,
                                    left: 1080, // 0.75 inch
                                    right: 1080
                                }
                            }
                        },
                        headers: {
                            default: new docx_1.Header({ children: headerChildren })
                        },
                        footers: {
                            default: new docx_1.Footer({
                                children: [
                                    new docx_1.Paragraph({
                                        children: [new docx_1.TextRun({ text: 'alsglobal.com', size: 16, font: 'Calibri', color: '666666' })],
                                        alignment: docx_1.AlignmentType.CENTER
                                    })
                                ]
                            })
                        },
                        children
                    }]
            });
            // Generate buffer and save
            const buffer = yield docx_1.Packer.toBuffer(doc);
            if (!fs_1.default.existsSync(UPLOADS_DIR))
                fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
            const safeService = serviceName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
            const filename = `Comunicado_${safeService}_${oit.oitNumber}_${Date.now()}.docx`;
            fs_1.default.writeFileSync(path_1.default.join(UPLOADS_DIR, filename), buffer);
            console.log(`[ComunicadoService] Generated: ${filename}`);
            return filename;
        });
    }
};
exports.default = exports.comunicadoService;
