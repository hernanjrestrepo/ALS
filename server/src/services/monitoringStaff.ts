// Personal de monitoreo desde la base (editable por administradores). Cache corta para
// no consultar en cada peticion; se invalida al editar.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StaffRow { id: string; nombre: string; cargo: string; correo: string; activo: boolean }

// Jefe, coordinadores, supervisores y planeador ven todas las OIT.
export const CARGO_SUPERVISA = /jefe|coordinador|supervisor|planeador/i;

const TTL_MS = 60_000;
let cache: { at: number; rows: StaffRow[] } | null = null;

export function invalidateStaffCache() { cache = null; }

export async function listActiveStaff(): Promise<StaffRow[]> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
    const rows = await prisma.monitoringStaff.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
    cache = { at: Date.now(), rows };
    return rows;
}

export async function staffEmails(): Promise<string[]> {
    return (await listActiveStaff()).map(r => r.correo.toLowerCase());
}

export async function isSupervisor(email?: string | null): Promise<boolean> {
    if (!email) return false;
    const row = (await listActiveStaff()).find(r => r.correo.toLowerCase() === email.toLowerCase());
    return !!row && CARGO_SUPERVISA.test(row.cargo);
}
