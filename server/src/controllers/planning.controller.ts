import { Request, Response } from 'express';
import planningService from '../services/planning.service';
import { handleError } from '../utils/http';

export const generatePlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const proposal = await planningService.generateProposal(id);
        res.json(proposal);
    } catch (error: any) {
        handleError(res, error, 'Error al generar planeación', { status: 500, response: { error: 'Error al generar planeación' }, log: () => console.error('Error generating planning:', error) });
    }
};

export const acceptPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.acceptProposal(id);
        res.json({ message: 'Planeación aceptada' });
    } catch (error: any) {
        handleError(res, error, 'Error al aceptar planeación', { status: 500, response: { error: 'Error al aceptar planeación' }, log: () => console.error('Error accepting planning:', error) });
    }
};

export const rejectPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.rejectProposal(id);
        res.json({ message: 'Planeación rechazada' });
    } catch (error: any) {
        handleError(res, error, 'Error al rechazar planeación', { status: 500, response: { error: 'Error al rechazar planeación' }, log: () => console.error('Error rejecting planning:', error) });
    }
};
