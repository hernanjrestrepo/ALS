import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createNotification } from '../controllers/notification.controller';
import { pdfService } from './pdf.service';
import { missingParameters, parseGrouped, serviceStatuses } from './labTracking';
import { sendSimpleEmail } from './email.service';
import { logError, logWarning } from '../utils/errors';

const prisma = new PrismaClient();

// Seguimiento automatico del laboratorio (reunion del 27-oct con Sirys y Juan):
//  - cierre automatico cuando lo cotizado aparece completo en los resultados,
//  - solicitudes de aclaracion por cada parametro cotizado que no aparece, con seguimiento,
//  - alerta si Serambiente deja de enviar,
//  - resumen diario por notificacion y por correo.

// ------------------------------------------------------------------ parametros cotizados vs recibidos
export async function quotedParameters(quotationId: string | null): Promise<string[]> {
    if (!quotationId) return [];
    const q = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { complianceResult: true } });
    try {
        const checks: any[] = JSON.parse(q?.complianceResult || '{}')?.parameterChecks || [];
        return checks.filter(c => c.quotedAs && !(c.problems || []).some((p: any) => p.type === 'FALTANTE')).map(c => String(c.quotedAs));
    } catch { return []; }
}

export async function resultsText(files: string[]): Promise<string> {
    let text = '';
    for (const f of files) {
        const p = path.join(__dirname, '../../', f);
        if (!fs.existsSync(p)) continue;
        try { text += '\n' + (f.endsWith('.pdf') ? await pdfService.extractText(p) : fs.readFileSync(p, 'utf-8')); } catch { /* archivo ilegible */ }
    }
    return text;
}

// ------------------------------------------------------------------ aclaraciones
// Una solicitud por parametro cotizado sin resultado; no se repite mientras siga abierta.
export async function openClarifications(oit: { id: string; oitNumber: string }, service: string, missing: string[]): Promise<number> {
    let created = 0;
    for (const parameter of missing) {
        const exists = await prisma.labClarification.findFirst({ where: { oitId: oit.id, service, parameter, status: 'ABIERTA' } });
        if (exists) continue;
        await prisma.labClarification.create({
            data: {
                oitId: oit.id, service, parameter,
                question: `El parámetro «${parameter}» está cotizado en la OIT ${oit.oitNumber} (${service}) pero no aparece en los resultados. ¿Se analizó? ¿Se entrega aparte o no aplica?`,
            },
        });
        created++;
    }
    return created;
}

// Al cerrar el servicio: si lo cotizado aparece completo, se cierra solo; si falta algo, se abren las aclaraciones.
export async function autoCloseLab(oitId: string): Promise<void> {
    try {
        const oit = await prisma.oIT.findUnique({
            where: { id: oitId },
            select: { id: true, oitNumber: true, status: true, aiData: true, labResultsUrl: true, labResultsAnalysis: true, labFileSource: true, labComplete: true, quotationId: true },
        });
        if (!oit?.quotationId) return;
        const quoted = await quotedParameters(oit.quotationId);
        if (!quoted.length) return;
        const complete: Record<string, any> = parseGrouped(oit.labComplete);
        let changed = false;
        for (const svc of serviceStatuses(oit)) {
            if (svc.complete || !svc.files.length || !svc.hasAnalysis) continue;
            const missing = missingParameters(quoted, await resultsText(svc.files.map(f => f.file)));
            if (missing.length) {
                await openClarifications(oit, svc.name, missing);
            } else {
                complete[svc.key] = { at: new Date().toISOString(), by: 'Sistema (automático)', missing: [] };
                changed = true;
            }
        }
        if (changed) {
            const after = serviceStatuses({ ...oit, labComplete: JSON.stringify(complete) });
            const allDone = after.length > 0 && after.every(s => s.state === 'COMPLETO');
            await prisma.oIT.update({ where: { id: oitId }, data: { labComplete: JSON.stringify(complete), ...(allDone && oit.status !== 'COMPLETED' ? { status: 'COMPLETED' } : {}) } });
            console.log(`[Laboratorio] OIT ${oit.oitNumber}: cierre automático (lo cotizado aparece completo en los resultados)`);
        }
    } catch (error) {
        logError(`OIT ${oitId}: no se pudo evaluar el cierre automático del laboratorio`, error);
    }
}

// ------------------------------------------------------------------ vigilancia de Serambiente
let lastWebhookAt = Date.now();
let alerted = false;
export function touchWebhook() { lastWebhookAt = Date.now(); alerted = false; }
export const lastWebhookTime = () => new Date(lastWebhookAt);

// Dias habiles de 8 a. m. a 6 p. m. (Colombia): si pasan 6 horas sin ninguna llamada de Serambiente,
// se avisa a los administradores una vez (el 21-oct y el 22-oct pasaron dias sin recibir nada).
export async function checkWebhookSilence(): Promise<void> {
    const co = new Date(Date.now() - 5 * 3600 * 1000);
    const hour = co.getUTCHours(), weekday = co.getUTCDay();
    if (alerted || weekday < 1 || weekday > 5 || hour < 8 || hour >= 18) return;
    const hours = (Date.now() - lastWebhookAt) / 3600000;
    if (hours < 6) return;
    alerted = true;
    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true }, select: { id: true } });
    for (const a of admins) {
        await createNotification(a.id, 'Serambiente no ha enviado nada', `Hace ${Math.floor(hours)} horas que no llega ninguna OIT ni resultado de laboratorio desde el Sistema Serambiente. Revisar con Orlando.`, 'WARNING');
    }
}

// ------------------------------------------------------------------ resumen diario
export async function dailyLabDigest(): Promise<number> {
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000);
    const oits = await prisma.oIT.findMany({
        where: { createdAt: { gte: since }, aiData: { not: null } },
        select: { id: true, oitNumber: true, status: true, aiData: true, labResultsUrl: true, labResultsAnalysis: true, labFileSource: true, labComplete: true },
        orderBy: { createdAt: 'desc' }, take: 300,
    });
    const open = oits.map(o => ({ o, s: serviceStatuses(o) })).filter(r => r.s.length && r.s.some(x => x.state !== 'COMPLETO'));
    const sin = open.filter(r => r.s.every(x => x.state === 'SIN_RESULTADOS'));
    const aclar = await prisma.labClarification.findMany({ where: { status: 'ABIERTA' }, include: { oit: { select: { oitNumber: true } } }, orderBy: { createdAt: 'asc' }, take: 50 });
    if (!open.length && !aclar.length) return 0;

    const lines = [
        `${open.length} OIT abiertas en laboratorio; ${sin.length} sin ningún resultado.`,
        ...open.slice(0, 8).map(({ o, s }) => `OIT ${o.oitNumber}: ${s.filter(x => x.state !== 'COMPLETO').map(x => `${x.name} (${x.state === 'SIN_RESULTADOS' ? 'sin resultados' : 'falta cargue completo'})`).join('; ')}`),
    ];
    if (aclar.length) lines.push(`${aclar.length} aclaración(es) abierta(s): ${aclar.slice(0, 5).map(a => `${a.parameter} (OIT ${a.oit.oitNumber})`).join(', ')}`);

    const recipients = await prisma.user.findMany({ where: { role: { in: ['LAB', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true }, select: { id: true, email: true, role: true } });
    for (const r of recipients) await createNotification(r.id, 'Pendientes de laboratorio', lines.join('\n').slice(0, 900), 'INFO');

    // Correo solo al personal de laboratorio (la gerencia ya lo ve en la app).
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#222;font-size:14px;line-height:1.5;">
        <h2 style="color:#12224B;font-size:17px;">Pendientes de laboratorio</h2>
        <ul>${lines.map(l => `<li>${l.replace(/</g, '&lt;')}</li>`).join('')}</ul>
        <p><a href="https://als.paradixe.xyz/lab" style="color:#3E6BFF;">Abrir el panel de Laboratorio</a></p></div>`;
    for (const r of recipients.filter(x => x.role === 'LAB')) {
        try { await sendSimpleEmail([r.email], 'Pendientes de laboratorio — ALS', html); } catch (e) { logWarning(`No se pudo enviar el resumen de laboratorio a ${r.email}`, e); }
    }
    return recipients.length;
}

// ------------------------------------------------------------------ trazabilidad de la muestra
export interface TraceEvent { at: string; label: string; detail?: string; who?: string }

export async function traceabilityFor(oitId: string): Promise<TraceEvent[]> {
    const oit = await prisma.oIT.findUnique({
        where: { id: oitId },
        select: {
            oitNumber: true, createdAt: true, scheduledDate: true, samplingData: true, samplingSheetUrl: true, labResultsUrl: true, labComplete: true,
            finalReportUrl: true, quotation: { select: { quotationNumber: true, createdAt: true } }, assignedEngineers: { include: { user: { select: { name: true } } } },
        },
    });
    if (!oit) return [];
    const ev: TraceEvent[] = [];
    if (oit.quotation) ev.push({ at: oit.quotation.createdAt.toISOString(), label: 'Cotización cargada', detail: oit.quotation.quotationNumber });
    ev.push({ at: oit.createdAt.toISOString(), label: 'OIT recibida de Serambiente', detail: oit.oitNumber });
    if (oit.scheduledDate) ev.push({ at: oit.scheduledDate.toISOString(), label: 'Visita programada', detail: oit.assignedEngineers.map(a => a.user?.name).filter(Boolean).join(', ') });

    try {
        const sd = JSON.parse(oit.samplingData || '{}');
        for (const [key, svc] of Object.entries<any>(sd.services || {})) {
            for (const [i, v] of (svc.visits || []).entries()) {
                if (v?.arrival?.at) ev.push({ at: v.arrival.at, label: `Llegada al sitio (día ${i + 1})`, detail: `${svc.serviceName || key}${v.arrival.gps ? ` · GPS ±${Math.round(v.arrival.gps.accuracy)} m` : ' · sin GPS'}` });
                if (v?.departure?.at) ev.push({ at: v.departure.at, label: `Salida del sitio (día ${i + 1})`, detail: svc.serviceName || key });
            }
            if (svc.completedAt) ev.push({ at: svc.completedAt, label: 'Muestreo enviado', detail: svc.serviceName || key });
        }
    } catch { /* sin muestreo */ }

    const fileTime = (rel: string) => { try { return fs.statSync(path.join(__dirname, '../../', rel)).mtime.toISOString(); } catch { return null; } };
    for (const [group, files] of Object.entries(parseGrouped<string[]>(oit.samplingSheetUrl))) {
        for (const f of files || []) { const t = fileTime(f); if (t) ev.push({ at: t, label: 'Planilla de campo cargada', detail: group }); }
    }
    for (const [group, files] of Object.entries(parseGrouped<string[]>(oit.labResultsUrl))) {
        for (const f of files || []) { const t = fileTime(f); if (t) ev.push({ at: t, label: 'Resultado de laboratorio recibido', detail: group }); }
    }
    for (const [group, c] of Object.entries(parseGrouped<{ at: string; by?: string; missing?: string[] }>(oit.labComplete))) {
        ev.push({ at: c.at, label: 'Cargue completo del laboratorio', detail: `${group}${c.missing?.length ? ` · ${c.missing.length} sin resultado` : ''}`, who: c.by });
    }
    try {
        const reports: any[] = JSON.parse(oit.finalReportUrl || '[]');
        for (const r of Array.isArray(reports) ? reports : []) {
            const t = r?.url ? fileTime(String(r.url)) : null;
            if (t) ev.push({ at: t, label: 'Informe generado', detail: r.name });
        }
    } catch { /* sin informes */ }

    return ev.sort((a, b) => a.at.localeCompare(b.at));
}
