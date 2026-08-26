import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';

import routes from './routes';
import { logError } from './utils/errors';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('Paradixe ALS V2 API');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Ultimo recurso: cualquier error que escape de un handler se registra y se responde
// como JSON, en vez de la pagina HTML por defecto de Express o de una peticion colgada.
app.use((err: Error & { status?: number }, req: Request, res: Response, next: NextFunction) => {
    logError(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) return next(err);
    const status = typeof err?.status === 'number' ? err.status : 500;
    const message = status < 500 && err?.message ? err.message : 'Error interno del servidor';
    res.status(status).json({ error: message });
});

export default app;
