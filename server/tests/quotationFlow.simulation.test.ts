// Simulacion del flujo completo de una cotizacion: runQuotationAnalysis real, con base
// de datos en memoria y la IA simulada (no hay Ollama ni produccion involucrados).
// Usa el texto real de la cotizacion de Ana (SIACOT-20938) y las normas reales.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const store = vi.hoisted(() => {
    const s: any = {
        quotations: new Map<string, any>(),
        standards: [] as any[],
        consultations: [] as any[],
        rules: [] as any[],
        users: [] as any[],
        notifications: [] as any[],
        failConsultationCreate: false,
    };
    return s;
});

vi.mock('@prisma/client', () => {
    const uniq = (rows: any[], where: any) => rows.find(r => Object.entries(where).every(([k, v]) => r[k] === v));
    const db = {
        quotation: {
            findUnique: async ({ where }: any) => {
                const q = store.quotations.get(where.id) || (where.quotationNumber ? [...store.quotations.values()].find(q => q.quotationNumber === where.quotationNumber) : null);
                return q ? { ...q } : null;
            },
            update: async ({ where, data }: any) => {
                const q = store.quotations.get(where.id);
                Object.assign(q, data, { updatedAt: new Date() });
                return { ...q };
            },
        },
        standard: { findMany: async () => store.standards.map(s => ({ ...s })) },
        parameterRule: {
            findMany: async () => store.rules.map(r => ({ ...r })),
            upsert: async ({ where, create, update }: any) => {
                const key = where.nameA_nameB;
                const r = store.rules.find(x => x.nameA === key.nameA && x.nameB === key.nameB);
                if (r) Object.assign(r, update); else store.rules.push({ ...create });
                return {};
            },
        },
        parameterConsultation: {
            findUnique: async ({ where }: any) => store.consultations.find(c => (where.key && c.key === where.key) || (where.id && c.id === where.id)) || null,
            findMany: async () => store.consultations.map(c => ({ ...c })),
            findFirst: async () => null,
            create: async ({ data }: any) => {
                if (store.failConsultationCreate) throw new Error('base caida');
                if (store.consultations.some(c => c.key === data.key)) throw new Error('Unique constraint failed');
                const row = { id: `c${store.consultations.length + 1}`, status: 'PENDIENTE', answerSame: null, ...data };
                store.consultations.push(row);
                return { ...row };
            },
            update: async ({ where, data }: any) => {
                const c = store.consultations.find(x => x.id === where.id);
                Object.assign(c, data);
                return { ...c };
            },
        },
        user: {
            findFirst: async ({ where }: any) => {
                const email = where.email.equals.toLowerCase();
                return store.users.find(u => u.email.toLowerCase() === email && u.isActive) || null;
            },
        },
        $transaction: async (ops: any[]) => Promise.all(ops),
    };
    return { PrismaClient: class { constructor() { return db as any; } } };
});

// Notificaciones: se guardan en memoria en lugar de la tabla de notificaciones.
vi.mock('../src/controllers/notification.controller', () => ({
    createNotification: async (userId: string, title: string, message: string, type: string) => {
        store.notifications.push({ userId, title, message, type });
    },
}));

import { runQuotationAnalysis, answerParameterConsultation, listParameterConsultations } from '../src/controllers/quotation.controller';
import { pdfService } from '../src/services/pdf.service';
import { aiService } from '../src/services/ai.service';
import { buildArticleBlocks, parseComparisonTargets } from '../src/services/quotationCompliance';

const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/quotation-compliance.json'), 'utf-8'));
const UPLOAD = path.join(__dirname, '../uploads/sim-quotation-test.pdf');
const ANA_ID = 'ana-user-id';

// Lo que devolveria el modelo para la cotizacion de Ana: "Nitrogeno" no esta en la norma
// del articulo 2.2.3.3.9.7, asi que un caso mixto mas util es usar el 2.2.3.3.9.7 con un
// nombre no resuelto: "Coliformes termotolerantes" ya es regla fija, asi que se simula otra pareja.
const aiAnswerWithDoubt = (extra: any[] = []) => JSON.stringify({
    parameters: [
        { normParameter: 'Coliformes fecales', normLimit: '200 microorganismos/100mL', quotedAs: 'Aguas Coliformes Termotolerantes (Agua Potable)', quotedLoq: '0 UFC/100 mL', problems: [] },
        { normParameter: 'Coliformes totales', normLimit: '1000 microorganismos/100mL', quotedAs: 'Aguas Coliformes Totales (Agua Potable)', quotedLoq: '0 UFC/100 mL', problems: [] },
        { normParameter: 'Compuestos Fenólicos', normLimit: '0.002 mg/L', quotedAs: 'Aguas Fenoles', quotedLoq: '0.1 mg/L', problems: [] },
        { normParameter: 'Oxígeno disuelto', normLimit: '70 %', problems: [] },
        { normParameter: 'pH', normLimit: '5.0-9.0 Unidades', problems: [] },
        { normParameter: 'Tensoactivos', normLimit: '0.5 mg/L', quotedAs: 'Aguas Detergentes (Saam)', quotedLoq: '0.4 mg SAAM/L', problems: [] },
        { normParameter: 'Grasas y aceites flotantes', normLimit: 'Ausencia', problems: [] },
        { normParameter: 'Materiales flotantes', normLimit: 'Ausencia', problems: [] },
        ...extra,
    ],
    quotationNumberFound: 'SIACOT-20938-10-2026',
});

const seed = (over: any = {}) => {
    const q = {
        id: 'q-ana', quotationNumber: 'COT-1791', status: 'ANALYZING', fileUrl: '/uploads/sim-quotation-test.pdf',
        complianceResult: null, approvedForOit: false, extractedText: null, aiData: null, ...over,
    };
    store.quotations.set(q.id, q);
    return q;
};

let chatSpy: any;
let aiQueue: Array<() => Promise<string>> = [];
let extractSpy: any;
let analyzeDocSpy: any;

beforeEach(() => {
    store.quotations.clear();
    store.consultations.length = 0;
    store.rules.length = 0;
    store.notifications.length = 0;
    store.failConsultationCreate = false;
    store.standards = [
        { id: 's1', title: 'Decreto 1076 de 2015 Decreto único ACT Decreto 703 de 2018', category: 'decreto', content: fx.decreto1076.content, createdAt: new Date() },
    ];
    store.users = [{ id: ANA_ID, email: 'ana.melendez@alsglobal.com', isActive: true }];
    fs.writeFileSync(UPLOAD, 'simulado');
    extractSpy = vi.spyOn(pdfService, 'extractText').mockResolvedValue(fx.siacot20938);
    analyzeDocSpy = vi.spyOn(aiService, 'analyzeDocument').mockResolvedValue({ status: 'check', alerts: [], missing: [], evidence: [] } as any);
    aiQueue = [];
    chatSpy = vi.spyOn(aiService, 'chat').mockImplementation(async () => {
        const next = aiQueue.shift();
        if (!next) throw new Error('la IA simulada no tiene respuesta preparada');
        return next();
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (fs.existsSync(UPLOAD)) fs.unlinkSync(UPLOAD);
});

describe('simulacion: cotizacion de Ana de principio a fin', () => {
    it('el articulo pedido llega a la IA (no el 2.2.3.3.9.3) y el veredicto es el esperado', async () => {
        seed();
        aiQueue.push(async () => aiAnswerWithDoubt());
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        const prompt: string = chatSpy.mock.calls[0][0];
        expect(prompt).toContain('2.2.3.3.9.7');
        expect(prompt).not.toContain('Arsénico');
        expect(chatSpy.mock.calls[0][4]).toBe(600_000); // limite medido: ~225 s en produccion
        const q = store.quotations.get('q-ana');
        expect(q.quotationNumber).toBe('SIACOT-20938-10-2026'); // numero real del PDF
        expect(q.status).toBe('NON_COMPLIANT');                  // matriz + fenoles
        const r = JSON.parse(q.complianceResult);
        expect(r.issues.map((i: any) => i.category)).toContain('Matriz distinta a la muestra');
        expect(r.issues.some((i: any) => i.category === 'Parámetro incorrecto' && i.parameter === 'Compuestos Fenólicos')).toBe(true);
        // Equivalencias confirmadas por Ana: sin dudas ni notificaciones
        expect(store.consultations).toHaveLength(0);
        expect(store.notifications).toHaveLength(0);
    });

    it('una duda de nombre crea UNA consulta y UNA notificacion en la bandeja de Ana', async () => {
        seed();
        // Nitrogeno Total de la norma vs Kjeldahl de la cotizacion: no hay regla todavia
        const extra = [{ normParameter: 'Nitrógeno Total (N)', normLimit: '20 mg/L', quotedAs: 'Nitrógeno Kjeldahl', quotedLoq: '5 mg/L', problems: [] }];
        aiQueue.push(async () => aiAnswerWithDoubt(extra));
        extractSpy.mockResolvedValue(fx.siacot20938 + '\nNitrógeno Kjeldahl 5,0 mg/L');
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        expect(store.consultations).toHaveLength(1);
        expect(store.consultations[0]).toMatchObject({ normParameter: 'Nitrógeno Total (N)', quotedAs: 'Nitrógeno Kjeldahl', notifiedUserId: ANA_ID, status: 'PENDIENTE' });
        expect(store.notifications).toHaveLength(1);
        expect(store.notifications[0].userId).toBe(ANA_ID);
        expect(store.notifications[0].message).toContain('SIACOT-20938-10-2026');
        expect(store.notifications[0].message).toContain('Consultas de parámetros');
        // Con duda pendiente la cotizacion queda para revision, no aprobada
        expect(store.quotations.get('q-ana').approvedForOit).toBe(false);
    });

    it('si Ana responde "si", el siguiente analisis ya no pregunta y aplica la regla', async () => {
        seed();
        const extra = [{ normParameter: 'Nitrógeno Total (N)', normLimit: '20 mg/L', quotedAs: 'Nitrógeno Kjeldahl', quotedLoq: '5 mg/L', problems: [] }];
        extractSpy.mockResolvedValue(fx.siacot20938 + '\nNitrógeno Kjeldahl 5,0 mg/L');
        aiQueue.push(async () => aiAnswerWithDoubt(extra));
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        const id = store.consultations[0].id;

        // Ana responde desde la pantalla (endpoint real, admin)
        const res: any = { statusCode: 200, body: undefined, status(c: number) { this.statusCode = c; return this; }, json(b: any) { this.body = b; return this; } };
        await answerParameterConsultation({ params: { id }, body: { same: true, note: 'Lo mide el laboratorio como Kjeldahl' } } as any, res);
        expect(res.statusCode).toBe(200);
        expect(store.rules).toEqual([expect.objectContaining({ nameA: 'Nitrógeno Total (N)', nameB: 'Nitrógeno Kjeldahl', sameParameter: true })]);

        // Segundo analisis: sin nueva consulta ni notificacion
        store.quotations.get('q-ana').status = 'ANALYZING';
        aiQueue.push(async () => aiAnswerWithDoubt(extra));
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        expect(store.consultations).toHaveLength(1);
        expect(store.notifications).toHaveLength(1);
        const r = JSON.parse(store.quotations.get('q-ana').complianceResult);
        expect(r.issues.some((i: any) => i.parameter === 'Nitrógeno Total (N)')).toBe(false);
    });

    it('si Ana responde "no", esa pareja pasa a parametro incorrecto (critico)', async () => {
        seed();
        const extra = [{ normParameter: 'Nitrógeno Total (N)', normLimit: '20 mg/L', quotedAs: 'Nitrógeno Kjeldahl', quotedLoq: '5 mg/L', problems: [] }];
        extractSpy.mockResolvedValue(fx.siacot20938 + '\nNitrógeno Kjeldahl 5,0 mg/L');
        aiQueue.push(async () => aiAnswerWithDoubt(extra));
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        const res: any = { statusCode: 200, status(c: number) { this.statusCode = c; return this; }, json() { return this; } };
        await answerParameterConsultation({ params: { id: store.consultations[0].id }, body: { same: false } } as any, res);
        store.quotations.get('q-ana').status = 'ANALYZING';
        aiQueue.push(async () => aiAnswerWithDoubt(extra));
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        const r = JSON.parse(store.quotations.get('q-ana').complianceResult);
        expect(r.issues.some((i: any) => i.category === 'Parámetro incorrecto' && i.parameter === 'Nitrógeno Total (N)')).toBe(true);
        expect(store.quotations.get('q-ana').status).toBe('NON_COMPLIANT');
    });

    it('si la consulta no se puede guardar, el veredicto de la cotizacion igual se registra', async () => {
        seed();
        store.failConsultationCreate = true;
        const extra = [{ normParameter: 'Nitrógeno Total (N)', normLimit: '20 mg/L', quotedAs: 'Nitrógeno Kjeldahl', quotedLoq: '5 mg/L', problems: [] }];
        aiQueue.push(async () => aiAnswerWithDoubt(extra));
        extractSpy.mockResolvedValue(fx.siacot20938 + '\nNitrógeno Kjeldahl 5,0 mg/L');
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        const q = store.quotations.get('q-ana');
        expect(q.status).not.toBe('ANALYZING');
        expect(q.complianceResult).toBeTruthy();
        expect(store.notifications).toHaveLength(0);
    });

    it('si el usuario Ana no existe o esta inactivo, la consulta queda visible sin notificar', async () => {
        seed();
        store.users = [];
        const extra = [{ normParameter: 'Nitrógeno Total (N)', normLimit: '20 mg/L', quotedAs: 'Nitrógeno Kjeldahl', quotedLoq: '5 mg/L', problems: [] }];
        extractSpy.mockResolvedValue(fx.siacot20938 + '\nNitrógeno Kjeldahl 5,0 mg/L');
        aiQueue.push(async () => aiAnswerWithDoubt(extra));
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        expect(store.consultations).toHaveLength(1);
        expect(store.consultations[0].notifiedUserId).toBeNull();
        expect(store.notifications).toHaveLength(0);
        const list: any = { body: undefined, json(b: any) { this.body = b; return this; }, status() { return this; } };
        await listParameterConsultations({} as any, list);
        expect(list.body).toHaveLength(1);
    });
});

describe('simulacion: la IA tarda o responde mal', () => {
    it('timeout en el primer intento: espera 90 s y reintenta; si el reintento responde, la revision sale normal', async () => {
        vi.useFakeTimers();
        seed();
        const timeout = Object.assign(new Error('timeout of 180000ms exceeded'), { code: 'ECONNABORTED' });
        aiQueue.push(async () => { throw timeout; }, async () => aiAnswerWithDoubt());
        const run = runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        await vi.advanceTimersByTimeAsync(90_000);
        await run;
        expect(chatSpy).toHaveBeenCalledTimes(2);
        const q = store.quotations.get('q-ana');
        expect(JSON.parse(q.complianceResult).warnings).toEqual([]);
        expect(q.status).toBe('NON_COMPLIANT');
    });

    it('timeout en los dos intentos: mensaje "IA ocupada" y la cotizacion queda para revisar', async () => {
        vi.useFakeTimers();
        seed();
        const timeout = () => Promise.reject(Object.assign(new Error('timeout of 180000ms exceeded'), { code: 'ECONNABORTED' }));
        aiQueue.push(timeout, timeout);
        const run = runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        await vi.advanceTimersByTimeAsync(90_000);
        await run;
        expect(chatSpy).toHaveBeenCalledTimes(2);
        const q = store.quotations.get('q-ana');
        // Sin revision de la IA, la matriz distinta que el sistema detecta sin IA sigue siendo un hallazgo critico.
        expect(q.status).toBe('NON_COMPLIANT');
        expect(q.approvedForOit).toBe(false);
        const r = JSON.parse(q.complianceResult);
        expect(r.warnings[0].category).toBe('IA ocupada');
        expect(r.issues.some((i: any) => i.category === 'Matriz distinta a la muestra')).toBe(true);
    });

    it('un error que no es timeout no reintenta y no dice "IA ocupada"', async () => {
        seed();
        aiQueue.push(async () => { throw new Error('connect ECONNREFUSED 127.0.0.1:11434'); });
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        expect(chatSpy).toHaveBeenCalledTimes(1);
        const r = JSON.parse(store.quotations.get('q-ana').complianceResult);
        expect(r.warnings[0].category).toBe('Sistema');
    });

    it('respuesta que no es JSON: aviso de sistema, sin inventar parametros', async () => {
        seed();
        aiQueue.push(async () => 'Lo siento, no puedo procesar esto.');
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        const r = JSON.parse(store.quotations.get('q-ana').complianceResult);
        expect(r.parameterChecks).toEqual([]);
        expect(r.warnings[0].category).toBe('Sistema');
        expect(store.quotations.get('q-ana').approvedForOit).toBe(false);
    });
});

describe('simulacion: la norma pedida no esta cargada', () => {
    it('el articulo que pide la cotizacion no existe en las normas: aviso y no se aprueba', async () => {
        seed();
        store.standards = [];
        extractSpy.mockResolvedValue(fx.siacot20938);
        await runQuotationAnalysis('q-ana', '/uploads/sim-quotation-test.pdf');
        expect(chatSpy).not.toHaveBeenCalled();
        const r = JSON.parse(store.quotations.get('q-ana').complianceResult);
        expect(r.warnings.map((w: any) => w.category)).toContain('Artículo no encontrado');
        expect(store.quotations.get('q-ana').approvedForOit).toBe(false);
    });
});

describe('simulacion: comprobaciones de la norma y el texto', () => {
    it('la norma de Res. 2115 art. 13 de la prueba de Ana tambien se arma sin el articulo equivocado', () => {
        const { blocks } = buildArticleBlocks([{ title: 'Resolución 2115 de 2007 Agua potable', content: fx.res2115.content }], parseComparisonTargets(fx.siacot20673));
        expect(blocks).toHaveLength(1);
        expect(blocks[0].text).toContain('13');
    });
});
