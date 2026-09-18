import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllServices = async (req: Request, res: Response) => {
    try {
        const services = await prisma.service.findMany({
            orderBy: { name: 'asc' },
        });
        res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ message: 'Error al obtener servicios' });
    }
};

export const getServiceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const service = await prisma.service.findUnique({ where: { id } });
        if (!service) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }
        res.status(200).json(service);
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ message: 'Error al obtener servicio' });
    }
};

export const createService = async (req: Request, res: Response) => {
    try {
        const { name, description, oitType } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'El nombre del servicio es obligatorio' });
        }
        const service = await prisma.service.create({
            data: { name, description, oitType },
        });
        res.status(201).json(service);
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ message: 'Error al crear servicio' });
    }
};

export const updateService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, oitType, active } = req.body;
        const service = await prisma.service.update({
            where: { id },
            data: { name, description, oitType, active },
        });
        res.status(200).json(service);
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ message: 'Error al actualizar servicio' });
    }
};

export const deleteService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const withQuotations = await prisma.quotation.count({ where: { serviceId: id } });
        if (withQuotations > 0) {
            return res.status(400).json({ message: `No se puede eliminar: tiene ${withQuotations} cotización(es) asociada(s)` });
        }
        await prisma.service.delete({ where: { id } });
        res.status(200).json({ message: 'Servicio eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: 'Error al eliminar servicio' });
    }
};
