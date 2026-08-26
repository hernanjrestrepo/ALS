import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuthUser, getUserId, handleError } from '../utils/http';


// Valid roles in the system
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    ENGINEER: 'ENGINEER',
    USER: 'USER'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Get all users (SUPER_ADMIN only)
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error: any) {
        handleError(res, error, 'Error al obtener usuarios', { status: 500, response: { error: 'Error al obtener usuarios' }, log: () => console.error('Error fetching users:', error) });
    }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error: any) {
        handleError(res, error, 'Error al obtener usuario', { status: 500, response: { error: 'Error al obtener usuario' }, log: () => console.error('Error fetching user:', error) });
    }
};

// Update user role (SUPER_ADMIN only)
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validate role
        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({
                error: 'Rol inválido',
                validRoles: Object.values(ROLES)
            });
        }

        // Prevent changing own role
        const currentUserId = getAuthUser(req as any)?.userId;
        if (id === currentUserId) {
            return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.json({ message: 'Rol actualizado exitosamente', user });
    } catch (error: any) {
        handleError(res, error, 'Error al actualizar rol', { status: 500, response: { error: 'Error al actualizar rol' }, log: () => console.error('Error updating user role:', error) });
    }
};

// Get all engineers (for OIT assignment)
export const getEngineers = async (req: Request, res: Response) => {
    try {
        const engineers = await prisma.user.findMany({
            where: { role: ROLES.ENGINEER },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                assignedOITs: {
                    select: {
                        oit: {
                            select: {
                                scheduledDate: true,
                                status: true
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(engineers);
    } catch (error: any) {
        handleError(res, error, 'Error al obtener ingenieros', { status: 500, response: { error: 'Error al obtener ingenieros' }, log: () => console.error('Error fetching engineers:', error) });
    }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = getAuthUser(req as any)?.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error: any) {
        handleError(res, error, 'Error al obtener perfil', { status: 500, response: { error: 'Error al obtener perfil' }, log: () => console.error('Error fetching profile:', error) });
    }
};
// Create new user (SUPER_ADMIN only)
export const createUser = async (req: Request, res: Response) => {
    try {
        const { email, password, name, role } = req.body;

        // Validate role
        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({
                error: 'Rol inválido',
                validRoles: Object.values(ROLES)
            });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || email.split('@')[0],
                role
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.status(201).json(user);
    } catch (error: any) {
        handleError(res, error, 'Error al crear usuario', { status: 500, response: { error: 'Error al crear usuario' }, log: () => console.error('Error creating user:', error) });
    }
};

// Update user password (ADMIN/SUPER_ADMIN only)
export const updatePassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error: any) {
        handleError(res, error, 'Error al actualizar contraseña', { status: 500, response: { error: 'Error al actualizar contraseña' }, log: () => console.error('Error updating password:', error) });
    }
};
