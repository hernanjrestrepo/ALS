import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { getAllResources, getResourceById, createResource, updateResource, deleteResource, bulkUpload } from '../controllers/resource.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/', getAllResources);
router.get('/:id', getResourceById);
router.post('/', requireAdmin, createResource);
router.post('/bulk-upload', requireAdmin, upload.single('csvFile'), bulkUpload);
router.put('/:id', requireAdmin, updateResource);
router.delete('/:id', requireAdmin, deleteResource);

export default router;
