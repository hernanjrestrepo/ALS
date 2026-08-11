"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = require("../config/multer");
const router = (0, express_1.Router)();
// Upload generic file
router.post('/upload', auth_middleware_1.authMiddleware, multer_1.upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('[Files] File uploaded successfully:', req.file.filename);
        res.json({
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: req.file.path
        });
    }
    catch (error) {
        console.error('[Files] Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});
router.get('/download/:filename', auth_middleware_1.authMiddleware, (req, res) => {
    try {
        const { filename } = req.params;
        const sanitizedFilename = path_1.default.basename(filename);
        const filePath = path_1.default.join(__dirname, '../../uploads', sanitizedFilename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const stat = fs_1.default.statSync(filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });
    }
    catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
/* ------------------------------------------------------------------ */
/*  DOCX Preview — convert template to interactive HTML               */
/* ------------------------------------------------------------------ */
router.get('/preview/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const sanitizedFilename = path_1.default.basename(filename);
        const dirs = [
            path_1.default.join(__dirname, '../../templates/docxtemplater'),
            path_1.default.join(__dirname, '../../templates/reports'),
            path_1.default.join(__dirname, '../../uploads'),
        ];
        let filePath = null;
        for (const dir of dirs) {
            const p = path_1.default.join(dir, sanitizedFilename);
            if (fs_1.default.existsSync(p)) {
                filePath = p;
                break;
            }
        }
        if (!filePath) {
            return res.status(404).json({ error: 'Template no encontrado' });
        }
        const mammoth = require('mammoth');
        const result = yield mammoth.convertToHtml({ path: filePath });
        let html = result.value;
        // Wrap docxtemplater placeholders in clickable spans
        const placeholderRegex = /\{([#%:\/]?[\w_]+(?:\|[\w]+)?)\}/g;
        html = html.replace(placeholderRegex, (match, tagName) => {
            const type = tagName.startsWith('#') ? 'loop' :
                tagName.startsWith('/') ? 'loop-end' :
                    tagName.startsWith(':') ? 'conditional' :
                        tagName.startsWith('%') ? 'image' : 'variable';
            return `<span class="dt-tag dt-tag--${type}" data-tag="${tagName}" data-type="${type}">{${tagName}}</span>`;
        });
        // Styled HTML with injected interaction script
        const styledHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI',Arial,sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937; max-width: 900px; margin: 40px auto; padding: 60px; background:#fff; box-shadow: 0 0 20px rgba(0,0,0,0.08); min-height: 100vh; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
  td, th { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  p { margin: 8px 0; }
  h1,h2,h3,h4 { margin: 16px 0 8px; color: #111827; }
  img { max-width: 100%; height: auto; }
  .dt-tag { display:inline; cursor: pointer; border-radius: 4px; padding: 1px 4px; font-family: 'SF Mono',monospace; font-size: 0.88em; transition: all .12s; border: 1px dashed transparent; }
  .dt-tag:hover { background: #e0e7ff; border-color: #6366f1; transform: scale(1.02); }
  .dt-tag--variable   { color: #1d4ed8; background: #dbeafe; }
  .dt-tag--loop       { color: #6d28d9; background: #ede9fe; }
  .dt-tag--loop-end   { color: #6d28d9; background: #ede9fe; opacity: 0.7; }
  .dt-tag--conditional{ color: #c2410c; background: #ffedd5; }
  .dt-tag--image      { color: #0e7490; background: #cffafe; }
  ::selection { background: #fde047; color: #1f2937; }
</style>
</head>
<body>
${html}
<script>
(function(){
  // Send click events to parent window
  document.addEventListener('click', function(e){
    var tag = e.target.closest('.dt-tag');
    if (tag) {
      window.parent.postMessage({ type: 'tag-click', tag: tag.dataset.tag, tagType: tag.dataset.type }, '*');
    }
  });
  // Also handle selection
  document.addEventListener('mouseup', function(){
    var sel = window.getSelection().toString().trim();
    if (sel.length > 2) {
      window.parent.postMessage({ type: 'text-selection', text: sel }, '*');
    }
  });
})();
</script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        res.send(styledHtml);
    }
    catch (error) {
        console.error('[Preview] Error:', error.message);
        res.status(500).json({ error: 'No se pudo generar la vista previa', details: error.message });
    }
}));
/* ------------------------------------------------------------------ */
/*  PDF Preview — serve filled sample PDFs                            */
/* ------------------------------------------------------------------ */
router.get('/preview-pdf/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const sanitizedFilename = path_1.default.basename(filename).replace('.docx', '.pdf');
        const pdfPath = path_1.default.join(__dirname, '../../templates/docxtemplater/pdf_samples', sanitizedFilename);
        if (!fs_1.default.existsSync(pdfPath)) {
            return res.status(404).json({ error: 'PDF de muestra no encontrado', file: sanitizedFilename });
        }
        const stat = fs_1.default.statSync(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stat.size);
        const stream = fs_1.default.createReadStream(pdfPath);
        stream.pipe(res);
        stream.on('error', (err) => {
            console.error('[PreviewPDF] stream error:', err);
            if (!res.headersSent)
                res.status(500).json({ error: 'Error sirviendo PDF' });
        });
    }
    catch (error) {
        console.error('[PreviewPDF] error:', error.message);
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
}));
/* ------------------------------------------------------------------ */
/*  Image Preview API — list page images + serve individual PNGs    */
/* ------------------------------------------------------------------ */
router.get('/preview-images/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const baseName = path_1.default.basename(filename).replace('.docx', '');
        const imgDir = path_1.default.join(__dirname, '../../uploads/preview_images', baseName);
        if (!fs_1.default.existsSync(imgDir)) {
            return res.status(404).json({ error: 'Preview images no encontrado', dir: baseName });
        }
        const files = fs_1.default.readdirSync(imgDir)
            .filter(f => f.endsWith('.png'))
            .sort((a, b) => {
            var _a, _b;
            const na = parseInt(((_a = a.match(/page-(\d+)\.png/)) === null || _a === void 0 ? void 0 : _a[1]) || '0', 10);
            const nb = parseInt(((_b = b.match(/page-(\d+)\.png/)) === null || _b === void 0 ? void 0 : _b[1]) || '0', 10);
            return na - nb;
        });
        const pages = files.map((f, i) => ({
            page: i + 1,
            url: `/api/files/preview-image/${encodeURIComponent(baseName)}/${encodeURIComponent(f)}`
        }));
        res.json({ pages });
    }
    catch (error) {
        console.error('[PreviewImages] error:', error.message);
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
}));
router.get('/preview-image/:template/:image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { template, image } = req.params;
        const safeTemplate = path_1.default.basename(template);
        const safeImage = path_1.default.basename(image);
        const imgPath = path_1.default.join(__dirname, '../../uploads/preview_images', safeTemplate, safeImage);
        if (!fs_1.default.existsSync(imgPath) || !imgPath.endsWith('.png')) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        const stat = fs_1.default.statSync(imgPath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        const stream = fs_1.default.createReadStream(imgPath);
        stream.pipe(res);
        stream.on('error', (err) => {
            console.error('[PreviewImage] stream error:', err);
            if (!res.headersSent)
                res.status(500).json({ error: 'Error sirviendo imagen' });
        });
    }
    catch (error) {
        console.error('[PreviewImage] error:', error.message);
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
}));
exports.default = router;
