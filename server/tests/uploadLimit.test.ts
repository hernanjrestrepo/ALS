// Subida real por HTTP con la configuracion de multer de la app: un documento de mas de
// 10 MB (lo que fallo el 2026-10-23 con 500 "File too large") ahora entra, y uno de mas
// de 100 MB recibe 413 con mensaje claro.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import type { AddressInfo } from 'net';
import { upload, MAX_UPLOAD_MB } from '../src/config/multer';
import { httpErrorFor } from '../src/utils/errors';

let server: any;
let base = '';
const saved: string[] = [];

beforeAll(async () => {
    const app = express();
    app.post('/up', upload.array('images', 6), (req, res) => {
        const files = (req.files as Express.Multer.File[]) || [];
        files.forEach(f => saved.push(f.path));
        res.json({ count: files.length, size: files[0]?.size });
    });
    app.use((err: any, _req: any, res: any, _next: any) => {
        const { status, message } = httpErrorFor(err, MAX_UPLOAD_MB);
        res.status(status).json({ error: message });
    });
    await new Promise<void>(r => { server = app.listen(0, '127.0.0.1', () => r()); });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
    server?.close();
    for (const p of saved) fs.rmSync(p, { force: true });
    // archivos parciales de la prueba de 101 MB
    const dir = path.join(__dirname, '../uploads');
    for (const f of fs.readdirSync(dir)) if (f.startsWith('images-') && f.endsWith('.pdf')) {
        const full = path.join(dir, f);
        if (fs.statSync(full).size > 10 * 1024 * 1024) fs.rmSync(full, { force: true });
    }
});

const send = async (bytes: number) => {
    const form = new FormData();
    form.append('images', new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'planilla.pdf');
    const r = await fetch(`${base}/up`, { method: 'POST', body: form });
    return { status: r.status, body: await r.json() };
};

describe('limite de subida', () => {
    it('un documento de 12 MB entra (antes fallaba con 500)', async () => {
        const r = await send(12 * 1024 * 1024);
        expect(r.status).toBe(200);
        expect(r.body.count).toBe(1);
        expect(r.body.size).toBe(12 * 1024 * 1024);
    }, 60_000);

    it('uno de mas de 100 MB recibe 413 con el motivo', async () => {
        const r = await send(101 * 1024 * 1024);
        expect(r.status).toBe(413);
        expect(r.body.error).toBe('El archivo supera el tamaño máximo de 100 MB.');
    }, 120_000);
});
