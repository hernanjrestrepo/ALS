import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { pushService } from '../services/push.service';
import { getAuthUser, getUserId, handleError } from '../utils/http';


export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);

        const notifications = await prisma.notification.findMany({
            where: { userId },
            include: {
                oit: {
                    select: {
                        id: true,
                        oitNumber: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(notifications);
    } catch (error) {
        handleError(res, error, 'Error al obtener notificaciones', { logLabel: 'Error fetching notifications:' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });

        res.json(updated);
    } catch (error) {
        handleError(res, error, 'Error al marcar como leída', { logLabel: 'Error marking notification as read:' });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);

        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });

        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        handleError(res, error, 'Error al marcar todas como leídas', { logLabel: 'Error marking all as read:' });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        await prisma.notification.delete({
            where: { id }
        });

        res.json({ message: 'Notificación eliminada' });
    } catch (error) {
        handleError(res, error, 'Error al eliminar notificación', { logLabel: 'Error deleting notification:' });
    }
};

// Type icons for push notifications
const typeIcons: Record<string, string> = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌'
};

export const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO',
    oitId?: string
) => {
    try {
        // Store notification in database
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                oitId
            }
        });

        // Send Web Push notification (async, don't wait)
        pushService.sendToUser(userId, {
            title: `${typeIcons[type]} ${title}`,
            body: message,
            url: oitId ? `/oits/${oitId}` : '/notifications',
            data: {
                notificationId: notification.id,
                type,
                oitId
            }
        }).catch(err => console.error('Push send error:', err));

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};
