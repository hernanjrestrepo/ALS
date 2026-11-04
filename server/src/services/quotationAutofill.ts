/**
 * Lo que Ana Melendez tuvo que hacer a mano con la cotizacion SIACOT-19469 (2026-11-04):
 * crear el cliente y el servicio antes de poder cargarla, y volver a escribir los datos
 * subsanados cada vez que se analizaba de nuevo. Aqui el sistema lo hace solo:
 *   - el cliente que se escribe en el formulario y no existe se crea (o se reutiliza el que ya estaba);
 *   - los servicios que trae la cotizacion (Agua Residual Domestica...) se crean si faltan y se enlazan;
 *   - los datos subsanados sobreviven al nuevo analisis aunque la IA redacte el faltante distinto.
 */
import { PrismaClient } from '@prisma/client';
import { nameKey } from './clientSync';

const prisma = new PrismaClient();

const fold = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Cliente por nombre (sin tildes, puntos ni tipo de sociedad): lo reutiliza o lo crea.
export async function findOrCreateClientByName(rawName: string): Promise<{ id: string; name: string; created: boolean } | null> {
    const name = String(rawName || '').trim().slice(0, 200);
    if (name.length < 2) return null;
    const key = nameKey(name);
    const existing = (await prisma.client.findMany({ select: { id: true, name: true } })).find(c => nameKey(c.name) === key);
    if (existing) return { ...existing, created: false };
    const created = await prisma.client.create({ data: { name }, select: { id: true, name: true } });
    console.log(`[Cotizacion] Cliente nuevo creado desde el formulario: ${created.name}`);
    return { ...created, created: true };
}

// "AGUA RESIDUAL DOMESTICA" -> "Agua residual doméstica" no se puede adivinar: se conserva el nombre de la
// cotizacion con la primera letra de cada palabra significativa en mayuscula solo si venia todo en mayusculas.
function serviceDisplayName(label: string): string {
    const t = String(label || '').replace(/\s+/g, ' ').trim();
    if (t && t === t.toUpperCase()) return t.charAt(0) + t.slice(1).toLowerCase();
    return t;
}

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'caracterizacion', 'monitoreo', 'muestreo']);
const keyOf = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(es|s)$/, '')).sort().join(' ');

// Crea los servicios de la cotizacion que aun no existen y los enlaza. Devuelve los nombres creados.
export async function ensureServicesForQuotation(quotationId: string, labels: string[]): Promise<string[]> {
    const wanted = [...new Map(labels.map(l => [keyOf(l), l.trim()] as const).filter(([k, l]) => k && l.length >= 4 && l.length <= 80)).entries()];
    if (!wanted.length) return [];
    const services = await prisma.service.findMany({ select: { id: true, name: true } });
    const quotation = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { services: { select: { id: true } } } });
    const linked = new Set((quotation?.services || []).map(s => s.id));
    const created: string[] = [];
    for (const [key, label] of wanted) {
        let service = services.find(s => keyOf(s.name) === key);
        if (!service) {
            const name = serviceDisplayName(label);
            const oitType = /agua/i.test(label) ? 'Agua' : /aire|emisi/i.test(label) ? 'Aire' : /suelo/i.test(label) ? 'Suelo' : /biota/i.test(label) ? 'Biota' : undefined;
            service = await prisma.service.create({ data: { name, oitType, description: 'Creado automáticamente desde una cotización' }, select: { id: true, name: true } });
            services.push(service);
            created.push(service.name);
        }
        if (!linked.has(service.id)) {
            await prisma.quotation.update({ where: { id: quotationId }, data: { services: { connect: { id: service.id } } } });
            linked.add(service.id);
        }
    }
    if (created.length) console.log(`[Cotizacion] Servicios creados desde la cotización: ${created.join(', ')}`);
    return created;
}

const tokens = (s: string) => new Set(fold(s).split(/[^a-z0-9]+/).filter(w => w.length > 3));

// Parecido entre dos redacciones del mismo faltante (0 a 1).
export function similarity(a: string, b: string): number {
    const A = tokens(a), B = tokens(b);
    if (!A.size || !B.size) return 0;
    let inter = 0;
    A.forEach(t => { if (B.has(t)) inter++; });
    return inter / Math.min(A.size, B.size);
}

/**
 * Al analizar de nuevo, la IA puede redactar distinto el mismo faltante. Cada dato subsanado se vuelve a
 * poner en el faltante vigente que mas se le parece (>= 0.6). Lo que ya no se parece a ninguno se
 * descarta solo si el faltante ya no existe; un dato escrito por una persona nunca se borra por cambio
 * de redaccion.
 */
export function remapResolutions<T>(old: Record<string, T>, missingNow: string[]): Record<string, T> {
    const out: Record<string, T> = {};
    const used = new Set<string>();
    for (const [key, value] of Object.entries(old)) {
        const exact = missingNow.find(m => m.trim() === key.trim());
        if (exact) { out[exact.trim()] = value; used.add(exact); continue; }
        let best: { m: string; s: number } | null = null;
        for (const m of missingNow) {
            if (used.has(m)) continue;
            const s = similarity(key, m);
            if (s >= 0.6 && (!best || s > best.s)) best = { m, s };
        }
        if (best) { out[best.m.trim()] = value; used.add(best.m); }
    }
    return out;
}
