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
    generateStageCertificate
} from '../controllers/oit.controller';
import { upload } from '../config/multer';
import { authMiddleware, requireAdmin, requireOperational, requireEngineerAssignment } from '../middleware/auth.middleware';

const router = Router();

// Read endpoints: any authenticated role, including read-only USER
router.get('/', authMiddleware, getAllOITs);
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

router.put('/:id', authMiddleware, requireAdmin, updateOIT);
router.patch('/:id', authMiddleware, requireAdmin, upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 },
]), updateOIT);
router.post('/:id/compliance', authMiddleware, checkCompliance);

router.post('/:id/reanalyze', authMiddleware, requireAdmin, reanalyzeOIT);

// Planning endpoints (ADMIN+ only)
router.post('/:id/accept-planning', authMiddleware, requireAdmin, acceptPlanning);
router.post('/:id/reject-planning', authMiddleware, requireAdmin, rejectPlanning);
router.put('/:id/service-dates', authMiddleware, requireAdmin, updateServiceDates);

// Sampling data endpoints: ADMIN+ always, ENGINEER only if assigned to this OIT, USER blocked
router.post('/:id/sampling-data', authMiddleware, requireOperational, requireEngineerAssignment, saveSamplingData);
router.get('/:id/sampling-data', authMiddleware, getSamplingData);

// Lab results and final report
router.post('/:id/lab-results', authMiddleware, requireOperational, requireEngineerAssignment, upload.single('file'), uploadLabResults);
router.delete('/:id/lab-results', authMiddleware, requireOperational, requireEngineerAssignment, deleteLabResult);
router.post('/:id/sampling-sheets', authMiddleware, requireOperational, requireEngineerAssignment, upload.single('file'), uploadSamplingSheets);
router.delete('/:id/sampling-sheets', authMiddleware, requireOperational, requireEngineerAssignment, deleteSamplingSheet);
// Final report generation/approval: ADMIN+ only
router.post('/:id/generate-final-report', authMiddleware, requireAdmin, generateFinalReport);
router.get('/:id/report-versions', authMiddleware, getReportVersions);
router.post('/:id/report-versions/:versionId/activate', authMiddleware, requireAdmin, activateReportVersion);
router.post('/:id/report-chat', authMiddleware, requireAdmin, reportChatPreview);
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
router.post('/:id/assign-engineers', authMiddleware, requireAdmin, assignEngineers);
router.get('/:id/engineers', authMiddleware, getAssignedEngineers);

// Update resources explicitly (planning-level, ADMIN+)
router.put('/:id/resources', authMiddleware, requireAdmin, updatePlanningResources);

export default router;

