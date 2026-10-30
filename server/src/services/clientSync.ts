/**
 * Clientes desde las OIT (Hernan, 2026-10-30: "por que no estas jalando a los clientes?").
 * Sistema Serambiente no tiene API de clientes: solo manda a ALS el PDF de cada OIT y los
 * resultados. Pero cada OIT trae la ficha del cliente ("INFORMACION BASICA DEL CLIENTE":
 * empresa, NIT, direccion, contacto, ciudad, telefonos y correo). Con eso se crea o completa
 * el cliente en el modulo Clientes. Sin IA: se lee el texto del PDF linea por linea.
 *
 * Nunca se pisa lo que alguien escribio a mano: solo se llenan los campos vacios.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ClientCard {
    name: string | null;
    nit: string | null;
    address: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    city: string | null;
}

// Valor de una linea "ETIQUETA:valor" (la etiqueta exacta al comienzo de la linea).
function field(text: string, label: string): string | null {
    const re = new RegExp(`^[ \\t]*${label}[ \\t]*:[ \\t]*(.*)$`, 'im');
    const v = re.exec(text)?.[1]?.trim() || '';
    // Si el campo viene vacio, la linea trae pegada la siguiente etiqueta ("TELEFONO:CELULAR:...").
    return v && !/^[A-ZÁÉÍÓÚÑ /]+:/.test(v) ? v : null;
}

export function extractClientCard(text: string): ClientCard {
    const t = String(text || '');
    const name = field(t, 'NOMBRE\\s+EMPRESA');
    const nitRaw = field(t, 'NIT');
    const nit = nitRaw && /\d{5,}/.test(nitRaw) ? nitRaw.replace(/[^\d-]/g, '') : null;
    const phoneLine = /^[ \t]*TEL[EÉ]FONO[ \t]*:(.*)$/im.exec(t)?.[1] || '';
    const fijo = phoneLine.split(/CELULAR\s*:/i)[0].replace(/[^\d+ ]/g, '').trim();
    const celular = (phoneLine.split(/CELULAR\s*:/i)[1] || '').replace(/[^\d+ ]/g, '').trim();
    const phones = [celular, fijo].filter(p => p.replace(/\D/g, '').length >= 7);
    const mail = field(t, 'MAIL')?.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)?.[0] || null;
    let address = field(t, 'DIRECCI[OÓ]N');
    if (address) address = address.replace(/\s*[\w.+-]+@[\w-]+(\.[\w-]+)+\s*/g, ' ').trim() || null; // a veces pegan el correo
    return {
        name: name && name.length >= 2 ? name.slice(0, 200) : null,
        nit,
        address: address ? address.slice(0, 300) : null,
        contactName: field(t, 'CONTACTO')?.slice(0, 120) || null,
        contactEmail: mail ? mail.toLowerCase() : null,
        contactPhone: phones.length ? phones.join(' / ').slice(0, 60) : null,
        city: field(t, 'CIUDAD\\s*/\\s*DEPARTAMENTO')?.slice(0, 120) || null,
    };
}

// NIT sin digito de verificacion ni puntos: "900.640.166-4" y "900640166" son el mismo cliente.
export const nitBase = (nit: string | null | undefined) => String(nit || '').split('-')[0].replace(/\D/g, '');

// Nombre comparable: sin tildes, puntos ni tipo de sociedad.
export function nameKey(name: string | null | undefined): string {
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
        .replace(/[.,&]/g, ' ').replace(/\b(S\s*A\s*S|S\s*A|LTDA|E\s*S\s*P|S\s*EN\s*C|Y\s*CIA|CIA)\b/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

export type ClientSyncResult = 'creado' | 'completado' | 'sin_cambios' | 'sin_datos';

// Crea el cliente o completa los campos vacios del que ya existe (por NIT, o por nombre si no hay NIT).
export async function upsertClientFromCard(card: ClientCard, db = prisma): Promise<ClientSyncResult> {
    if (!card.name || !card.nit) return 'sin_datos';
    const base = nitBase(card.nit);
    const all = await db.client.findMany({ select: { id: true, name: true, nit: true, contactName: true, contactEmail: true, contactPhone: true, address: true, notes: true } });
    const existing = all.find(c => c.nit && nitBase(c.nit) === base) || all.find(c => !c.nit && nameKey(c.name) === nameKey(card.name));
    if (!existing) {
        await db.client.create({
            data: {
                name: card.name, nit: card.nit, address: card.address, contactName: card.contactName,
                contactEmail: card.contactEmail, contactPhone: card.contactPhone,
                notes: card.city ? `Ciudad: ${card.city}. Creado desde la OIT.` : 'Creado desde la OIT.',
            },
        });
        return 'creado';
    }
    const data: Record<string, string> = {};
    if (!existing.nit) data.nit = card.nit;
    for (const k of ['contactName', 'contactEmail', 'contactPhone', 'address'] as const) {
        if (!existing[k] && card[k]) data[k] = card[k] as string;
    }
    if (!Object.keys(data).length) return 'sin_cambios';
    await db.client.update({ where: { id: existing.id }, data });
    return 'completado';
}

export async function syncClientFromOitText(text: string): Promise<ClientSyncResult> {
    try {
        return await upsertClientFromCard(extractClientCard(text));
    } catch (e) {
        console.warn('[Clientes] No se pudo crear el cliente desde la OIT:', (e as Error).message);
        return 'sin_datos';
    }
}
