import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const send = vi.fn();
const clientArgs: any[] = [];

vi.mock('@aws-sdk/client-sesv2', () => ({
    SESv2Client: class {
        constructor(config: any) {
            clientArgs.push(config);
        }
        send = (command: unknown) => send(command);
    },
    SendEmailCommand: class {
        constructor(public input: any) {}
    }
}));

async function loadService(env: Record<string, string> = {}) {
    vi.resetModules();
    clientArgs.length = 0;
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    return import('../src/services/email.service');
}

beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('sendPasswordResetEmail', () => {
    it('sends the reset link to the recipient from the default sender', async () => {
        const { sendPasswordResetEmail } = await loadService();

        await sendPasswordResetEmail('user@example.com', 'https://als.example/reset?token=abc');

        const input = send.mock.calls[0][0].input;
        expect(input.FromEmailAddress).toBe('ceo@paradixe.xyz');
        expect(input.Destination.ToAddresses).toEqual(['user@example.com']);
        expect(input.Content.Simple.Subject.Data).toBe('Recuperación de contraseña — ALS');
        expect(input.Content.Simple.Body.Html.Data).toContain('https://als.example/reset?token=abc');
    });

    it('honours the configured region and sender', async () => {
        const { sendPasswordResetEmail } = await loadService({
            AWS_REGION: 'us-west-2',
            SES_SENDER_EMAIL: 'no-reply@als.test'
        });

        await sendPasswordResetEmail('user@example.com', 'https://als.example/reset');

        expect(clientArgs[0]).toEqual({ region: 'us-west-2' });
        expect(send.mock.calls[0][0].input.FromEmailAddress).toBe('no-reply@als.test');
    });

    it('defaults to us-east-1 when no region is configured', async () => {
        await loadService({ AWS_REGION: '' });
        expect(clientArgs[0]).toEqual({ region: 'us-east-1' });
    });

    it('propagates SES failures to the caller', async () => {
        const { sendPasswordResetEmail } = await loadService();
        send.mockRejectedValue(new Error('SES rejected the message'));

        await expect(sendPasswordResetEmail('user@example.com', 'https://als.example/reset')).rejects.toThrow(
            'SES rejected the message'
        );
    });
});
