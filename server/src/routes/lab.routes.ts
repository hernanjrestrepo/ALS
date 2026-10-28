import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { labOverview, listClarifications, answerClarification, webhookStatus } from '../controllers/lab.controller';

const router = Router();

// Panel de laboratorio: lo ven laboratorio y administradores.
router.get('/overview', authMiddleware, requireRole(['SUPER_ADMIN', 'ADMIN', 'LAB']), labOverview);

router.get('/clarifications', authMiddleware, requireRole(['SUPER_ADMIN', 'ADMIN', 'LAB']), listClarifications);
router.post('/clarifications/:id/answer', authMiddleware, requireRole(['SUPER_ADMIN', 'ADMIN', 'LAB']), answerClarification);
router.get('/webhook-status', authMiddleware, webhookStatus);

export default router;
