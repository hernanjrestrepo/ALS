// Personal de monitoreo editable por administradores (Raul, planeador de Operaciones).
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { invalidateStaffCache } from '../services/monitoringStaff';

const prisma = new PrismaClient();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(body: any) {
    return {
        nombre: String(body?.nombre || '').trim().slice(0, 120),
        cargo: String(body?.cargo || '').trim().slice(0, 120),
        correo: String(body?.correo || '').trim().toLowerCase().slice(0, 160),
    };
}

// Lista con la cuenta de ALS de cada persona (sin cuenta no puede ser asignada).
export const listStaff = async (_req: Request, res: Response) => {
    try {
        const rows = await prisma.monitoringStaff.findMany({ orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] });
        const users = await prisma.user.findMany({ where: { email: { in: rows.map(r => r.correo) } }, select: { email: true, isActive: true, role: true } });
        const byEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));
        res.json(rows.map(r => ({ ...r, cuentaAls: byEmail.has(r.correo) ? { activa: byEmail.get(r.correo)!.isActive, rol: byEmail.get(r.correo)!.role } : null })));
    } catch (error) {
        console.error('Error listing monitoring staff:', error);
        res.status(500).json({ error: 'Error al listar el personal' });
    }
};

export const createStaff = async (req: Request, res: Response) => {
    try {
        const data = clean(req.body);
        if (!data.nombre || !data.cargo) return res.status(400).json({ error: 'Nombre y cargo son obligatorios' });
        if (!EMAIL.test(data.correo)) return res.status(400).json({ error: 'Correo no válido' });
        if (await prisma.monitoringStaff.findUnique({ where: { correo: data.correo } })) {
            return res.status(409).json({ error: 'Ya hay una persona con ese correo' });
        }
        const row = await prisma.monitoringStaff.create({ data: { ...data, activo: true } });
        invalidateStaffCache();
        res.status(201).json(row);
    } catch (error) {
        console.error('Error creating monitoring staff:', error);
        res.status(500).json({ error: 'Error al agregar la persona' });
    }
};

export const updateStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const current = await prisma.monitoringStaff.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ error: 'Persona no encontrada' });
        const data: any = {};
        const c = clean({ ...current, ...req.body });
        if (req.body?.nombre !== undefined) { if (!c.nombre) return res.status(400).json({ error: 'El nombre no puede quedar vacío' }); data.nombre = c.nombre; }
        if (req.body?.cargo !== undefined) { if (!c.cargo) return res.status(400).json({ error: 'El cargo no puede quedar vacío' }); data.cargo = c.cargo; }
        if (req.body?.correo !== undefined) {
            if (!EMAIL.test(c.correo)) return res.status(400).json({ error: 'Correo no válido' });
            const clash = await prisma.monitoringStaff.findUnique({ where: { correo: c.correo } });
            if (clash && clash.id !== id) return res.status(409).json({ error: 'Ya hay una persona con ese correo' });
            data.correo = c.correo;
        }
        if (req.body?.activo !== undefined) data.activo = req.body.activo === true;
        const row = await prisma.monitoringStaff.update({ where: { id }, data });
        invalidateStaffCache();
        res.json(row);
    } catch (error) {
        console.error('Error updating monitoring staff:', error);
        res.status(500).json({ error: 'Error al actualizar la persona' });
    }
};

export const deleteStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!(await prisma.monitoringStaff.findUnique({ where: { id } }))) return res.status(404).json({ error: 'Persona no encontrada' });
        await prisma.monitoringStaff.delete({ where: { id } });
        invalidateStaffCache();
        res.json({ ok: true });
    } catch (error) {
        console.error('Error deleting monitoring staff:', error);
        res.status(500).json({ error: 'Error al quitar la persona' });
    }
};
