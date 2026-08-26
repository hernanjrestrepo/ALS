"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const email_service_1 = require("../services/email.service");
const env_1 = require("../config/env");
const prisma = new client_1.PrismaClient();
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name } = req.body;
        if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            return res.status(400).json({ message: 'Correo electrónico inválido' });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }
        if (name !== undefined && typeof name !== 'string') {
            return res.status(400).json({ message: 'Nombre inválido' });
        }
        const existingUser = yield prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Check if this is the first user - make them SUPER_ADMIN
        const userCount = yield prisma.user.count();
        const isFirstUser = userCount === 0;
        const user = yield prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || email.split('@')[0],
                role: isFirstUser ? 'SUPER_ADMIN' : 'USER'
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, (0, env_1.getJwtSecret)(), {
            expiresIn: '24h',
        });
        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Cuenta inactiva. Contacte al administrador.' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, (0, env_1.getJwtSecret)(), {
            expiresIn: '24h',
        });
        res.status(200).json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});
exports.login = login;
// Genera un token de recuperación de un solo uso, válido 1 hora.
// No hay proveedor de correo configurado en este sistema todavía, así que el
// link se retorna directamente en la respuesta para que el frontend lo muestre.
// El usuario escribe su nueva contraseña directamente en el navegador; el
// backend nunca recibe ni registra la contraseña en texto plano fuera de este flujo.
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (typeof email !== 'string' || !email) {
            return res.status(400).json({ message: 'Correo electrónico inválido' });
        }
        const user = yield prisma.user.findUnique({ where: { email } });
        // Respuesta genérica siempre, para no revelar si el correo existe o no
        const genericResponse = { message: 'Si el correo existe, se generó un link de recuperación.' };
        if (!user || !user.isActive) {
            return res.status(200).json(genericResponse);
        }
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        yield prisma.user.update({
            where: { id: user.id },
            data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry },
        });
        const frontendUrl = process.env.FRONTEND_URL || 'https://als.paradixe.xyz';
        const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
        try {
            yield (0, email_service_1.sendPasswordResetEmail)(email, resetUrl);
        }
        catch (emailError) {
            console.error('Error sending password reset email:', emailError);
            // No revelamos el link en la respuesta ni el error real al cliente
        }
        res.status(200).json(genericResponse);
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, token, password } = req.body;
        if (typeof email !== 'string' || typeof token !== 'string') {
            return res.status(400).json({ message: 'Link de recuperación inválido o expirado' });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user || !user.resetTokenHash || !user.resetTokenExpiry) {
            return res.status(400).json({ message: 'Link de recuperación inválido o expirado' });
        }
        if (user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ message: 'Link de recuperación inválido o expirado' });
        }
        const tokenHash = crypto_1.default.createHash('sha256').update(token || '').digest('hex');
        if (tokenHash !== user.resetTokenHash) {
            return res.status(400).json({ message: 'Link de recuperación inválido o expirado' });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        yield prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, resetTokenHash: null, resetTokenExpiry: null },
        });
        res.status(200).json({ message: 'Contraseña actualizada correctamente' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});
exports.resetPassword = resetPassword;
