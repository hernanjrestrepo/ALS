import { Router } from 'express';
import {
    getAllDistributionLists,
    getDistributionListById,
    createDistributionList,
    updateDistributionList,
    deleteDistributionList,
} from '../controllers/distribution-list.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getAllDistributionLists);
router.get('/:id', getDistributionListById);
router.post('/', requireAdmin, createDistributionList);
router.put('/:id', requireAdmin, updateDistributionList);
router.delete('/:id', requireAdmin, deleteDistributionList);

export default router;
