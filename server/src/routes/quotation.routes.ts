import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import {
    getQuotations,
    getQuotation,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    analyzeQuotation
} from '../controllers/quotation.controller';

import { upload } from '../config/multer';

const router = Router();

router.use(authMiddleware);

// CRUD routes
router.get('/', getQuotations);
router.get('/:id', getQuotation);
router.post('/', requireAdmin, upload.single('file'), createQuotation);
router.put('/:id', requireAdmin, upload.single('file'), updateQuotation);
router.delete('/:id', requireAdmin, deleteQuotation);

// Analysis route
router.post('/:id/analyze', requireAdmin, analyzeQuotation);

export default router;
