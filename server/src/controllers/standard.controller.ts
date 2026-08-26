import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { handleError } from '../utils/http';


export const getStandards = async (req: Request, res: Response) => {
    try {
        const standards = await prisma.standard.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(standards);
    } catch (error) {
        handleError(res, error, 'Error al obtener normas', { logLabel: 'Error fetching standards:' });
    }
};

export const getStandard = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const standard = await prisma.standard.findUnique({
            where: { id }
        });

        if (!standard) {
            return res.status(404).json({ error: 'Norma no encontrada' });
        }

        res.json(standard);
    } catch (error) {
        handleError(res, error, 'Error al obtener norma', { logLabel: 'Error fetching standard:' });
    }
};

export const createStandard = async (req: Request, res: Response) => {
    try {
        const { title, description, type } = req.body;
        const file = req.file;

        const standard = await prisma.standard.create({
            data: {
                title,
                description,
                type,
                fileUrl: file ? file.path : undefined
            }
        });
        res.status(201).json(standard);
    } catch (error) {
        handleError(res, error, 'Error al crear norma', { logLabel: 'Error creating standard:' });
    }
};

export const updateStandard = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, type } = req.body;
        const file = req.file;

        const data: any = {
            title,
            description,
            type
        };

        if (file) {
            data.fileUrl = file.path;
        }

        const standard = await prisma.standard.update({
            where: { id },
            data
        });
        res.json(standard);
    } catch (error) {
        handleError(res, error, 'Error al actualizar norma', { logLabel: 'Error updating standard:' });
    }
};

export const deleteStandard = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.standard.delete({
            where: { id }
        });
        res.json({ message: 'Norma eliminada' });
    } catch (error) {
        handleError(res, error, 'Error al eliminar norma', { logLabel: 'Error deleting standard:' });
    }
};
