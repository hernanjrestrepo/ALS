import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { upload } from '../config/multer';
import { analyzeTemplateTags, applyTemplateTags } from '../controllers/template-detection.controller';

const router = Router();

router.use(authMiddleware);
router.post('/analyze', requireAdmin, upload.single('file'), analyzeTemplateTags);
router.post('/apply', requireAdmin, applyTemplateTags);

export default router;
