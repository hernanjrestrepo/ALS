import { Request, Response } from 'express';
import planningService from '../services/planning.service';
import { PrismaClient } from '@prisma/client';
import { planAssignments, serviceDays, ProposedService, Person } from '../services/planningAssign';
import { listActiveStaff, CARGO_SUPERVISA } from '../services/monitoringStaff';

const prisma = new PrismaClient();

export const generatePlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const proposal = await planningService.generateProposal(id);
        res.json(proposal);
    } catch (error) {
        console.error('Error generating planning:', error);
        res.status(500).json({ error: 'Error al generar planeación' });
    }
};

export const acceptPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.acceptProposal(id);
        res.json({ message: 'Planeación aceptada' });
    } catch (error) {
        console.error('Error accepting planning:', error);
        res.status(500).json({ error: 'Error al aceptar planeación' });
    }
};

export const rejectPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await planningService.rejectProposal(id);
        res.json({ message: 'Planeación rechazada' });
    } catch (error) {
        console.error('Error rejecting planning:', error);
        res.status(500).json({ error: 'Error al rechazar planeación' });
    }
};

// Propuesta de programacion con ingenieros asignados y alertas (reunion del 2026-10-23).
// No guarda nada: la pantalla muestra el resultado y lo guarda con /service-dates.
export const proposeAssignments = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const services = Array.isArray(req.body?.services) ? req.body.services : [];
        if (!services.length) return res.status(400).json({ error: 'No hay servicios para programar' });
        const result = await buildAssignmentPlan(id, services.map((s: any) => ({
            key: String(s.key), name: String(s.name || ''), date: String(s.date || ''),
            extraDates: Array.isArray(s.extraDates) ? s.extraDates.map(String) : undefined,
            time: s.time ? String(s.time) : undefined,
        })));
        res.json(result);
    } catch (error) {
        console.error('Error proposing assignments:', error);
        res.status(500).json({ error: 'Error al proponer la asignación' });
    }
};

export async function buildAssignmentPlan(oitId: string, services: ProposedService[]) {
    const staff = await listActiveStaff();
    const cargoPorCorreo = new Map(staff.map(p => [p.correo.toLowerCase(), p.cargo]));
    const users = await prisma.user.findMany({
        where: { email: { in: [...cargoPorCorreo.keys()] }, isActive: true, role: { in: ['ENGINEER', 'ADMIN'] } },
        select: { id: true, name: true, email: true },
    });
    const people: Person[] = users.map(u => {
        const cargo = cargoPorCorreo.get(u.email.toLowerCase()) || '';
        return { id: u.id, name: u.name, cargo, supervises: CARGO_SUPERVISA.test(cargo) };
    });

    // Lo que cada persona ya tiene programado en otras OIT, por dia.
    const others = await prisma.oIT.findMany({ where: { id: { not: oitId }, serviceDates: { not: null } }, select: { serviceDates: true, status: true } });
    const busyByDay: Record<string, string[]> = {};
    for (const o of others) {
        if (o.status === 'CANCELLED') continue;
        let sd: Record<string, any> = {};
        try { sd = JSON.parse(o.serviceDates || '{}') || {}; } catch { continue; }
        for (const s of Object.values(sd)) {
            if (!s?.confirmed || !Array.isArray(s.engineerIds)) continue;
            for (const day of serviceDays(s)) (busyByDay[day] ||= []).push(...s.engineerIds);
        }
    }

    // Equipos disponibles por matriz.
    const resources = await prisma.resource.findMany({ where: { status: { in: ['AVAILABLE', 'OPERATIVO'] } }, select: { type: true, quantity: true } });
    const resourcesByType: Record<string, number> = {};
    for (const r of resources) resourcesByType[r.type] = (resourcesByType[r.type] || 0) + (r.quantity || 1);

    return planAssignments({ services, people, busyByDay, resourcesByType });
}
