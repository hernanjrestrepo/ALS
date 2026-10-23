import { Request, Response } from 'express';
import { sheetReaderEnabled, SheetField } from '../services/sheetReader';
import { readFieldsFromFiles } from '../services/sheetFill';
import { logError } from '../utils/errors';

// Estado de la lectura de planillas por foto (la pantalla muestra el boton solo si esta activa).
export const sheetReaderStatus = (_req: Request, res: Response) => {
    res.json({ enabled: sheetReaderEnabled() });
};

// Foto(s) de la planilla de campo -> valores para los campos del formulario. Las fotos
// quedan guardadas como evidencia (se devuelven sus nombres de archivo).
export const readSheet = async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    try {
        if (!files.length) return res.status(400).json({ error: 'Falta la foto o el archivo de la planilla' });
        let fields: SheetField[] = [];
        try { fields = JSON.parse(String(req.body?.fields || '[]')); } catch { /* se valida abajo */ }
        fields = (Array.isArray(fields) ? fields : [])
            .filter(f => f && typeof f.key === 'string' && typeof f.label === 'string')
            .slice(0, 60)
            .map(f => ({ key: f.key.slice(0, 40), label: f.label.slice(0, 120), unit: f.unit ? String(f.unit).slice(0, 20) : undefined, hint: f.hint ? String(f.hint).slice(0, 120) : undefined }));
        if (!fields.length) return res.status(400).json({ error: 'No hay campos para llenar' });

        // Cualquier archivo: fotos y PDF escaneados por vision; Word/PDF/Excel por texto.
        const started = Date.now();
        const { values, sources, doubts } = await readFieldsFromFiles(files.map(f => ({ path: f.path, name: f.originalname })), fields);
        console.log(`[Planilla] OIT ${req.params.id}: ${Object.keys(values).length} de ${fields.length} campos leídos en ${((Date.now() - started) / 1000).toFixed(1)} s (${sources.map(s => `${s.name}:${s.via}`).join(', ')})`);
        // fileNames: nombre original de cada archivo, para verlo y quitarlo en el formulario.
        res.json({ values, files: files.map(f => f.filename), fileNames: files.map(f => f.originalname), sources, doubts });
    } catch (error: any) {
        logError(`OIT ${req.params.id}: no se pudo leer la planilla`, error);
        res.status(error?.status || 500).json({ error: error?.status === 503 ? error.message : 'No se pudo leer la planilla. Intenta con una foto más clara o diligencia a mano.' });
    }
};
