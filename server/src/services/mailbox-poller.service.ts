import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createDraftFromEmail, emailAlreadyProcessed } from './email-intake.service';
import { logError } from '../utils/errors';

// Lector del buzon de solicitudes de cotizacion. Se activa SOLO si el servidor tiene
// estas variables en su .env (las pone el dueno directamente, la clave nunca pasa
// por el codigo ni por el repo):
//   INTAKE_IMAP_HOST, INTAKE_IMAP_USER, INTAKE_IMAP_PASSWORD
//   opcionales:
//     INTAKE_IMAP_PORT       (993)
//     INTAKE_POLL_MINUTES    (5)
//     INTAKE_LOOKBACK_HOURS  (12)  solo se consideran correos de las ultimas N horas
//     INTAKE_KEYWORDS        ("cotiz") palabras (separadas por coma) que debe contener
//                            el asunto o el cuerpo; vacio = procesar todo. Con un buzon
//                            personal o compartido DEBE haber filtro: sin el, cada correo
//                            recibido se trataria como una solicitud de cotizacion.
//
// El lector es de SOLO LECTURA: nunca cambia marcas de leido/no leido ni mueve ni
// borra nada en el buzon. Los duplicados se evitan por Message-ID guardado en la
// cotizacion borrador.
const MAX_PER_POLL = 20;
let running = false;
const skippedThisRun = new Set<string>(); // correos ya revisados que no aplican (evita re-descargarlos cada vuelta)

function htmlToText(html: string): string {
    return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesKeywords(text: string): boolean {
    const raw = process.env.INTAKE_KEYWORDS === undefined ? 'cotiz' : process.env.INTAKE_KEYWORDS;
    const keywords = raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    if (keywords.length === 0) return true;
    const t = text.toLowerCase();
    return keywords.some(k => t.includes(k));
}

export interface PollResult { skipped: boolean; scanned: number; processed: number; error?: string }

// Una vuelta colgada (conexion IMAP o IA sin respuesta) dejaba `running` en true para
// siempre y todas las vueltas siguientes se descartaban en silencio.
export async function pollMailboxNow(): Promise<PollResult> {
    if (running) return { skipped: true, scanned: 0, processed: 0 };
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<PollResult>(resolve => {
        timer = setTimeout(() => { running = false; resolve({ skipped: false, scanned: 0, processed: 0, error: 'timeout de 5 min (la vuelta sigue en curso o quedo colgada)' }); }, 5 * 60_000);
    });
    let result: PollResult;
    try {
        result = await Promise.race([pollMailboxOnce(), timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
    console.log(`[Buzon solicitudes] Vuelta: revisados ${result.scanned}, borradores creados ${result.processed}${result.error ? ', error: ' + result.error : ''}`);
    return result;
}

async function pollMailboxOnce(): Promise<PollResult> {
    const host = process.env.INTAKE_IMAP_HOST;
    const user = process.env.INTAKE_IMAP_USER;
    const pass = process.env.INTAKE_IMAP_PASSWORD;
    if (!host || !user || !pass) return { skipped: true, scanned: 0, processed: 0 };

    running = true;
    let processed = 0;
    let scanned = 0;
    let errorMsg: string | undefined;
    const lookbackMs = (Number(process.env.INTAKE_LOOKBACK_HOURS) || 12) * 3_600_000;
    const since = new Date(Date.now() - lookbackMs);
    const client = new ImapFlow({
        host,
        port: Number(process.env.INTAKE_IMAP_PORT) || 993,
        secure: true,
        auth: { user, pass },
        logger: false,
    });

    try {
        await client.connect();
        // readOnly: garantiza a nivel de protocolo que no se modifica nada del buzon
        const lock = await client.getMailboxLock('INBOX', { readOnly: true });
        try {
            const uids = (await client.search({ since }, { uid: true })) || [];
            // los mas recientes primero
            for (const uid of uids.slice(-MAX_PER_POLL * 5).reverse()) {
                if (processed >= MAX_PER_POLL) break;
                const key = String(uid);
                scanned++;
                if (skippedThisRun.has(key)) continue;
                try {
                    const msg = await client.fetchOne(key, { source: true }, { uid: true });
                    if (!msg || !msg.source) continue;
                    const parsed = await simpleParser(msg.source);
                    if (parsed.date && parsed.date < since) { skippedThisRun.add(key); continue; }
                    const messageId = parsed.messageId || `uid-${uid}`;
                    const body = (parsed.text || (parsed.html ? htmlToText(String(parsed.html)) : '')).trim();

                    if (body.length < 10 || !matchesKeywords(`${parsed.subject || ''}\n${body}`)) {
                        skippedThisRun.add(key);
                        continue;
                    }
                    if (await emailAlreadyProcessed(messageId)) {
                        skippedThisRun.add(key);
                        continue;
                    }
                    await createDraftFromEmail({
                        fromEmail: parsed.from?.value?.[0]?.address,
                        subject: parsed.subject,
                        body,
                        messageId,
                    });
                    skippedThisRun.add(key);
                    processed++;
                } catch (err) {
                    logError(`Buzon de solicitudes: error procesando el correo uid ${uid}`, err);
                }
            }
        } finally {
            lock.release();
        }
    } catch (err: any) {
        errorMsg = err?.responseText || err?.message || String(err);
        logError('Buzon de solicitudes: error de conexion IMAP', err);
    } finally {
        try { await client.logout(); } catch { /* conexion ya cerrada */ }
        running = false;
    }
    return { skipped: false, scanned, processed, error: errorMsg };
}

export function startMailboxPolling() {
    if (!process.env.INTAKE_IMAP_HOST || !process.env.INTAKE_IMAP_USER || !process.env.INTAKE_IMAP_PASSWORD) {
        console.log('[Buzon solicitudes] Desactivado (faltan INTAKE_IMAP_HOST/USER/PASSWORD en .env)');
        return;
    }
    const minutes = Number(process.env.INTAKE_POLL_MINUTES) || 5;
    const kw = process.env.INTAKE_KEYWORDS === undefined ? 'cotiz' : process.env.INTAKE_KEYWORDS;
    console.log(`[Buzon solicitudes] Activo (solo lectura): ${process.env.INTAKE_IMAP_USER} cada ${minutes} min, filtro="${kw || '(ninguno)'}"`);
    setTimeout(() => { void pollMailboxNow(); }, 15_000);
    setInterval(() => { void pollMailboxNow(); }, minutes * 60_000);
}
