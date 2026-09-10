import { Router } from 'express';
import { authMiddleware, requireOperational, requireEngineerAssignment } from '../middleware/auth.middleware';
import { upload } from '../config/multer';
import {
    getSignaturesForOit,
    createSignature,
    uploadSignedDocument,
    deleteSignature,
} from '../controllers/signature.controller';

const router = Router();

router.use(authMiddleware);

// Lectura: cualquier rol autenticado
router.get('/oits/:id/signatures', getSignaturesForOit);

// Escritura: ADMIN+ siempre, ENGINEER solo si esta asignado a esa OIT
// (:id, no :oitId - requireEngineerAssignment lee req.params.id)
router.post('/oits/:id/signatures', requireOperational, requireEngineerAssignment, createSignature);
router.post('/oits/:id/signatures/document', requireOperational, requireEngineerAssignment, upload.single('file'), uploadSignedDocument);
router.delete('/signatures/:id', requireOperational, deleteSignature);

export default router;
