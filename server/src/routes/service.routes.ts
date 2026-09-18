import { Router } from 'express';
import { getAllServices, getServiceById, createService, updateService, deleteService } from '../controllers/service.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getAllServices);
router.get('/:id', getServiceById);
router.post('/', requireAdmin, createService);
router.put('/:id', requireAdmin, updateService);
router.delete('/:id', requireAdmin, deleteService);

export default router;
