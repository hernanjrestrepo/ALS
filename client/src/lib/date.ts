export function formatDate(value: string | number | Date, locale = 'es-ES'): string {
    return new Date(value).toLocaleDateString(locale);
}

export function formatDateTime(value: string | number | Date, locale = 'es-ES', options?: Intl.DateTimeFormatOptions): string {
    return new Date(value).toLocaleString(locale, options);
}

export function formatTime(value: string | number | Date, locale?: string, options?: Intl.DateTimeFormatOptions): string {
    return new Date(value).toLocaleTimeString(locale || [], options);
}

export function formatLongDate(value: string | number | Date, locale = 'es-ES'): string {
    return new Date(value).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
