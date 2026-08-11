import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';
import { upload } from '../config/multer';

const router = Router();

// Upload generic file
router.post('/upload', authMiddleware, upload.single('file'), (req: Request, res: Response) => {
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
    } catch (error) {
        console.error('[Files] Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

router.get('/download/:filename', authMiddleware, (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const sanitizedFilename = path.basename(filename);
        const filePath = path.join(__dirname, '../../uploads', sanitizedFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/* ------------------------------------------------------------------ */
/*  DOCX Preview — convert template to interactive HTML               */
/* ------------------------------------------------------------------ */
router.get('/preview/:filename', async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const sanitizedFilename = path.basename(filename);
        const dirs = [
            path.join(__dirname, '../../templates/docxtemplater'),
            path.join(__dirname, '../../templates/reports'),
            path.join(__dirname, '../../uploads'),
        ];
        let filePath: string | null = null;
        for (const dir of dirs) {
            const p = path.join(dir, sanitizedFilename);
            if (fs.existsSync(p)) {
                filePath = p;
                break;
            }
        }
        if (!filePath) {
            return res.status(404).json({ error: 'Template no encontrado' });
        }

        const mammoth = require('mammoth');
        const result = await mammoth.convertToHtml({ path: filePath });
        let html = result.value;

        const placeholderRegex = /\{([#%:\/]?[\w_]+(?:\|[\w]+)?)\}/g;
        html = html.replace(placeholderRegex, (match: string, tagName: string) => {
            const type = tagName.startsWith('#') ? 'loop' :
                         tagName.startsWith('/') ? 'loop-end' :
                         tagName.startsWith(':') ? 'conditional' :
                         tagName.startsWith('%') ? 'image' : 'variable';
            return `<span class="dt-tag dt-tag--${type}" data-tag="${tagName}" data-type="${type}">{${tagName}}</span>`;
        });

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
  document.addEventListener('click', function(e){
    var tag = e.target.closest('.dt-tag');
    if (tag) {
      window.parent.postMessage({ type: 'tag-click', tag: tag.dataset.tag, tagType: tag.dataset.type }, '*');
    }
  });
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
    } catch (error: any) {
        console.error('[Preview] Error:', error.message);
        res.status(500).json({ error: 'No se pudo generar la vista previa', details: error.message });
    }
});

/* ------------------------------------------------------------------ */
/*  PDF Preview — serve filled sample PDFs                            */
/* ------------------------------------------------------------------ */
router.get('/preview-pdf/:filename', async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const sanitizedFilename = path.basename(filename).replace('.docx', '.pdf');
        const pdfPath = path.join(__dirname, '../../templates/docxtemplater/pdf_samples', sanitizedFilename);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ error: 'PDF de muestra no encontrado', file: sanitizedFilename });
        }

        const stat = fs.statSync(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stat.size);
        const stream = fs.createReadStream(pdfPath);
        stream.pipe(res);
        stream.on('error', (err) => {
            console.error('[PreviewPDF] stream error:', err);
            if (!res.headersSent) res.status(500).json({ error: 'Error sirviendo PDF' });
        });
    } catch (error: any) {
        console.error('[PreviewPDF] error:', error.message);
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
});

/* ------------------------------------------------------------------ */
/*  Image Preview — list pages and serve images                       */
/* ------------------------------------------------------------------ */
router.get('/preview-images/:filename', async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const base = path.basename(filename).replace('.docx', '').replace('.pdf', '');
        const imgDir = path.join(__dirname, '../../uploads/preview_images', base);

        if (!fs.existsSync(imgDir)) {
            return res.status(404).json({ error: 'Imágenes no generadas', dir: imgDir });
        }

        const files = fs.readdirSync(imgDir)
            .filter((f: string) => f.endsWith('.png'))
            .sort((a: string, b: string) => {
                const na = parseInt(a.match(/\d+/)?.[0] || '0');
                const nb = parseInt(b.match(/\d+/)?.[0] || '0');
                return na - nb;
            });

        const pages = files.map((f: string, i: number) => ({
            page: i + 1,
            url: `/api/files/preview-image/${encodeURIComponent(base)}/${encodeURIComponent(f)}`,
            filename: f,
        }));

        res.json({ template: base, pages, count: pages.length });
    } catch (error: any) {
        console.error('[PreviewImages] error:', error.message);
        res.status(500).json({ error: 'Error interno', details: error.message });
    }
});

// Serve individual image
router.get('/preview-image/:template/:image', (req: Request, res: Response) => {
    try {
        const { template, image } = req.params;
        const imgPath = path.join(__dirname, '../../uploads/preview_images', path.basename(template), path.basename(image));
        if (!fs.existsSync(imgPath)) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        const stat = fs.statSync(imgPath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', stat.size);
        fs.createReadStream(imgPath).pipe(res);
    } catch (error: any) {
        console.error('[PreviewImage] error:', error.message);
        res.status(500).json({ error: 'Error sirviendo imagen' });
    }
});

export default router;
