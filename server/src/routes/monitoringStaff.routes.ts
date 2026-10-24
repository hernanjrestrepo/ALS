import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { listStaff, createStaff, updateStaff, deleteStaff } from '../controllers/monitoringStaff.controller';

// Personal de monitoreo: solo administradores (ADMIN y SUPER_ADMIN).
const router = Router();
router.use(authMiddleware, requireAdmin);
router.get('/', listStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

export default router;
