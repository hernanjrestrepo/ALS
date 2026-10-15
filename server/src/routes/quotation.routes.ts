import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import {
    getQuotations,
    getQuotation,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    analyzeQuotation,
    processEmailRequest,
    pollMailbox,
    listParameterConsultations,
    answerParameterConsultation
} from '../controllers/quotation.controller';

import { upload } from '../config/multer';

const router = Router();

router.use(authMiddleware);

// CRUD routes
router.get('/', getQuotations);
// Antes de /:id para que no se tome como id de cotizacion.
router.get('/parameter-consultations', requireAdmin, listParameterConsultations);
router.post('/parameter-consultations/:id/answer', requireAdmin, answerParameterConsultation);
router.get('/:id', getQuotation);
router.post('/', requireAdmin, upload.single('file'), createQuotation);
router.put('/:id', requireAdmin, upload.single('file'), updateQuotation);
router.delete('/:id', requireAdmin, deleteQuotation);

// Analysis route
router.post('/:id/analyze', requireAdmin, analyzeQuotation);

// Correo automatico -> resumen (requiere ADMIN+ por ahora; se puede abrir como
// webhook publico, como /oits/from-url, una vez se conecte un buzon real)
router.post('/from-email-request', requireAdmin, processEmailRequest);
router.post('/poll-mailbox', requireAdmin, pollMailbox);

export default router;
