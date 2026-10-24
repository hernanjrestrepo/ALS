import { Router } from 'express';
import { authMiddleware, requireSuperAdmin } from '../middleware/auth.middleware';
import { getAcademy, listPropuestas, decidirPropuesta, buscarPropuestas } from '../controllers/academy.controller';

// Xmart Academy: todos con sesion lo leen; las propuestas de la IA solo las decide un SUPER_ADMIN.
const router = Router();
router.use(authMiddleware);
router.get('/', getAcademy);
router.get('/propuestas', requireSuperAdmin, listPropuestas);
router.post('/propuestas/buscar', requireSuperAdmin, buscarPropuestas);
router.post('/propuestas/:id/decision', requireSuperAdmin, decidirPropuesta);

export default router;
