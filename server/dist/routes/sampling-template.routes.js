"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const sampling_template_controller_1 = require("../controllers/sampling-template.controller");
const docx_service_1 = require("../services/docx.service");
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/', sampling_template_controller_1.getTemplates);
router.get('/trash', sampling_template_controller_1.getTrashedTemplates);
router.get('/:id', sampling_template_controller_1.getTemplateById);
router.get('/:id/versions', sampling_template_controller_1.getTemplateVersions);
router.post('/', sampling_template_controller_1.createTemplate);
router.put('/:id', sampling_template_controller_1.updateTemplate);
router.delete('/:id', sampling_template_controller_1.deleteTemplate);
router.post('/:id/restore', sampling_template_controller_1.restoreTemplate);
router.post('/:id/versions/:versionId/restore', sampling_template_controller_1.restoreTemplateVersion);
// Get template fields (docxtemplater tags)
router.get('/fields/:fileName', (req, res) => {
    try {
        const fileName = path_1.default.basename(req.params.fileName);
        const fields = docx_service_1.docxService.getTemplateFields(fileName);
        res.json({ fileName, fields, count: fields.length });
    }
    catch (error) {
        console.error('[TemplateFields] Error:', error.message);
        res.status(500).json({ error: 'No se pudieron extraer los campos del template', details: error.message });
    }
});
exports.default = router;
