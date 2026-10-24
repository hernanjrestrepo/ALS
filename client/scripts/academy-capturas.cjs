// Capturas de Xmart Academy con DATOS SIMULADOS (nunca datos reales de clientes).
// Toma cada pantalla del cliente local (vite en :5173) con la API simulada por page.route y
// calcula la posicion de los marcadores numerados sobre los elementos reales.
//
// Uso (con el cliente corriendo: npm run dev --prefix client):
//   NODE_PATH=<carpeta con playwright instalado>/node_modules node client/scripts/academy-capturas.cjs
// Escribe client/public/academy/<archivo>.png y client/public/academy/marcas.json.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.ACADEMY_BASE || 'http://localhost:5173';
const OUT = path.join(__dirname, '../public/academy');
fs.mkdirSync(OUT, { recursive: true });

// ---------- Datos simulados ----------
const hoy = new Date();
const iso = d => d.toISOString();
const dia = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d; };
const ymd = d => d.toISOString().slice(0, 10);
const user = { id: 'u-demo', name: 'Usuario Demo', email: 'demo@ejemplo.local', role: 'SUPER_ADMIN' };
const clientes = [
    { id: 'c1', name: 'Aguas del Caribe Demo S.A.', nit: '900.111.222-3', contactName: 'Laura Martínez', contactEmail: 'laura@demo.local', contactPhone: '300 000 0001', createdAt: iso(dia(-40)) },
    { id: 'c2', name: 'Industrias Ejemplo S.A.S.', nit: '901.333.444-5', contactName: 'Carlos Ruiz', contactEmail: 'carlos@demo.local', contactPhone: '300 000 0002', createdAt: iso(dia(-30)) },
    { id: 'c3', name: 'Puerto Muestra S.A.', nit: '800.555.666-7', contactName: 'Ana Gómez', contactEmail: 'ana@demo.local', contactPhone: '300 000 0003', createdAt: iso(dia(-12)) },
];
const servicios = [
    { id: 's1', name: 'Muestreo de agua subterránea', description: 'Piezómetros y pozos', oitType: 'Agua', active: true },
    { id: 's2', name: 'Muestreo de agua residual', description: 'Vertimientos puntuales y compuestos', oitType: 'Agua', active: true },
    { id: 's3', name: 'Calidad del aire', description: 'PM10 y PM2.5', oitType: 'Aire', active: true },
    { id: 's4', name: 'Muestreo de suelos', description: 'Compuestos por cuadrícula', oitType: 'Suelo', active: true },
];
const cotizaciones = [
    { id: 'q1', quotationNumber: 'SIACOT-20001-10-2026', clientName: clientes[0].name, client: { id: 'c1', name: clientes[0].name }, status: 'APPROVED', approvedForOit: true, description: 'Monitoreo de agua subterránea', createdAt: iso(dia(-8)), linkedOITs: [{ id: 'oit-1' }] },
    { id: 'q2', quotationNumber: 'SIACOT-20002-10-2026', clientName: clientes[1].name, client: { id: 'c2', name: clientes[1].name }, status: 'REVIEW_NEEDED', approvedForOit: false, description: 'Vertimiento Res. 0631', createdAt: iso(dia(-3)), linkedOITs: [] },
    { id: 'q3', quotationNumber: 'SIACOT-20003-10-2026', clientName: clientes[2].name, client: { id: 'c3', name: clientes[2].name }, status: 'ANALYZING', approvedForOit: false, description: 'Calidad de aire', createdAt: iso(dia(-1)), linkedOITs: [] },
];
const template = {
    id: 't-1', name: 'Aguas subterráneas', description: 'Monitoreo en piezómetros y pozos', oitType: 'Agua', createdAt: iso(dia(-60)),
    steps: JSON.stringify([
        { id: 'p1', title: 'Tipo de captación', description: 'Piezómetro, aljibe, pozo…', type: 'INPUT', required: true },
        { id: 'p2', title: 'pH', description: 'Medido en campo', type: 'INPUT', inputType: 'number', required: false },
        { id: 'p3', title: 'Temperatura (°C)', description: 'Medida en campo', type: 'INPUT', inputType: 'number', required: false },
        { id: 'p4', title: 'Observaciones', description: '', type: 'TEXT', required: false },
    ]),
};
const plantillas = [template,
    { id: 't-2', name: 'Agua residual — vertimientos', description: 'Puntual y compuesto', oitType: 'Agua', steps: '[]', createdAt: iso(dia(-50)) },
    { id: 't-3', name: 'Calidad de aire', description: 'Material particulado', oitType: 'Aire', steps: '[]', createdAt: iso(dia(-45)) }];
const serviceDates = {
    'ai-service-0': { name: 'Monitoreo agua subterránea', date: ymd(dia(3)), extraDates: [ymd(dia(4))], time: '08:00', engineerIds: ['e1'], confirmed: true, flags: ['Falta multiparámetro: hay 0 disponibles y se necesita 1.'] },
};
const oitBase = (over = {}) => ({
    id: 'oit-1', oitNumber: '15031', status: 'SCHEDULED', description: 'Monitoreo de agua subterránea en piezómetro PZ-3',
    location: 'Zona industrial, Cartagena', clientName: clientes[0].name, clientNit: clientes[0].nit, reportTo: 'Puerto Muestra S.A.',
    aiData: JSON.stringify({ data: { services: [{ name: 'Monitoreo agua subterránea', proposedDate: null, templates: [{ id: 't-1' }] }] } }),
    serviceDates: JSON.stringify(serviceDates), scheduledDate: iso(dia(3)), planningAccepted: true,
    selectedTemplateIds: JSON.stringify(['t-1']), engineers: [{ id: 'e1' }], assignedEngineers: [{ user: { id: 'e1', name: 'Técnico Demo Uno' } }],
    quotation: { id: 'q1', quotationNumber: 'SIACOT-20001-10-2026' }, createdAt: iso(dia(-5)), updatedAt: iso(dia(-1)),
    ...over,
});
const oits = [
    oitBase(),
    oitBase({ id: 'oit-2', oitNumber: '15032', status: 'PENDING', description: 'Vertimiento planta de tratamiento', clientName: clientes[1].name, scheduledDate: null, serviceDates: null, planningAccepted: false, createdAt: iso(dia(-2)) }),
    oitBase({ id: 'oit-3', oitNumber: '15029', status: 'COMPLETED', description: 'Calidad de aire — estación norte', clientName: clientes[2].name, scheduledDate: iso(dia(-6)), createdAt: iso(dia(-12)) }),
    oitBase({ id: 'oit-4', oitNumber: '15030', status: 'IN_PROGRESS', description: 'Muestreo de suelos — lote 4', clientName: clientes[0].name, scheduledDate: iso(dia(0)), createdAt: iso(dia(-7)) }),
];
const recursos = [
    { id: 'r1', name: 'Multiparámetro portátil', type: 'Equipo de medición', quantity: 2, status: 'IN_USE', calibrationExpiry: iso(dia(40)) },
    { id: 'r2', name: 'Bomba peristáltica', type: 'Equipo de muestreo', quantity: 3, status: 'AVAILABLE', calibrationExpiry: null },
    { id: 'r3', name: 'Nevera con gel refrigerante', type: 'Preservación', quantity: 6, status: 'AVAILABLE', calibrationExpiry: null },
    { id: 'r4', name: 'Muestreador de PM10', type: 'Equipo de medición', quantity: 1, status: 'MAINTENANCE', calibrationExpiry: iso(dia(-2)) },
];
const normas = [
    { id: 'n1', title: 'Resolución 0631 de 2015 — Vertimientos', description: 'Parámetros y límites máximos permisibles en vertimientos puntuales.', type: 'QUOTATION', createdAt: iso(dia(-200)) },
    { id: 'n2', title: 'Resolución 2254 de 2017 — Calidad del aire', description: 'Norma de calidad del aire ambiente.', type: 'QUOTATION', createdAt: iso(dia(-180)) },
    { id: 'n3', title: 'Decreto 1076 de 2015', description: 'Decreto único del sector ambiente.', type: 'OIT', createdAt: iso(dia(-300)) },
];
const listas = [
    { id: 'l1', name: 'Informes — Aguas del Caribe Demo', purpose: 'Informes', recipients: [{ name: 'Laura Martínez', email: 'laura@demo.local', required: true }, { name: 'Gerencia', email: 'gerencia@demo.local', required: false }], createdAt: iso(dia(-20)) },
    { id: 'l2', name: 'Facturación — Industrias Ejemplo', purpose: 'Factura', recipients: [{ name: 'Contabilidad', email: 'conta@demo.local', required: true }], createdAt: iso(dia(-15)) },
];
const consultas = [
    { id: 'pc1', normParameter: 'Nitrógeno total (N)', quotedAs: 'Nitrógeno Kjeldahl', normReference: 'Res. 0631, art. 8', quotationNumber: 'SIACOT-20002-10-2026', status: 'PENDIENTE', createdAt: iso(dia(-1)) },
    { id: 'pc2', normParameter: 'Coliformes termotolerantes', quotedAs: 'Coliformes fecales', normReference: '', quotationNumber: 'SIACOT-20001-10-2026', status: 'RESPONDIDA', answerSame: true, answerNote: 'Mismo análisis', createdAt: iso(dia(-6)) },
];
const notificaciones = [
    { id: 'nt1', title: 'Análisis de cotización terminado', message: 'SIACOT-20002-10-2026 tiene 2 hallazgos por decidir.', type: 'WARNING', read: false, createdAt: iso(dia(0)) },
    { id: 'nt2', title: 'Te asignaron un muestreo', message: 'OIT 15031 — en 3 días a las 8:00.', type: 'INFO', read: false, createdAt: iso(dia(-1)), oit: { id: 'oit-1', oitNumber: '15031' } },
    { id: 'nt3', title: 'Informe generado', message: 'OIT 15029 — listo para firmar.', type: 'SUCCESS', read: true, createdAt: iso(dia(-2)) },
];
const personal = [
    { id: 'm1', nombre: 'Técnico Demo Uno', cargo: 'Técnico de monitoreo', correo: 'tecnico1@demo.local', activo: true, hasAccount: true },
    { id: 'm2', nombre: 'Técnica Demo Dos', cargo: 'Técnica de monitoreo', correo: 'tecnico2@demo.local', activo: true, hasAccount: true },
    { id: 'm3', nombre: 'Coordinadora Demo', cargo: 'Coordinadora de monitoreo', correo: 'coordinacion@demo.local', activo: true, hasAccount: false },
];
const analitica = {
    totalOITs: 48, totalReports: 31, activeTemplatesCount: 12, trashedTemplatesCount: 1,
    oitsByStatus: { PENDING: 9, SCHEDULED: 11, IN_PROGRESS: 6, COMPLETED: 22 },
    reportsByMonth: [{ month: 'jun', count: 3 }, { month: 'jul', count: 5 }, { month: 'ago', count: 6 }, { month: 'sep', count: 8 }, { month: 'oct', count: 9 }],
    reportsByMatrix: [{ name: 'Agua', count: 18 }, { name: 'Aire', count: 8 }, { name: 'Suelo', count: 5 }],
    topClients: clientes.map((c, i) => ({ name: c.name, count: 12 - i * 3 })),
    recentReports: [{ id: 'rr1', name: 'Informe OIT 15029', type: 'Aire', oitNumber: '15029', createdAt: iso(dia(-2)) }],
};

async function mockApi(page) {
    await page.route('http://localhost:3000/**', async route => {
        const req = route.request();
        const p = new URL(req.url()).pathname.replace(/^\/api/, '');
        const m = req.method();
        const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        if (p.startsWith('/uploads/')) return route.fulfill({ status: 404, body: '' });
        if (m !== 'GET') return json({ ok: true });
        const o = p.match(/^\/oits\/([\w-]+)$/);
        if (o) return json(oits.find(x => x.id === o[1]) || oits[0]);
        const routes = {
            '/oits': oits, '/clients': clientes, '/services': servicios, '/quotations': cotizaciones,
            '/quotations/parameter-consultations': consultas, '/resources': recursos, '/standards': normas,
            '/distribution-lists': listas, '/notifications': notificaciones, '/monitoring-staff': personal,
            '/sampling-templates': plantillas, '/sampling-templates/t-1': template, '/analytics/dashboard': analitica,
            '/users/profile': { ...user, area: 'Operaciones' }, '/oits/sheet-reader/status': { enabled: true },
            '/users/engineers': [{ id: 'e1', name: 'Técnico Demo Uno', email: 'tecnico1@demo.local' }, { id: 'e2', name: 'Técnica Demo Dos', email: 'tecnico2@demo.local' }],
        };
        return json(routes[p] ?? []);
    });
}

// ---------- Que capturar y donde van los marcadores ----------
// Cada marca ubica un elemento por su texto visible (o un selector CSS con css:).
const CAPTURAS = [
    { archivo: 'panel.png', url: '/', marcas: [['Panel de Control', 'Inicio', 'El resumen del día: OIT por estado, muestreos de hoy y alertas.'], ['Xmart Academy', 'Academy', 'Este entrenamiento, siempre a un clic.']] },
    { archivo: 'clientes.png', url: '/clients', marcas: [['Nuevo Cliente', 'Crear cliente', 'Nombre, NIT y contacto.'], ['Aguas del Caribe Demo S.A.', 'Cada cliente', 'Edita o elimina desde su fila.']] },
    { archivo: 'servicios.png', url: '/services', marcas: [['Nuevo Servicio', 'Crear servicio', 'Nombre y categoría.'], ['Muestreo de agua subterránea', 'Catálogo', 'Lo que presta ALS.']] },
    { archivo: 'cotizaciones.png', url: '/quotations', marcas: [['Nueva Cotización', 'Cargar cotización', 'Sube el PDF; la IA revisa la norma.'], ['SIACOT-20002-10-2026', 'Resultado', 'Abre la cotización para ver cumplimiento y hallazgos.']] },
    { archivo: 'consultas.png', url: '/parameter-consultations', marcas: [['Nitrógeno total', 'Consulta pendiente', 'Parámetro de la norma y cómo se cotizó.'], ['¿Es el mismo parámetro?', 'Responder', 'Sí o No, con nota opcional.']] },
    { archivo: 'listas.png', url: '/distribution-lists', marcas: [['Nueva Lista', 'Crear lista', 'Nombre y destinatarios.']] },
    { archivo: 'oits.png', url: '/oits', marcas: [['Nueva OIT', 'Cargar OIT', 'Sube el PDF; la IA extrae la información.'], ['css:input[placeholder*="Buscar"]', 'Buscar', 'Por número, cliente, NIT o cotización.'], ['15031', 'Cada OIT', 'Ábrela para ver sus pestañas.']] },
    { archivo: 'agenda.png', url: '/oits/oit-1', tab: /Agenda/i, marcas: [['Editar Programación', 'Editar', 'Cambia días, hora o personal.'], ['Servicios', 'Días y alertas', 'Cada servicio con sus días y las banderas rojas.']] },
    { archivo: 'muestreo.png', url: '/oits/oit-1', tab: /Muestreo/i, servicio: 'Monitoreo agua subterránea', movil: true, marcas: [['Llegué al sitio', 'Llegada', 'Registra hora y ubicación.'], ['Leer la planilla de campo', 'Planilla', 'Foto, PDF, Word o Excel: llena los campos.'], ['css:select', 'Tipo de captación', 'Lista; viene lleno si la OIT lo dice.']] },
    { archivo: 'calendario.png', url: '/calendar', marcas: [['Mes', 'Vistas', 'Mes, semana, día o agenda.'], ['css:.rbc-event', 'Muestreo', 'Toca para abrir la OIT.']] },
    { archivo: 'recursos.png', url: '/resources', marcas: [['Multiparámetro portátil', 'Equipo', 'Estado y calibración al día.']] },
    { archivo: 'informe.png', url: '/oits/oit-3', tab: /Informe/i, marcas: [['Gestión de Informes por Servicio', 'Informes', 'Sube resultados y genera el informe por servicio.']] },
    { archivo: 'plantillas.png', url: '/sampling-templates', marcas: [['Aguas subterráneas', 'Plantilla', 'Pasos del formulario de campo.']] },
    { archivo: 'normas.png', url: '/standards', marcas: [['Resolución 0631', 'Norma', 'Contra esto revisa la IA.']] },
    { archivo: 'analitica.png', url: '/analytics', marcas: [['Analítica', 'Indicadores', 'OIT por estado, tendencias e informes.']] },
    { archivo: 'ana.png', url: '/ai', marcas: [['css:textarea, input[placeholder*="pregunta"]', 'Pregunta', 'Escribe en lenguaje natural.']] },
    { archivo: 'notificaciones.png', url: '/notifications', marcas: [['Análisis de cotización terminado', 'Aviso', 'Toca para ir al detalle.']] },
    { archivo: 'personal.png', url: '/monitoring-staff', marcas: [['Coordinadora Demo', 'Persona', 'Nombre, cargo, correo y si está activa.']] },
];

async function centro(page, marca) {
    const [sel] = marca;
    const loc = sel.startsWith('css:') ? page.locator(sel.slice(4)).first() : page.getByText(sel, { exact: false }).first();
    try {
        await loc.waitFor({ state: 'visible', timeout: 4000 });
        const b = await loc.boundingBox();
        const vp = page.viewportSize();
        if (!b || b.y > vp.height) return null;
        return { x: +(((b.x + Math.min(b.width, 160) / 2) / vp.width) * 100).toFixed(1), y: +(((b.y + b.height / 2) / vp.height) * 100).toFixed(1) };
    } catch { return null; }
}

(async () => {
    const browser = await chromium.launch();
    const resultado = {};
    for (const c of CAPTURAS) {
        const ctx = await browser.newContext({
            viewport: c.movil ? { width: 420, height: 900 } : { width: 1366, height: 820 },
            deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota',
            permissions: ['geolocation'], geolocation: { latitude: 10.39, longitude: -75.51 },
        });
        await ctx.addInitScript(u => {
            if (location.hostname !== 'localhost') return;
            localStorage.setItem('auth-storage', JSON.stringify({ state: { user: u, token: 'demo', isAuthenticated: true }, version: 0 }));
        }, user);
        const page = await ctx.newPage();
        await mockApi(page);
        try {
            await page.goto(BASE + c.url, { waitUntil: 'networkidle' });
            if (c.tab) await page.getByRole('tab', { name: c.tab }).click();
            if (c.servicio) await page.getByText(c.servicio).first().click();
            await page.waitForTimeout(900);
            const marcas = [];
            for (const mk of c.marcas) {
                const pos = await centro(page, mk);
                if (pos) marcas.push({ ...pos, titulo: mk[1], texto: mk[2] });
                else console.log(`  (sin marca) ${c.archivo}: ${mk[0]}`);
            }
            await page.screenshot({ path: path.join(OUT, c.archivo) });
            resultado[c.archivo] = marcas;
            console.log(`OK ${c.archivo} (${marcas.length}/${c.marcas.length} marcas)`);
        } catch (e) {
            console.log(`FALLA ${c.archivo}: ${e.message.split('\n')[0]}`);
        }
        await ctx.close();
    }
    fs.writeFileSync(path.join(OUT, 'marcas.json'), JSON.stringify(resultado, null, 2));
    await browser.close();
})();
