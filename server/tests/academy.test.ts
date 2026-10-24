import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('../src/controllers/notification.controller', () => ({ createNotification: vi.fn() }));

import { MODULOS_ACADEMY, moduloDePregunta } from '../src/data/academy-catalogo';
import { generarPropuestas, parseBorrador, promptNovedad, MIN_PREGUNTAS, PropuestasDeps } from '../src/services/academyPropuestas';

const ROOT = path.join(__dirname, '../..');

describe('catalogo de Xmart Academy', () => {
    it('cada modulo tiene clave unica, pasos y fuentes que existen en el codigo', () => {
        const keys = MODULOS_ACADEMY.map(m => m.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const m of MODULOS_ACADEMY) {
            expect(m.pasos.length, m.key).toBeGreaterThan(0);
            for (const f of m.fuentes) expect(fs.existsSync(path.join(ROOT, f)), `${m.key}: ${f}`).toBe(true);
        }
    });

    it('cada enlace "Ir al modulo" es una ruta de la aplicacion', () => {
        const app = fs.readFileSync(path.join(ROOT, 'client/src/App.tsx'), 'utf8');
        for (const m of MODULOS_ACADEMY.filter(x => x.href && x.href !== '/')) {
            expect(app.includes(`"${m.href!.slice(1)}"`) || app.includes(`'${m.href!.slice(1)}'`), `${m.key}: ${m.href}`).toBe(true);
        }
    });

    it('sabe de que modulo es una pregunta', () => {
        expect(moduloDePregunta('¿Cómo leo la planilla con una foto?')).toBe('muestreo');
        expect(moduloDePregunta('por qué mi cotización sigue en análisis')).toBe('cotizaciones');
        expect(moduloDePregunta('hola')).toBeNull();
    });
});

function fakeDb() {
    const propuestas: any[] = [];
    const preguntas: any[] = [];
    return {
        propuestas, preguntas,
        academyPropuesta: {
            findUnique: vi.fn(async ({ where }: any) => propuestas.find(p => p.origen === where.origen) || null),
            findMany: vi.fn(async ({ where }: any) => propuestas.filter(p => !where?.tipo || p.tipo === where.tipo)),
            create: vi.fn(async ({ data }: any) => { const p = { id: `p${propuestas.length}`, estado: 'PENDIENTE', ...data }; propuestas.push(p); return p; }),
        },
        assistantQuestion: { findMany: vi.fn(async () => preguntas) },
    };
}

const deps = (over: Partial<PropuestasDeps> & { db: any }): PropuestasDeps => ({
    gitLog: async () => [],
    redactar: async () => ({ titulo: 'Novedad', contenido: 'Ahora se puede X.' }),
    avisar: vi.fn(async () => undefined),
    ...over,
} as any);

describe('propuestas de la IA', () => {
    it('un cambio de codigo crea una novedad PENDIENTE, una sola vez, y avisa', async () => {
        const db = fakeDb();
        const d = deps({ db, gitLog: async f => (f.includes('server/src/services/sheetFill.ts') ? [{ hash: 'abc123', fecha: '2026-10-25', asunto: 'feat(planillas): lee Excel con varias hojas' }] : []) });
        const r1 = await generarPropuestas(d);
        expect(r1.novedades).toBe(1);
        expect(db.propuestas[0]).toMatchObject({ modulo: 'muestreo', tipo: 'NOVEDAD', estado: 'PENDIENTE', origen: 'commit:abc123:muestreo' });
        expect(d.avisar).toHaveBeenCalledWith(1);
        const r2 = await generarPropuestas(d);
        expect(r2.novedades).toBe(0);
        expect(db.propuestas).toHaveLength(1);
    });

    it('ignora commits de pruebas o mantenimiento', async () => {
        const db = fakeDb();
        const redactar = vi.fn(async () => ({ titulo: 'x', contenido: 'y' }));
        await generarPropuestas(deps({ db, redactar, gitLog: async () => [{ hash: 'h1', fecha: '2026-10-25', asunto: 'test: mas casos' }, { hash: 'h2', fecha: '2026-10-25', asunto: 'chore: limpieza' }] }));
        expect(redactar).not.toHaveBeenCalled();
        expect(db.propuestas).toHaveLength(0);
    });

    it('si la IA dice que no afecta al usuario, queda rechazada y no se vuelve a preguntar', async () => {
        const db = fakeDb();
        await generarPropuestas(deps({ db, redactar: async () => null, gitLog: async f => (f.includes('client/src/pages/ClientsPage.tsx') ? [{ hash: 'z9', fecha: '2026-10-25', asunto: 'fix(clientes): orden interno' }] : []) }));
        expect(db.propuestas[0].estado).toBe('RECHAZADA');
    });

    it('si la IA falla no registra nada (se reintenta en la siguiente vuelta)', async () => {
        const db = fakeDb();
        await generarPropuestas(deps({ db, redactar: async () => { throw new Error('ollama apagado'); }, gitLog: async f => (f.includes('client/src/pages/ClientsPage.tsx') ? [{ hash: 'z9', fecha: '2026-10-25', asunto: 'feat(clientes): x' }] : []) }));
        expect(db.propuestas).toHaveLength(0);
    });

    it(`con ${MIN_PREGUNTAS} preguntas sobre un modulo propone una pregunta frecuente; con menos no`, async () => {
        const db = fakeDb();
        db.preguntas.push({ id: 'q1', modulo: 'muestreo', pregunta: '¿cómo leo la planilla?' }, { id: 'q2', modulo: 'muestreo', pregunta: 'la planilla no se lee' });
        const redactar = vi.fn(async () => ({ titulo: '¿Cómo leer la planilla?', contenido: 'Toma la foto…' }));
        expect((await generarPropuestas(deps({ db, redactar }))).preguntas).toBe(0);
        db.preguntas.push({ id: 'q3', modulo: 'muestreo', pregunta: 'planilla en pdf' });
        expect((await generarPropuestas(deps({ db, redactar }))).preguntas).toBe(1);
        expect(db.propuestas[0]).toMatchObject({ tipo: 'PREGUNTA', modulo: 'muestreo', origen: 'preguntas:q1,q2,q3' });
        expect(db.propuestas[0].evidencia).toContain('3 preguntas');
        // las mismas preguntas no se vuelven a usar
        expect((await generarPropuestas(deps({ db, redactar }))).preguntas).toBe(0);
    });

    it('lee el borrador JSON de la IA aunque venga con texto alrededor', () => {
        expect(parseBorrador('Claro: {"titulo":"A","contenido":"B"} listo')).toEqual({ titulo: 'A', contenido: 'B' });
        expect(parseBorrador('{"titulo":"","contenido":""}')).toBeNull();
        expect(parseBorrador('sin json')).toBeNull();
    });

    it('el pedido a la IA prohibe terminos tecnicos y nombres de proveedores', () => {
        const p = promptNovedad(MODULOS_ACADEMY.find(m => m.key === 'muestreo')!, { hash: 'a', fecha: '2026-10-25', asunto: 'feat: x' });
        expect(p).toContain('sin nombres de archivos ni de proveedores');
    });
});
