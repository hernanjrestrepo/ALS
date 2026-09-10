import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TRASH_RETENTION_DAYS = 90;

// Borra permanentemente cualquier plantilla que lleve mas de 90 dias en la papelera.
// Se ejecuta de forma perezosa en cada lectura de plantillas/papelera, sin necesitar
// infraestructura de cron aparte.
async function sweepExpiredTrash() {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.samplingTemplate.deleteMany({
        where: { deletedAt: { not: null, lt: cutoff } },
    });
}

// Guarda un snapshot del estado ACTUAL de la plantilla como una nueva version
// en el historial, antes de sobreescribirla. Nunca se pierde una version anterior.
async function snapshotVersion(templateId: string) {
    const current = await prisma.samplingTemplate.findUnique({ where: { id: templateId } });
    if (!current) return;

    const lastVersion = await prisma.samplingTemplateVersion.findFirst({
        where: { samplingTemplateId: templateId },
        orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    await prisma.samplingTemplateVersion.create({
        data: {
            samplingTemplateId: templateId,
            versionNumber: nextVersionNumber,
            name: current.name,
            description: current.description,
            oitType: current.oitType,
            steps: current.steps,
            reportTemplateFile: current.reportTemplateFile,
            startMessage: current.startMessage,
        },
    });
}

export const getTemplates = async (req: Request, res: Response) => {
    try {
        await sweepExpiredTrash();
        const templates = await prisma.samplingTemplate.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Error al obtener plantillas' });
    }
};

export const getTrashedTemplates = async (req: Request, res: Response) => {
    try {
        await sweepExpiredTrash();
        const templates = await prisma.samplingTemplate.findMany({
            where: { deletedAt: { not: null } },
            orderBy: { deletedAt: 'desc' }
        });
        const withExpiry = templates.map(t => {
            const deletedAt = t.deletedAt as Date;
            const expiresAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
            const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
            return { ...t, expiresAt, daysRemaining };
        });
        res.json(withExpiry);
    } catch (error) {
        console.error('Error fetching trashed templates:', error);
        res.status(500).json({ error: 'Error al obtener la papelera' });
    }
};

export const getTemplateById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const template = await prisma.samplingTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return res.status(404).json({ error: 'Plantilla no encontrada' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Error al obtener plantilla' });
    }
};

export const getTemplateVersions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const versions = await prisma.samplingTemplateVersion.findMany({
            where: { samplingTemplateId: id },
            orderBy: { versionNumber: 'desc' },
        });
        res.json(versions);
    } catch (error) {
        console.error('Error fetching template versions:', error);
        res.status(500).json({ error: 'Error al obtener el historial de versiones' });
    }
};

export const createTemplate = async (req: Request, res: Response) => {
    try {
        const { name, description, oitType, steps } = req.body;

        const template = await prisma.samplingTemplate.create({
            data: {
                name,
                description,
                oitType,
                steps: JSON.stringify(steps)
            }
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Error al crear plantilla' });
    }
};

export const updateTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, oitType, steps } = req.body;

        // El usuario aprueba el cambio al guardar: se conserva el estado anterior
        // como una version nueva en el historial antes de sobreescribir.
        await snapshotVersion(id);

        const template = await prisma.samplingTemplate.update({
            where: { id },
            data: {
                name,
                description,
                oitType,
                steps: JSON.stringify(steps)
            }
        });

        res.json(template);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Error al actualizar plantilla' });
    }
};

// Envia la plantilla a la papelera (soft-delete). Se conserva 90 dias y se puede
// restaurar; despues de ese plazo, el sweep perezoso la borra definitivamente.
export const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.samplingTemplate.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Plantilla movida a la papelera' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Error al eliminar plantilla' });
    }
};

export const restoreTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const template = await prisma.samplingTemplate.update({
            where: { id },
            data: { deletedAt: null }
        });

        res.json(template);
    } catch (error) {
        console.error('Error restoring template:', error);
        res.status(500).json({ error: 'Error al restaurar plantilla' });
    }
};

// Restaura una version anterior del historial como el estado actual. El estado
// que estaba activo antes de restaurar tambien se guarda como version (nunca se
// pierde nada), asi que esto es siempre reversible.
export const restoreTemplateVersion = async (req: Request, res: Response) => {
    try {
        const { id, versionId } = req.params;

        const version = await prisma.samplingTemplateVersion.findUnique({ where: { id: versionId } });
        if (!version || version.samplingTemplateId !== id) {
            return res.status(404).json({ error: 'Version no encontrada' });
        }

        await snapshotVersion(id);

        const template = await prisma.samplingTemplate.update({
            where: { id },
            data: {
                name: version.name,
                description: version.description,
                oitType: version.oitType,
                steps: version.steps,
                reportTemplateFile: version.reportTemplateFile,
                startMessage: version.startMessage,
            },
        });

        res.json(template);
    } catch (error) {
        console.error('Error restoring template version:', error);
        res.status(500).json({ error: 'Error al restaurar la version' });
    }
};

// Plantilla de campo en blanco (punto 8 del blueprint): un PDF imprimible con
// los mismos pasos/campos de la plantilla digital, para que el equipo de campo
// la lleve impresa cuando no hay señal o prefiere registrar en papel.
export const getFieldTemplatePdf = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const template = await prisma.samplingTemplate.findUnique({ where: { id } });
        if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });

        let steps: any[] = [];
        try {
            steps = JSON.parse(template.steps);
            if (!Array.isArray(steps)) steps = [];
        } catch (e) {
            steps = [];
        }
        steps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const stepsHtml = steps.map((s: any) => `
            <div class="field">
                <div class="field-title">${s.title || ''}${s.required ? ' *' : ''}</div>
                ${s.description ? `<div class="field-desc">${s.description}</div>` : ''}
                <div class="field-line"></div>
            </div>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; }
                    .header { border-bottom: 3px solid #004CAB; padding-bottom: 16px; margin-bottom: 24px; }
                    .header h1 { color: #004CAB; font-size: 20px; margin: 0 0 4px; }
                    .header p { color: #64748b; font-size: 13px; margin: 0; }
                    .field { margin-bottom: 22px; page-break-inside: avoid; }
                    .field-title { font-weight: 600; font-size: 14px; color: #0f172a; }
                    .field-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
                    .field-line { border-bottom: 1px solid #94a3b8; height: 28px; margin-top: 6px; }
                    .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ALS XMART — Plantilla de Campo</h1>
                    <p>${template.name}${template.oitType ? ` · ${template.oitType}` : ''}</p>
                </div>
                ${stepsHtml || '<p>Esta plantilla no tiene pasos configurados.</p>'}
                <div class="footer">Generado desde ALS Xmart · para captura manual en sitio</div>
            </body>
            </html>
        `;

        const { pdfService } = require('../services/pdf.service');
        const safeName = template.name.replace(/[^a-zA-Z0-9]/g, '_');
        const pdfPath = await pdfService.generatePDFFromHTML(html, `Plantilla_Campo_${safeName}_${Date.now()}.pdf`);

        res.download(pdfPath, `Plantilla_Campo_${safeName}.pdf`);
    } catch (error) {
        console.error('Error generating field template PDF:', error);
        res.status(500).json({ error: 'Error al generar la plantilla de campo' });
    }
};
