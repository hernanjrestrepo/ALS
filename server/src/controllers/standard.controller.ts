import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { pdfService } from '../services/pdf.service';
import { logError } from '../utils/errors';

const prisma = new PrismaClient();

// Extrae el texto del PDF subido para que quede disponible como "content" -
// antes esto nunca se hacia en create/update, solo en la carga manual unica
// de enero-2026, asi que toda norma nueva quedaba con content vacio y nunca
// se podia usar para el analisis de cumplimiento (hallazgo 2026-10-05).
async function extractStandardContent(filename: string): Promise<string | undefined> {
    try {
        const filePath = path.join(__dirname, '../../uploads', filename);
        const text = await pdfService.extractText(filePath);
        // Mismo limite que uso la carga inicial de enero-2026 (import-standards.ts)
        return text && text.trim().length > 0 ? text.substring(0, 100000) : undefined;
    } catch (error) {
        logError(`No se pudo extraer contenido del PDF de norma (${filename})`, error);
        return undefined;
    }
}

export const getStandards = async (req: Request, res: Response) => {
    try {
        const standards = await prisma.standard.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(standards);
    } catch (error) {
        console.error('Error fetching standards:', error);
        res.status(500).json({ error: 'Error al obtener normas' });
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
        console.error('Error fetching standard:', error);
        res.status(500).json({ error: 'Error al obtener norma' });
    }
};

export const createStandard = async (req: Request, res: Response) => {
    try {
        const { title, description, type } = req.body;
        const file = req.file;

        const data: any = {
            title,
            description,
            type,
            // Ruta web-relativa, no la ruta absoluta del disco del servidor (ese era
            // el bug que rompia toda descarga de Normas desde enero-2026).
            fileUrl: file ? `/uploads/${file.filename}` : undefined
        };

        if (file) {
            data.content = await extractStandardContent(file.filename);
        }

        const standard = await prisma.standard.create({ data });
        res.status(201).json(standard);
    } catch (error) {
        console.error('Error creating standard:', error);
        res.status(500).json({ error: 'Error al crear norma' });
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
            data.fileUrl = `/uploads/${file.filename}`;
            data.content = await extractStandardContent(file.filename);
        }

        const standard = await prisma.standard.update({
            where: { id },
            data
        });
        res.json(standard);
    } catch (error) {
        console.error('Error updating standard:', error);
        res.status(500).json({ error: 'Error al actualizar norma' });
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
        console.error('Error deleting standard:', error);
        res.status(500).json({ error: 'Error al eliminar norma' });
    }
};
