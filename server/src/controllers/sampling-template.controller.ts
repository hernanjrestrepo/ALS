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
