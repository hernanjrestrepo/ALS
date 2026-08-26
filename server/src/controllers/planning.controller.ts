import { Request, Response } from 'express';
import planningService from '../services/planning.service';
import { handleError } from '../utils/http';

export const generatePlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const proposal = await planningService.generateProposal(id);
        res.json(proposal);
    } catch (error) {
        handleError(res, error, 'Error al generar planeación', { logLabel: 'Error generating planning:' });
    }
};

export const acceptPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.acceptProposal(id);
        res.json({ message: 'Planeación aceptada' });
    } catch (error) {
        handleError(res, error, 'Error al aceptar planeación', { logLabel: 'Error accepting planning:' });
    }
};

export const rejectPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.rejectProposal(id);
        res.json({ message: 'Planeación rechazada' });
    } catch (error) {
        handleError(res, error, 'Error al rechazar planeación', { logLabel: 'Error rejecting planning:' });
    }
};
