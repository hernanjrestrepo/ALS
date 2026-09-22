// Ayudas para la fecha propuesta de un servicio en la Agenda de la OIT.
//
// La IA no siempre extrae una fecha del documento (es frecuente: la misma IA lo
// reporta como alerta "Falta fecha de inicio y fin del servicio"). Cuando pasaba
// esto, la pantalla igual mostraba una fecha bajo el título "Propuesta de
// Programación IA / Basada en análisis del documento", como si viniera del
// documento, cuando en realidad era solo "hoy + 7 días" inventado aquí. Estas
// funciones separan "vino del documento" de "es un valor por defecto", para que
// la pantalla pueda avisarlo, y parsean la fecha por sus componentes (año-mes-día)
// en vez de con `new Date(str)` + `toLocaleDateString()`, que dependía de la zona
// horaria del navegador y podía mostrar/guardar un día distinto del propuesto.

export interface SuggestedDate {
    /** Fecha en formato YYYY-MM-DD, sin hora ni zona horaria. */
    date: string;
    /** true si viene del análisis del documento; false si es un valor por defecto (hoy + 7 días + idx). */
    fromDocument: boolean;
}

export function getSuggestedDate(proposedDate: string | null | undefined, idx: number, today: Date = new Date()): SuggestedDate {
    const fromDoc = proposedDate?.split('T')[0];
    if (fromDoc) return { date: fromDoc, fromDocument: true };

    // Sin fecha en el documento: se sugiere una por defecto para no bloquear la
    // programación, calculada por componentes locales (no por toISOString, que
    // convierte a UTC y puede correr la fecha un dia segun la zona horaria).
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate() + 7 + idx;
    const fallback = new Date(y, m, d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        date: `${fallback.getFullYear()}-${pad(fallback.getMonth() + 1)}-${pad(fallback.getDate())}`,
        fromDocument: false,
    };
}

/** Parsea una fecha YYYY-MM-DD por sus componentes locales (evita el corrimiento de un dia de `new Date(str)`). */
export function parseLocalDate(dateOnly: string): Date {
    const [y, m, d] = dateOnly.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

export function formatLocalDateLong(dateOnly: string): string {
    return parseLocalDate(dateOnly).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
