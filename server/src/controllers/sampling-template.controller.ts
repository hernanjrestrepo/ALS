import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { handleError } from '../utils/http';


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
    } catch (error: any) {
        handleError(res, error, 'Error al obtener plantillas', { status: 500, response: { error: 'Error al obtener plantillas' }, log: () => console.error('Error fetching templates:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al obtener la papelera', { status: 500, response: { error: 'Error al obtener la papelera' }, log: () => console.error('Error fetching trashed templates:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al obtener plantilla', { status: 500, response: { error: 'Error al obtener plantilla' }, log: () => console.error('Error fetching template:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al obtener el historial de versiones', { status: 500, response: { error: 'Error al obtener el historial de versiones' }, log: () => console.error('Error fetching template versions:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al crear plantilla', { status: 500, response: { error: 'Error al crear plantilla' }, log: () => console.error('Error creating template:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al actualizar plantilla', { status: 500, response: { error: 'Error al actualizar plantilla' }, log: () => console.error('Error updating template:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al eliminar plantilla', { status: 500, response: { error: 'Error al eliminar plantilla' }, log: () => console.error('Error deleting template:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al restaurar plantilla', { status: 500, response: { error: 'Error al restaurar plantilla' }, log: () => console.error('Error restoring template:', error) });
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
    } catch (error: any) {
        handleError(res, error, 'Error al restaurar la version', { status: 500, response: { error: 'Error al restaurar la version' }, log: () => console.error('Error restoring template version:', error) });
    }
};
