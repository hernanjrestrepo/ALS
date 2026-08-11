"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PDFService {
    /**
     * Extract text from PDF file
     */
    extractText(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pdfParse = (yield Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
                const dataBuffer = fs.readFileSync(filePath);
                const data = yield pdfParse(dataBuffer);
                return data.text;
            }
            catch (error) {
                console.error('Error extracting text from PDF:', error);
                throw error;
            }
        });
    }
    generateSamplingReport(oit, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { marked } = yield Promise.resolve().then(() => __importStar(require('marked')));
            let stepsHTML = '';
            if (oit.stepValidations) {
                try {
                    const validations = JSON.parse(oit.stepValidations);
                    const steps = ((_b = (_a = JSON.parse(oit.aiData || '{}').data) === null || _a === void 0 ? void 0 : _a.samplingPlan) === null || _b === void 0 ? void 0 : _b.steps) || [];
                    validations.forEach((v, index) => {
                        var _a;
                        const step = steps[index] || {};
                        stepsHTML += `
                        <div class="step">
                            <h3>${step.description || 'Paso ' + (index + 1)}</h3>
                            <p><strong>Resultado:</strong> ${v.validated ? 'Validado' : 'No validado'}</p>
                            <p>${((_a = v.data) === null || _a === void 0 ? void 0 : _a.value) || ''}</p>
                            ${v.feedback ? `<div class="markdown">${marked.parse(v.feedback)}</div>` : ''}
                        </div>
                    `;
                    });
                }
                catch (e) {
                    console.error('Error parsing steps for PDF:', e);
                }
            }
            const html = `
            <html>
                <head><style>body { font-family: sans-serif; padding: 20px; }</style></head>
                <body>
                    <h1>Informe de Muestreo - ${oit.oitNumber}</h1>
                    <p><strong>Descripción:</strong> ${oit.description}</p>
                    <p><strong>Ubicación:</strong> ${oit.location}</p>
                    <hr/>
                    ${stepsHTML}
                    ${oit.finalAnalysis ? `<h2>Análisis Final</h2><div class="markdown">${marked.parse(oit.finalAnalysis)}</div>` : ''}
                </body>
            </html>
        `;
            return this.generatePDFFromHTML(html, `report-${oit.oitNumber}.pdf`);
        });
    }
    generatePDFFromHTML(htmlContent, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const uploadsDir = path.join(__dirname, '../../uploads/reports');
            if (!fs.existsSync(uploadsDir))
                fs.mkdirSync(uploadsDir, { recursive: true });
            const filepath = path.join(uploadsDir, filename);
            const puppeteer = require('puppeteer');
            const browser = yield puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
            const page = yield browser.newPage();
            yield page.setContent(htmlContent);
            yield page.pdf({ path: filepath, format: 'A4' });
            yield browser.close();
            return filepath;
        });
    }
}
exports.pdfService = new PDFService();
