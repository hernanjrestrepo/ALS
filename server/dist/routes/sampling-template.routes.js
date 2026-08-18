"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const sampling_template_controller_1 = require("../controllers/sampling-template.controller");
const docx_service_1 = require("../services/docx.service");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/', sampling_template_controller_1.getTemplates);
router.get('/trash', sampling_template_controller_1.getTrashedTemplates);
router.get('/:id', sampling_template_controller_1.getTemplateById);
router.post('/', sampling_template_controller_1.createTemplate);
router.put('/:id', sampling_template_controller_1.updateTemplate);
router.delete('/:id', sampling_template_controller_1.deleteTemplate);
router.post('/:id/restore', sampling_template_controller_1.restoreTemplate);
// Get template fields (docxtemplater tags)
router.get('/fields/:fileName', (req, res) => {
    try {
        const { fileName } = req.params;
        const fields = docx_service_1.docxService.getTemplateFields(fileName);
        res.json({ fileName, fields, count: fields.length });
    }
    catch (error) {
        console.error('[TemplateFields] Error:', error.message);
        res.status(500).json({ error: 'No se pudieron extraer los campos del template', details: error.message });
    }
});
exports.default = router;
