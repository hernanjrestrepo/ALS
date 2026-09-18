import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllClients = async (req: Request, res: Response) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { name: 'asc' },
        });
        res.status(200).json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
};

export const getClientById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const client = await prisma.client.findUnique({
            where: { id },
            include: { quotations: { orderBy: { createdAt: 'desc' } } },
        });
        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.status(200).json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ message: 'Error al obtener cliente' });
    }
};

export const createClient = async (req: Request, res: Response) => {
    try {
        const { name, nit, contactName, contactEmail, contactPhone, address, notes } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'El nombre del cliente es obligatorio' });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const contractorManualUrl = files?.contractorManual?.[0] ? `/uploads/${files.contractorManual[0].filename}` : undefined;
        const proceduresUrl = files?.procedures?.[0] ? `/uploads/${files.procedures[0].filename}` : undefined;
        const policiesUrl = files?.policies?.[0] ? `/uploads/${files.policies[0].filename}` : undefined;

        const client = await prisma.client.create({
            data: {
                name, nit: nit || undefined, contactName, contactEmail, contactPhone, address, notes,
                contractorManualUrl, proceduresUrl, policiesUrl,
            },
        });
        res.status(201).json(client);
    } catch (error: any) {
        console.error('Error creating client:', error);
        if (error?.code === 'P2002') {
            return res.status(400).json({ message: 'Ya existe un cliente con ese NIT' });
        }
        res.status(500).json({ message: 'Error al crear cliente' });
    }
};

export const updateClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, nit, contactName, contactEmail, contactPhone, address, notes } = req.body;

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const data: any = { name, nit: nit || undefined, contactName, contactEmail, contactPhone, address, notes };
        if (files?.contractorManual?.[0]) data.contractorManualUrl = `/uploads/${files.contractorManual[0].filename}`;
        if (files?.procedures?.[0]) data.proceduresUrl = `/uploads/${files.procedures[0].filename}`;
        if (files?.policies?.[0]) data.policiesUrl = `/uploads/${files.policies[0].filename}`;

        const client = await prisma.client.update({ where: { id }, data });
        res.status(200).json(client);
    } catch (error: any) {
        console.error('Error updating client:', error);
        if (error?.code === 'P2002') {
            return res.status(400).json({ message: 'Ya existe un cliente con ese NIT' });
        }
        res.status(500).json({ message: 'Error al actualizar cliente' });
    }
};

export const deleteClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const withQuotations = await prisma.quotation.count({ where: { clientId: id } });
        if (withQuotations > 0) {
            return res.status(400).json({ message: `No se puede eliminar: tiene ${withQuotations} cotización(es) asociada(s)` });
        }
        await prisma.client.delete({ where: { id } });
        res.status(200).json({ message: 'Cliente eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Error al eliminar cliente' });
    }
};
