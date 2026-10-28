import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { labOverview } from '../controllers/lab.controller';

const router = Router();

// Panel de laboratorio: lo ven laboratorio y administradores.
router.get('/overview', authMiddleware, requireRole(['SUPER_ADMIN', 'ADMIN', 'LAB']), labOverview);

export default router;
