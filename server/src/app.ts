import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';

import routes from './routes';
import { getAllowedOrigins } from './config/env';

dotenv.config();

const app = express();

const allowedOrigins = getAllowedOrigins();

app.use(cors({
    origin: (origin, callback) => {
        // Requests without an Origin header (curl, server-to-server, same-origin
        // navigations) are not subject to the browser same-origin policy.
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Do not echo back unknown origins: the response simply carries no
        // CORS headers and the browser blocks the cross-origin read.
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('Paradixe ALS V2 API');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

export default app;
