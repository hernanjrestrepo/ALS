import { Router } from 'express';
import { getAllClients, getClientById, createClient, updateClient, deleteClient } from '../controllers/client.controller';
import { upload } from '../config/multer';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

const clientDocs = upload.fields([
    { name: 'contractorManual', maxCount: 1 },
    { name: 'procedures', maxCount: 1 },
    { name: 'policies', maxCount: 1 },
]);

router.get('/', getAllClients);
router.get('/:id', getClientById);
router.post('/', requireAdmin, clientDocs, createClient);
router.put('/:id', requireAdmin, clientDocs, updateClient);
router.delete('/:id', requireAdmin, deleteClient);

export default router;
