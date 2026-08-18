import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../config/multer';
import { analyzeTemplateTags, applyTemplateTags } from '../controllers/template-detection.controller';

const router = Router();

router.use(authMiddleware);
router.post('/analyze', upload.single('file'), analyzeTemplateTags);
router.post('/apply', applyTemplateTags);

export default router;
