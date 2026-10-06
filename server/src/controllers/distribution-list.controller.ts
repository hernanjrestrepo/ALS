import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Recipient {
    name: string;
    email: string;
    required: boolean;
}

export function parseRecipients(raw: unknown): Recipient[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((r: any) => r && typeof r.email === 'string' && r.email.trim())
        .map((r: any) => ({
            name: String(r.name || '').trim(),
            email: String(r.email).trim(),
            required: r.required !== false,
        }));
}

export const getAllDistributionLists = async (req: Request, res: Response) => {
    try {
        const lists = await prisma.distributionList.findMany({ orderBy: { name: 'asc' } });
        res.status(200).json(lists.map(l => ({ ...l, recipients: JSON.parse(l.recipients || '[]') })));
    } catch (error) {
        console.error('Error fetching distribution lists:', error);
        res.status(500).json({ message: 'Error al obtener las listas de distribución' });
    }
};

export const getDistributionListById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const list = await prisma.distributionList.findUnique({ where: { id } });
        if (!list) {
            return res.status(404).json({ message: 'Lista de distribución no encontrada' });
        }
        res.status(200).json({ ...list, recipients: JSON.parse(list.recipients || '[]') });
    } catch (error) {
        console.error('Error fetching distribution list:', error);
        res.status(500).json({ message: 'Error al obtener la lista de distribución' });
    }
};

export const createDistributionList = async (req: Request, res: Response) => {
    try {
        const { name, purpose, clientId, notes } = req.body;
        if (!name || !purpose) {
            return res.status(400).json({ message: 'El nombre y el propósito (factura, informes, etc.) son obligatorios' });
        }
        const recipients = parseRecipients(req.body.recipients);
        if (recipients.length === 0) {
            return res.status(400).json({ message: 'Agrega al menos un destinatario con correo' });
        }

        const list = await prisma.distributionList.create({
            data: {
                name,
                purpose,
                clientId: clientId || undefined,
                notes: notes || undefined,
                recipients: JSON.stringify(recipients),
            },
        });
        res.status(201).json({ ...list, recipients });
    } catch (error) {
        console.error('Error creating distribution list:', error);
        res.status(500).json({ message: 'Error al crear la lista de distribución' });
    }
};

export const updateDistributionList = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, purpose, clientId, notes } = req.body;

        const data: any = { name, purpose, clientId: clientId || null, notes: notes || null };
        if (req.body.recipients !== undefined) {
            const recipients = parseRecipients(req.body.recipients);
            if (recipients.length === 0) {
                return res.status(400).json({ message: 'La lista debe tener al menos un destinatario con correo' });
            }
            data.recipients = JSON.stringify(recipients);
        }

        const list = await prisma.distributionList.update({ where: { id }, data });
        res.status(200).json({ ...list, recipients: JSON.parse(list.recipients || '[]') });
    } catch (error) {
        console.error('Error updating distribution list:', error);
        res.status(500).json({ message: 'Error al actualizar la lista de distribución' });
    }
};

export const deleteDistributionList = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.distributionList.delete({ where: { id } });
        res.status(200).json({ message: 'Lista de distribución eliminada exitosamente' });
    } catch (error) {
        console.error('Error deleting distribution list:', error);
        res.status(500).json({ message: 'Error al eliminar la lista de distribución' });
    }
};
