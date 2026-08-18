import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getDashboardMetrics } from '../controllers/analytics.controller';

const router = Router();

router.use(authMiddleware);
router.get('/dashboard', getDashboardMetrics);

export default router;
