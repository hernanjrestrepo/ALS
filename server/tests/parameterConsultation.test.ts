import { describe, it, expect, vi, beforeEach } from 'vitest';

// Base de datos simulada: el flujo de consultas se prueba sin tocar produccion.
const db = vi.hoisted(() => ({
    user: { findFirst: vi.fn() },
    parameterConsultation: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    parameterRule: { findMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
}));
const notify = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
    PrismaClient: class {
        constructor() { return db as any; }
    },
}));
vi.mock('../src/controllers/notification.controller', () => ({ createNotification: notify }));

import {
    registerParameterConsultations, loadParameterRules, listParameterConsultations,
    answerParameterConsultation, CONSULTA_USER_EMAIL,
} from '../src/controllers/quotation.controller';
import { pendingNameQuestions } from '../src/services/quotationCompliance';
import quotationRoutes from '../src/routes/quotation.routes';
import { requireAdmin } from '../src/middleware/auth.middleware';

const res = () => {
    const r: any = { statusCode: 200, body: undefined };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: unknown) => { r.body = b; return r; };
    return r;
};

const question = { normParameter: 'Nitrógeno Total (N)', quotedAs: 'Nitrógeno Kjeldahl', normReference: '20 mg/L' };

beforeEach(() => {
    vi.clearAllMocks();
    db.parameterConsultation.findUnique.mockResolvedValue(null);
    db.parameterConsultation.create.mockImplementation(async ({ data }: any) => ({ id: 'c1', ...data }));
    db.user.findFirst.mockResolvedValue({ id: 'ana-id' });
    db.$transaction.mockImplementation(async (ops: any[]) => Promise.all(ops));
});

describe('registerParameterConsultations (bandeja de ALS, sin correo)', () => {
    it('crea la consulta y avisa en la bandeja de Ana Melendez', async () => {
        await registerParameterConsultations([question], 'SIACOT-1');
        expect(db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: { email: { equals: CONSULTA_USER_EMAIL, mode: 'insensitive' }, isActive: true },
        }));
        expect(db.parameterConsultation.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                normParameter: question.normParameter,
                quotedAs: question.quotedAs,
                quotationNumber: 'SIACOT-1',
                notifiedUserId: 'ana-id',
                notifiedAt: expect.any(Date),
            }),
        });
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith('ana-id', 'Consulta de parámetro', expect.stringContaining('Consultas de parámetros'), 'WARNING');
        expect(notify.mock.calls[0][2]).toContain('SIACOT-1');
    });

    it('no vuelve a preguntar una pareja ya consultada (ni pendiente ni respondida)', async () => {
        db.parameterConsultation.findUnique.mockResolvedValue({ id: 'c0', status: 'PENDIENTE' });
        await registerParameterConsultations([question], 'SIACOT-2');
        expect(db.parameterConsultation.create).not.toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
    });

    it('la misma pareja en orden inverso cuenta como la misma consulta', async () => {
        await registerParameterConsultations([question], 'SIACOT-3');
        const key1 = db.parameterConsultation.findUnique.mock.calls[0][0].where.key;
        db.parameterConsultation.findUnique.mockClear();
        await registerParameterConsultations([{ normParameter: 'Nitrógeno Kjeldahl', quotedAs: 'Nitrógeno Total (N)', normReference: '' }], 'SIACOT-4');
        const key2 = db.parameterConsultation.findUnique.mock.calls[0][0].where.key;
        expect(key2).toBe(key1);
    });

    it('si no existe el usuario, la consulta queda guardada sin notificar', async () => {
        db.user.findFirst.mockResolvedValue(null);
        await registerParameterConsultations([question], 'SIACOT-5');
        expect(db.parameterConsultation.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ notifiedUserId: null, notifiedAt: null }),
        });
        expect(notify).not.toHaveBeenCalled();
    });

    it('si dos analisis crean la misma consulta a la vez, el segundo no falla ni notifica', async () => {
        db.parameterConsultation.create.mockRejectedValueOnce(new Error('Unique constraint failed'));
        await expect(registerParameterConsultations([question], 'SIACOT-6')).resolves.toBeUndefined();
        expect(notify).not.toHaveBeenCalled();
    });

    it('sin preguntas no consulta nada', async () => {
        await registerParameterConsultations([], 'SIACOT-7');
        expect(db.user.findFirst).not.toHaveBeenCalled();
    });

    it('las preguntas salen de las comparaciones que no se pueden decidir (NOMBRE_DISTINTO)', () => {
        const checks: any[] = [
            { normParameter: 'Nitrógeno Total (N)', normLimit: '20 mg/L', quotedAs: 'Nitrógeno Kjeldahl', problems: [{ type: 'NOMBRE_DISTINTO', detail: 'x' }] },
            { normParameter: 'pH', quotedAs: 'Ph', problems: [] },
            { normParameter: 'Cadmio', problems: [{ type: 'FALTANTE' }] },
        ];
        expect(pendingNameQuestions(checks)).toEqual([{ normParameter: 'Nitrógeno Total (N)', quotedAs: 'Nitrógeno Kjeldahl', normReference: '20 mg/L' }]);
    });
});

describe('loadParameterRules', () => {
    it('suma las reglas aprendidas a las listas fijas, separadas por tipo', async () => {
        db.parameterRule.findMany.mockResolvedValue([
            { nameA: 'Nitrógeno Total', nameB: 'Nitrógeno Kjeldahl', sameParameter: true },
            { nameA: 'Cloruros', nameB: 'Cloro', sameParameter: false },
        ]);
        const rules = await loadParameterRules();
        expect(rules.equivalent).toContainEqual(['Nitrógeno Total', 'Nitrógeno Kjeldahl']);
        expect(rules.equivalent).toContainEqual(['Coliformes fecales', 'Coliformes termotolerantes']); // lista fija
        expect(rules.nonEquivalent).toContainEqual(['Cloruros', 'Cloro']);
        expect(rules.nonEquivalent).toContainEqual(['Fenoles', 'Compuestos fenólicos']); // lista fija
        expect(rules.equivalent).not.toContainEqual(['Cloruros', 'Cloro']);
    });
});

describe('listParameterConsultations', () => {
    it('devuelve las consultas', async () => {
        db.parameterConsultation.findMany.mockResolvedValue([{ id: 'c1' }]);
        const r = res();
        await listParameterConsultations({} as any, r);
        expect(r.body).toEqual([{ id: 'c1' }]);
    });
});

describe('answerParameterConsultation', () => {
    const consultation = { id: 'c1', normParameter: 'Nitrógeno Total (N)', quotedAs: 'Nitrógeno Kjeldahl' };

    it('rechaza una respuesta que no es si/no', async () => {
        const r = res();
        await answerParameterConsultation({ params: { id: 'c1' }, body: { same: 'si' } } as any, r);
        expect(r.statusCode).toBe(400);
        expect(db.parameterConsultation.update).not.toHaveBeenCalled();
        expect(db.parameterRule.upsert).not.toHaveBeenCalled();
    });

    it('responde 404 si la consulta no existe', async () => {
        db.parameterConsultation.findUnique.mockResolvedValue(null);
        const r = res();
        await answerParameterConsultation({ params: { id: 'nope' }, body: { same: true } } as any, r);
        expect(r.statusCode).toBe(404);
    });

    it('"sí" registra la regla de equivalencia y marca la consulta respondida', async () => {
        db.parameterConsultation.findUnique.mockResolvedValue(consultation);
        db.parameterConsultation.update.mockResolvedValue({ ...consultation, status: 'RESPONDIDA', answerSame: true });
        db.parameterRule.upsert.mockResolvedValue({});
        const r = res();
        await answerParameterConsultation({ params: { id: 'c1' }, body: { same: true, note: 'Lo mide el laboratorio como Kjeldahl' } } as any, r);
        expect(db.parameterRule.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { nameA_nameB: { nameA: 'Nitrógeno Total (N)', nameB: 'Nitrógeno Kjeldahl' } },
            create: expect.objectContaining({ sameParameter: true, source: 'consulta c1' }),
        }));
        expect(db.parameterConsultation.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'RESPONDIDA', answerSame: true, answerNote: 'Lo mide el laboratorio como Kjeldahl' }),
        }));
        expect(r.statusCode).toBe(200);
    });

    it('"no" registra la regla de NO equivalencia (queda como distinto, no como faltante)', async () => {
        db.parameterConsultation.findUnique.mockResolvedValue(consultation);
        db.parameterConsultation.update.mockResolvedValue({});
        db.parameterRule.upsert.mockResolvedValue({});
        await answerParameterConsultation({ params: { id: 'c1' }, body: { same: false } } as any, res());
        expect(db.parameterRule.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ sameParameter: false }),
            update: expect.objectContaining({ sameParameter: false }),
        }));
    });

    it('la nota se corta a 500 caracteres', async () => {
        db.parameterConsultation.findUnique.mockResolvedValue(consultation);
        db.parameterConsultation.update.mockResolvedValue({});
        db.parameterRule.upsert.mockResolvedValue({});
        await answerParameterConsultation({ params: { id: 'c1' }, body: { same: true, note: 'x'.repeat(900) } } as any, res());
        expect(db.parameterConsultation.update.mock.calls[0][0].data.answerNote).toHaveLength(500);
    });
});

describe('rutas', () => {
    it('las rutas de consultas van antes de /:id para no confundirse con un id de cotizacion', () => {
        const paths = (quotationRoutes as any).stack.map((l: any) => l.route?.path).filter(Boolean);
        const idx = paths.indexOf('/:id');
        expect(paths.indexOf('/parameter-consultations')).toBeGreaterThanOrEqual(0);
        expect(paths.indexOf('/parameter-consultations')).toBeLessThan(idx);
        expect(paths.indexOf('/parameter-consultations/:id/answer')).toBeLessThan(idx);
    });

    it('las rutas de consultas exigen rol administrador', () => {
        const layers = (quotationRoutes as any).stack.filter((l: any) => l.route?.path?.startsWith('/parameter-consultations'));
        expect(layers.length).toBe(2);
        for (const l of layers) {
            expect(l.route.stack.map((s: any) => s.handle)).toContain(requireAdmin);
        }
    });
});
