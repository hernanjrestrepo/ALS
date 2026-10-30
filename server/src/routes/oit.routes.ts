import { Router } from 'express';
import {
    getAllOITs,
    getOITById,
    createOIT,
    createOITAsync,
    createOITFromUrl,
    updateOIT,
    deleteOIT,
    checkCompliance,
    acceptPlanning,
    rejectPlanning,
    saveSamplingData,
    getSamplingData,
    uploadLabResults,
    uploadSamplingSheets,
    deleteSamplingSheet,
    deleteLabResult,
    generateFinalReport,
    getReportVersions,
    activateReportVersion,
    reportChatPreview,
    reportChatApprove,
    validateStepData,
    finalizeSampling,
    generateSamplingReport,
    reanalyzeOIT,
    assignEngineers,
    getAssignedEngineers,
    submitSampling,
    updatePlanningResources,
    requestRedoSteps,
    updateServiceDates,
    verifyConsistency,
    sendFinalReport,
    generateStageCertificate,
    receiveLabResultsFromUrl
} from '../controllers/oit.controller';
import { upload } from '../config/multer';
import { readSheet, sheetReaderStatus } from '../controllers/sheet.controller';
import { prioridadAlta } from '../services/gpuQueue';
import { labComplete, labStatusForOit, oitTraceability } from '../controllers/lab.controller';
import { proposeAssignments } from '../controllers/planning.controller';
import { requireQuotationApproved } from '../middleware/quotationApproved';
import { authMiddleware, requireAdmin, requireOperational, requireEngineerAssignment, requireLabAccess } from '../middleware/auth.middleware';

const router = Router();

// Read endpoints: any authenticated role, including read-only USER
router.get('/', authMiddleware, getAllOITs);
// Antes de /:id para que no se tome como id de OIT
router.get('/sheet-reader/status', authMiddleware, sheetReaderStatus);
router.get('/:id/lab-status', authMiddleware, labStatusForOit);
router.get('/:id/traceability', authMiddleware, oitTraceability);
router.get('/:id', authMiddleware, getOITById);

// Creating/editing/deleting an OIT is a planning decision: ADMIN+ only
router.post('/', authMiddleware, requireAdmin, createOIT);

// Async creation endpoint with file uploads (oitFile and quotationFile)
router.post(
    '/async',
    authMiddleware,
    requireAdmin,
    upload.fields([
        { name: 'oitFile', maxCount: 1 },
        { name: 'quotationFile', maxCount: 1 },
    ]),
    createOITAsync
);
// Legacy webhook intake endpoint (e.g. automated email pipeline) - auth intentionally optional
router.post('/from-url', createOITFromUrl);
// Webhook de integracion externa (Sistema Serambiente): resultado de laboratorio
// para una OIT existente, identificada por numero (OT) - auth intencionalmente opcional
router.post('/lab-results-from-url', receiveLabResultsFromUrl);

router.put('/:id', authMiddleware, requireAdmin, updateOIT);
router.patch('/:id', authMiddleware, requireAdmin, upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 },
]), updateOIT);
router.post('/:id/compliance', authMiddleware, checkCompliance);

router.post('/:id/reanalyze', authMiddleware, requireAdmin, reanalyzeOIT);

// Planning endpoints (ADMIN+ only)
router.post('/:id/accept-planning', authMiddleware, requireAdmin, requireQuotationApproved, acceptPlanning);
router.post('/:id/propose-assignments', authMiddleware, requireAdmin, requireQuotationApproved, proposeAssignments);
router.post('/:id/reject-planning', authMiddleware, requireAdmin, rejectPlanning);
router.put('/:id/service-dates', authMiddleware, requireAdmin, requireQuotationApproved, updateServiceDates);

// Sampling data endpoints: ADMIN+ always, ENGINEER only if assigned to this OIT, USER blocked
router.post('/:id/sampling-data', authMiddleware, requireOperational, requireEngineerAssignment, saveSamplingData);
// Lectura de la planilla de campo por foto (llena el formulario de muestreo)
router.post('/:id/read-sheet', authMiddleware, requireOperational, requireEngineerAssignment, upload.array('images', 6), prioridadAlta, readSheet);
router.get('/:id/sampling-data', authMiddleware, getSamplingData);

// Lab results and final report
router.post('/:id/lab-results', authMiddleware, requireLabAccess, upload.array('file', 20), uploadLabResults);
router.delete('/:id/lab-results', authMiddleware, requireLabAccess, deleteLabResult);
router.post('/:id/lab-complete', authMiddleware, requireLabAccess, labComplete);
router.post('/:id/sampling-sheets', authMiddleware, requireOperational, requireEngineerAssignment, upload.single('file'), uploadSamplingSheets);
router.delete('/:id/sampling-sheets', authMiddleware, requireOperational, requireEngineerAssignment, deleteSamplingSheet);
// Final report generation/approval: ADMIN+ only
router.post('/:id/generate-final-report', authMiddleware, requireAdmin, generateFinalReport);
router.get('/:id/report-versions', authMiddleware, getReportVersions);
router.post('/:id/report-versions/:versionId/activate', authMiddleware, requireAdmin, activateReportVersion);
router.post('/:id/report-chat', authMiddleware, requireAdmin, prioridadAlta, reportChatPreview);
router.post('/:id/report-chat/approve', authMiddleware, requireAdmin, reportChatApprove);
router.post('/:id/send-report', authMiddleware, requireAdmin, sendFinalReport);
router.post('/:id/certificate', authMiddleware, requireOperational, requireEngineerAssignment, generateStageCertificate);

// Sampling validation workflow: ADMIN+ always, ENGINEER only if assigned, USER blocked
router.post('/:id/validate-step', authMiddleware, requireOperational, requireEngineerAssignment, validateStepData);
router.post('/:id/finalize-sampling', authMiddleware, requireOperational, requireEngineerAssignment, finalizeSampling);
router.post('/:id/submit-sampling', authMiddleware, requireOperational, requireEngineerAssignment, submitSampling);
router.get('/:id/sampling-report', authMiddleware, generateSamplingReport);
router.post('/:id/verify', authMiddleware, requireOperational, requireEngineerAssignment, verifyConsistency);

// Request redo of sampling steps (Admin only)
router.post('/:id/request-redo', authMiddleware, requireAdmin, requestRedoSteps);

router.delete('/:id', authMiddleware, requireAdmin, deleteOIT);

// Engineer assignment endpoints
router.post('/:id/assign-engineers', authMiddleware, requireAdmin, requireQuotationApproved, assignEngineers);
router.get('/:id/engineers', authMiddleware, getAssignedEngineers);

// Update resources explicitly (planning-level, ADMIN+)
router.put('/:id/resources', authMiddleware, requireAdmin, requireQuotationApproved, updatePlanningResources);

export default router;

