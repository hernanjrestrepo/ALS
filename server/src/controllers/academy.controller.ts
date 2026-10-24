import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GRUPOS_ACADEMY, MODULOS_ACADEMY } from '../data/academy-catalogo';
import { idiomaAcademy, nombreGrupo, traducirModulo } from '../data/academy-traduccion';
import { ejecutarPropuestas } from '../services/academyPropuestas';
import { logError } from '../utils/errors';

const prisma = new PrismaClient();

// Catalogo + lo aprobado (novedades y preguntas frecuentes) para la pantalla /academy.
export const getAcademy = async (req: Request, res: Response) => {
    try {
        const aprobadas = await prisma.academyPropuesta.findMany({
            where: { estado: 'APROBADA' }, orderBy: { decididoEn: 'desc' },
            select: { id: true, modulo: true, tipo: true, titulo: true, contenido: true, decididoEn: true },
        });
        const lang = idiomaAcademy(req.headers['x-lang']);
        const modulos = MODULOS_ACADEMY.map(m0 => traducirModulo(m0, lang)).map(({ fuentes, palabras, ...m }) => ({
            ...m,
            novedades: aprobadas.filter(a => a.modulo === m.key && a.tipo === 'NOVEDAD').slice(0, 10),
            preguntasAprobadas: aprobadas.filter(a => a.modulo === m.key && a.tipo === 'PREGUNTA'),
        }));
        // grupo sigue en espanol (es la clave); gruposNombre es lo que se muestra.
        res.json({ grupos: GRUPOS_ACADEMY, gruposNombre: Object.fromEntries(GRUPOS_ACADEMY.map(g => [g, nombreGrupo(g, lang)])), modulos });
    } catch (error) {
        logError('Academy: no se pudo cargar', error);
        res.status(500).json({ error: 'No se pudo cargar Xmart Academy' });
    }
};

export const listPropuestas = async (req: Request, res: Response) => {
    const estado = String(req.query.estado || 'PENDIENTE').toUpperCase();
    const where = ['PENDIENTE', 'APROBADA', 'RECHAZADA'].includes(estado) ? { estado } : {};
    res.json(await prisma.academyPropuesta.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }));
};

// Aprobar (con el texto editado, si lo cambio) o rechazar.
export const decidirPropuesta = async (req: Request, res: Response) => {
    const { aprobar, titulo, contenido } = req.body || {};
    if (typeof aprobar !== 'boolean') return res.status(400).json({ error: 'Falta "aprobar": true o false' });
    const actual = await prisma.academyPropuesta.findUnique({ where: { id: req.params.id } });
    if (!actual) return res.status(404).json({ error: 'Propuesta no encontrada' });
    const user = await prisma.user.findUnique({ where: { id: (req as any).user?.userId }, select: { name: true, email: true } });
    const t = typeof titulo === 'string' && titulo.trim() ? titulo.trim().slice(0, 160) : actual.titulo;
    const c = typeof contenido === 'string' && contenido.trim() ? contenido.trim().slice(0, 4000) : actual.contenido;
    const updated = await prisma.academyPropuesta.update({
        where: { id: actual.id },
        data: { estado: aprobar ? 'APROBADA' : 'RECHAZADA', titulo: t, contenido: c, decididoPor: user?.name || user?.email || 'administrador', decididoEn: new Date() },
    });
    res.json(updated);
};

// Buscar propuestas ahora (corre en segundo plano: la IA puede tardar varios minutos).
export const buscarPropuestas = async (_req: Request, res: Response) => {
    ejecutarPropuestas()
        .then(r => console.log(`[Academy] Busqueda manual: ${r.novedades} novedades, ${r.preguntas} preguntas frecuentes`))
        .catch(e => logError('Academy: busqueda manual', e));
    res.status(202).json({ message: 'Buscando propuestas. Te llega una notificación si hay nuevas.' });
};
