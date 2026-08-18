import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this is the first user - make them SUPER_ADMIN
        const userCount = await prisma.user.count();
        const isFirstUser = userCount === 0;

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || email.split('@')[0],
                role: isFirstUser ? 'SUPER_ADMIN' : 'USER'
            },
        });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: '24h',
        });

        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Cuenta inactiva. Contacte al administrador.' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: '24h',
        });

        res.status(200).json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};


// Genera un token de recuperación de un solo uso, válido 1 hora.
// No hay proveedor de correo configurado en este sistema todavía, así que el
// link se retorna directamente en la respuesta para que el frontend lo muestre.
// El usuario escribe su nueva contraseña directamente en el navegador; el
// backend nunca recibe ni registra la contraseña en texto plano fuera de este flujo.
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        // Respuesta genérica siempre, para no revelar si el correo existe o no
        const genericResponse = { message: 'Si el correo existe, se generó un link de recuperación.' };

        if (!user || !user.isActive) {
            return res.status(200).json(genericResponse);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await prisma.user.update({
            where: { id: user.id },
            data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry },
        });

        const frontendUrl = process.env.FRONTEND_URL || 'https://als.paradixe.xyz';
        const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

        res.status(200).json({ ...genericResponse, resetUrl });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, token, password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.resetTokenHash || !user.resetTokenExpiry) {
            return res.status(400).json({ message: 'Link de recuperación inválido o expirado' });
        }

        if (user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ message: 'Link de recuperación inválido o expirado' });
        }

        const tokenHash = crypto.createHash('sha256').update(token || '').digest('hex');
        if (tokenHash !== user.resetTokenHash) {
            return res.status(400).json({ message: 'Link de recuperación inválido o expirado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, resetTokenHash: null, resetTokenExpiry: null },
        });

        res.status(200).json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};