import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AIService } from '../services/ai.service';
const aiService = new AIService();
import { createNotification } from './notification.controller';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import axios from 'axios';

const prisma = new PrismaClient();

// Accept Planning Proposal
export const acceptPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { templateId } = req.body;

        // Get OIT with aiData to extract assigned resources
        const existingOit = await prisma.oIT.findUnique({ where: { id } });


        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                planningAccepted: true,
                selectedTemplateIds: templateId ? JSON.stringify([templateId]) : null,
                status: 'SCHEDULED'
            }
        });

        // Update resource statuses if there are assigned resources
        if (existingOit?.aiData) {
            try {
                const aiData = JSON.parse(existingOit.aiData);
                if (aiData?.data?.assignedResources && Array.isArray(aiData.data.assignedResources)) {
                    // Update each resource status to IN_USE
                    for (const resource of aiData.data.assignedResources) {
                        if (resource.id) {
                            await prisma.resource.update({
                                where: { id: resource.id },
                                data: { status: 'IN_USE' }
                            });
                            console.log(`Resource ${resource.name} set to IN_USE for OIT ${oit.oitNumber}`);
                        }
                    }
                }
            } catch (parseError) {
                console.error('Error parsing aiData for resource updates:', parseError);
                // Continue even if resource update fails
            }
        }

        // Create notification
        if ((req as any).user?.userId) {
            await prisma.notification.create({
                data: {
                    userId: (req as any).user.userId,
                    oitId: id,
                    title: 'Planeación Aceptada',
                    message: `La propuesta de planeación para OIT ${oit.oitNumber} ha sido aceptada. Recursos asignados y programados.`,
                    type: 'SUCCESS'
                }
            });
        }

        res.json(oit);
    } catch (error) {
        console.error('Error accepting planning:', error);
        res.status(500).json({ error: 'Error al aceptar planeación' });
    }
};

// Reject Planning Proposal
export const rejectPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                planningProposal: null,
                planningAccepted: false
            }
        });

        res.json({ message: 'Propuesta rechazada, puede crear una planeación manual', oit });
    } catch (error) {
        console.error('Error rejecting planning:', error);
        res.status(500).json({ error: 'Error al rechazar planeación' });
    }
};

// Save Sampling Data
export const saveSamplingData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const samplingData = req.body;

        const isComplete = !samplingData.partial && samplingData.completedAt;

        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                samplingData: JSON.stringify(samplingData),
                status: isComplete ? 'IN_PROGRESS' : 'SCHEDULED',
                pendingSync: false
            }
        });

        // Create notification if completed
        if (isComplete && (req as any).user?.userId) {
            await prisma.notification.create({
                data: {
                    userId: (req as any).user.userId,
                    oitId: id,
                    title: 'Muestreo Completado',
                    message: `El muestreo para OIT ${oit.oitNumber} ha sido completado`,
                    type: 'SUCCESS'
                }
            });
        }

        res.json({ success: true, oit });
    } catch (error) {
        console.error('Error saving sampling data:', error);
        res.status(500).json({ error: 'Error al guardar datos de muestreo' });
    }
};

// Submit Final Sampling
export const submitSampling = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const samplingData = req.body; // Full JSON of all steps

        // 1. Update OIT with raw data
        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                samplingData: JSON.stringify(samplingData),
                status: 'ANALYZING', // Temporary status while AI runs
                pendingSync: false
            }
        });

        res.json({ success: true, message: 'Muestreo recibido. Analizando...', oit });

        // 2. Trigger async AI analysis
        (async () => {
            try {
                const analysis = await aiService.analyzeSamplingResults(samplingData, oit.description || '');

                await prisma.oIT.update({
                    where: { id },
                    data: {
                        finalAnalysis: analysis,
                        status: 'COMPLETED' // Flow finished, ready for admin review
                    }
                });

                // Notify user/admin
                // await createNotification(...)
            } catch (err) {
                console.error('Error in background sampling analysis:', err);
                await prisma.oIT.update({
                    where: { id },
                    data: { status: 'REVIEW_IMPORTANT' }
                });
            }
        })();

    } catch (error) {
        console.error('Error submitting sampling:', error);
        res.status(500).json({ error: 'Error al enviar muestreo' });
    }
};

// Get Sampling Data
export const getSamplingData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const oit = await prisma.oIT.findUnique({ where: { id } });

        if (!oit || !oit.samplingData) {
            return res.status(404).json({ error: 'No hay datos de muestreo' });
        }

        res.json(JSON.parse(oit.samplingData));
    } catch (error) {
        console.error('Error getting sampling data:', error);
        res.status(500).json({ error: 'Error al obtener datos de muestreo' });
    }
};

// Upload Lab Results
// Upload Lab Results
// Upload Lab Results
export const uploadLabResults = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { group = 'General' } = req.body; // New: optional group
        const file = (req as any).file;

        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }

        // Fetch current OIT to append file
        const currentOit = await prisma.oIT.findUnique({ where: { id }, select: { labResultsUrl: true } });
        let groupedFiles: Record<string, string[]> = {};

        if (currentOit?.labResultsUrl) {
            try {
                const parsed = JSON.parse(currentOit.labResultsUrl);
                if (Array.isArray(parsed)) {
                    // Migration: treat as General
                    groupedFiles = { 'General': parsed };
                } else if (typeof parsed === 'object' && parsed !== null) {
                    groupedFiles = parsed;
                } else {
                    groupedFiles = { 'General': [currentOit.labResultsUrl] };
                }
            } catch (e) {
                groupedFiles = { 'General': [currentOit.labResultsUrl] };
            }
        }

        const newPath = `uploads/${file.filename}`;
        if (!groupedFiles[group]) groupedFiles[group] = [];
        groupedFiles[group].push(newPath);

        // 1. Return immediate response and set status to ANALYZING
        await prisma.oIT.update({
            where: { id },
            data: {
                labResultsUrl: JSON.stringify(groupedFiles),
                // We keep status as ANALYZING. 
                // Analysis is now stored per group in labResultsAnalysis
                status: 'ANALYZING'
            } as any
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

    } catch (error) {
        console.error('Error uploading lab results:', error);
        res.status(500).json({ error: 'Error al subir resultados de laboratorio' });
    }
};

// Background Processor for Lab Results
// Background Processor for Lab Results
async function processLabResultsAsync(oitId: string, filenames: string[], group: string = 'General') {
    try {
        console.log(`Starting background lab analysis for OIT ${oitId}, Group: ${group} with ${filenames.length} files`);
        const { pdfService } = require('../services/pdf.service');
        const path = require('path');
        let fullCombinedText = '';

        for (const filename of filenames) {
            const filePath = path.join(__dirname, '../../uploads', filename);

            if (!fs.existsSync(filePath)) {
                console.warn(`[LAB_RESULTS] File not found: ${filePath}`);
                continue;
            }

            let extractedText = '';
            try {
                if (filename.endsWith('.pdf')) {
                    extractedText = await pdfService.extractText(filePath);
                } else {
                    extractedText = fs.readFileSync(filePath, 'utf-8');
                }
            } catch (readErr) {
                console.error("Error extracting text from lab file:", readErr);
                extractedText = "[Error al leer documento de laboratorio]";
            }
            fullCombinedText += `\n\n=== ARCHIVO: ${filename} ===\n${extractedText}`;
        }

        // Get OIT Context for better analysis
        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });
        const oitContext = `${oit?.description || ''} - Servicio específico: ${group}`;

        // Analyze with AI
        const analysis = await aiService.analyzeLabResults(fullCombinedText, oitContext);

        // Update grouped internal analysis
        let currentAnalyses: Record<string, string> = {};
        if (oit?.labResultsAnalysis) {
            try {
                const parsed = JSON.parse(oit.labResultsAnalysis);
                currentAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': String(parsed) };
            } catch {
                currentAnalyses = { 'General': oit.labResultsAnalysis };
            }
        }
        currentAnalyses[group] = analysis;

        // Update OIT with results
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                labResultsAnalysis: JSON.stringify(currentAnalyses),
                status: analysis.includes('Error') ? 'REVIEW_NEEDED' : 'COMPLETED'
            } as any
        });

        console.log(`Lab analysis completed for OIT ${oitId}, Group: ${group}`);

        // Automatically generate final report if analysis was successful
        if (!analysis.includes('Error')) {
            console.log(`Triggering automatic report generation for OIT ${oitId}`);
            try {
                await internalGenerateFinalReport(oitId);
            } catch (reportErr) {
                console.error(`Automatic report generation failed for OIT ${oitId}:`, reportErr);
            }
        }

    } catch (error) {
        console.error('Background lab analysis failed:', error);
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                status: 'REVIEW_NEEDED',
                labResultsAnalysis: "Error interno al procesar resultados. Por favor, revise el documento manualmente."
            } as any
        });
    }
}

// Reusable report generation logic
async function internalGenerateFinalReport(id: string) {
    const { pdfService } = require('../services/pdf.service');
    const { docxService } = require('../services/docx.service');
    const { validationService } = require('../services/validation.service');
    const { TemplateDataMapper } = require('../config/templateDataMapper');
    const marked = require('marked');

    console.log(`[Report] Starting grouped generation for OIT ${id}`);
    const oit = await prisma.oIT.findUnique({ where: { id } });
    if (!oit) throw new Error('OIT no encontrada');

    // 1. Prepare grouped data
    let groupedLabAnalyses: Record<string, string> = {};
    if (oit.labResultsAnalysis) {
        try {
            const parsed = JSON.parse(oit.labResultsAnalysis);
            groupedLabAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': String(parsed) };
        } catch { groupedLabAnalyses = { 'General': oit.labResultsAnalysis }; }
    }

    // 2. Parse sampling sheet analysis
    let groupedSheetAnalysis: Record<string, any> = {};
    if (oit.samplingSheetAnalysis) {
        try {
            const parsed = JSON.parse(oit.samplingSheetAnalysis);
            groupedSheetAnalysis = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': parsed };
        } catch (e) {
            console.warn('[Report] Failed to parse samplingSheetAnalysis', e);
        }
    }

    // 3. Group Templates by Service Type
    const templateIds: string[] = oit.selectedTemplateIds ? JSON.parse(oit.selectedTemplateIds) : [];
    const generatedReports: Array<{ name: string; url: string; type: 'pdf' | 'docx' }> = [];

    if (templateIds.length === 0) {
        // Fallback: One General Report
        console.log('[Report] No templates selected, generating general report.');
        const groupLabAnalysis = groupedLabAnalyses['General'] || '';
        const groupSheetAnalysis = groupedSheetAnalysis['General'] || null;
        const reportMarkdown = await validationService.generateFinalReportContent(oit, groupLabAnalysis, 'General', groupSheetAnalysis);
        const { filename, isDocx } = await generateDocumentFromMarkdown(oit, reportMarkdown, null);
        generatedReports.push({ name: 'Informe General', url: filename, type: isDocx ? 'docx' : 'pdf' });

        // Generate Comunicado for General
        if (groupLabAnalysis) {
            try {
                console.log('[Report] Generating comunicado for General...');
                const comunicadoContent = await validationService.generateComunicadoContent(oit, groupLabAnalysis, 'General');
                const { comunicadoService } = require('../services/comunicado.service');
                const comunicadoFilename = await comunicadoService.generateComunicado(oit, comunicadoContent, 'General');
                generatedReports.push({ name: 'Comunicado General', url: comunicadoFilename, type: 'docx' });
            } catch (comErr) {
                console.error('[Report] Comunicado generation failed for General:', comErr);
            }
        }
    } else {
        // Fetch all templates
        const templates = await prisma.samplingTemplate.findMany({
            where: { id: { in: templateIds } }
        });

        // Group by oitType
        const groupedTemplates: Record<string, typeof templates> = {};
        for (const t of templates) {
            const type = t.oitType || 'General';
            if (!groupedTemplates[type]) groupedTemplates[type] = [];
            groupedTemplates[type].push(t);
        }

        console.log(`[Report] Found groups: ${Object.keys(groupedTemplates).join(', ')}`);

        // Generate one report per Group
        for (const [groupName, group] of Object.entries(groupedTemplates)) {
            // Find a valid DOCX template to use (use the first one that has it)
            const masterTemplate = group.find(t => t.reportTemplateFile) || group[0];

            // Context description: "Agua Potable (Fisicoquímico, Microbiológico)"
            const serviceContext = `${groupName} (${group.map(t => t.name).join(', ')})`;

            console.log(`[Report] Generating report for Group: ${groupName} using template ${masterTemplate.reportTemplateFile || 'None'}`);

            // Use group-specific lab analysis instead of raw text if available
            const groupLabAnalysis = groupedLabAnalyses[groupName] || groupedLabAnalyses['General'] || '';
            const groupSheetAnalysis = groupedSheetAnalysis[groupName] || groupedSheetAnalysis['General'] || null;

            const reportMarkdown = await validationService.generateFinalReportContent(oit, groupLabAnalysis, serviceContext, groupSheetAnalysis);
            const { filename, isDocx } = await generateDocumentFromMarkdown(oit, reportMarkdown, masterTemplate);

            generatedReports.push({
                name: `Informe ${groupName}`,
                url: filename,
                type: isDocx ? 'docx' : 'pdf'
            });

            // Generate Comunicado for this service group
            if (groupLabAnalysis) {
                try {
                    console.log(`[Report] Generating comunicado for ${groupName}...`);
                    const comunicadoContent = await validationService.generateComunicadoContent(oit, groupLabAnalysis, serviceContext);
                    const { comunicadoService } = require('../services/comunicado.service');
                    const comunicadoFilename = await comunicadoService.generateComunicado(oit, comunicadoContent, groupName);
                    generatedReports.push({ name: `Comunicado ${groupName}`, url: comunicadoFilename, type: 'docx' });
                } catch (comErr) {
                    console.error(`[Report] Comunicado generation failed for ${groupName}:`, comErr);
                }
            }
        }
    }

    // 4. Update OIT
    await prisma.oIT.update({
        where: { id },
        data: { finalReportUrl: JSON.stringify(generatedReports) }
    });

    console.log(`[Report] Completed. Generated ${generatedReports.length} reports.`);
    // Return compatible object for legacy handling if strictly needed, but new flow uses JSON list
    return { generatedReports };
}

/**
 * Helper to generate document, returns filename and type
 */
async function generateDocumentFromMarkdown(oit: any, reportMarkdown: string, template: any) {
    const { pdfService } = require('../services/pdf.service');
    const { docxService } = require('../services/docx.service');
    const { TemplateDataMapper } = require('../config/templateDataMapper');
    const marked = require('marked');

    let generatedFileBuffer: Buffer | null = null;
    let generatedFileName = '';
    let isDocx = false;

    // Try Word Generation
    if (template && template.reportTemplateFile) {
        try {
            const mapper = new TemplateDataMapper(
                template.reportTemplateFile,
                {
                    oitNumber: oit.oitNumber,
                    description: oit.description,
                    location: oit.location,
                    scheduledDate: oit.scheduledDate,
                    serviceName: template.oitType || template.name // Use Type as main title if possible
                },
                reportMarkdown
            );
            const docxData = mapper.generateData();
            generatedFileBuffer = await docxService.generateDocument(template.reportTemplateFile, docxData);
            // Filename: Informe_Agua_Potable_OIT-123...
            const safeType = (template.oitType || template.name).replace(/[^a-zA-Z0-9]/g, '_');
            generatedFileName = `Informe_${safeType}_${oit.oitNumber}_${Date.now()}.docx`;
            isDocx = true;
        } catch (e) {
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
                        ${template?.oitType || template?.name || 'General'}
                    </div>
                    <div>${oit.oitNumber} <br> ${date}</div>
                </div>
                ${marked.parse(reportMarkdown)}
            </body>
            </html>
        `;
        generatedFileName = `Informe_${(template?.oitType || 'General').replace(/\s+/g, '_')}_${oit.oitNumber}_${Date.now()}.pdf`;
        const pdfPath = await pdfService.generatePDFFromHTML(htmlContent, generatedFileName);
        generatedFileBuffer = fs.readFileSync(pdfPath);
    }

    // Save File
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, generatedFileName), generatedFileBuffer!);

    return { filename: generatedFileName, isDocx };
}

// Generate Final Report


// Assign Engineers to OIT
export const assignEngineers = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { engineerIds } = req.body; // Array of user IDs

        if (!Array.isArray(engineerIds)) {
            return res.status(400).json({ error: 'engineerIds debe ser un array' });
        }

        // Verify OIT exists
        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        // Remove existing assignments
        await prisma.oITAssignment.deleteMany({
            where: { oitId: id }
        });

        // Create new assignments
        if (engineerIds.length > 0) {
            await prisma.oITAssignment.createMany({
                data: engineerIds.map((userId: string) => ({
                    oitId: id,
                    userId
                }))
            });
        }

        // Get updated OIT with assignments
        const updatedOit = await prisma.oIT.findUnique({
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
            assignedEngineers: updatedOit?.assignedEngineers.map((a: any) => a.user) || []
        });
    } catch (error) {
        console.error('Error assigning engineers:', error);
        res.status(500).json({ error: 'Error al asignar ingenieros' });
    }
};

// Get assigned engineers for an OIT
export const getAssignedEngineers = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const assignments = await prisma.oITAssignment.findMany({
            where: { oitId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });

        res.json(assignments.map((a: any) => a.user));
    } catch (error) {
        console.error('Error getting assigned engineers:', error);
        res.status(500).json({ error: 'Error al obtener ingenieros asignados' });
    }
};

// Get all OIT records (filtered by role)
export const getAllOITs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userRole = user?.role;
        const userId = user?.userId;

        // If user is ENGINEER, only show OITs assigned to them
        let whereClause: any = {};

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

        const oits = await prisma.oIT.findMany({
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
        const result = oits.map((oit: any) => ({
            ...oit,
            engineers: oit.assignedEngineers.map((a: any) => a.user)
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getAllOITs:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
};

// Get a single OIT by ID
export const getOITById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const oit = await prisma.oIT.findUnique({
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
        if (user?.role === 'ENGINEER') {
            const isAssigned = oit.assignedEngineers.some((a: any) => a.userId === user.userId);
            if (!isAssigned) {
                return res.status(403).json({ message: 'No tienes acceso a esta OIT' });
            }
        }

        res.status(200).json({
            ...oit,
            engineers: oit.assignedEngineers.map((a: any) => a.user)
        });
    } catch (error) {
        console.error('Error in getOITById:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
};

/* Existing createOIT (JSON) kept for backward compatibility */
export const createOIT = async (req: Request, res: Response) => {
    try {
        const { oitNumber, description, status } = req.body;
        const oit = await prisma.oIT.create({
            data: {
                oitNumber: oitNumber || '',
                description: description || '',
                status: status || 'PENDING',
            },
        });
        res.status(201).json(oit);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

// Async creation endpoint that accepts file uploads and triggers background AI processing
// Create OIT from URL (Legacy JSON support)
export const createOITFromUrl = async (req: Request, res: Response) => {
    try {
        const { OT, DOCUMENTO } = req.body;

        if (!DOCUMENTO) {
            return res.status(400).json({ error: 'Falta el campo DOCUMENTO (URL)' });
        }

        const oitNumber = OT || `OIT-${Date.now()}`;
        // Auth is optional for this endpoint as per requirement, but if token is sent, we can use it
        const userId = (req as any).user?.userId;

        console.log(`[Legacy API] Processing OIT from URL: ${DOCUMENTO}`);

        // 1. Download file
        const filename = `oitFromUrl-${Date.now()}.pdf`;
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, filename);

        try {
            const response = await axios({
                method: 'get',
                url: DOCUMENTO,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(true));
                writer.on('error', reject);
            });
        } catch (downloadError) {
            console.error('Error downloading file:', downloadError);
            return res.status(400).json({ error: 'Error al descargar el archivo desde la URL proporcionada' });
        }

        const fileUrl = `/uploads/${filename}`;

        // 2. Create OIT Record
        const oit = await prisma.oIT.create({
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

        (async () => {
            try {
                const { pdfService } = require('../services/pdf.service');
                const text = await pdfService.extractText(filePath);

                await prisma.oIT.update({ where: { id: oit.id }, data: { status: 'ANALYZING' } });

                const analysis = await aiService.analyzeDocument(text);

                await prisma.oIT.update({
                    where: { id: oit.id },
                    data: {
                        aiData: JSON.stringify(analysis),
                        status: 'PENDING'
                    }
                });
                console.log(`[Legacy API] OIT ${oit.oitNumber} processed successfully.`);
            } catch (err) {
                console.error('[Legacy API] Error processing background task:', err);
                await prisma.oIT.update({
                    where: { id: oit.id },
                    data: { status: 'REVIEW_IMPORTANT' }
                });
            }
        })();

    } catch (error) {
        console.error('Error creating OIT from URL:', error);
        res.status(500).json({ error: 'Error interno al procesar solicitud' });
    }
};

export const createOITAsync = async (req: Request, res: Response) => {
    try {
        const { oitNumber, description } = req.body;
        const userId = (req as any).user?.userId; // Cast req to any to access user property

        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Generate oitNumber if not provided
        const finalOitNumber = oitNumber || `OIT-${Date.now()}`;

        // Create OIT with UPLOADING status
        const oit = await prisma.oIT.create({
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
        processOITFilesAsync(oit.id, req.files as any, userId).catch(err => {
            console.error('Error processing OIT files:', err);
        });

    } catch (error) {
        console.error('Error creating OIT:', error);
        res.status(500).json({ error: 'Error al crear OIT' });
    }
};

// Separated Analysis Logic
async function runOITAnalysis(oitId: string, oitFilePath: string | null, quotationFilePath: string | null, userId: string) {
    try {
        const { complianceService } = await import('../services/compliance.service');
        const { default: planningService } = await import('../services/planning.service') as any;


        await prisma.oIT.update({
            where: { id: oitId },
            data: { status: 'ANALYZING' }
        });

        const aiDataContent: any = {};
        let extractedDescription: string | null = null;
        let extractedLocation: string | null = null;

        // Analyze OIT File
        if (oitFilePath && fs.existsSync(oitFilePath)) {
            const pdfParse = (await import('pdf-parse')).default;
            const dataBuffer = await fs.promises.readFile(oitFilePath);
            const pdfData = await pdfParse(dataBuffer);
            const oitText = pdfData.text;

            const oitAnalysis = await aiService.analyzeDocument(oitText);
            aiDataContent.oit = oitAnalysis;

            // Extract description
            if ((oitAnalysis as any).description) {
                extractedDescription = (oitAnalysis as any).description;
            } else if (oitText.length > 50) {
                extractedDescription = oitText.substring(0, 200).trim() + '...';
            }

            // Extract location from analysis
            if ((oitAnalysis as any).location) {
                extractedLocation = (oitAnalysis as any).location;
            } else {
                // Fallback: search for common location keywords
                const locationMatch = oitText.match(/(?:Dirección|Ubicación|Lugar|Sitio|Dirección del sitio)[:\s]+([^\n.]{10,150})/i);
                if (locationMatch) {
                    extractedLocation = locationMatch[1].trim();
                }
            }
        }

        // Analyze Quotation File
        if (quotationFilePath && fs.existsSync(quotationFilePath)) {
            const pdfParse = (await import('pdf-parse')).default;
            const dataBuffer = await fs.promises.readFile(quotationFilePath);
            const pdfData = await pdfParse(dataBuffer);
            const quotationText = pdfData.text;
            const quotationAnalysis = await aiService.analyzeDocument(quotationText);
            aiDataContent.quotation = quotationAnalysis;

            // Extract resources
            if ((quotationAnalysis as any).resources) {
                aiDataContent.resources = (quotationAnalysis as any).resources;
            }
        }

        // Update with AI data
        await prisma.oIT.update({
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
        await createNotification(userId, 'Verificando Cumplimiento', 'Analizando normas...', 'INFO', oitId);
        try {
            const complianceResult = await complianceService.checkCompliance(oitId, userId);
            await prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'REVIEW_REQUIRED' }
            });
        } catch (e) {
            console.error('Compliance check error:', e);
            // Fallback: update status anyway so it doesn't get stuck
            await prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'REVIEW_REQUIRED' }
            });
        }

        // Planning
        try {
            await createNotification(userId, 'Generando Propuesta', 'Creando propuesta de planeación...', 'INFO', oitId);
            const proposal = await planningService.generateProposal(oitId);
            await createNotification(userId, 'Propuesta Lista', `Propuesta generada con plantilla "${proposal.templateName}"`, 'SUCCESS', oitId);
        } catch (e) { console.error(e); }

        await createNotification(userId, 'OIT Procesada', 'Análisis completado exitosamente.', 'SUCCESS', oitId);

    } catch (error) {
        console.error('Error in runOITAnalysis:', error);
        await prisma.oIT.update({ where: { id: oitId }, data: { status: 'PENDING' } });
        await createNotification(userId, 'Error al Procesar', 'Falló el análisis de la OIT.', 'ERROR', oitId);
    }
}

async function processOITFilesAsync(
    oitId: string,
    files: { oitFile?: Express.Multer.File[], quotationFile?: Express.Multer.File[] },
    userId: string
) {
    const oitFile = files?.oitFile?.[0];
    const quotationFile = files?.quotationFile?.[0];

    let updateData: any = { status: 'ANALYZING' };
    if (oitFile) updateData.oitFileUrl = `/uploads/${oitFile.filename}`;
    if (quotationFile) updateData.quotationFileUrl = `/uploads/${quotationFile.filename}`;

    await prisma.oIT.update({
        where: { id: oitId },
        data: updateData
    });

    // Run analysis using physical paths
    await runOITAnalysis(
        oitId,
        oitFile ? oitFile.path : null,
        quotationFile ? quotationFile.path : null,
        userId
    );
}

// Re-analyze Endpoint
export const reanalyzeOIT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) return res.status(404).json({ error: 'OIT not found' });

        // Resolve absolute paths
        const uploadsRoot = path.join(__dirname, '../../');
        let oitPath = null;
        let quotationPath = null;

        if (oit.oitFileUrl) {
            // Handle both relative URL (/uploads/file) and stored filenames
            const cleanPath = oit.oitFileUrl.replace(/^\//, '').replace(/\\/g, '/'); // Remove leading slash
            oitPath = path.join(uploadsRoot, cleanPath);
            // Fallback if not found (sometimes stored simply as uploads/file)
            if (!fs.existsSync(oitPath)) {
                oitPath = path.join(uploadsRoot, 'uploads', path.basename(oit.oitFileUrl));
            }
        }

        if (oit.quotationFileUrl) {
            const cleanPath = oit.quotationFileUrl.replace(/^\//, '').replace(/\\/g, '/');
            quotationPath = path.join(uploadsRoot, cleanPath);
            if (!fs.existsSync(quotationPath)) {
                quotationPath = path.join(uploadsRoot, 'uploads', path.basename(oit.quotationFileUrl));
            }
        }

        // Trigger Async Analysis
        runOITAnalysis(id, oitPath, quotationPath, userId).catch(err => console.error("Re-analysis error:", err));

        res.json({ message: 'Re-análisis iniciado correctamente.' });

    } catch (error) {
        console.error('Error re-analyzing:', error);
        res.status(500).json({ error: 'Error al iniciar re-análisis' });
    }
};

// Update OIT (supports new fields, engineer assignment, and file uploads)
export const updateOIT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { oitNumber, description, status, oitFileUrl, quotationFileUrl, aiData, resources, engineerIds } = req.body;
        const userId = (req as any).user?.userId;
        const data: any = {};

        // Handle uploaded files from multer
        const files = req.files as { oitFile?: Express.Multer.File[], quotationFile?: Express.Multer.File[] } | undefined;
        const uploadedOitFile = files?.oitFile?.[0];
        const uploadedQuotationFile = files?.quotationFile?.[0];
        let shouldReanalyze = false;

        if (uploadedOitFile) {
            data.oitFileUrl = `/uploads/${uploadedOitFile.filename}`;
            shouldReanalyze = true;
        }
        if (uploadedQuotationFile) {
            data.quotationFileUrl = `/uploads/${uploadedQuotationFile.filename}`;
            shouldReanalyze = true;
        }

        if (oitNumber !== undefined) data.oitNumber = oitNumber;
        if (description !== undefined) data.description = description;
        if (status !== undefined) data.status = status;
        // Only use URL from body if no file was uploaded
        if (oitFileUrl !== undefined && !uploadedOitFile) data.oitFileUrl = oitFileUrl;
        if (quotationFileUrl !== undefined && !uploadedQuotationFile) data.quotationFileUrl = quotationFileUrl;
        if (req.body.quotationId !== undefined) {
            data.quotationId = req.body.quotationId;
            // Fetch quotation file url if we want to sync it?
            // Ideally, we should rely on relational data, but if we need to display it from oIT.quotationFileUrl for legacy reasons:
            try {
                const q = await prisma.quotation.findUnique({ where: { id: req.body.quotationId } });
                if (q && q.fileUrl) data.quotationFileUrl = q.fileUrl;
            } catch (e) { console.error('Error fetching linked quotation file', e) }
        }
        if (aiData !== undefined) data.aiData = aiData;
        if (resources !== undefined) data.resources = resources;
        if (req.body.scheduledDate !== undefined) data.scheduledDate = req.body.scheduledDate;

        // Handle selectedTemplateIds (expecting array from client)
        if (req.body.selectedTemplateIds !== undefined) {
            data.selectedTemplateIds = Array.isArray(req.body.selectedTemplateIds)
                ? JSON.stringify(req.body.selectedTemplateIds)
                : req.body.selectedTemplateIds; // If already string or null
        }

        // Get the existing OIT to check for status change and current assignments
        const existing = await prisma.oIT.findUnique({
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
        const result = await prisma.$transaction(async (prisma: any) => {
            // 1. Update OIT fields
            const updated = await prisma.oIT.update({
                where: { id },
                data,
            });

            // 2. Update assignments if provided
            if (engineerIds && Array.isArray(engineerIds)) {
                // Remove existing
                await prisma.oITAssignment.deleteMany({
                    where: { oitId: id }
                });

                // Add new
                if (engineerIds.length > 0) {
                    await prisma.oITAssignment.createMany({
                        data: engineerIds.map((userId: string) => ({
                            oitId: id,
                            userId
                        }))
                    });
                }
            }

            return updated;
        });

        // Create notification on status change (reuse existing logic)
        if (status && existing.status !== status) {
            const userId = (req as any).user?.userId;
            if (userId) {
                const statusMessages: Record<string, { title: string; message: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }> = {
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
                    await createNotification(
                        userId,
                        notificationData.title,
                        notificationData.message,
                        notificationData.type,
                        id
                    );
                }
            }
        }

        // Return updated object with engineers
        const finalOit = await prisma.oIT.findUnique({
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

        res.status(200).json({
            ...finalOit,
            engineers: finalOit?.assignedEngineers.map((a: any) => a.user),
            reanalyzing: shouldReanalyze
        });

        // Trigger re-analysis in background if files were uploaded
        if (shouldReanalyze && userId && finalOit) {
            const uploadsRoot = path.join(__dirname, '../../');
            const oitPath = finalOit.oitFileUrl
                ? path.join(uploadsRoot, finalOit.oitFileUrl.replace(/^\//, ''))
                : null;
            const quotationPath = finalOit.quotationFileUrl
                ? path.join(uploadsRoot, finalOit.quotationFileUrl.replace(/^\//, ''))
                : null;

            runOITAnalysis(id, oitPath, quotationPath, userId).catch(err =>
                console.error('Error in background re-analysis after update:', err)
            );
        }

    } catch (error) {
        console.error('Error updating OIT:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const deleteOIT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.oIT.delete({ where: { id } });
        res.status(200).json({ message: 'OIT deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const checkCompliance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Import dynamically to avoid potential circular dependency issues if any
        const { complianceService } = require('../services/compliance.service');

        const result = await complianceService.checkCompliance(id, userId);
        res.json(result);
    } catch (error) {
        console.error('Error checking compliance:', error);
        res.status(500).json({ error: 'Error al verificar cumplimiento' });
    }
};

// Validate Sampling Step Data
export const validateStepData = async (req: Request, res: Response) => {
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
        const validationResult = await validationService.validateStepData(
            stepDescription,
            stepRequirements,
            data
        );

        // Update OIT with validation result
        const oit = await prisma.oIT.findUnique({ where: { id } });
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

        await prisma.oIT.update({
            where: { id },
            data: {
                stepValidations: JSON.stringify(stepValidations),
                samplingProgress: JSON.stringify(samplingProgress)
            }
        });

        res.json(validationResult);
    } catch (error) {
        console.error('Error validating step:', error);
        res.status(500).json({ error: 'Error al validar el paso' });
    }
};

// Finalize Sampling and Generate Analysis
export const finalizeSampling = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        // Verify all steps are completed
        const samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : null;
        const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const steps = aiData?.data?.steps || [];

        if (!samplingProgress || samplingProgress.completedSteps.length !== steps.length) {
            return res.status(400).json({ error: 'No todos los pasos están completados' });
        }

        // Prepare data for analysis
        const allStepsData = steps.map((step: any, index: number) => ({
            step: step.description || `Paso ${index + 1}`,
            data: stepValidations[index]?.data || {},
            validation: stepValidations[index] || {}
        }));

        const { validationService } = require('../services/validation.service');

        // Generate final analysis
        const finalAnalysis = await validationService.generateFinalAnalysis(
            oit.oitNumber,
            aiData?.data?.selectedTemplate || 'Plantilla',
            allStepsData
        );

        // Update OIT with final analysis and status
        await prisma.oIT.update({
            where: { id },
            data: {
                finalAnalysis,
                status: 'COMPLETED'
            }
        });

        // Release Resources (Set to AVAILABLE)
        // Check both oit.resources and aiData.data.assignedResources for consistency
        const resourceIdsToRelease: string[] = [];

        if (oit.resources) {
            try {
                const resources = JSON.parse(oit.resources);
                const ids = Array.isArray(resources)
                    ? resources.map((r: any) => typeof r === 'string' ? r : r.id).filter(Boolean)
                    : [];
                resourceIdsToRelease.push(...ids);
            } catch (e) { }
        }

        // Also check aiData.data.assignedResources
        if (aiData?.data?.assignedResources && Array.isArray(aiData.data.assignedResources)) {
            for (const resource of aiData.data.assignedResources) {
                if (resource.id && !resourceIdsToRelease.includes(resource.id)) {
                    resourceIdsToRelease.push(resource.id);
                }
            }
        }

        if (resourceIdsToRelease.length > 0) {
            await prisma.resource.updateMany({
                where: { id: { in: resourceIdsToRelease } },
                data: { status: 'AVAILABLE' }
            });
            console.log(`Released ${resourceIdsToRelease.length} resources for OIT ${oit.oitNumber}`);
        }

        res.json({
            success: true,
            analysis: finalAnalysis
        });
    } catch (error) {
        console.error('Error finalizing sampling:', error);
        res.status(500).json({ error: 'Error al finalizar el muestreo' });
    }
};

// Generate Sampling Report PDF
export const generateSamplingReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        if (!oit.finalAnalysis) {
            return res.status(400).json({ error: 'El muestreo no ha sido finalizado' });
        }

        // Import PDF service
        const { pdfService } = require('../services/pdf.service');

        // Generate PDF
        const pdfPath = await pdfService.generateSamplingReport(oit);

        // Update OIT with report URL
        await prisma.oIT.update({
            where: { id },
            data: {
                samplingReportUrl: pdfPath
            }
        });

        // Send PDF file
        res.download(pdfPath, `Informe_Muestreo_${oit.oitNumber}.pdf`);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Error al generar el informe PDF' });
    }
};

// Upload Sampling Sheets (Planillas de Muestreo)
export const uploadSamplingSheets = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { group = 'General' } = req.body; // New parameter
        const file = (req as any).file;

        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo de planillas' });
        }

        // Fetch current OIT to append file
        const currentOit = await prisma.oIT.findUnique({ where: { id }, select: { samplingSheetUrl: true } });
        let groupedFiles: Record<string, string[]> = {};

        if (currentOit?.samplingSheetUrl) {
            try {
                const parsed = JSON.parse(currentOit.samplingSheetUrl);
                if (Array.isArray(parsed)) {
                    groupedFiles = { 'General': parsed };
                } else if (typeof parsed === 'object' && parsed !== null) {
                    groupedFiles = parsed;
                } else {
                    groupedFiles = { 'General': [currentOit.samplingSheetUrl] };
                }
            } catch (e) {
                groupedFiles = { 'General': [currentOit.samplingSheetUrl] };
            }
        }

        const newPath = `uploads/${file.filename}`;
        if (!groupedFiles[group]) groupedFiles[group] = [];
        groupedFiles[group].push(newPath);

        // Save file URL list and trigger analysis
        await prisma.oIT.update({
            where: { id },
            data: {
                samplingSheetUrl: JSON.stringify(groupedFiles)
            } as any
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

    } catch (error) {
        console.error('Error uploading sampling sheets:', error);
        res.status(500).json({ error: 'Error al subir planillas de muestreo' });
    }
};

// Delete a Sampling Sheet from the list
export const deleteSamplingSheet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fileUrl, group = 'General' } = req.body;

        if (!fileUrl) {
            return res.status(400).json({ error: 'Se requiere fileUrl para eliminar' });
        }

        const currentOit = await prisma.oIT.findUnique({ where: { id }, select: { samplingSheetUrl: true, samplingSheetAnalysis: true } });
        let groupedFiles: Record<string, string[]> = {};

        if (currentOit?.samplingSheetUrl) {
            try {
                const parsed = JSON.parse(currentOit.samplingSheetUrl);
                groupedFiles = Array.isArray(parsed) ? { 'General': parsed } : parsed;
            } catch { groupedFiles = { 'General': [currentOit.samplingSheetUrl] }; }
        }

        if (groupedFiles[group]) {
            groupedFiles[group] = groupedFiles[group].filter(url => url !== fileUrl);
        }

        // Handle Analysis reset for that group
        let groupedAnalyses: Record<string, any> = {};
        if (currentOit?.samplingSheetAnalysis) {
            try {
                const parsed = JSON.parse(currentOit.samplingSheetAnalysis);
                groupedAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': parsed };
            } catch { groupedAnalyses = { 'General': currentOit.samplingSheetAnalysis }; }
        }
        delete groupedAnalyses[group];

        await prisma.oIT.update({
            where: { id },
            data: {
                samplingSheetUrl: JSON.stringify(groupedFiles),
                samplingSheetAnalysis: JSON.stringify(groupedAnalyses)
            } as any
        });

        res.json({ success: true, samplingSheetUrl: JSON.stringify(groupedFiles), message: 'Archivo eliminado' });
    } catch (error) {
        console.error('Error deleting sampling sheet:', error);
        res.status(500).json({ error: 'Error al eliminar planilla' });
    }
};

// Delete a Lab Result from the list
export const deleteLabResult = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fileUrl, group = 'General' } = req.body;

        if (!fileUrl) {
            return res.status(400).json({ error: 'Se requiere fileUrl para eliminar' });
        }

        const currentOit = await prisma.oIT.findUnique({ where: { id }, select: { labResultsUrl: true, labResultsAnalysis: true } });
        let groupedFiles: Record<string, string[]> = {};

        if (currentOit?.labResultsUrl) {
            try {
                const parsed = JSON.parse(currentOit.labResultsUrl);
                groupedFiles = Array.isArray(parsed) ? { 'General': parsed } : parsed;
            } catch { groupedFiles = { 'General': [currentOit.labResultsUrl] }; }
        }

        if (groupedFiles[group]) {
            groupedFiles[group] = groupedFiles[group].filter(url => url !== fileUrl);
        }

        // Handle Analysis reset for that group
        let groupedAnalyses: Record<string, any> = {};
        if (currentOit?.labResultsAnalysis) {
            try {
                const parsed = JSON.parse(currentOit.labResultsAnalysis);
                groupedAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': String(parsed) };
            } catch { groupedAnalyses = { 'General': currentOit.labResultsAnalysis }; }
        }
        delete groupedAnalyses[group];

        await prisma.oIT.update({
            where: { id },
            data: {
                labResultsUrl: JSON.stringify(groupedFiles),
                labResultsAnalysis: JSON.stringify(groupedAnalyses)
            } as any
        });

        res.json({ success: true, labResultsUrl: JSON.stringify(groupedFiles), message: 'Archivo eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar resultado de laboratorio' });
    }
};

// Background Processor for Sampling Sheets
async function processSamplingSheetsAsync(oitId: string, filenames: string[], group: string = 'General') {
    try {
        console.log(`[SAMPLING_SHEETS] Starting analysis for OIT ${oitId}, Group: ${group} with ${filenames.length} files`);
        const { pdfService } = require('../services/pdf.service');
        const path = require('path');
        let fullCombinedText = '';

        for (const filename of filenames) {
            const filePath = path.join(__dirname, '../../uploads', filename);

            if (!fs.existsSync(filePath)) {
                console.warn(`[SAMPLING_SHEETS] File not found: ${filePath}`);
                continue;
            }

            let extractedText = '';
            try {
                console.log(`[SAMPLING_SHEETS] Processing file: ${filename}`);
                if (filename.endsWith('.pdf')) {
                    extractedText = await pdfService.extractText(filePath);
                } else if (filename.match(/\.(xlsx|xls)$/i)) {
                    // Parse Excel file
                    const xlsx = require('xlsx');
                    const workbook = xlsx.readFile(filePath);

                    // Convert all sheets to text representation
                    let allSheetsText = "";
                    workbook.SheetNames.forEach((sheetName: string) => {
                        const sheet = workbook.Sheets[sheetName];
                        const csvData = xlsx.utils.sheet_to_csv(sheet);
                        allSheetsText += `\n--- HOJA: ${sheetName} ---\n${csvData}\n`;
                    });
                    extractedText = allSheetsText;
                } else {
                    extractedText = "[Contenido no legible directamente]";
                }
            } catch (readErr) {
            }

            fullCombinedText += `\n\n=== ARCHIVO: ${filename} ===\n${extractedText}`;
        }

        const oit = await prisma.oIT.findUnique({ where: { id: oitId }, select: { description: true, samplingSheetAnalysis: true } });
        const oitContext = oit?.description || '';

        const analysis = await aiService.analyzeSamplingSheets(fullCombinedText, oitContext);

        // Update grouped internal analysis
        let currentAnalyses: Record<string, any> = {};
        if (oit?.samplingSheetAnalysis) {
            try {
                const parsed = JSON.parse(oit.samplingSheetAnalysis);
                currentAnalyses = (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : { 'General': parsed };
            } catch {
                currentAnalyses = { 'General': oit.samplingSheetAnalysis };
            }
        }
        currentAnalyses[group] = analysis;

        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                samplingSheetAnalysis: JSON.stringify(currentAnalyses)
            } as any
        });

        console.log(`[SAMPLING_SHEETS] Analysis completed for OIT ${oitId}, Group: ${group}, quality: ${analysis.quality}`);
        await internalGenerateFinalReport(oitId).catch(e => console.error("Auto report generation failed", e));
    } catch (error) {
        console.error('[SAMPLING_SHEETS] Error in background processing:', error);
    }
}

export const generateFinalReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { generatedReports } = await internalGenerateFinalReport(id);

        res.json({
            success: true,
            message: `Se han generado ${generatedReports.length} informe(s) correctamente.`,
            reports: generatedReports
        });

    } catch (error) {
        console.error('Final Report Error:', error);
        res.status(500).json({ error: 'Error generando informe final' });
    }
};


// Update Resources in Planning Proposal
export const updatePlanningResources = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { resourceIds } = req.body;

        if (!Array.isArray(resourceIds)) {
            return res.status(400).json({ error: 'resourceIds debe ser un array' });
        }

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) return res.status(404).json({ error: 'OIT no encontrada' });

        // Fetch details of selected resources
        const selectedResources = await prisma.resource.findMany({
            where: { id: { in: resourceIds } }
        });

        const mappedResources = selectedResources.map(r => {
            const res = r as any;
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
        let planningProposal: any = {};
        if (oit.planningProposal) {
            try {
                planningProposal = JSON.parse(oit.planningProposal);
            } catch (e) { }
        }
        planningProposal.assignedResources = mappedResources;

        // Update aiData too for consistency in UI
        let aiData: any = {};
        if (oit.aiData) {
            try {
                aiData = JSON.parse(oit.aiData);
                if (aiData.data) {
                    aiData.data.assignedResources = mappedResources;
                }
            } catch (e) { }
        }

        await prisma.oIT.update({
            where: { id },
            data: {
                planningProposal: JSON.stringify(planningProposal),
                aiData: JSON.stringify(aiData)
            }
        });

        res.json({ success: true, resources: mappedResources });
    } catch (error) {
        console.error('Error updating planning resources:', error);
        res.status(500).json({ error: 'Error al actualizar recursos' });
    }
};

// Request Redo of Sampling Steps (Admin Only)
export const requestRedoSteps = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { stepIndices, redoAll, reason } = req.body;

        const oit = await prisma.oIT.findUnique({ where: { id } });
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
            samplingProgress.redoRequests = samplingProgress.completedSteps.map((idx: number) => ({
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
        } else if (stepIndices && Array.isArray(stepIndices)) {
            // Mark specific steps for redo
            stepIndices.forEach((stepIndex: number) => {
                // Add to redo requests
                samplingProgress.redoRequests.push({
                    stepIndex,
                    reason: reason || 'Solicitado por administrador',
                    requestedAt: new Date().toISOString(),
                    status: 'PENDING'
                });
                // Remove from completed if present
                samplingProgress.completedSteps = samplingProgress.completedSteps.filter((idx: number) => idx !== stepIndex);
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
        await prisma.oIT.update({
            where: { id },
            data: {
                samplingProgress: JSON.stringify(samplingProgress),
                stepValidations: JSON.stringify(stepValidations),
                status: 'REDO_REQUIRED' // New status to indicate redo needed
            }
        });

        // Create notification for assigned engineers
        const assignedEngineers = await prisma.oITAssignment.findMany({
            where: { oitId: id },
            include: { user: true }
        });

        for (const eng of assignedEngineers) {
            const notifMessage = redoAll
                ? `La OIT #${oit.oitNumber} requiere rehacer todos los pasos de muestreo. Razón: ${reason || 'Solicitado por admin'}`
                : `La OIT #${oit.oitNumber} requiere rehacer ${stepIndices?.length} paso(s). Razón: ${reason || 'Solicitado por admin'}`;

            await createNotification(
                eng.userId,
                'Pasos de muestreo requieren corrección',
                notifMessage,
                'WARNING',
                id
            );
        }


        res.json({
            success: true,
            message: redoAll ? 'Todos los pasos marcados para rehacer' : `${stepIndices?.length} paso(s) marcado(s) para rehacer`,
            samplingProgress
        });
    } catch (error) {
        console.error('Error requesting redo:', error);
        res.status(500).json({ error: 'Error al solicitar corrección' });
    }
};

// Update Service Dates
export const updateServiceDates = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { serviceDates } = req.body;

        // serviceDates format:
        // { [serviceId]: { name, date, time, engineerIds[], confirmed } }

        // 1. Extract all unique engineer IDs from all service dates
        const engineerIds = new Set<string>();
        if (serviceDates) {
            Object.values(serviceDates).forEach((schedule: any) => {
                if (schedule.engineerIds && Array.isArray(schedule.engineerIds)) {
                    schedule.engineerIds.forEach((eid: string) => engineerIds.add(eid));
                }
            });
        }

        const uniqueEngineerIds = Array.from(engineerIds);

        // 2. Transaction to update OIT and sync assignments
        await prisma.$transaction(async (tx) => {
            // Update OIT JSON
            await tx.oIT.update({
                where: { id },
                data: {
                    serviceDates: JSON.stringify(serviceDates),
                    status: 'SCHEDULED',
                    planningAccepted: true
                }
            });

            // Sync Assignments
            // First, delete existing assignments for this OIT
            await tx.oITAssignment.deleteMany({
                where: { oitId: id }
            });

            // Create new assignments
            if (uniqueEngineerIds.length > 0) {
                await tx.oITAssignment.createMany({
                    data: uniqueEngineerIds.map((userId) => ({
                        oitId: id,
                        userId
                    }))
                });
            }
        });

        res.json({
            success: true,
            message: 'Programación actualizada correctamente',
            assignedEngineersCount: uniqueEngineerIds.length
        });
    } catch (error) {
        console.error('Error updating service dates:', error);
        res.status(500).json({ error: 'Error al actualizar fechas de servicio' });
    }
};

// Verify Consistency
export const verifyConsistency = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const verificationService = require('../services/verification.service').default;

        const result = await verificationService.verifyConsistency(id);
        res.json(result);
    } catch (error) {
        console.error('Error verifying consistency:', error);
        res.status(500).json({ error: 'Error en verificación de consistencia' });
    }
};
