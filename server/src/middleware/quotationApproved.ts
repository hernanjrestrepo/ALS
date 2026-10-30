import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Reunion del 30-oct: una OIT cuya cotizacion tiene hallazgos sin resolver no puede programarse
// (fechas, ingenieros, recursos, plan) para evitar errores y reprocesos en operaciones.
// Las OIT sin cotizacion vinculada no se bloquean.
export async function requireQuotationApproved(req: Request, res: Response, next: NextFunction) {
    try {
        const oit = await prisma.oIT.findUnique({
            where: { id: req.params.id },
            select: { quotation: { select: { quotationNumber: true, approvedForOit: true } } },
        });
        const q = oit?.quotation;
        if (q && !q.approvedForOit) {
            return res.status(409).json({
                error: `La cotización ${q.quotationNumber} tiene hallazgos sin resolver contra la norma. Debe quedar aprobada antes de programar esta OIT.`,
                quotationNumber: q.quotationNumber,
            });
        }
        next();
    } catch (error) {
        console.error('Error verificando la cotización de la OIT:', error);
        res.status(500).json({ error: 'No se pudo verificar la cotización de la OIT' });
    }
}
