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
exports.complianceService = exports.ComplianceService = void 0;
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const pdf_service_1 = require("./pdf.service");
const notification_controller_1 = require("../controllers/notification.controller");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
const OIT_TYPE_CATEGORIES = {
    'AGUA_SUBTERRANEA': ['AGUA', 'SUBTERRANEA'],
    'RESPEL': ['RESPEL', 'RESIDUOS'],
    'PUNTO_SECO': ['GENERAL'],
    'RUIDO_EMISION': ['RUIDO'],
    'RUIDO_AMBIENTAL': ['RUIDO'],
    'RUIDO_INTRADOMICILIARIO': ['RUIDO'],
    'RUIDO_MIXTO': ['RUIDO'],
    'AIRE': ['AIRE'],
    'OLORES': ['OLORES'],
    'PARTICULAS': ['AIRE'],
    'FUENTES_FIJAS_PREVIO': ['FUENTES_FIJAS'],
    'FUENTES_FIJAS': ['FUENTES_FIJAS'],
    'DEFAULT': ['GENERAL']
};
class ComplianceService {
    detectOitType(oit) {
        const combined = ((oit.description || '') + (oit.oitNumber || '')).toLowerCase();
        if (combined.includes('subterránea') || combined.includes('subterranea'))
            return 'AGUA_SUBTERRANEA';
        if (combined.includes('respel') || combined.includes('residuos'))
            return 'RESPEL';
        if (combined.includes('punto seco'))
            return 'PUNTO_SECO';
        if (combined.includes('ruido ambiental'))
            return 'RUIDO_AMBIENTAL';
        if (combined.includes('emisión de ruido') || combined.includes('emision de ruido'))
            return 'RUIDO_EMISION';
        if (combined.includes('intradomiciliario'))
            return 'RUIDO_INTRADOMICILIARIO';
        if (combined.includes('fuente fija') || combined.includes('fuentes fijas'))
            return 'FUENTES_FIJAS';
        if (combined.includes('aire'))
            return 'AIRE';
        if (combined.includes('olores'))
            return 'OLORES';
        if (combined.includes('partículas') || combined.includes('particulas'))
            return 'PARTICULAS';
        return 'DEFAULT';
    }
    getApplicableStandards(oitType) {
        return __awaiter(this, void 0, void 0, function* () {
            const categories = OIT_TYPE_CATEGORIES[oitType] || OIT_TYPE_CATEGORIES['DEFAULT'];
            const allCategories = [...categories, ...OIT_TYPE_CATEGORIES['DEFAULT']];
            return prisma.standard.findMany({
                where: {
                    OR: [
                        { category: { in: allCategories } },
                        { type: 'OIT' }
                    ]
                }
            });
        });
    }
    extractQuotationContent(quotationFileUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!quotationFileUrl)
                return '';
            let filePath = quotationFileUrl.startsWith('/') ? quotationFileUrl.substring(1) : quotationFileUrl;
            if (!fs_1.default.existsSync(filePath)) {
                filePath = path_1.default.join(process.cwd(), filePath);
            }
            if (!fs_1.default.existsSync(filePath))
                return '';
            try {
                return yield pdf_service_1.pdfService.extractText(filePath);
            }
            catch (error) {
                return '';
            }
        });
    }
    buildStandardsContent(standards) {
        // Truncate individual standards to 5000 chars each to stay within context
        return standards.map(s => {
            const content = (s.content || s.description || 'Sin contenido').substring(0, 5000);
            return `### NORMA: ${s.title}\n${content}`;
        }).join('\n---\n');
    }
    checkCompliance(oitId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const oit = yield prisma.oIT.findUnique({ where: { id: oitId } });
            if (!oit)
                throw new Error('OIT not found');
            const oitType = this.detectOitType(oit);
            const standards = yield this.getApplicableStandards(oitType);
            const quotationContent = yield this.extractQuotationContent(oit.quotationFileUrl);
            const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
            // Cascade Summary for Standards if they are too many
            let standardsContent = this.buildStandardsContent(standards);
            if (standardsContent.length > 30000) {
                console.log(`[Compliance] Standards content too large (${standardsContent.length}). Chunking...`);
                standardsContent = yield ai_service_1.aiService.cascadeSummary(standardsContent, 'Resumir requisitos técnicos clave de estas normas ambientales');
            }
            const prompt = `Analiza cumplimiento ambiental.
## OIT: ${oit.oitNumber} (${oitType})
## COTIZACIÓN: ${quotationContent.substring(0, 10000)}
## NORMAS: ${standardsContent}

Responde SOLO JSON:
{
  "compliant": true,
  "score": 100,
  "oitType": "${oitType}",
  "summary": "",
  "exclusions": [],
  "issues": [],
  "recommendations": []
}`;
            try {
                const aiResponse = yield ai_service_1.aiService.chat(prompt);
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                const result = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
                yield (0, notification_controller_1.createNotification)(userId, `Cumplimiento: ${oit.oitNumber}`, `Resultado: ${result.score}/100`, result.compliant ? 'SUCCESS' : 'WARNING', oitId);
                return result;
            }
            catch (error) {
                console.error('Compliance error:', error);
                return { compliant: false, score: 0, summary: 'Error en análisis IA' };
            }
        });
    }
}
exports.ComplianceService = ComplianceService;
exports.complianceService = new ComplianceService();
