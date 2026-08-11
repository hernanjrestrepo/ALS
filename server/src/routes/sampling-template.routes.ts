import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate
} from '../controllers/sampling-template.controller';
import { docxService } from '../services/docx.service';

const router = Router();

router.use(authMiddleware);

router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

// Get template fields (docxtemplater tags)
router.get('/fields/:fileName', (req: Request, res: Response) => {
    try {
        const { fileName } = req.params;
        const fields = docxService.getTemplateFields(fileName);
        res.json({ fileName, fields, count: fields.length });
    } catch (error: any) {
        console.error('[TemplateFields] Error:', error.message);
        res.status(500).json({ error: 'No se pudieron extraer los campos del template', details: error.message });
    }
});

export default router;
