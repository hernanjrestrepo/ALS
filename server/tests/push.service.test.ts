import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const setVapidDetails = vi.fn();
const sendNotification = vi.fn();
const userUpdate = vi.fn();
const userFindUnique = vi.fn();
const userFindMany = vi.fn();

vi.mock('web-push', () => ({
    default: {
        setVapidDetails: (...args: unknown[]) => setVapidDetails(...args),
        sendNotification: (...args: unknown[]) => sendNotification(...args)
    }
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        user = {
            update: (...args: unknown[]) => userUpdate(...args),
            findUnique: (...args: unknown[]) => userFindUnique(...args),
            findMany: (...args: unknown[]) => userFindMany(...args)
        };
    }
}));

async function loadService(vapid: boolean) {
    vi.resetModules();
    if (vapid) {
        vi.stubEnv('VAPID_PUBLIC_KEY', 'public-key');
        vi.stubEnv('VAPID_PRIVATE_KEY', 'private-key');
    } else {
        vi.stubEnv('VAPID_PUBLIC_KEY', '');
        vi.stubEnv('VAPID_PRIVATE_KEY', '');
    }
    const mod = await import('../src/services/push.service');
    return mod.pushService;
}

const subscription = { endpoint: 'https://push.example/1', keys: { p256dh: 'a', auth: 'b' } };

beforeEach(() => {
    setVapidDetails.mockReset();
    sendNotification.mockReset();
    userUpdate.mockReset();
    userFindUnique.mockReset();
    userFindMany.mockReset();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('VAPID configuration', () => {
    it('configures web-push when both keys are present', async () => {
        await loadService(true);
        expect(setVapidDetails).toHaveBeenCalledWith('mailto:admin@alsglobal.com', 'public-key', 'private-key');
    });

    it('skips configuration when keys are missing', async () => {
        const service = await loadService(false);
        expect(setVapidDetails).not.toHaveBeenCalled();
        expect(service.getPublicKey()).toBe('');
    });

    it('exposes the public key for client subscription', async () => {
        const service = await loadService(true);
        expect(service.getPublicKey()).toBe('public-key');
    });
});

describe('subscribe / unsubscribe', () => {
    it('stores the serialized subscription', async () => {
        const service = await loadService(true);
        userUpdate.mockResolvedValue({});

        await expect(service.subscribe('u1', subscription)).resolves.toBe(true);
        expect(userUpdate).toHaveBeenCalledWith({
            where: { id: 'u1' },
            data: { pushSubscription: JSON.stringify(subscription) }
        });
    });

    it('clears the subscription on unsubscribe', async () => {
        const service = await loadService(true);
        userUpdate.mockResolvedValue({});

        await expect(service.unsubscribe('u1')).resolves.toBe(true);
        expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { pushSubscription: null } });
    });

    it('reports failure instead of throwing when the database rejects', async () => {
        const service = await loadService(true);
        userUpdate.mockRejectedValue(new Error('db down'));

        await expect(service.subscribe('u1', subscription)).resolves.toBe(false);
        await expect(service.unsubscribe('u1')).resolves.toBe(false);
    });
});

describe('sendToUser', () => {
    it('sends a payload with the default icon, badge, tag and url', async () => {
        const service = await loadService(true);
        userFindUnique.mockResolvedValue({ pushSubscription: JSON.stringify(subscription) });
        sendNotification.mockResolvedValue({});

        await expect(service.sendToUser('u1', { title: 'Hola', body: 'Cuerpo' })).resolves.toBe(true);
        expect(JSON.parse(sendNotification.mock.calls[0][1] as string)).toEqual({
            title: 'Hola',
            body: 'Cuerpo',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'als-notification',
            data: { url: '/' }
        });
    });

    it('merges custom fields and extra data into the payload', async () => {
        const service = await loadService(true);
        userFindUnique.mockResolvedValue({ pushSubscription: JSON.stringify(subscription) });
        sendNotification.mockResolvedValue({});

        await service.sendToUser('u1', {
            title: 'T',
            body: 'B',
            icon: '/i.png',
            badge: '/b.png',
            tag: 'oit',
            url: '/oits/1',
            data: { oitId: '1' }
        });

        expect(JSON.parse(sendNotification.mock.calls[0][1] as string)).toMatchObject({
            icon: '/i.png',
            badge: '/b.png',
            tag: 'oit',
            data: { url: '/oits/1', oitId: '1' }
        });
    });

    it('does nothing when the user has no subscription', async () => {
        const service = await loadService(true);
        userFindUnique.mockResolvedValue({ pushSubscription: null });

        await expect(service.sendToUser('u1', { title: 'T', body: 'B' })).resolves.toBe(false);
        expect(sendNotification).not.toHaveBeenCalled();
    });

    it('returns false when the stored subscription is not valid JSON', async () => {
        const service = await loadService(true);
        userFindUnique.mockResolvedValue({ pushSubscription: 'not-json' });

        await expect(service.sendToUser('u1', { title: 'T', body: 'B' })).resolves.toBe(false);
    });

    it('returns false for an expired subscription (410)', async () => {
        const service = await loadService(true);
        userFindUnique.mockResolvedValue({ pushSubscription: JSON.stringify(subscription) });
        sendNotification.mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));

        await expect(service.sendToUser('u1', { title: 'T', body: 'B' })).resolves.toBe(false);
    });

    it('skips sending entirely when VAPID is not configured', async () => {
        const service = await loadService(false);
        userFindUnique.mockResolvedValue({ pushSubscription: JSON.stringify(subscription) });

        await expect(service.sendToUser('u1', { title: 'T', body: 'B' })).resolves.toBe(false);
        expect(sendNotification).not.toHaveBeenCalled();
    });
});

describe('sendToAll', () => {
    it('counts only the successful deliveries', async () => {
        const service = await loadService(true);
        userFindMany.mockResolvedValue([
            { id: 'u1', pushSubscription: JSON.stringify(subscription) },
            { id: 'u2', pushSubscription: JSON.stringify(subscription) },
            { id: 'u3', pushSubscription: null }
        ]);
        sendNotification.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'));

        await expect(service.sendToAll({ title: 'T', body: 'B' })).resolves.toBe(1);
        expect(sendNotification).toHaveBeenCalledTimes(2);
    });

    it('returns zero when the query fails', async () => {
        const service = await loadService(true);
        userFindMany.mockRejectedValue(new Error('db down'));

        await expect(service.sendToAll({ title: 'T', body: 'B' })).resolves.toBe(0);
    });
});
