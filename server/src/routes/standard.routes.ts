import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import {
    getStandards,
    getStandard,
    createStandard,
    updateStandard,
    deleteStandard
} from '../controllers/standard.controller';

import { upload } from '../config/multer';

const router = Router();

router.use(authMiddleware);

router.get('/', getStandards);
router.get('/:id', getStandard);
router.post('/', requireAdmin, upload.single('file'), createStandard);
router.put('/:id', requireAdmin, upload.single('file'), updateStandard);
router.delete('/:id', requireAdmin, deleteStandard);

export default router;
