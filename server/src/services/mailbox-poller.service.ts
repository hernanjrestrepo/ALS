import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createDraftFromEmail, emailAlreadyProcessed } from './email-intake.service';
import { logError } from '../utils/errors';

// Lector del buzon de solicitudes de cotizacion. Se activa SOLO si las variables
// de entorno estan definidas en el servidor (las pone Hernan directamente en .env,
// la clave nunca pasa por el codigo ni por el repo):
//   INTAKE_IMAP_HOST, INTAKE_IMAP_USER, INTAKE_IMAP_PASSWORD
//   opcionales: INTAKE_IMAP_PORT (993), INTAKE_POLL_MINUTES (5)
const MAX_PER_POLL = 20;
let running = false;

function htmlToText(html: string): string {
    return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function pollMailboxOnce(): Promise<number> {
    const host = process.env.INTAKE_IMAP_HOST;
    const user = process.env.INTAKE_IMAP_USER;
    const pass = process.env.INTAKE_IMAP_PASSWORD;
    if (!host || !user || !pass || running) return 0;

    running = true;
    let processed = 0;
    const client = new ImapFlow({
        host,
        port: Number(process.env.INTAKE_IMAP_PORT) || 993,
        secure: true,
        auth: { user, pass },
        logger: false,
    });

    try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
            const uids = (await client.search({ seen: false }, { uid: true })) || [];
            for (const uid of uids.slice(0, MAX_PER_POLL)) {
                try {
                    const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
                    if (!msg || !msg.source) continue;
                    const parsed = await simpleParser(msg.source);
                    const messageId = parsed.messageId || `uid-${uid}`;

                    if (!(await emailAlreadyProcessed(messageId))) {
                        const body = (parsed.text || (parsed.html ? htmlToText(String(parsed.html)) : '')).trim();
                        if (body.length >= 10) {
                            await createDraftFromEmail({
                                fromEmail: parsed.from?.value?.[0]?.address,
                                subject: parsed.subject,
                                body,
                                messageId,
                            });
                            processed++;
                        }
                    }
                    // Solo se marca leido si se proceso (o ya estaba procesado): si falla,
                    // queda sin leer y se reintenta en la siguiente vuelta.
                    await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
                } catch (err) {
                    logError(`Buzon de solicitudes: error procesando el correo uid ${uid}`, err);
                }
            }
        } finally {
            lock.release();
        }
    } catch (err) {
        logError('Buzon de solicitudes: error de conexion IMAP', err);
    } finally {
        try { await client.logout(); } catch { /* conexion ya cerrada */ }
        running = false;
    }
    return processed;
}

export function startMailboxPolling() {
    if (!process.env.INTAKE_IMAP_HOST || !process.env.INTAKE_IMAP_USER || !process.env.INTAKE_IMAP_PASSWORD) {
        console.log('[Buzon solicitudes] Desactivado (faltan INTAKE_IMAP_HOST/USER/PASSWORD en .env)');
        return;
    }
    const minutes = Number(process.env.INTAKE_POLL_MINUTES) || 5;
    console.log(`[Buzon solicitudes] Activo: revisando ${process.env.INTAKE_IMAP_USER} cada ${minutes} min`);
    setTimeout(() => { void pollMailboxOnce(); }, 15_000);
    setInterval(() => { void pollMailboxOnce(); }, minutes * 60_000);
}
