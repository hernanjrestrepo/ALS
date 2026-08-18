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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyConsistency = exports.updateServiceDates = exports.requestRedoSteps = exports.updatePlanningResources = exports.generateFinalReport = exports.activateReportVersion = exports.getReportVersions = exports.reportChatApprove = exports.reportChatPreview = exports.deleteLabResult = exports.deleteSamplingSheet = exports.uploadSamplingSheets = exports.generateSamplingReport = exports.finalizeSampling = exports.validateStepData = exports.checkCompliance = exports.deleteOIT = exports.updateOIT = exports.reanalyzeOIT = exports.createOITAsync = exports.createOITFromUrl = exports.createOIT = exports.getOITById = exports.getAllOITs = exports.getAssignedEngineers = exports.assignEngineers = exports.uploadLabResults = exports.getSamplingData = exports.submitSampling = exports.saveSamplingData = exports.rejectPlanning = exports.acceptPlanning = void 0;
const client_1 = require("@prisma/client");
const ai_service_1 = require("../services/ai.service");
const aiService = new ai_service_1.AIService();
const notification_controller_1 = require("./notification.controller");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// import { marked } from 'marked';
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
// Guarda un snapshot de version por cada informe (name/url/type) generado para
// un OIT, y marca como inactivas las versiones anteriores con el mismo nombre.
// Nunca borra archivos ni filas -- solo ajusta isActive. Es aditivo: se llama
// justo despues de escribir finalReportUrl, sin cambiar la logica existente.
function recordReportVersions(oitId, reports) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const report of reports) {
            try {
                yield prisma.oITReportVersion.updateMany({
                    where: { oitId, name: report.name, isActive: true },
                    data: { isActive: false },
                });
                const last = yield prisma.oITReportVersion.findFirst({
                    where: { oitId, name: report.name },
                    orderBy: { versionNumber: 'desc' },
                });
                yield prisma.oITReportVersion.create({
                    data: {
                        oitId,
                        name: report.name,
                        url: report.url,
                        type: report.type,
                        versionNumber: ((last === null || last === void 0 ? void 0 : last.versionNumber) || 0) + 1,
                        isActive: true,
                    },
                });
            }
            catch (err) {
                console.error(`[ReportVersion] Failed to record version for "${report.name}":`, err);
            }
        }
    });
}
// Accept Planning Proposal
const acceptPlanning = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { templateId } = req.body;
        // Get OIT with aiData to extract assigned resources
        const existingOit = yield prisma.oIT.findUnique({ where: { id } });
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                planningAccepted: true,
                selectedTemplateIds: templateId ? JSON.stringify([templateId]) : null,
                status: 'SCHEDULED'
            }
        });
        // Update resource statuses if there are assigned resources
        if (existingOit === null || existingOit === void 0 ? void 0 : existingOit.aiData) {
            try {
                const aiData = JSON.parse(existingOit.aiData);
                if (((_a = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _a === void 0 ? void 0 : _a.assignedResources) && Array.isArray(aiData.data.assignedResources)) {
                    // Update each resource status to IN_USE
                    for (const resource of aiData.data.assignedResources) {
                        if (resource.id) {
                            yield prisma.resource.update({
                                where: { id: resource.id },
                                data: { status: 'IN_USE' }
                            });
                            console.log(`Resource ${resource.name} set to IN_USE for OIT ${oit.oitNumber}`);
                        }
                    }
                }
            }
            catch (parseError) {
                console.error('Error parsing aiData for resource updates:', parseError);
                // Continue even if resource update fails
            }
        }
        // Create notification
        if ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId) {
            yield prisma.notification.create({
                data: {
                    userId: req.user.userId,
                    oitId: id,
                    title: 'Planeación Aceptada',
                    message: `La propuesta de planeación para OIT ${oit.oitNumber} ha sido aceptada. Recursos asignados y programados.`,
                    type: 'SUCCESS'
                }
            });
        }
        res.json(oit);
    }
    catch (error) {
        console.error('Error accepting planning:', error);
        res.status(500).json({ error: 'Error al aceptar planeación' });
    }
});
exports.acceptPlanning = acceptPlanning;
// Reject Planning Proposal
const rejectPlanning = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                planningProposal: null,
                planningAccepted: false
            }
        });
        res.json({ message: 'Propuesta rechazada, puede crear una planeación manual', oit });
    }
    catch (error) {
        console.error('Error rejecting planning:', error);
        res.status(500).json({ error: 'Error al rechazar planeación' });
    }
});
exports.rejectPlanning = rejectPlanning;
// Save Sampling Data
const saveSamplingData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const samplingData = req.body;
        const isComplete = !samplingData.partial && samplingData.completedAt;
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                samplingData: JSON.stringify(samplingData),
                status: isComplete ? 'IN_PROGRESS' : 'SCHEDULED',
                pendingSync: false
            }
        });
        // Create notification if completed
        if (isComplete && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId)) {
            yield prisma.notification.create({
                data: {
                    userId: req.user.userId,
                    oitId: id,
                    title: 'Muestreo Completado',
                    message: `El muestreo para OIT ${oit.oitNumber} ha sido completado`,
                    type: 'SUCCESS'
                }
            });
        }
        res.json({ success: true, oit });
    }
    catch (error) {
        console.error('Error saving sampling data:', error);
        res.status(500).json({ error: 'Error al guardar datos de muestreo' });
    }
});
exports.saveSamplingData = saveSamplingData;
// Submit Final Sampling
const submitSampling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const samplingData = req.body; // Full JSON of all steps
        // 1. Update OIT with raw data
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                samplingData: JSON.stringify(samplingData),
                status: 'ANALYZING', // Temporary status while AI runs
                pendingSync: false
            }
        });
        res.json({ success: true, message: 'Muestreo recibido. Analizando...', oit });
        // 2. Trigger async AI analysis
        (() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const analysis = yield aiService.analyzeSamplingResults(samplingData, oit.description || '');
                yield prisma.oIT.update({
                    where: { id },
                    data: {
                        finalAnalysis: analysis,
                        status: 'COMPLETED' // Flow finished, ready for admin review
                    }
                });
                // Notify user/admin
                // await createNotification(...)
            }
            catch (err) {
                console.error('Error in background sampling analysis:', err);
                yield prisma.oIT.update({
                    where: { id },
                    data: { status: 'REVIEW_IMPORTANT' }
                });
            }
        }))();
    }
    catch (error) {
        console.error('Error submitting sampling:', error);
        res.status(500).json({ error: 'Error al enviar muestreo' });
    }
});
exports.submitSampling = submitSampling;
// Get Sampling Data
const getSamplingData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit || !oit.samplingData) {
            return res.status(404).json({ error: 'No hay datos de muestreo' });
        }
        res.json(JSON.parse(oit.samplingData));
    }
    catch (error) {
        console.error('Error getting sampling data:', error);
        res.status(500).json({ error: 'Error al obtener datos de muestreo' });
    }
});
exports.getSamplingData = getSamplingData;
// Upload Lab Results
// Upload Lab Results
// Upload Lab Results
const uploadLabResults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { group = 'General' } = req.body; // New: optional group
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }
        // Fetch current OIT to append file
        const currentOit = yield prisma.oIT.findUnique({ where: { id }, select: { labResultsUrl: true } });
        let groupedFiles = {};
        if (currentOit === null || currentOit === void 0 ? void 0 : currentOit.labResultsUrl) {
            try {
                const parsed = JSON.parse(currentOit.labResultsUrl);
                if (Array.isArray(parsed)) {
                    // Migration: treat as General
                    groupedFiles = { 'General': parsed };
                }
                else if (typeof parsed === 'object' && parsed !== null) {
                    groupedFiles = parsed;
                }
                else {
                    groupedFiles = { 'General': [currentOit.labResultsUrl] };
                }
            }
            catch (e) {
                groupedFiles = { 'General': [currentOit.labResultsUrl] };
            }
        }
        const newPath = `uploads/${file.filename}`;
        if (!groupedFiles[group])
            groupedFiles[group] = [];
        groupedFiles[group].push(newPath);
        // 1. Return immediate response and set status to ANALYZING
        yield prisma.oIT.update({
            where: { id },
            data: {
                labResultsUrl: JSON.stringify(groupedFiles),
                // We keep status as ANALYZING. 
                // Analysis is now stored per group in labResultsAnalysis
                status: 'ANALYZING'
            }
        });
        res.json({
            success: true,
            labResultsUrl: JSON.stringify(groupedFiles),
            status: 'ANALYZING',
            message: `Resultados para ${group} subidos. Análisis en curso...`
        });
        // 2. Trigger asynchronous processing for THIS GROUP
        processLabResultsAsync(id, groupedFiles[group].map(url => url.replace('uploads/', '')), group).catch(err => {
            console.error('Error in background lab processing:', err);
        });
    }
    catch (error) {
        console.error('Error uploading lab results:', error);
        res.status(500).json({ error: 'Error al subir resultados de laboratorio' });
    }
});
exports.uploadLabResults = uploadLabResults;
// Background Processor for Lab Results
// Background Processor for Lab Results
function processLabResultsAsync(oitId_1, filenames_1) {
    return __awaiter(this, arguments, void 0, function* (oitId, filenames, group = 'General') {
        try {
            console.log(`Starting background lab analysis for OIT ${oitId}, Group: ${group} with ${filenames.length} files`);
            const { pdfService } = require('../services/pdf.service');
            const path = require('path');
            let fullCombinedText = '';
            for (const filename of filenames) {
                const filePath = path.join(__dirname, '../../uploads', filename);
                if (!fs_1.default.existsSync(filePath)) {
                    console.warn(`[LAB_RESULTS] File not found: ${filePath}`);
                    continue;
                }
                let extractedText = '';
                try {
                    if (filename.endsWith('.pdf')) {
                        extractedText = yield pdfService.extractText(filePath);
                    }
                    else {
                        extractedText = fs_1.default.readFileSync(filePath, 'utf-8');
                    }
                }
                catch (readErr) {
                    console.error("Error extracting text from lab file:", readErr);
                    extractedText = "[Error al leer documento de laboratorio]";
                }
                fullCombinedText += `\n\n=== ARCHIVO: ${filename} ===\n${extractedText}`;
            }
            // Get OIT Context for better analysis
            const oit = yield prisma.oIT.findUnique({ where: { id: oitId } });
            const oitContext = `${(oit === null || oit === void 0 ? void 0 : oit.description) || ''} - Servicio específico: ${group}`;
            // Analyze with AI
            const analysis = yield aiService.analyzeLabResults(fullCombinedText, oitContext);
            // Update grouped internal analysis
            let currentAnalyses = {};
            if (oit === null || oit === void 0 ? void 0 : oit.labResultsAnalysis) {
                try {
                    const parsed = JSON.parse(oit.labResultsAnalysis);
                    currentAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': String(parsed) };
                }
                catch (_a) {
                    currentAnalyses = { 'General': oit.labResultsAnalysis };
                }
            }
            currentAnalyses[group] = analysis;
            // Update OIT with results
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    labResultsAnalysis: JSON.stringify(currentAnalyses),
                    status: analysis.includes('Error') ? 'REVIEW_NEEDED' : 'COMPLETED'
                }
            });
            console.log(`Lab analysis completed for OIT ${oitId}, Group: ${group}`);
            // Automatically generate final report if analysis was successful
            if (!analysis.includes('Error')) {
                console.log(`Triggering automatic report generation for OIT ${oitId}, Group: ${group}`);
                try {
                    yield internalGenerateFinalReport(oitId, group);
                }
                catch (reportErr) {
                    console.error(`Automatic report generation failed for OIT ${oitId}:`, reportErr);
                }
            }
        }
        catch (error) {
            console.error('Background lab analysis failed:', error);
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    status: 'REVIEW_NEEDED',
                    labResultsAnalysis: "Error interno al procesar resultados. Por favor, revise el documento manualmente."
                }
            });
        }
    });
}
// Reusable report generation logic
function internalGenerateFinalReport(id, targetGroup) {
    return __awaiter(this, void 0, void 0, function* () {
        const { pdfService } = require('../services/pdf.service');
        const { docxService } = require('../services/docx.service');
        const { validationService } = require('../services/validation.service');
        const { TemplateDataMapper } = require('../config/templateDataMapper');
        const { marked } = yield Promise.resolve().then(() => __importStar(require('marked')));
        console.log(`[Report] Starting grouped generation for OIT ${id}`);
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit)
            throw new Error('OIT no encontrada');
        // 1. Prepare grouped data
        let groupedLabAnalyses = {};
        if (oit.labResultsAnalysis) {
            try {
                const parsed = JSON.parse(oit.labResultsAnalysis);
                groupedLabAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': String(parsed) };
            }
            catch (_a) {
                groupedLabAnalyses = { 'General': oit.labResultsAnalysis };
            }
        }
        // 2. Parse sampling sheet analysis
        let groupedSheetAnalysis = {};
        if (oit.samplingSheetAnalysis) {
            try {
                const parsed = JSON.parse(oit.samplingSheetAnalysis);
                groupedSheetAnalysis = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': parsed };
            }
            catch (e) {
                console.warn('[Report] Failed to parse samplingSheetAnalysis', e);
            }
        }
        console.log(`[Report] Available labAnalysis keys: [${Object.keys(groupedLabAnalyses).join(', ')}]`);
        console.log(`[Report] Available sheetAnalysis keys: [${Object.keys(groupedSheetAnalysis).join(', ')}]`);
        // 3. Group Templates by Service Type
        const templateIds = oit.selectedTemplateIds ? JSON.parse(oit.selectedTemplateIds) : [];
        const generatedReports = [];
        if (templateIds.length === 0) {
            // Fallback: One General Report
            console.log('[Report] No templates selected, generating general report.');
            const groupLabAnalysis = groupedLabAnalyses['General'] || '';
            const groupSheetAnalysis = groupedSheetAnalysis['General'] || null;
            const reportMarkdown = yield validationService.generateFinalReportContent(oit, groupLabAnalysis, 'General', groupSheetAnalysis);
            const { filename, isDocx } = yield generateDocumentFromMarkdown(oit, reportMarkdown, null);
            generatedReports.push({ name: 'Informe General', url: filename, type: isDocx ? 'docx' : 'pdf' });
            // Generate Comunicado for General
            if (groupLabAnalysis) {
                try {
                    console.log('[Report] Generating comunicado for General...');
                    const comunicadoContent = yield validationService.generateComunicadoContent(oit, groupLabAnalysis, 'General');
                    const { comunicadoService } = require('../services/comunicado.service');
                    const comunicadoFilename = yield comunicadoService.generateComunicado(oit, comunicadoContent, 'General');
                    generatedReports.push({ name: 'Comunicado General', url: comunicadoFilename, type: 'docx' });
                }
                catch (comErr) {
                    console.error('[Report] Comunicado generation failed for General:', comErr);
                }
            }
        }
        else {
            // Fetch all templates
            const templates = yield prisma.samplingTemplate.findMany({
                where: { id: { in: templateIds } }
            });
            // Group by oitType
            const groupedTemplates = {};
            // Fuzzy match helper: checks if either string contains the other (case-insensitive)
            const matchesGroup = (oitType, target) => {
                const a = oitType.toLowerCase().trim();
                const b = target.toLowerCase().trim();
                return a === b || a.includes(b) || b.includes(a);
            };
            for (const t of templates) {
                const type = t.oitType || 'General';
                if (targetGroup && targetGroup !== 'General' && !matchesGroup(type, targetGroup))
                    continue;
                if (!groupedTemplates[type])
                    groupedTemplates[type] = [];
                groupedTemplates[type].push(t);
            }
            if (Object.keys(groupedTemplates).length === 0 && targetGroup && targetGroup !== 'General') {
                console.warn(`[Report] No templates found for targetGroup: "${targetGroup}". Available oitTypes: ${templates.map(t => t.oitType).join(', ')}`);
            }
            console.log(`[Report] Found groups to process: ${Object.keys(groupedTemplates).join(', ')}`);
            // Generate reports for targeted Groups in PARALLEL to avoid timeouts
            const reportPromises = Object.entries(groupedTemplates).map((_a) => __awaiter(this, [_a], void 0, function* ([groupName, group]) {
                try {
                    // Find a valid DOCX template to use
                    let masterTemplate = group.find(t => t.reportTemplateFile);
                    // Fallback 1: First in group
                    if (!masterTemplate && group.length > 0)
                        masterTemplate = group[0];
                    if (!masterTemplate || !masterTemplate.reportTemplateFile) {
                        const errorMsg = `[Report] CRITICAL: No DOCX template configured for service "${groupName}". Please configure a template file for this service in the Templates module.`;
                        console.error(errorMsg);
                        throw new Error(`La plantilla DOCX para el servicio "${groupName}" no está configurada.`);
                    }
                    // Context description: "Agua Potable (Fisicoquímico, Microbiológico)"
                    const serviceContext = `${groupName} (${group.map(t => t.name).join(', ')})`;
                    // Fuzzy key lookup: lab analyses are stored under service names like "SERVICIO 1 - AGUAS"
                    // but groupName is the oitType like "AGUA". We need to find the matching key.
                    const fuzzyLookup = (record, key) => {
                        // 1. Exact match
                        if (record[key] !== undefined)
                            return record[key];
                        // 2. Word-level fuzzy match (same logic as matchesGroup)
                        const keyLower = key.toLowerCase().trim();
                        for (const storedKey of Object.keys(record)) {
                            if (storedKey === 'General')
                                continue; // Skip General for fuzzy match
                            const storedLower = storedKey.toLowerCase().trim();
                            if (storedLower.includes(keyLower) || keyLower.includes(storedLower)) {
                                console.log(`[Report] Fuzzy key match: "${key}" → "${storedKey}"`);
                                return record[storedKey];
                            }
                            // Word-level: split both and check for significant overlap
                            const keyWords = keyLower.split(/[\s_\-,]+/).filter(w => w.length >= 3);
                            const storedWords = storedLower.split(/[\s_\-,]+/).filter(w => w.length >= 3);
                            const hasOverlap = keyWords.some(w => storedWords.some(sw => sw.includes(w) || w.includes(sw)));
                            if (hasOverlap) {
                                console.log(`[Report] Fuzzy word match: "${key}" → "${storedKey}"`);
                                return record[storedKey];
                            }
                        }
                        // 3. Fallback to General
                        return record['General'];
                    };
                    const groupLabAnalysisRaw = fuzzyLookup(groupedLabAnalyses, groupName) || '';
                    let groupLabAnalysisNarrative = typeof groupLabAnalysisRaw === 'string' ? groupLabAnalysisRaw : '';
                    let groupLabAnalysisParsed = {};
                    if (typeof groupLabAnalysisRaw === 'string') {
                        try {
                            const parsed = JSON.parse(groupLabAnalysisRaw);
                            if (parsed.rawText) {
                                groupLabAnalysisNarrative = parsed.rawText;
                                groupLabAnalysisParsed = parsed.parsedData || {};
                            }
                        }
                        catch (e) { }
                    }
                    else if (typeof groupLabAnalysisRaw === 'object' && groupLabAnalysisRaw !== null) {
                        groupLabAnalysisNarrative = groupLabAnalysisRaw.rawText || JSON.stringify(groupLabAnalysisRaw);
                        groupLabAnalysisParsed = groupLabAnalysisRaw.parsedData || {};
                    }
                    const groupSheetAnalysis = fuzzyLookup(groupedSheetAnalysis, groupName) || null;
                    console.log(`[Report] Group "${groupName}": labAnalysis=${groupLabAnalysisNarrative ? groupLabAnalysisNarrative.slice(0, 80) + '...' : 'EMPTY'}, sheetAnalysis=${groupSheetAnalysis ? 'YES' : 'NO'}`);
                    const groupResults = [];
                    // 1. Generate Final Report
                    const reportMarkdown = yield validationService.generateFinalReportContent(oit, groupLabAnalysisNarrative, serviceContext, groupSheetAnalysis);
                    // Ensure masterTemplate is valid before passing
                    const effectiveTemplate = masterTemplate || (templates.length > 0 ? templates[0] : null);
                    console.log(`[Report] Using template: ${effectiveTemplate === null || effectiveTemplate === void 0 ? void 0 : effectiveTemplate.name}, File: ${effectiveTemplate === null || effectiveTemplate === void 0 ? void 0 : effectiveTemplate.reportTemplateFile}`);
                    const { filename, isDocx } = yield generateDocumentFromMarkdown(oit, reportMarkdown, effectiveTemplate, groupLabAnalysisParsed);
                    groupResults.push({
                        name: `Informe ${groupName}`,
                        url: filename,
                        type: (isDocx ? 'docx' : 'pdf')
                    });
                    // 2. Generate Comunicado for this service group
                    if (groupLabAnalysisNarrative) {
                        try {
                            console.log(`[Report] Generating comunicado for ${groupName}...`);
                            const comunicadoContent = yield validationService.generateComunicadoContent(oit, groupLabAnalysisNarrative, serviceContext);
                            const { comunicadoService } = require('../services/comunicado.service');
                            const comunicadoFilename = yield comunicadoService.generateComunicado(oit, comunicadoContent, groupName);
                            groupResults.push({ name: `Comunicado ${groupName}`, url: comunicadoFilename, type: 'docx' });
                        }
                        catch (comErr) {
                            console.error(`[Report] Comunicado generation failed for ${groupName}:`, comErr);
                        }
                    }
                    return groupResults;
                }
                catch (err) {
                    console.error(`[Report] Failed to generate report for group ${groupName}:`, err);
                    return [];
                }
            }));
            // Wait for all groups to complete
            const results = yield Promise.all(reportPromises);
            results.flat().forEach(r => generatedReports.push(r));
        }
        // 4. Update OIT
        yield prisma.oIT.update({
            where: { id },
            data: { finalReportUrl: JSON.stringify(generatedReports) }
        });
        yield recordReportVersions(id, generatedReports);
        console.log(`[Report] Completed. Generated ${generatedReports.length} reports.`);
        // Return compatible object for legacy handling if strictly needed, but new flow uses JSON list
        return { generatedReports };
    });
}
/**
 * Helper to generate document, returns filename and type
 */
function generateDocumentFromMarkdown(oit_1, reportMarkdown_1, template_1) {
    return __awaiter(this, arguments, void 0, function* (oit, reportMarkdown, template, parsedAIData = {}) {
        const { pdfService } = require('../services/pdf.service');
        const { docxService } = require('../services/docx.service');
        const { TemplateDataMapper } = require('../config/templateDataMapper');
        const { marked } = yield Promise.resolve().then(() => __importStar(require('marked')));
        let generatedFileBuffer = null;
        let generatedFileName = '';
        let isDocx = false;
        // Try Word Generation
        if (template && template.reportTemplateFile) {
            try {
                const mapper = new TemplateDataMapper(template.reportTemplateFile, {
                    oitNumber: oit.oitNumber,
                    description: oit.description,
                    location: oit.location,
                    scheduledDate: oit.scheduledDate,
                    serviceName: template.oitType || template.name, // Use Type as main title if possible
                    aiData: Object.keys(parsedAIData).length > 0 ? JSON.stringify(parsedAIData) : undefined
                }, reportMarkdown);
                const docxData = mapper.generateData();
                console.log(`[Report] Generated DOCX data with ${Object.keys(docxData).length} keys for template ${template.name}`);
                generatedFileBuffer = yield docxService.generateDocument(template.reportTemplateFile, docxData);
                if (generatedFileBuffer) {
                    console.log(`[Report] Generated DOCX buffer size: ${generatedFileBuffer.length} bytes`);
                }
                // Filename: Informe_Agua_Potable_OIT-123...
                const safeType = (template.oitType || template.name).replace(/[^a-zA-Z0-9]/g, '_');
                generatedFileName = `Informe_${safeType}_${oit.oitNumber}_${Date.now()}.docx`;
                isDocx = true;
            }
            catch (e) {
                console.error('[Report] Docx generation failed, falling back to PDF', e);
            }
        }
        if (!isDocx) {
            // PDF Generation
            const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
            const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    h1 { border-bottom: 2px solid #22c55e; padding-bottom: 12px; font-size: 24px; color: #14532d; }
                    h2 { background: #f0fdf4; padding: 8px 12px; border-left: 4px solid #22c55e; font-size: 18px; margin-top:20px; }
                    strong { color: #14532d; }
                    .meta { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 15px; display: flex; justify-content: space-between; }
                </style>
            </head>
            <body>
                <div class="meta">
                    <div>
                        <strong>ALS - Informe Técnico</strong><br>
                        ${(template === null || template === void 0 ? void 0 : template.oitType) || (template === null || template === void 0 ? void 0 : template.name) || 'General'}
                    </div>
                    <div>${oit.oitNumber} <br> ${date}</div>
                </div>
                ${(yield Promise.resolve().then(() => __importStar(require('marked')))).marked.parse(reportMarkdown)}
            </body>
            </html>
        `;
            generatedFileName = `Informe_${((template === null || template === void 0 ? void 0 : template.oitType) || 'General').replace(/\s+/g, '_')}_${oit.oitNumber}_${Date.now()}.pdf`;
            const pdfPath = yield pdfService.generatePDFFromHTML(htmlContent, generatedFileName);
            generatedFileBuffer = fs_1.default.readFileSync(pdfPath);
        }
        // Save File
        const uploadsDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadsDir))
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(uploadsDir, generatedFileName), generatedFileBuffer);
        return { filename: generatedFileName, isDocx };
    });
}
// Generate Final Report
// Assign Engineers to OIT
const assignEngineers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { engineerIds } = req.body; // Array of user IDs
        if (!Array.isArray(engineerIds)) {
            return res.status(400).json({ error: 'engineerIds debe ser un array' });
        }
        // Verify OIT exists
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Remove existing assignments
        yield prisma.oITAssignment.deleteMany({
            where: { oitId: id }
        });
        // Create new assignments
        if (engineerIds.length > 0) {
            yield prisma.oITAssignment.createMany({
                data: engineerIds.map((userId) => ({
                    oitId: id,
                    userId
                }))
            });
        }
        // Get updated OIT with assignments
        const updatedOit = yield prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        res.json({
            success: true,
            assignedEngineers: (updatedOit === null || updatedOit === void 0 ? void 0 : updatedOit.assignedEngineers.map((a) => a.user)) || []
        });
    }
    catch (error) {
        console.error('Error assigning engineers:', error);
        res.status(500).json({ error: 'Error al asignar ingenieros' });
    }
});
exports.assignEngineers = assignEngineers;
// Get assigned engineers for an OIT
const getAssignedEngineers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const assignments = yield prisma.oITAssignment.findMany({
            where: { oitId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });
        res.json(assignments.map((a) => a.user));
    }
    catch (error) {
        console.error('Error getting assigned engineers:', error);
        res.status(500).json({ error: 'Error al obtener ingenieros asignados' });
    }
});
exports.getAssignedEngineers = getAssignedEngineers;
// Get all OIT records (filtered by role)
const getAllOITs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const userRole = user === null || user === void 0 ? void 0 : user.role;
        const userId = user === null || user === void 0 ? void 0 : user.userId;
        // If user is ENGINEER, only show OITs assigned to them
        let whereClause = {};
        if (userRole === 'ENGINEER' && userId) {
            whereClause = {
                assignedEngineers: {
                    some: {
                        userId: userId
                    }
                }
            };
        }
        console.log('[DEBUG-OIT-LIST] User:', { userId, userRole });
        console.log('[DEBUG-OIT-LIST] WhereClause:', JSON.stringify(whereClause, null, 2));
        const oits = yield prisma.oIT.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        console.log(`[DEBUG-OIT-LIST] Found ${oits.length} OITs`);
        // Map to include engineers in a cleaner format
        const result = oits.map((oit) => (Object.assign(Object.assign({}, oit), { engineers: oit.assignedEngineers.map((a) => a.user) })));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in getAllOITs:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
});
exports.getAllOITs = getAllOITs;
// Get a single OIT by ID
const getOITById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        const oit = yield prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        if (!oit) {
            return res.status(404).json({ message: 'OIT not found' });
        }
        // If user is ENGINEER, check if they are assigned
        if ((user === null || user === void 0 ? void 0 : user.role) === 'ENGINEER') {
            const isAssigned = oit.assignedEngineers.some((a) => a.userId === user.userId);
            if (!isAssigned) {
                return res.status(403).json({ message: 'No tienes acceso a esta OIT' });
            }
        }
        res.status(200).json(Object.assign(Object.assign({}, oit), { engineers: oit.assignedEngineers.map((a) => a.user) }));
    }
    catch (error) {
        console.error('Error in getOITById:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
});
exports.getOITById = getOITById;
/* Existing createOIT (JSON) kept for backward compatibility */
const createOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { oitNumber, description, status } = req.body;
        const oit = yield prisma.oIT.create({
            data: {
                oitNumber: oitNumber || '',
                description: description || '',
                status: status || 'PENDING',
            },
        });
        res.status(201).json(oit);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.createOIT = createOIT;
// Async creation endpoint that accepts file uploads and triggers background AI processing
// Create OIT from URL (Legacy JSON support)
const createOITFromUrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { OT, DOCUMENTO } = req.body;
        if (!DOCUMENTO) {
            return res.status(400).json({ error: 'Falta el campo DOCUMENTO (URL)' });
        }
        const oitNumber = OT || `OIT-${Date.now()}`;
        // Auth is optional for this endpoint as per requirement, but if token is sent, we can use it
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        console.log(`[Legacy API] Processing OIT from URL: ${DOCUMENTO}`);
        // 1. Download file
        const filename = `oitFromUrl-${Date.now()}.pdf`;
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path_1.default.join(uploadDir, filename);
        try {
            const response = yield (0, axios_1.default)({
                method: 'get',
                url: DOCUMENTO,
                responseType: 'stream'
            });
            const writer = fs_1.default.createWriteStream(filePath);
            response.data.pipe(writer);
            yield new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(true));
                writer.on('error', reject);
            });
        }
        catch (downloadError) {
            console.error('Error downloading file:', downloadError);
            return res.status(400).json({ error: 'Error al descargar el archivo desde la URL proporcionada' });
        }
        const fileUrl = `/uploads/${filename}`;
        // 2. Create OIT Record
        const oit = yield prisma.oIT.create({
            data: {
                oitNumber: oitNumber,
                description: 'Importado vía integración externa',
                status: 'UPLOADING',
                oitFileUrl: fileUrl,
            }
        });
        // 3. Respond immediately
        res.json({
            id: oit.id,
            oitNumber: oit.oitNumber,
            status: 'UPLOADING',
            message: 'OIT recibida y creada. Procesando archivo...'
        });
        // 4. Trigger Async Processing reusing existing logic
        // We mock the file object structure expected by processOITFilesAsync (partial match)
        const mockFiles = {
            oitFile: [{
                    path: filePath,
                    filename: filename
                }]
        };
        // Note: processOITFilesAsync needs to be defined/imported or available in scope. 
        // Since it is in this same file (usually below), we can call it if it's hoisted or defined later. 
        // If it's not exported or hoisted, we might need to check. 
        // TypeScript functions are hoisted if defined as 'async function', but 'const func = ...' are not hoisted.
        // If processOITFilesAsync is defined as 'const', we might have issues if it's below.
        // Let's check processOITFilesAsync definition style.
        // Assuming processOITFilesAsync is defined below as 'const processOITFilesAsync = ...' or 'export const ...'
        // If so, we can't call it before definition.
        // Safer approach: duplicate the crucial background logic locally or move definitions.
        // For now, I'll inline the core logic to be safe and avoid refactoring huge file.
        (() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { pdfService } = require('../services/pdf.service');
                const text = yield pdfService.extractText(filePath);
                yield prisma.oIT.update({ where: { id: oit.id }, data: { status: 'ANALYZING' } });
                const analysis = yield aiService.analyzeDocument(text);
                yield prisma.oIT.update({
                    where: { id: oit.id },
                    data: {
                        aiData: JSON.stringify(analysis),
                        status: 'PENDING'
                    }
                });
                console.log(`[Legacy API] OIT ${oit.oitNumber} processed successfully.`);
            }
            catch (err) {
                console.error('[Legacy API] Error processing background task:', err);
                yield prisma.oIT.update({
                    where: { id: oit.id },
                    data: { status: 'REVIEW_IMPORTANT' }
                });
            }
        }))();
    }
    catch (error) {
        console.error('Error creating OIT from URL:', error);
        res.status(500).json({ error: 'Error interno al procesar solicitud' });
    }
});
exports.createOITFromUrl = createOITFromUrl;
const createOITAsync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { oitNumber, description } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId; // Cast req to any to access user property
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        // Generate oitNumber if not provided
        const finalOitNumber = oitNumber || `OIT-${Date.now()}`;
        // Create OIT with UPLOADING status
        const oit = yield prisma.oIT.create({
            data: {
                oitNumber: finalOitNumber,
                description: description || 'Análisis en curso...',
                status: 'UPLOADING'
            }
        });
        // Send immediate response
        res.json({
            id: oit.id,
            oitNumber: oit.oitNumber,
            status: 'UPLOADING',
            message: 'OIT creada. Procesando archivos en segundo plano...'
        });
        // Process files asynchronously
        processOITFilesAsync(oit.id, req.files, userId).catch(err => {
            console.error('Error processing OIT files:', err);
        });
    }
    catch (error) {
        console.error('Error creating OIT:', error);
        res.status(500).json({ error: 'Error al crear OIT' });
    }
});
exports.createOITAsync = createOITAsync;
// Separated Analysis Logic
function runOITAnalysis(oitId, oitFilePath, quotationFilePath, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { complianceService } = yield Promise.resolve().then(() => __importStar(require('../services/compliance.service')));
            const { default: planningService } = yield Promise.resolve().then(() => __importStar(require('../services/planning.service')));
            yield prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'ANALYZING' }
            });
            const aiDataContent = {};
            let extractedDescription = null;
            let extractedLocation = null;
            // Analyze OIT File
            if (oitFilePath && fs_1.default.existsSync(oitFilePath)) {
                const pdfParse = (yield Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
                const dataBuffer = yield fs_1.default.promises.readFile(oitFilePath);
                const pdfData = yield pdfParse(dataBuffer);
                const oitText = pdfData.text;
                const oitAnalysis = yield aiService.analyzeDocument(oitText);
                aiDataContent.oit = oitAnalysis;
                // Extract description
                if (oitAnalysis.description) {
                    extractedDescription = oitAnalysis.description;
                }
                else if (oitText.length > 50) {
                    extractedDescription = oitText.substring(0, 200).trim() + '...';
                }
                // Extract location from analysis
                if (oitAnalysis.location) {
                    extractedLocation = oitAnalysis.location;
                }
                else {
                    // Fallback: search for common location keywords
                    const locationMatch = oitText.match(/(?:Dirección|Ubicación|Lugar|Sitio|Dirección del sitio)[:\s]+([^\n.]{10,150})/i);
                    if (locationMatch) {
                        extractedLocation = locationMatch[1].trim();
                    }
                }
            }
            // Analyze Quotation File
            if (quotationFilePath && fs_1.default.existsSync(quotationFilePath)) {
                const pdfParse = (yield Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
                const dataBuffer = yield fs_1.default.promises.readFile(quotationFilePath);
                const pdfData = yield pdfParse(dataBuffer);
                const quotationText = pdfData.text;
                const quotationAnalysis = yield aiService.analyzeDocument(quotationText);
                aiDataContent.quotation = quotationAnalysis;
                // Extract resources
                if (quotationAnalysis.resources) {
                    aiDataContent.resources = quotationAnalysis.resources;
                }
            }
            // Update with AI data
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    description: extractedDescription || undefined, // Only update if found
                    location: extractedLocation || undefined,
                    aiData: JSON.stringify({
                        valid: true,
                        message: 'Análisis de documentos completado',
                        data: aiDataContent
                    }),
                    resources: aiDataContent.resources ? JSON.stringify(aiDataContent.resources) : undefined
                }
            });
            // Compliance
            yield (0, notification_controller_1.createNotification)(userId, 'Verificando Cumplimiento', 'Analizando normas...', 'INFO', oitId);
            try {
                const complianceResult = yield complianceService.checkCompliance(oitId, userId);
                yield prisma.oIT.update({
                    where: { id: oitId },
                    data: { status: 'REVIEW_REQUIRED' }
                });
            }
            catch (e) {
                console.error('Compliance check error:', e);
                // Fallback: update status anyway so it doesn't get stuck
                yield prisma.oIT.update({
                    where: { id: oitId },
                    data: { status: 'REVIEW_REQUIRED' }
                });
            }
            // Planning
            try {
                yield (0, notification_controller_1.createNotification)(userId, 'Generando Propuesta', 'Creando propuesta de planeación...', 'INFO', oitId);
                const proposal = yield planningService.generateProposal(oitId);
                yield (0, notification_controller_1.createNotification)(userId, 'Propuesta Lista', `Propuesta generada con plantilla "${proposal.templateName}"`, 'SUCCESS', oitId);
            }
            catch (e) {
                console.error(e);
            }
            yield (0, notification_controller_1.createNotification)(userId, 'OIT Procesada', 'Análisis completado exitosamente.', 'SUCCESS', oitId);
        }
        catch (error) {
            console.error('Error in runOITAnalysis:', error);
            yield prisma.oIT.update({ where: { id: oitId }, data: { status: 'PENDING' } });
            yield (0, notification_controller_1.createNotification)(userId, 'Error al Procesar', 'Falló el análisis de la OIT.', 'ERROR', oitId);
        }
    });
}
function processOITFilesAsync(oitId, files, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const oitFile = (_a = files === null || files === void 0 ? void 0 : files.oitFile) === null || _a === void 0 ? void 0 : _a[0];
        const quotationFile = (_b = files === null || files === void 0 ? void 0 : files.quotationFile) === null || _b === void 0 ? void 0 : _b[0];
        let updateData = { status: 'ANALYZING' };
        if (oitFile)
            updateData.oitFileUrl = `/uploads/${oitFile.filename}`;
        if (quotationFile)
            updateData.quotationFileUrl = `/uploads/${quotationFile.filename}`;
        yield prisma.oIT.update({
            where: { id: oitId },
            data: updateData
        });
        // Run analysis using physical paths
        yield runOITAnalysis(oitId, oitFile ? oitFile.path : null, quotationFile ? quotationFile.path : null, userId);
    });
}
// Re-analyze Endpoint
const reanalyzeOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit)
            return res.status(404).json({ error: 'OIT not found' });
        // Resolve absolute paths
        const uploadsRoot = path_1.default.join(__dirname, '../../');
        let oitPath = null;
        let quotationPath = null;
        if (oit.oitFileUrl) {
            // Handle both relative URL (/uploads/file) and stored filenames
            const cleanPath = oit.oitFileUrl.replace(/^\//, '').replace(/\\/g, '/'); // Remove leading slash
            oitPath = path_1.default.join(uploadsRoot, cleanPath);
            // Fallback if not found (sometimes stored simply as uploads/file)
            if (!fs_1.default.existsSync(oitPath)) {
                oitPath = path_1.default.join(uploadsRoot, 'uploads', path_1.default.basename(oit.oitFileUrl));
            }
        }
        if (oit.quotationFileUrl) {
            const cleanPath = oit.quotationFileUrl.replace(/^\//, '').replace(/\\/g, '/');
            quotationPath = path_1.default.join(uploadsRoot, cleanPath);
            if (!fs_1.default.existsSync(quotationPath)) {
                quotationPath = path_1.default.join(uploadsRoot, 'uploads', path_1.default.basename(oit.quotationFileUrl));
            }
        }
        // Trigger Async Analysis
        runOITAnalysis(id, oitPath, quotationPath, userId).catch(err => console.error("Re-analysis error:", err));
        res.json({ message: 'Re-análisis iniciado correctamente.' });
    }
    catch (error) {
        console.error('Error re-analyzing:', error);
        res.status(500).json({ error: 'Error al iniciar re-análisis' });
    }
});
exports.reanalyzeOIT = reanalyzeOIT;
// Update OIT (supports new fields, engineer assignment, and file uploads)
const updateOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const { oitNumber, description, status, oitFileUrl, quotationFileUrl, aiData, resources, engineerIds } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const data = {};
        // Handle uploaded files from multer
        const files = req.files;
        const uploadedOitFile = (_b = files === null || files === void 0 ? void 0 : files.oitFile) === null || _b === void 0 ? void 0 : _b[0];
        const uploadedQuotationFile = (_c = files === null || files === void 0 ? void 0 : files.quotationFile) === null || _c === void 0 ? void 0 : _c[0];
        let shouldReanalyze = false;
        if (uploadedOitFile) {
            data.oitFileUrl = `/uploads/${uploadedOitFile.filename}`;
            shouldReanalyze = true;
        }
        if (uploadedQuotationFile) {
            data.quotationFileUrl = `/uploads/${uploadedQuotationFile.filename}`;
            shouldReanalyze = true;
        }
        if (oitNumber !== undefined)
            data.oitNumber = oitNumber;
        if (description !== undefined)
            data.description = description;
        if (status !== undefined)
            data.status = status;
        // Only use URL from body if no file was uploaded
        if (oitFileUrl !== undefined && !uploadedOitFile)
            data.oitFileUrl = oitFileUrl;
        if (quotationFileUrl !== undefined && !uploadedQuotationFile)
            data.quotationFileUrl = quotationFileUrl;
        if (req.body.quotationId !== undefined) {
            data.quotationId = req.body.quotationId;
            // Fetch quotation file url if we want to sync it?
            // Ideally, we should rely on relational data, but if we need to display it from oIT.quotationFileUrl for legacy reasons:
            try {
                const q = yield prisma.quotation.findUnique({ where: { id: req.body.quotationId } });
                if (q && q.fileUrl)
                    data.quotationFileUrl = q.fileUrl;
            }
            catch (e) {
                console.error('Error fetching linked quotation file', e);
            }
        }
        if (aiData !== undefined)
            data.aiData = aiData;
        if (resources !== undefined)
            data.resources = resources;
        if (req.body.scheduledDate !== undefined)
            data.scheduledDate = req.body.scheduledDate;
        // Handle selectedTemplateIds (expecting array from client)
        if (req.body.selectedTemplateIds !== undefined) {
            data.selectedTemplateIds = Array.isArray(req.body.selectedTemplateIds)
                ? JSON.stringify(req.body.selectedTemplateIds)
                : req.body.selectedTemplateIds; // If already string or null
        }
        // Get the existing OIT to check for status change and current assignments
        const existing = yield prisma.oIT.findUnique({
            where: { id },
            include: { assignedEngineers: true }
        });
        if (!existing) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Validate mandatory engineer assignment when scheduling
        if (status === 'SCHEDULED') {
            const hasNewEngineers = engineerIds && Array.isArray(engineerIds) && engineerIds.length > 0;
            const hasExistingEngineers = existing.assignedEngineers.length > 0;
            // If neither new engineers are provided nor existing ones are present (and we aren't clearing them with empty array)
            const willHaveEngineers = hasNewEngineers || (hasExistingEngineers && engineerIds === undefined);
            if (!willHaveEngineers) {
                return res.status(400).json({
                    error: 'Debe asignar al menos un ingeniero de campo para programar la visita.'
                });
            }
        }
        // Transaction to update OIT and assignments
        const result = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Update OIT fields
            const updated = yield prisma.oIT.update({
                where: { id },
                data,
            });
            // 2. Update assignments if provided
            if (engineerIds && Array.isArray(engineerIds)) {
                // Remove existing
                yield prisma.oITAssignment.deleteMany({
                    where: { oitId: id }
                });
                // Add new
                if (engineerIds.length > 0) {
                    yield prisma.oITAssignment.createMany({
                        data: engineerIds.map((userId) => ({
                            oitId: id,
                            userId
                        }))
                    });
                }
            }
            return updated;
        }));
        // Create notification on status change (reuse existing logic)
        if (status && existing.status !== status) {
            const userId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.userId;
            if (userId) {
                const statusMessages = {
                    'REVIEW_REQUIRED': {
                        title: 'Revisión Requerida',
                        message: `OIT ${result.oitNumber} requiere revisión. Se encontraron observaciones en el análisis.`,
                        type: 'WARNING'
                    },
                    'SCHEDULED': {
                        title: 'Muestreo Agendado',
                        message: `OIT ${result.oitNumber} ha sido agendado para muestreo.`,
                        type: 'SUCCESS'
                    },
                    'IN_PROGRESS': {
                        title: 'Muestreo en Progreso',
                        message: `OIT ${result.oitNumber} está en proceso de muestreo.`,
                        type: 'INFO'
                    },
                    'COMPLETED': {
                        title: 'OIT Completado',
                        message: `OIT ${result.oitNumber} ha sido completado exitosamente.`,
                        type: 'SUCCESS'
                    }
                };
                const notificationData = statusMessages[status];
                if (notificationData) {
                    yield (0, notification_controller_1.createNotification)(userId, notificationData.title, notificationData.message, notificationData.type, id);
                }
            }
        }
        // Return updated object with engineers
        const finalOit = yield prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        res.status(200).json(Object.assign(Object.assign({}, finalOit), { engineers: finalOit === null || finalOit === void 0 ? void 0 : finalOit.assignedEngineers.map((a) => a.user), reanalyzing: shouldReanalyze }));
        // Trigger re-analysis in background if files were uploaded
        if (shouldReanalyze && userId && finalOit) {
            const uploadsRoot = path_1.default.join(__dirname, '../../');
            const oitPath = finalOit.oitFileUrl
                ? path_1.default.join(uploadsRoot, finalOit.oitFileUrl.replace(/^\//, ''))
                : null;
            const quotationPath = finalOit.quotationFileUrl
                ? path_1.default.join(uploadsRoot, finalOit.quotationFileUrl.replace(/^\//, ''))
                : null;
            runOITAnalysis(id, oitPath, quotationPath, userId).catch(err => console.error('Error in background re-analysis after update:', err));
        }
    }
    catch (error) {
        console.error('Error updating OIT:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});
exports.updateOIT = updateOIT;
const deleteOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.oIT.delete({ where: { id } });
        res.status(200).json({ message: 'OIT deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.deleteOIT = deleteOIT;
const checkCompliance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        // Import dynamically to avoid potential circular dependency issues if any
        const { complianceService } = require('../services/compliance.service');
        const result = yield complianceService.checkCompliance(id, userId);
        res.json(result);
    }
    catch (error) {
        console.error('Error checking compliance:', error);
        res.status(500).json({ error: 'Error al verificar cumplimiento' });
    }
});
exports.checkCompliance = checkCompliance;
// Validate Sampling Step Data
const validateStepData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { stepIndex, stepDescription, stepRequirements, data } = req.body;
        console.log('--- VALIDATE STEP START ---');
        console.log('OIT ID:', id);
        console.log('Step Index:', stepIndex);
        console.log('Step Description:', stepDescription);
        console.log('Data recieved payload:', JSON.stringify(data, null, 2));
        console.log('Req Body keys:', Object.keys(req.body));
        if (!data) {
            console.error('MISSING DATA IN REQUEST BODY');
            return res.status(400).json({ error: 'Faltan datos para validar' });
        }
        const { validationService } = require('../services/validation.service');
        // Validate the step data using AI
        const validationResult = yield validationService.validateStepData(stepDescription, stepRequirements, data);
        // Update OIT with validation result
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Parse existing validations
        const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        stepValidations[stepIndex] = {
            validated: validationResult.validated,
            feedback: validationResult.feedback,
            confidence: validationResult.confidence,
            data: data,
            timestamp: new Date().toISOString()
        };
        // Update progress if validated
        let samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : { currentStep: 0, completedSteps: [] };
        if (validationResult.validated) {
            if (!samplingProgress.completedSteps.includes(stepIndex)) {
                samplingProgress.completedSteps.push(stepIndex);
            }
            samplingProgress.currentStep = stepIndex + 1;
        }
        yield prisma.oIT.update({
            where: { id },
            data: {
                stepValidations: JSON.stringify(stepValidations),
                samplingProgress: JSON.stringify(samplingProgress)
            }
        });
        res.json(validationResult);
    }
    catch (error) {
        console.error('Error validating step:', error);
        res.status(500).json({ error: 'Error al validar el paso' });
    }
});
exports.validateStepData = validateStepData;
// Finalize Sampling and Generate Analysis
const finalizeSampling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Verify all steps are completed
        const samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : null;
        const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const steps = ((_a = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _a === void 0 ? void 0 : _a.steps) || [];
        if (!samplingProgress || samplingProgress.completedSteps.length !== steps.length) {
            return res.status(400).json({ error: 'No todos los pasos están completados' });
        }
        // Prepare data for analysis
        const allStepsData = steps.map((step, index) => {
            var _a;
            return ({
                step: step.description || `Paso ${index + 1}`,
                data: ((_a = stepValidations[index]) === null || _a === void 0 ? void 0 : _a.data) || {},
                validation: stepValidations[index] || {}
            });
        });
        const { validationService } = require('../services/validation.service');
        // Generate final analysis
        const finalAnalysis = yield validationService.generateFinalAnalysis(oit.oitNumber, ((_b = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _b === void 0 ? void 0 : _b.selectedTemplate) || 'Plantilla', allStepsData);
        // Update OIT with final analysis and status
        yield prisma.oIT.update({
            where: { id },
            data: {
                finalAnalysis,
                status: 'COMPLETED'
            }
        });
        // Release Resources (Set to AVAILABLE)
        // Check both oit.resources and aiData.data.assignedResources for consistency
        const resourceIdsToRelease = [];
        if (oit.resources) {
            try {
                const resources = JSON.parse(oit.resources);
                const ids = Array.isArray(resources)
                    ? resources.map((r) => typeof r === 'string' ? r : r.id).filter(Boolean)
                    : [];
                resourceIdsToRelease.push(...ids);
            }
            catch (e) { }
        }
        // Also check aiData.data.assignedResources
        if (((_c = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _c === void 0 ? void 0 : _c.assignedResources) && Array.isArray(aiData.data.assignedResources)) {
            for (const resource of aiData.data.assignedResources) {
                if (resource.id && !resourceIdsToRelease.includes(resource.id)) {
                    resourceIdsToRelease.push(resource.id);
                }
            }
        }
        if (resourceIdsToRelease.length > 0) {
            yield prisma.resource.updateMany({
                where: { id: { in: resourceIdsToRelease } },
                data: { status: 'AVAILABLE' }
            });
            console.log(`Released ${resourceIdsToRelease.length} resources for OIT ${oit.oitNumber}`);
        }
        res.json({
            success: true,
            analysis: finalAnalysis
        });
    }
    catch (error) {
        console.error('Error finalizing sampling:', error);
        res.status(500).json({ error: 'Error al finalizar el muestreo' });
    }
});
exports.finalizeSampling = finalizeSampling;
// Generate Sampling Report PDF
const generateSamplingReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        if (!oit.finalAnalysis) {
            return res.status(400).json({ error: 'El muestreo no ha sido finalizado' });
        }
        // Import PDF service
        const { pdfService } = require('../services/pdf.service');
        // Generate PDF
        const pdfPath = yield pdfService.generateSamplingReport(oit);
        // Update OIT with report URL
        yield prisma.oIT.update({
            where: { id },
            data: {
                samplingReportUrl: pdfPath
            }
        });
        // Send PDF file
        res.download(pdfPath, `Informe_Muestreo_${oit.oitNumber}.pdf`);
    }
    catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Error al generar el informe PDF' });
    }
});
exports.generateSamplingReport = generateSamplingReport;
// Upload Sampling Sheets (Planillas de Muestreo)
const uploadSamplingSheets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { group = 'General' } = req.body; // New parameter
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo de planillas' });
        }
        // Fetch current OIT to append file
        const currentOit = yield prisma.oIT.findUnique({ where: { id }, select: { samplingSheetUrl: true } });
        let groupedFiles = {};
        if (currentOit === null || currentOit === void 0 ? void 0 : currentOit.samplingSheetUrl) {
            try {
                const parsed = JSON.parse(currentOit.samplingSheetUrl);
                if (Array.isArray(parsed)) {
                    groupedFiles = { 'General': parsed };
                }
                else if (typeof parsed === 'object' && parsed !== null) {
                    groupedFiles = parsed;
                }
                else {
                    groupedFiles = { 'General': [currentOit.samplingSheetUrl] };
                }
            }
            catch (e) {
                groupedFiles = { 'General': [currentOit.samplingSheetUrl] };
            }
        }
        const newPath = `uploads/${file.filename}`;
        if (!groupedFiles[group])
            groupedFiles[group] = [];
        groupedFiles[group].push(newPath);
        // Save file URL list and trigger analysis
        yield prisma.oIT.update({
            where: { id },
            data: {
                samplingSheetUrl: JSON.stringify(groupedFiles)
            }
        });
        res.json({
            success: true,
            samplingSheetUrl: JSON.stringify(groupedFiles), // Return updated list
            message: `Planillas para ${group} subidas. Analizando...`
        });
        // Trigger async analysis for THIS GROUP
        processSamplingSheetsAsync(id, groupedFiles[group].map(url => url.replace('uploads/', '')), group).catch(err => {
            console.error('Error in background sampling sheets processing:', err);
        });
    }
    catch (error) {
        console.error('Error uploading sampling sheets:', error);
        res.status(500).json({ error: 'Error al subir planillas de muestreo' });
    }
});
exports.uploadSamplingSheets = uploadSamplingSheets;
// Delete a Sampling Sheet from the list
const deleteSamplingSheet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { fileUrl, group = 'General' } = req.body;
        if (!fileUrl) {
            return res.status(400).json({ error: 'Se requiere fileUrl para eliminar' });
        }
        const currentOit = yield prisma.oIT.findUnique({ where: { id }, select: { samplingSheetUrl: true, samplingSheetAnalysis: true } });
        let groupedFiles = {};
        if (currentOit === null || currentOit === void 0 ? void 0 : currentOit.samplingSheetUrl) {
            try {
                const parsed = JSON.parse(currentOit.samplingSheetUrl);
                groupedFiles = Array.isArray(parsed) ? { 'General': parsed } : parsed;
            }
            catch (_a) {
                groupedFiles = { 'General': [currentOit.samplingSheetUrl] };
            }
        }
        if (groupedFiles[group]) {
            groupedFiles[group] = groupedFiles[group].filter(url => url !== fileUrl);
        }
        // Handle Analysis reset for that group
        let groupedAnalyses = {};
        if (currentOit === null || currentOit === void 0 ? void 0 : currentOit.samplingSheetAnalysis) {
            try {
                const parsed = JSON.parse(currentOit.samplingSheetAnalysis);
                groupedAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': parsed };
            }
            catch (_b) {
                groupedAnalyses = { 'General': currentOit.samplingSheetAnalysis };
            }
        }
        delete groupedAnalyses[group];
        yield prisma.oIT.update({
            where: { id },
            data: {
                samplingSheetUrl: JSON.stringify(groupedFiles),
                samplingSheetAnalysis: JSON.stringify(groupedAnalyses)
            }
        });
        res.json({ success: true, samplingSheetUrl: JSON.stringify(groupedFiles), message: 'Archivo eliminado' });
    }
    catch (error) {
        console.error('Error deleting sampling sheet:', error);
        res.status(500).json({ error: 'Error al eliminar planilla' });
    }
});
exports.deleteSamplingSheet = deleteSamplingSheet;
// Delete a Lab Result from the list
const deleteLabResult = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { fileUrl, group = 'General' } = req.body;
        if (!fileUrl) {
            return res.status(400).json({ error: 'Se requiere fileUrl para eliminar' });
        }
        const currentOit = yield prisma.oIT.findUnique({ where: { id }, select: { labResultsUrl: true, labResultsAnalysis: true } });
        let groupedFiles = {};
        if (currentOit === null || currentOit === void 0 ? void 0 : currentOit.labResultsUrl) {
            try {
                const parsed = JSON.parse(currentOit.labResultsUrl);
                groupedFiles = Array.isArray(parsed) ? { 'General': parsed } : parsed;
            }
            catch (_a) {
                groupedFiles = { 'General': [currentOit.labResultsUrl] };
            }
        }
        if (groupedFiles[group]) {
            groupedFiles[group] = groupedFiles[group].filter(url => url !== fileUrl);
        }
        // Handle Analysis reset for that group
        let groupedAnalyses = {};
        if (currentOit === null || currentOit === void 0 ? void 0 : currentOit.labResultsAnalysis) {
            try {
                const parsed = JSON.parse(currentOit.labResultsAnalysis);
                groupedAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': String(parsed) };
            }
            catch (_b) {
                groupedAnalyses = { 'General': currentOit.labResultsAnalysis };
            }
        }
        delete groupedAnalyses[group];
        yield prisma.oIT.update({
            where: { id },
            data: {
                labResultsUrl: JSON.stringify(groupedFiles),
                labResultsAnalysis: JSON.stringify(groupedAnalyses)
            }
        });
        res.json({ success: true, labResultsUrl: JSON.stringify(groupedFiles), message: 'Archivo eliminado' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al eliminar resultado de laboratorio' });
    }
});
exports.deleteLabResult = deleteLabResult;
// Background Processor for Sampling Sheets
function processSamplingSheetsAsync(oitId_1, filenames_1) {
    return __awaiter(this, arguments, void 0, function* (oitId, filenames, group = 'General') {
        try {
            console.log(`[SAMPLING_SHEETS] Starting analysis for OIT ${oitId}, Group: ${group} with ${filenames.length} files`);
            const { pdfService } = require('../services/pdf.service');
            const path = require('path');
            let fullCombinedText = '';
            for (const filename of filenames) {
                const filePath = path.join(__dirname, '../../uploads', filename);
                if (!fs_1.default.existsSync(filePath)) {
                    console.warn(`[SAMPLING_SHEETS] File not found: ${filePath}`);
                    continue;
                }
                let extractedText = '';
                try {
                    console.log(`[SAMPLING_SHEETS] Processing file: ${filename}`);
                    if (filename.endsWith('.pdf')) {
                        extractedText = yield pdfService.extractText(filePath);
                    }
                    else if (filename.match(/\.(xlsx|xls)$/i)) {
                        // Parse Excel file
                        const xlsx = require('xlsx');
                        const workbook = xlsx.readFile(filePath);
                        // Convert all sheets to text representation
                        let allSheetsText = "";
                        workbook.SheetNames.forEach((sheetName) => {
                            const sheet = workbook.Sheets[sheetName];
                            const csvData = xlsx.utils.sheet_to_csv(sheet);
                            allSheetsText += `\n--- HOJA: ${sheetName} ---\n${csvData}\n`;
                        });
                        extractedText = allSheetsText;
                    }
                    else {
                        extractedText = "[Contenido no legible directamente]";
                    }
                }
                catch (readErr) {
                }
                fullCombinedText += `\n\n=== ARCHIVO: ${filename} ===\n${extractedText}`;
            }
            const oit = yield prisma.oIT.findUnique({ where: { id: oitId }, select: { description: true, samplingSheetAnalysis: true } });
            const oitContext = (oit === null || oit === void 0 ? void 0 : oit.description) || '';
            const analysis = yield aiService.analyzeSamplingSheets(fullCombinedText, oitContext);
            // Update grouped internal analysis
            let currentAnalyses = {};
            if (oit === null || oit === void 0 ? void 0 : oit.samplingSheetAnalysis) {
                try {
                    const parsed = JSON.parse(oit.samplingSheetAnalysis);
                    currentAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': parsed };
                }
                catch (_a) {
                    currentAnalyses = { 'General': oit.samplingSheetAnalysis };
                }
            }
            currentAnalyses[group] = analysis;
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    samplingSheetAnalysis: JSON.stringify(currentAnalyses)
                }
            });
            console.log(`[SAMPLING_SHEETS] Analysis completed for OIT ${oitId}, Group: ${group}, quality: ${analysis.quality}`);
            yield internalGenerateFinalReport(oitId, group).catch(e => console.error("Auto report generation failed", e));
        }
        catch (error) {
            console.error('[SAMPLING_SHEETS] Error in background processing:', error);
        }
    });
}
// Reconstruye el contexto (analisis de laboratorio, planillas, plantilla maestra)
// para un grupo/servicio especifico de un OIT. Es una version aislada de la misma
// logica de busqueda difusa usada en internalGenerateFinalReport, para no tocar esa
// funcion ya probada -- se usa solo en el flujo de chat de edicion de informes.
function getGroupContextForReport(oit, groupName) {
    return __awaiter(this, void 0, void 0, function* () {
        let groupedLabAnalyses = {};
        if (oit.labResultsAnalysis) {
            try {
                const parsed = JSON.parse(oit.labResultsAnalysis);
                groupedLabAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { General: parsed };
            }
            catch (e) { }
        }
        const matchesGroup = (oitType, target) => {
            const a = oitType.toLowerCase().trim();
            const b = target.toLowerCase().trim();
            return a === b || a.includes(b) || b.includes(a);
        };
        const fuzzyLookup = (record, key) => {
            if (record[key] !== undefined)
                return record[key];
            const keyLower = key.toLowerCase().trim();
            for (const storedKey of Object.keys(record)) {
                if (storedKey === 'General')
                    continue;
                const storedLower = storedKey.toLowerCase().trim();
                if (storedLower.includes(keyLower) || keyLower.includes(storedLower))
                    return record[storedKey];
                const keyWords = keyLower.split(/[\s_\-,]+/).filter(w => w.length >= 3);
                const storedWords = storedLower.split(/[\s_\-,]+/).filter(w => w.length >= 3);
                const hasOverlap = keyWords.some(w => storedWords.some(sw => sw.includes(w) || w.includes(sw)));
                if (hasOverlap)
                    return record[storedKey];
            }
            return record['General'];
        };
        const groupLabAnalysisRaw = fuzzyLookup(groupedLabAnalyses, groupName) || '';
        let groupLabAnalysisNarrative = typeof groupLabAnalysisRaw === 'string' ? groupLabAnalysisRaw : '';
        let groupLabAnalysisParsed = {};
        if (typeof groupLabAnalysisRaw === 'string') {
            try {
                const parsed = JSON.parse(groupLabAnalysisRaw);
                if (parsed.rawText) {
                    groupLabAnalysisNarrative = parsed.rawText;
                    groupLabAnalysisParsed = parsed.parsedData || {};
                }
            }
            catch (e) { }
        }
        else if (typeof groupLabAnalysisRaw === 'object' && groupLabAnalysisRaw !== null) {
            groupLabAnalysisNarrative = groupLabAnalysisRaw.rawText || JSON.stringify(groupLabAnalysisRaw);
            groupLabAnalysisParsed = groupLabAnalysisRaw.parsedData || {};
        }
        let groupedSheetAnalysis = {};
        if (oit.samplingSheetAnalysis) {
            try {
                const parsed = JSON.parse(oit.samplingSheetAnalysis);
                groupedSheetAnalysis = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { General: parsed };
            }
            catch (e) { }
        }
        const groupSheetAnalysis = fuzzyLookup(groupedSheetAnalysis, groupName) || null;
        const templateIds = oit.selectedTemplateIds ? JSON.parse(oit.selectedTemplateIds) : [];
        let masterTemplate = null;
        if (templateIds.length > 0) {
            const templates = yield prisma.samplingTemplate.findMany({ where: { id: { in: templateIds } } });
            const groupTemplates = templates.filter(t => matchesGroup(t.oitType || 'General', groupName));
            masterTemplate = groupTemplates.find(t => t.reportTemplateFile) || groupTemplates[0]
                || templates.find(t => t.reportTemplateFile) || templates[0] || null;
        }
        return { groupLabAnalysisNarrative, groupLabAnalysisParsed, groupSheetAnalysis, masterTemplate };
    });
}
// Chat de edicion de informes: el usuario pide un cambio en lenguaje natural, la IA
// propone una version revisada del markdown, y el usuario aprueba o descarta. No
// modifica nada hasta que se llama a reportChatApprove.
const reportChatPreview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reportName, group, message, currentMarkdown } = req.body;
        if (!reportName || !message) {
            return res.status(400).json({ error: 'Se requiere reportName y message' });
        }
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit)
            return res.status(404).json({ error: 'OIT no encontrada' });
        const { validationService } = require('../services/validation.service');
        const context = yield getGroupContextForReport(oit, group || 'General');
        const baselineMarkdown = currentMarkdown || (yield validationService.generateFinalReportContent(oit, context.groupLabAnalysisNarrative, `${group || 'General'} (${reportName})`, context.groupSheetAnalysis));
        const proposedMarkdown = yield aiService.reviseReportNarrative(baselineMarkdown, message);
        res.json({ currentMarkdown: baselineMarkdown, proposedMarkdown });
    }
    catch (error) {
        console.error('Error in report chat preview:', error);
        res.status(500).json({ error: 'Error al generar la propuesta de cambio' });
    }
});
exports.reportChatPreview = reportChatPreview;
// Aplica un markdown ya aprobado por el usuario: regenera el docx real y crea una
// nueva version (via recordReportVersions), sin tocar el flujo de generacion original.
const reportChatApprove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reportName, group, approvedMarkdown } = req.body;
        if (!reportName || !approvedMarkdown) {
            return res.status(400).json({ error: 'Se requiere reportName y approvedMarkdown' });
        }
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit)
            return res.status(404).json({ error: 'OIT no encontrada' });
        const context = yield getGroupContextForReport(oit, group || 'General');
        if (!context.masterTemplate || !context.masterTemplate.reportTemplateFile) {
            return res.status(400).json({ error: 'No se encontro la plantilla de informe asociada a este servicio' });
        }
        const { filename, isDocx } = yield generateDocumentFromMarkdown(oit, approvedMarkdown, context.masterTemplate, context.groupLabAnalysisParsed);
        let existingReports = [];
        if (oit.finalReportUrl) {
            try {
                existingReports = JSON.parse(oit.finalReportUrl);
                if (!Array.isArray(existingReports))
                    existingReports = [];
            }
            catch (_a) {
                existingReports = [];
            }
        }
        const newReport = { name: reportName, url: filename, type: (isDocx ? 'docx' : 'pdf') };
        const updatedReports = [...existingReports.filter(r => r.name !== reportName), newReport];
        yield prisma.oIT.update({ where: { id }, data: { finalReportUrl: JSON.stringify(updatedReports) } });
        yield recordReportVersions(id, [newReport]);
        res.json({ message: 'Informe actualizado y nueva version creada', report: newReport });
    }
    catch (error) {
        console.error('Error approving report chat edit:', error);
        res.status(500).json({ error: 'Error al aplicar el cambio aprobado' });
    }
});
exports.reportChatApprove = reportChatApprove;
const getReportVersions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const versions = yield prisma.oITReportVersion.findMany({
            where: { oitId: id },
            orderBy: [{ name: 'asc' }, { versionNumber: 'desc' }],
        });
        res.json(versions);
    }
    catch (error) {
        console.error('Error fetching report versions:', error);
        res.status(500).json({ error: 'Error al obtener el historial de versiones del informe' });
    }
});
exports.getReportVersions = getReportVersions;
// Reactiva una version anterior de un informe: la marca isActive y actualiza
// finalReportUrl para que la UI y las descargas apunten a ese archivo. La
// version que estaba activa queda marcada inactiva, pero su fila y su archivo
// permanecen intactos -- siempre reversible.
const activateReportVersion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, versionId } = req.params;
        const version = yield prisma.oITReportVersion.findUnique({ where: { id: versionId } });
        if (!version || version.oitId !== id) {
            return res.status(404).json({ error: 'Version no encontrada' });
        }
        yield prisma.oITReportVersion.updateMany({
            where: { oitId: id, name: version.name, isActive: true },
            data: { isActive: false },
        });
        yield prisma.oITReportVersion.update({
            where: { id: versionId },
            data: { isActive: true },
        });
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        let reports = [];
        if (oit === null || oit === void 0 ? void 0 : oit.finalReportUrl) {
            try {
                reports = JSON.parse(oit.finalReportUrl);
                if (!Array.isArray(reports))
                    reports = [];
            }
            catch (_a) {
                reports = [];
            }
        }
        const otherReports = reports.filter(r => r.name !== version.name);
        const updatedReports = [...otherReports, { name: version.name, url: version.url, type: version.type }];
        yield prisma.oIT.update({
            where: { id },
            data: { finalReportUrl: JSON.stringify(updatedReports) },
        });
        res.json({ message: 'Version reactivada', activeVersion: version });
    }
    catch (error) {
        console.error('Error activating report version:', error);
        res.status(500).json({ error: 'Error al reactivar la version' });
    }
});
exports.activateReportVersion = activateReportVersion;
const generateFinalReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { group } = req.body; // New: optional group parameter
        // If no group specified, clear everything (legacy behavior)
        // If group is specified, we'll merge instead of clearing the whole field
        if (!group || group === 'General') {
            yield prisma.oIT.update({
                where: { id },
                data: { finalReportUrl: null }
            });
        }
        else {
            // Optional: clear only reports for this group?
            // For now, internalGenerateFinalReport will handle the merge logic if we pass the group.
        }
        // Start generation in background (Fire and Forget)
        internalGenerateFinalReport(id, group)
            .then((_a) => __awaiter(void 0, [_a], void 0, function* ({ generatedReports }) {
            console.log(`[Report] Background generation completed for OIT ${id}. Group: ${group || 'All'}.`);
            // MERGE LOGIC: If a group was targeted, preserve reports from other groups
            if (group && group !== 'General') {
                const currentOit = yield prisma.oIT.findUnique({ where: { id } });
                let existingReports = [];
                if (currentOit === null || currentOit === void 0 ? void 0 : currentOit.finalReportUrl) {
                    try {
                        existingReports = JSON.parse(currentOit.finalReportUrl);
                        if (!Array.isArray(existingReports))
                            existingReports = [];
                    }
                    catch (_b) {
                        existingReports = [];
                    }
                }
                // Remove existing reports that match ANY of the newly generated report names
                // This ensures we replace old versions of the same reports
                const newReportNames = new Set(generatedReports.map(r => r.name));
                const otherReports = existingReports.filter(r => !newReportNames.has(r.name));
                const mergedReports = [...otherReports, ...generatedReports];
                console.log(`[Report] Merge: ${existingReports.length} existing, ${generatedReports.length} new, ${otherReports.length} kept = ${mergedReports.length} total`);
                yield prisma.oIT.update({
                    where: { id },
                    data: { finalReportUrl: JSON.stringify(mergedReports) }
                });
                yield recordReportVersions(id, generatedReports);
            }
        }))
            .catch(error => {
            console.error(`[Report] Background generation failed for OIT ${id}:`, error);
        });
        // Return immediately to avoid 504 Timeout
        res.status(202).json({
            success: true,
            processing: true,
            message: 'La generación de informes ha comenzado en segundo plano.',
            reports: []
        });
    }
    catch (error) {
        console.error('Final Report Error:', error);
        res.status(500).json({ error: 'Error iniciando generación de informe final' });
    }
});
exports.generateFinalReport = generateFinalReport;
// Update Resources in Planning Proposal
const updatePlanningResources = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { resourceIds } = req.body;
        if (!Array.isArray(resourceIds)) {
            return res.status(400).json({ error: 'resourceIds debe ser un array' });
        }
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit)
            return res.status(404).json({ error: 'OIT no encontrada' });
        // Fetch details of selected resources
        const selectedResources = yield prisma.resource.findMany({
            where: { id: { in: resourceIds } }
        });
        const mappedResources = selectedResources.map(r => {
            const res = r;
            return {
                id: res.id,
                name: res.name,
                code: res.code,
                type: res.type,
                brand: res.brand,
                model: res.model
            };
        });
        // Update planningProposal
        let planningProposal = {};
        if (oit.planningProposal) {
            try {
                planningProposal = JSON.parse(oit.planningProposal);
            }
            catch (e) { }
        }
        planningProposal.assignedResources = mappedResources;
        // Update aiData too for consistency in UI
        let aiData = {};
        if (oit.aiData) {
            try {
                aiData = JSON.parse(oit.aiData);
                if (aiData.data) {
                    aiData.data.assignedResources = mappedResources;
                }
            }
            catch (e) { }
        }
        yield prisma.oIT.update({
            where: { id },
            data: {
                planningProposal: JSON.stringify(planningProposal),
                aiData: JSON.stringify(aiData)
            }
        });
        res.json({ success: true, resources: mappedResources });
    }
    catch (error) {
        console.error('Error updating planning resources:', error);
        res.status(500).json({ error: 'Error al actualizar recursos' });
    }
});
exports.updatePlanningResources = updatePlanningResources;
// Request Redo of Sampling Steps (Admin Only)
const requestRedoSteps = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { stepIndices, redoAll, reason } = req.body;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Parse existing data
        let samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : { currentStep: 0, completedSteps: [], redoRequests: [] };
        let stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        // Initialize redoRequests array if not present
        if (!samplingProgress.redoRequests) {
            samplingProgress.redoRequests = [];
        }
        if (redoAll) {
            // Mark all steps for redo
            samplingProgress.redoRequests = samplingProgress.completedSteps.map((idx) => ({
                stepIndex: idx,
                reason: reason || 'Solicitado por administrador',
                requestedAt: new Date().toISOString(),
                status: 'PENDING'
            }));
            // Reset completed steps
            samplingProgress.completedSteps = [];
            samplingProgress.currentStep = 0;
            // Mark all validations as requiring redo
            Object.keys(stepValidations).forEach(key => {
                stepValidations[key].redoRequired = true;
                stepValidations[key].redoReason = reason || 'Solicitado por administrador';
            });
        }
        else if (stepIndices && Array.isArray(stepIndices)) {
            // Mark specific steps for redo
            stepIndices.forEach((stepIndex) => {
                // Add to redo requests
                samplingProgress.redoRequests.push({
                    stepIndex,
                    reason: reason || 'Solicitado por administrador',
                    requestedAt: new Date().toISOString(),
                    status: 'PENDING'
                });
                // Remove from completed if present
                samplingProgress.completedSteps = samplingProgress.completedSteps.filter((idx) => idx !== stepIndex);
                // Mark the validation as needing redo
                if (stepValidations[stepIndex]) {
                    stepValidations[stepIndex].redoRequired = true;
                    stepValidations[stepIndex].redoReason = reason || 'Solicitado por administrador';
                }
            });
            // Adjust current step if needed
            const minRedoStep = Math.min(...stepIndices);
            if (samplingProgress.currentStep > minRedoStep) {
                samplingProgress.currentStep = minRedoStep;
            }
        }
        // Update OIT
        yield prisma.oIT.update({
            where: { id },
            data: {
                samplingProgress: JSON.stringify(samplingProgress),
                stepValidations: JSON.stringify(stepValidations),
                status: 'REDO_REQUIRED' // New status to indicate redo needed
            }
        });
        // Create notification for assigned engineers
        const assignedEngineers = yield prisma.oITAssignment.findMany({
            where: { oitId: id },
            include: { user: true }
        });
        for (const eng of assignedEngineers) {
            const notifMessage = redoAll
                ? `La OIT #${oit.oitNumber} requiere rehacer todos los pasos de muestreo. Razón: ${reason || 'Solicitado por admin'}`
                : `La OIT #${oit.oitNumber} requiere rehacer ${stepIndices === null || stepIndices === void 0 ? void 0 : stepIndices.length} paso(s). Razón: ${reason || 'Solicitado por admin'}`;
            yield (0, notification_controller_1.createNotification)(eng.userId, 'Pasos de muestreo requieren corrección', notifMessage, 'WARNING', id);
        }
        res.json({
            success: true,
            message: redoAll ? 'Todos los pasos marcados para rehacer' : `${stepIndices === null || stepIndices === void 0 ? void 0 : stepIndices.length} paso(s) marcado(s) para rehacer`,
            samplingProgress
        });
    }
    catch (error) {
        console.error('Error requesting redo:', error);
        res.status(500).json({ error: 'Error al solicitar corrección' });
    }
});
exports.requestRedoSteps = requestRedoSteps;
// Update Service Dates
const updateServiceDates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { serviceDates } = req.body;
        // serviceDates format:
        // { [serviceId]: { name, date, time, engineerIds[], confirmed } }
        // 1. Extract all unique engineer IDs from all service dates
        const engineerIds = new Set();
        if (serviceDates) {
            Object.values(serviceDates).forEach((schedule) => {
                if (schedule.engineerIds && Array.isArray(schedule.engineerIds)) {
                    schedule.engineerIds.forEach((eid) => engineerIds.add(eid));
                }
            });
        }
        const uniqueEngineerIds = Array.from(engineerIds);
        // 2. Transaction to update OIT and sync assignments
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update OIT JSON
            yield tx.oIT.update({
                where: { id },
                data: {
                    serviceDates: JSON.stringify(serviceDates),
                    status: 'SCHEDULED',
                    planningAccepted: true
                }
            });
            // Sync Assignments
            // First, delete existing assignments for this OIT
            yield tx.oITAssignment.deleteMany({
                where: { oitId: id }
            });
            // Create new assignments
            if (uniqueEngineerIds.length > 0) {
                yield tx.oITAssignment.createMany({
                    data: uniqueEngineerIds.map((userId) => ({
                        oitId: id,
                        userId
                    }))
                });
            }
        }));
        res.json({
            success: true,
            message: 'Programación actualizada correctamente',
            assignedEngineersCount: uniqueEngineerIds.length
        });
    }
    catch (error) {
        console.error('Error updating service dates:', error);
        res.status(500).json({ error: 'Error al actualizar fechas de servicio' });
    }
});
exports.updateServiceDates = updateServiceDates;
// Verify Consistency
const verifyConsistency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const verificationService = require('../services/verification.service').default;
        const result = yield verificationService.verifyConsistency(id);
        res.json(result);
    }
    catch (error) {
        console.error('Error verifying consistency:', error);
        res.status(500).json({ error: 'Error en verificación de consistencia' });
    }
});
exports.verifyConsistency = verifyConsistency;
