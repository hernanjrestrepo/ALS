/**
 * Xmart Academy se actualiza solo, pero con aprobacion (Hernan, 2026-10-24: "que lo que proponga
 * la IA pase por mi aprobacion"). Dos fuentes:
 *
 *  - NOVEDAD: commits nuevos que tocan las `fuentes` de un modulo -> la IA redacta en lenguaje
 *    del equipo que cambio.
 *  - PREGUNTA: preguntas que le hicieron a Ana sobre un modulo; con 3 o mas sin usar, la IA
 *    redacta una pregunta frecuente con su respuesta (esa repeticion es friccion).
 *
 * Todo queda PENDIENTE hasta que un SUPER_ADMIN lo apruebe (puede editar el texto antes).
 */
import axios from 'axios';
import path from 'path';
import { execFile } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { MODULOS_ACADEMY, ModuloAcademy } from '../data/academy-catalogo';
import { createNotification } from '../controllers/notification.controller';
import { logError } from '../utils/errors';

const prisma = new PrismaClient();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const TEXT_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss';
const REPO_ROOT = path.join(__dirname, '../../..');

// El contenido del catalogo se reviso contra el codigo hasta esta fecha (hora Colombia).
export const CONTENIDO_REVISADO = '2026-10-24 23:59:59 -0500';
export const MIN_PREGUNTAS = 3;
const MAX_POR_VUELTA = 6; // la GPU atiende una solicitud a la vez: pocas por vuelta
const COMMIT_SIN_IMPACTO = /^(test|tests|chore|docs|style|refactor|ci|build)(\(|:)|^merge /i;

export interface Commit { hash: string; fecha: string; asunto: string }
export interface Borrador { titulo: string; contenido: string }

export interface PropuestasDeps {
    gitLog: (fuentes: string[], desde: string) => Promise<Commit[]>;
    redactar: (prompt: string) => Promise<Borrador | null>;
    db: typeof prisma;
    avisar: (creadas: number) => Promise<void>;
}

export function gitLog(fuentes: string[], desde: string): Promise<Commit[]> {
    return new Promise(resolve => {
        execFile('git', ['log', `--after=${desde}`, '--format=%h%x1f%ad%x1f%s', '--date=short', '--', ...fuentes], { cwd: REPO_ROOT, timeout: 30_000 }, (err, out) => {
            if (err) return resolve([]);
            resolve(String(out).split('\n').filter(Boolean).map(l => {
                const [hash, fecha, asunto] = l.split('\x1f');
                return { hash, fecha, asunto: asunto || '' };
            }));
        });
    });
}

export function parseBorrador(text: string): Borrador | null {
    const m = String(text || '').match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
        const o = JSON.parse(m[0]);
        const titulo = String(o.titulo || '').trim().slice(0, 160);
        const contenido = String(o.contenido || '').trim().slice(0, 2000);
        return titulo && contenido ? { titulo, contenido } : null;
    } catch {
        return null;
    }
}

export async function redactar(prompt: string): Promise<Borrador | null> {
    const r = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: TEXT_MODEL, prompt, stream: false, think: 'low',
        // Mismo contexto que el resto de llamadas: si cambia, Ollama recarga el modelo (~77 s)
        // y la siguiente persona que use la IA espera esa recarga (29-oct).
        options: { num_ctx: 16384, temperature: 0.2, seed: 42 },
    }, { timeout: 300_000 });
    return parseBorrador(r.data?.response || '');
}

const contexto = (m: ModuloAcademy) =>
    `MÓDULO: ${m.titulo} (${m.href || 'sin pantalla'})\nQUÉ ES: ${m.resumen}\nPARA QUÉ: ${m.paraQue}\nPASOS:\n${m.pasos.map(p => `- ${p.titulo}: ${p.detalle}`).join('\n')}`;

const REGLAS_REDACCION = `Escribe en español de Colombia, para el equipo de ALS (técnicos, comerciales, laboratorio), sin términos de programación, sin nombres de archivos ni de proveedores de tecnología. No inventes funciones que el texto no diga.`;

export function promptNovedad(m: ModuloAcademy, c: Commit): string {
    return `Eres el editor de Xmart Academy, el entrenamiento de la plataforma ALS Xmart.
${REGLAS_REDACCION}

${contexto(m)}

CAMBIO DE SOFTWARE (${c.fecha}): ${c.asunto}

Redacta una novedad corta para este módulo: qué cambió para quien usa la pantalla y qué debe hacer distinto (2 a 4 frases).
Si el cambio no afecta lo que ve o hace el usuario, responde {"titulo":"","contenido":""}.
Responde SOLO un JSON: {"titulo":"...","contenido":"..."}`;
}

export function promptPregunta(m: ModuloAcademy, preguntas: string[]): string {
    return `Eres el editor de Xmart Academy, el entrenamiento de la plataforma ALS Xmart.
${REGLAS_REDACCION}

${contexto(m)}

PREGUNTAS REALES QUE LE HICIERON AL ASISTENTE SOBRE ESTE MÓDULO:
${preguntas.map(p => `- ${p}`).join('\n')}

Redacta UNA pregunta frecuente que resuma la duda común y su respuesta paso a paso usando solo la información del módulo (máximo 6 frases).
Si la información del módulo no alcanza para responder, dilo en la respuesta y sugiere preguntarle a Operaciones.
Responde SOLO un JSON: {"titulo":"la pregunta","contenido":"la respuesta"}`;
}

let corriendo = false;

export async function generarPropuestas(deps: PropuestasDeps): Promise<{ novedades: number; preguntas: number }> {
    if (corriendo) return { novedades: 0, preguntas: 0 };
    corriendo = true;
    let novedades = 0, preguntas = 0;
    try {
        let cupo = MAX_POR_VUELTA;

        // 1. Novedades por cambios de codigo
        for (const m of MODULOS_ACADEMY) {
            if (!m.fuentes.length || cupo <= 0) continue;
            const commits = (await deps.gitLog(m.fuentes, CONTENIDO_REVISADO)).filter(c => !COMMIT_SIN_IMPACTO.test(c.asunto));
            for (const c of commits.reverse()) {
                if (cupo <= 0) break;
                const origen = `commit:${c.hash}:${m.key}`;
                if (await deps.db.academyPropuesta.findUnique({ where: { origen } })) continue;
                cupo--;
                // Si la IA falla (apagada, ocupada) se reintenta en la siguiente vuelta.
                const b = await deps.redactar(promptNovedad(m, c)).catch(e => { logError('Academy: borrador de novedad', e); return undefined; });
                if (b === undefined) continue;
                // null = sin impacto para el usuario: se registra rechazada para no volver a preguntar.
                const sinImpacto = !b;
                await deps.db.academyPropuesta.create({
                    data: {
                        modulo: m.key, tipo: 'NOVEDAD', origen,
                        titulo: b?.titulo || c.asunto.slice(0, 160),
                        contenido: b?.contenido || '(La IA consideró que este cambio no afecta lo que ve el usuario.)',
                        evidencia: `Cambio ${c.hash} del ${c.fecha}: ${c.asunto}`,
                        estado: sinImpacto ? 'RECHAZADA' : 'PENDIENTE',
                        decididoPor: sinImpacto ? 'IA (sin impacto para el usuario)' : null,
                    },
                });
                if (!sinImpacto) novedades++;
            }
        }

        // 2. Preguntas frecuentes (friccion)
        const desde = new Date(Date.now() - 30 * 86400_000);
        const recientes = await deps.db.assistantQuestion.findMany({ where: { createdAt: { gte: desde }, modulo: { not: null } }, orderBy: { createdAt: 'asc' } });
        const usadas = new Set((await deps.db.academyPropuesta.findMany({ where: { tipo: 'PREGUNTA' }, select: { origen: true } }))
            .flatMap(p => p.origen.replace(/^preguntas:/, '').split(',')));
        const porModulo = new Map<string, typeof recientes>();
        for (const q of recientes) if (!usadas.has(q.id)) porModulo.set(q.modulo!, [...(porModulo.get(q.modulo!) || []), q]);
        for (const [key, qs] of porModulo) {
            const m = MODULOS_ACADEMY.find(x => x.key === key);
            if (!m || qs.length < MIN_PREGUNTAS || cupo <= 0) continue;
            cupo--;
            const muestra = qs.slice(-15);
            const b = await deps.redactar(promptPregunta(m, muestra.map(q => q.pregunta))).catch(e => { logError('Academy: borrador de pregunta', e); return null; });
            if (!b) continue;
            await deps.db.academyPropuesta.create({
                data: {
                    modulo: m.key, tipo: 'PREGUNTA', origen: `preguntas:${qs.map(q => q.id).join(',')}`,
                    titulo: b.titulo, contenido: b.contenido,
                    evidencia: `${qs.length} preguntas en 30 días, por ejemplo:\n${muestra.slice(-5).map(q => `- ${q.pregunta}`).join('\n')}`,
                },
            });
            preguntas++;
        }

        if (novedades + preguntas > 0) await deps.avisar(novedades + preguntas);
        return { novedades, preguntas };
    } finally {
        corriendo = false;
    }
}

async function avisarAprobadores(creadas: number) {
    const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true }, select: { id: true } });
    for (const a of admins) {
        await createNotification(a.id, 'Xmart Academy: propuestas por aprobar', `La IA preparó ${creadas} propuesta(s) para el entrenamiento. Revísalas en Xmart Academy → Propuestas.`, 'INFO');
    }
}

export const propuestasDeps: PropuestasDeps = { gitLog, redactar, db: prisma, avisar: avisarAprobadores };

export const ejecutarPropuestas = () => generarPropuestas(propuestasDeps);

// Una vuelta 15 minutos despues de arrancar y luego cada dia. ACADEMY_PROPUESTAS=0 la apaga.
export function startAcademyScheduler() {
    if (process.env.ACADEMY_PROPUESTAS === '0') return;
    const vuelta = () => ejecutarPropuestas()
        .then(r => { if (r.novedades + r.preguntas) console.log(`[Academy] Propuestas nuevas: ${r.novedades} novedades, ${r.preguntas} preguntas frecuentes`); })
        .catch(e => logError('Academy: vuelta de propuestas', e));
    setTimeout(vuelta, 15 * 60_000).unref();
    setInterval(vuelta, 24 * 3600_000).unref();
}
