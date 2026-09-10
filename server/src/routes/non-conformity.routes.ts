import { Router } from 'express';
import { authMiddleware, requireOperational, requireEngineerAssignment } from '../middleware/auth.middleware';
import {
    getNonConformitiesForOit,
    createNonConformity,
    updateNonConformity,
    deleteNonConformity,
} from '../controllers/non-conformity.controller';

const router = Router();

router.use(authMiddleware);

// Lectura: cualquier rol autenticado, incluido USER de solo consulta
router.get('/oits/:id/non-conformities', getNonConformitiesForOit);

// Escritura: ADMIN+ siempre, ENGINEER solo si esta asignado a esa OIT
// (:id, no :oitId - requireEngineerAssignment lee req.params.id)
router.post('/oits/:id/non-conformities', requireOperational, requireEngineerAssignment, createNonConformity);
router.put('/non-conformities/:id', requireOperational, updateNonConformity);
router.delete('/non-conformities/:id', requireOperational, deleteNonConformity);

export default router;
