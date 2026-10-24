// Monitoreo de varios dias (reunion del 2026-10-23, Raul y Hernan): un servicio puede
// hacerse un solo dia, un rango (lunes a viernes) o dias sueltos (lunes y jueves).
// "date" sigue siendo el primer dia (compatibilidad con lo ya programado) y "extraDates"
// guarda los demas.
export interface DaysSchedule {
    date?: string;
    extraDates?: string[];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Todos los dias del servicio, sin repetir y en orden.
export function scheduleDays(s: DaysSchedule | null | undefined): string[] {
    if (!s) return [];
    const all = [s.date, ...(s.extraDates || [])].filter((d): d is string => !!d && ISO_DAY.test(d));
    return [...new Set(all)].sort();
}

// Dias de un rango (inclusive). Con weekdaysOnly se saltan sabados y domingos.
export function rangeDays(from: string, to: string, weekdaysOnly = true): string[] {
    if (!ISO_DAY.test(from) || !ISO_DAY.test(to) || from > to) return [];
    const out: string[] = [];
    const [y, m, d] = from.split('-').map(Number);
    const cur = new Date(Date.UTC(y, m - 1, d));
    for (let i = 0; i < 62; i++) {
        const iso = cur.toISOString().slice(0, 10);
        if (iso > to) break;
        const dow = cur.getUTCDay();
        if (!weekdaysOnly || (dow !== 0 && dow !== 6)) out.push(iso);
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
}

// Vuelve a armar date/extraDates a partir de una lista de dias.
export function withDays<T extends DaysSchedule>(s: T, days: string[]): T {
    const sorted = [...new Set(days.filter(d => ISO_DAY.test(d)))].sort();
    return { ...s, date: sorted[0] || '', extraDates: sorted.slice(1) };
}

// "27/10/2026" o "27/10, 28/10 y 30/10/2026"
// conjuncion: la "y" en el idioma elegido (la pantalla pasa tr('y')).
export function formatDays(days: string[], conjuncion = 'y'): string {
    if (!days.length) return '';
    const short = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
    if (days.length === 1) return `${short(days[0])}/${days[0].slice(0, 4)}`;
    const last = days[days.length - 1];
    return `${days.slice(0, -1).map(short).join(', ')} ${conjuncion} ${short(last)}/${last.slice(0, 4)}`;
}
