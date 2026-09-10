import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createNotification } from './notification.controller';
import { logError } from '../utils/errors';

const prisma = new PrismaClient();

const SEVERITIES = ['MENOR', 'MAYOR', 'CRITICA'];
const STATUSES = ['ABIERTA', 'EN_TRATAMIENTO', 'CERRADA'];

export const getNonConformitiesForOit = async (req: Request, res: Response) => {
    try {
        const oitId = req.params.id;
        const items = await prisma.nonConformity.findMany({
            where: { oitId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(items);
    } catch (error) {
        logError('Error fetching non-conformities', error);
        res.status(500).json({ error: 'Error al obtener no conformidades' });
    }
};

export const createNonConformity = async (req: Request, res: Response) => {
    try {
        const oitId = req.params.id;
        const { title, description, severity, detectedBy } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Título y descripción son obligatorios' });
        }
        if (severity && !SEVERITIES.includes(severity)) {
            return res.status(400).json({ error: 'Severidad inválida', validValues: SEVERITIES });
        }

        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });
        if (!oit) return res.status(404).json({ error: 'OIT no encontrada' });

        const item = await prisma.nonConformity.create({
            data: {
                oitId,
                title,
                description,
                severity: severity || 'MENOR',
                detectedBy: detectedBy || undefined,
            }
        });

        const userId = (req as any).user?.userId;
        if (userId) {
            await createNotification(userId, `No conformidad: ${oit.oitNumber}`, `Se registró "${title}"`, 'WARNING', oitId);
        }

        res.status(201).json(item);
    } catch (error) {
        logError('Error creating non-conformity', error);
        res.status(500).json({ error: 'Error al crear no conformidad' });
    }
};

export const updateNonConformity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, severity, status, resolution } = req.body;

        if (severity !== undefined && !SEVERITIES.includes(severity)) {
            return res.status(400).json({ error: 'Severidad inválida', validValues: SEVERITIES });
        }
        if (status !== undefined && !STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido', validValues: STATUSES });
        }

        const existing = await prisma.nonConformity.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'No conformidad no encontrada' });

        const data: any = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (severity !== undefined) data.severity = severity;
        if (resolution !== undefined) data.resolution = resolution;
        if (status !== undefined) {
            data.status = status;
            if (status === 'CERRADA' && existing.status !== 'CERRADA') {
                data.closedAt = new Date();
                if (!resolution && !existing.resolution) {
                    return res.status(400).json({ error: 'Para cerrar una no conformidad se requiere describir la resolución' });
                }
            }
            if (status !== 'CERRADA') {
                data.closedAt = null;
            }
        }

        const item = await prisma.nonConformity.update({ where: { id }, data });
        res.json(item);
    } catch (error) {
        logError('Error updating non-conformity', error);
        res.status(500).json({ error: 'Error al actualizar no conformidad' });
    }
};

export const deleteNonConformity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.nonConformity.delete({ where: { id } });
        res.json({ message: 'No conformidad eliminada' });
    } catch (error) {
        logError('Error deleting non-conformity', error);
        res.status(500).json({ error: 'Error al eliminar no conformidad' });
    }
};
