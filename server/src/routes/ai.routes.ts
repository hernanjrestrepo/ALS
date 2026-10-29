import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { chat, attachFiles, exportAnswer, getModels, analyzeDocument, recommendResources, validateOITDocuments } from '../controllers/ai.controller';
import { upload } from '../config/multer';

import { prioridadAlta } from '../services/gpuQueue';
const router = Router();

// Using shared upload config (disk storage). Controller will still validate mimetypes

router.use(authMiddleware);

// El chat de Ana pasa primero en la fila de la GPU (alguien espera la respuesta).
router.post('/chat', prioridadAlta, chat);
router.post('/attach', upload.array('files', 6), attachFiles);
router.post('/export', exportAnswer);
router.get('/models', getModels);
router.post('/analyze', analyzeDocument);
router.post('/recommend', recommendResources);
router.post('/validate-oit-documents', upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 }
]), validateOITDocuments);

export default router;
