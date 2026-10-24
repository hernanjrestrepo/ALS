// Asignacion automatica al aceptar la propuesta de programacion (reunion del 2026-10-23:
// "si lo va a hacer automaticamente, deberia tambien asignar los ingenieros... revisar que
// exista disponibilidad de inventario o recursos... poner un red flag").
//
// Funcion pura: recibe los servicios propuestos, el personal, lo que ya tiene cada quien
// programado y los recursos por matriz; devuelve la programacion con ingenieros y alertas.

export interface ProposedService {
    key: string;
    name: string;
    date: string;
    extraDates?: string[];
    time?: string;
}

export interface Person {
    id: string;
    name: string;
    cargo: string;
    supervises: boolean;
}

export interface PlanInput {
    services: ProposedService[];
    people: Person[];
    // dia (YYYY-MM-DD) -> ids de personas ya programadas ese dia en otras OIT
    busyByDay: Record<string, string[]>;
    // matriz de recurso (Resource.type) -> cantidad disponible
    resourcesByType: Record<string, number>;
    engineersPerService?: number;
}

export interface PlannedService extends ProposedService {
    engineerIds: string[];
    confirmed: boolean;
    flags: string[];
    desk?: boolean;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function serviceDays(s: { date?: string; extraDates?: string[] }): string[] {
    const all = [s.date, ...(s.extraDates || [])].filter((d): d is string => !!d && ISO_DAY.test(d));
    return [...new Set(all)].sort();
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Servicios que no salen a campo (se hacen en oficina): no llevan ingeniero ni equipo.
const DESK = /(consultor|geodatabase|\bica\b|\brua\b|informe de cumplimiento|fichas|registro unico|elaboracion)/;

// Matriz de recursos que necesita un servicio, por su nombre. El orden importa: "emision
// de ruido" es ruido, no aire; "clorofila" en agua superficial es agua.
const MATRIX_RULES: Array<[RegExp, string]> = [
    [/fuentes? fijas?|emisiones? atmosf|chimenea|isocinetic/, 'Fuentes fijas'],
    [/ruido/, 'Ruido'],
    [/calidad (del )?aire|aire|olor/, 'Calidad del aire'],
    [/agua|sediment|marin|vertimient/, 'Aguas'],
    [/biota|flora|fauna|hidrobio|epifit/, 'Hidrobiología y Biota'],
];

export function serviceMatrix(name: string): string | null {
    const n = fold(name);
    for (const [re, type] of MATRIX_RULES) if (re.test(n)) return type;
    return null;
}

export function isDeskService(name: string): boolean {
    return DESK.test(fold(name));
}

const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function planAssignments(input: PlanInput): { services: PlannedService[]; flags: string[] } {
    const perService = Math.max(1, input.engineersPerService || 1);
    // Ocupacion que se va armando (lo ya programado + lo que se asigna aqui).
    const busy: Record<string, Set<string>> = {};
    for (const [day, ids] of Object.entries(input.busyByDay)) busy[day] = new Set(ids);
    const load = new Map<string, number>();
    for (const ids of Object.values(input.busyByDay)) for (const id of ids) load.set(id, (load.get(id) || 0) + 1);

    const out: PlannedService[] = [];
    const allFlags: string[] = [];

    for (const s of input.services) {
        const days = serviceDays(s);
        const flags: string[] = [];
        const planned: PlannedService = { ...s, time: s.time || '08:00', engineerIds: [], confirmed: true, flags };

        if (isDeskService(s.name)) {
            planned.desk = true;
            out.push(planned);
            continue;
        }

        // Equipos: que exista al menos un recurso disponible de la matriz.
        const matrix = serviceMatrix(s.name);
        if (matrix && !(input.resourcesByType[matrix] > 0)) {
            flags.push(`Sin equipos disponibles de ${matrix} para «${s.name}».`);
        }

        // Personal: libre todos los dias del servicio; primero quienes no supervisan y con
        // menos carga. Los supervisores solo si no hay nadie mas.
        const free = (p: Person) => days.every(d => !busy[d]?.has(p.id));
        const byLoad = (a: Person, b: Person) => (load.get(a.id) || 0) - (load.get(b.id) || 0) || a.name.localeCompare(b.name);
        const field = input.people.filter(p => !p.supervises && free(p)).sort(byLoad);
        const supervisors = input.people.filter(p => p.supervises && free(p)).sort(byLoad);
        const chosen = [...field, ...supervisors].slice(0, perService);

        if (!days.length) flags.push(`«${s.name}» no tiene fecha.`);
        if (chosen.length < perService) {
            const missing = perService - chosen.length;
            flags.push(`No hay personal libre para «${s.name}» el ${days.map(fmtDay).join(', ')} (faltan ${missing}).`);
        } else if (chosen.some(p => p.supervises)) {
            flags.push(`Para «${s.name}» solo quedó libre personal supervisor; revisar la programación.`);
        }

        for (const p of chosen) {
            planned.engineerIds.push(p.id);
            load.set(p.id, (load.get(p.id) || 0) + days.length);
            for (const d of days) (busy[d] ||= new Set()).add(p.id);
        }
        allFlags.push(...flags);
        out.push(planned);
    }
    return { services: out, flags: allFlags };
}
