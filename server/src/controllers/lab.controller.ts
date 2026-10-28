import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createNotification } from './notification.controller';
import { pdfService } from '../services/pdf.service';
import { logError } from '../utils/errors';
import { filesForService, missingParameters, parseGrouped, serviceStatuses, servicesOf, needsLabResult } from '../services/labTracking';

const prisma = new PrismaClient();

const LAB_SELECT = {
    id: true, oitNumber: true, status: true, clientName: true, description: true, createdAt: true, updatedAt: true,
    aiData: true, labResultsUrl: true, labResultsAnalysis: true, labFileSource: true, labComplete: true, quotationId: true,
} as const;

// Panel de laboratorio: por OIT, que servicios tienen resultados, de quien son y cuales
// faltan por cargar o por marcar como completos.
export const labOverview = async (_req: Request, res: Response) => {
    try {
        const since = new Date(Date.now() - 120 * 24 * 3600 * 1000);
        const oits = await prisma.oIT.findMany({ where: { createdAt: { gte: since }, aiData: { not: null } }, select: LAB_SELECT, orderBy: { createdAt: 'desc' }, take: 400 });
        const rows = oits
            .map(o => ({ o, services: serviceStatuses(o) }))
            .filter(r => r.services.length)
            .map(({ o, services }) => {
                const done = services.filter(s => s.state === 'COMPLETO').length;
                const withFiles = services.filter(s => s.files.length).length;
                return {
                    id: o.id, oitNumber: o.oitNumber, clientName: o.clientName, status: o.status, createdAt: o.createdAt,
                    services, summary: { total: services.length, completos: done, conResultados: withFiles, pendientes: services.length - done },
                    estado: done === services.length ? 'COMPLETO' : withFiles ? 'PARCIAL' : 'SIN_RESULTADOS',
                };
            });
        const count = (e: string) => rows.filter(r => r.estado === e).length;
        res.json({
            totals: { oit: rows.length, sinResultados: count('SIN_RESULTADOS'), parciales: count('PARCIAL'), completas: count('COMPLETO') },
            rows,
        });
    } catch (error) {
        logError('Error en el panel de laboratorio', error);
        res.status(500).json({ error: 'Error al cargar el panel de laboratorio' });
    }
};

// Estado de laboratorio de UNA OIT (la pestana Informe lo muestra por servicio).
export const labStatusForOit = async (req: Request, res: Response) => {
    try {
        const oit = await prisma.oIT.findUnique({ where: { id: req.params.id }, select: LAB_SELECT });
        if (!oit) return res.status(404).json({ error: 'OIT no encontrada' });
        res.json({ services: serviceStatuses(oit) });
    } catch (error) {
        logError(`Error leyendo el estado de laboratorio de la OIT ${req.params.id}`, error);
        res.status(500).json({ error: 'Error al leer el estado de laboratorio' });
    }
};

async function resultsText(files: string[]): Promise<string> {
    let text = '';
    for (const f of files) {
        const p = path.join(__dirname, '../../', f);
        if (!fs.existsSync(p)) continue;
        try { text += '\n' + (f.endsWith('.pdf') ? await pdfService.extractText(p) : fs.readFileSync(p, 'utf-8')); } catch { /* archivo ilegible */ }
    }
    return text;
}

// Parametros cotizados para la OIT (cotizacion vinculada).
async function quotedParameters(quotationId: string | null): Promise<string[]> {
    if (!quotationId) return [];
    const q = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { complianceResult: true } });
    try {
        const checks: any[] = JSON.parse(q?.complianceResult || '{}')?.parameterChecks || [];
        return checks.filter(c => c.quotedAs && !(c.problems || []).some((p: any) => p.type === 'FALTANTE')).map(c => String(c.quotedAs));
    } catch { return []; }
}

// Laboratorio marca (o desmarca) "cargue completo" de un servicio. Al marcarlo se compara lo
// cotizado contra lo recibido y se reportan las discrepancias (reunion del 27-oct).
export const labComplete = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { group, complete = true } = req.body || {};
        if (!group || typeof group !== 'string') return res.status(400).json({ error: 'Falta el servicio' });
        const oit = await prisma.oIT.findUnique({ where: { id }, select: LAB_SELECT });
        if (!oit) return res.status(404).json({ error: 'OIT no encontrada' });
        const svc = serviceStatuses(oit).find(s => s.key === group);
        if (!svc) return res.status(404).json({ error: 'Ese servicio no está en la OIT' });

        const completeMap: Record<string, any> = parseGrouped(oit.labComplete);
        const user = (req as any).user;
        let missing: string[] = [];
        if (complete) {
            if (!svc.files.length) return res.status(400).json({ error: 'Carga al menos un resultado antes de marcar el cargue completo.' });
            missing = missingParameters(await quotedParameters(oit.quotationId), await resultsText(svc.files.map(f => f.file)));
            const by = user?.userId ? (await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } }))?.name : undefined;
            completeMap[group] = { at: new Date().toISOString(), by: by || 'Laboratorio', missing };
        } else {
            delete completeMap[group];
        }

        const after = serviceStatuses({ ...oit, labComplete: JSON.stringify(completeMap) });
        const allDone = after.length > 0 && after.every(s => s.state === 'COMPLETO');
        await prisma.oIT.update({ where: { id }, data: { labComplete: JSON.stringify(completeMap), ...(allDone && oit.status !== 'COMPLETED' ? { status: 'COMPLETED' } : {}) } });

        if (complete && missing.length) await notifyDiscrepancy(oit, group, missing);
        res.json({ ok: true, complete: !!complete, missing, allServicesComplete: allDone });
    } catch (error) {
        logError(`Error marcando cargue completo de la OIT ${req.params.id}`, error);
        res.status(500).json({ error: 'No se pudo registrar el cargue completo' });
    }
};

async function notifyDiscrepancy(oit: { id: string; oitNumber: string }, group: string, missing: string[]) {
    const recipients = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'LAB'] }, isActive: true }, select: { id: true } });
    const message = `${group}: cotizados y sin resultado → ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ` y ${missing.length - 8} más` : ''}`.slice(0, 400);
    for (const r of recipients) await createNotification(r.id, `Discrepancia de laboratorio — OIT ${oit.oitNumber}`, message, 'WARNING', oit.id);
}

// Resumen diario para laboratorio: que esta abierto y que espera resultados.
export async function dailyLabDigest() {
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000);
    const oits = await prisma.oIT.findMany({ where: { createdAt: { gte: since }, aiData: { not: null } }, select: LAB_SELECT, orderBy: { createdAt: 'desc' }, take: 300 });
    const open = oits.map(o => ({ o, s: serviceStatuses(o) })).filter(r => r.s.length && r.s.some(x => x.state !== 'COMPLETO'));
    const sin = open.filter(r => r.s.every(x => x.state === 'SIN_RESULTADOS'));
    if (!open.length) return 0;
    const lines = [
        `${open.length} OIT abiertas en laboratorio; ${sin.length} sin ningún resultado.`,
        ...open.slice(0, 6).map(({ o, s }) => `OIT ${o.oitNumber}: ${s.filter(x => x.state !== 'COMPLETO').map(x => `${x.name} (${x.state === 'SIN_RESULTADOS' ? 'sin resultados' : 'falta cargue completo'})`).join('; ')}`),
    ];
    const recipients = await prisma.user.findMany({ where: { role: { in: ['LAB', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true }, select: { id: true } });
    for (const r of recipients) await createNotification(r.id, 'Pendientes de laboratorio', lines.join('\n').slice(0, 900), 'INFO');
    return recipients.length;
}

export { servicesOf, needsLabResult, filesForService };
