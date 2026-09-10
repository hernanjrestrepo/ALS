import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { logError } from '../utils/errors';

const prisma = new PrismaClient();

const SIGNER_ROLES = ['ALS', 'CLIENTE'];
const MAX_SIGNATURE_DATA_URL_LENGTH = 2_000_000; // ~1.5MB de imagen en base64, suficiente para una firma

export const getSignaturesForOit = async (req: Request, res: Response) => {
    try {
        const oitId = req.params.id;
        const items = await prisma.signature.findMany({ where: { oitId }, orderBy: { createdAt: 'desc' } });
        res.json(items);
    } catch (error) {
        logError('Error fetching signatures', error);
        res.status(500).json({ error: 'Error al obtener firmas' });
    }
};

// Firma capturada en pantalla (canvas -> PNG en base64)
export const createSignature = async (req: Request, res: Response) => {
    try {
        const oitId = req.params.id;
        const { signerName, signerRole, signatureData } = req.body;

        if (!signerName || !signerRole || !signatureData) {
            return res.status(400).json({ error: 'Se requiere nombre del firmante, rol, y la firma capturada' });
        }
        if (!SIGNER_ROLES.includes(signerRole)) {
            return res.status(400).json({ error: 'Rol de firmante inválido', validValues: SIGNER_ROLES });
        }
        if (typeof signatureData !== 'string' || !signatureData.startsWith('data:image/') || signatureData.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
            return res.status(400).json({ error: 'Firma inválida' });
        }

        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });
        if (!oit) return res.status(404).json({ error: 'OIT no encontrada' });

        const item = await prisma.signature.create({
            data: { oitId, signerName, signerRole, signatureData }
        });

        res.status(201).json(item);
    } catch (error) {
        logError('Error creating signature', error);
        res.status(500).json({ error: 'Error al guardar la firma' });
    }
};

// Alternativa: subir un documento ya firmado como respaldo
export const uploadSignedDocument = async (req: Request, res: Response) => {
    try {
        const oitId = req.params.id;
        const { signerName, signerRole } = req.body;
        const file = req.file;

        if (!signerName || !signerRole) {
            return res.status(400).json({ error: 'Se requiere nombre del firmante y rol' });
        }
        if (!SIGNER_ROLES.includes(signerRole)) {
            return res.status(400).json({ error: 'Rol de firmante inválido', validValues: SIGNER_ROLES });
        }
        if (!file) {
            return res.status(400).json({ error: 'Se requiere el documento firmado' });
        }

        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });
        if (!oit) return res.status(404).json({ error: 'OIT no encontrada' });

        const item = await prisma.signature.create({
            data: { oitId, signerName, signerRole, documentUrl: `/uploads/${file.filename}` }
        });

        res.status(201).json(item);
    } catch (error) {
        logError('Error uploading signed document', error);
        res.status(500).json({ error: 'Error al subir el documento firmado' });
    }
};

export const deleteSignature = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const existing = await prisma.signature.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Firma no encontrada' });

        if (existing.documentUrl) {
            const filePath = path.join(__dirname, '../../', existing.documentUrl);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { logError('No se pudo borrar el archivo de firma', e); }
            }
        }

        await prisma.signature.delete({ where: { id } });
        res.json({ message: 'Firma eliminada' });
    } catch (error) {
        logError('Error deleting signature', error);
        res.status(500).json({ error: 'Error al eliminar firma' });
    }
};
