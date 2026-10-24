// Idiomas de ALS Xmart (Hernan, 2026-10-24): espanol, ingles, portugues y frances.
// El texto en espanol es la clave: tr('Guardar') devuelve la traduccion o, si falta, el espanol.
// El idioma es por persona (en su navegador); al cambiarlo se recarga la pagina para que todo,
// incluidos los textos definidos fuera de los componentes, salga en el idioma nuevo.
import en from './en.json';
import pt from './pt.json';
import fr from './fr.json';
import { es as dfEs, enUS as dfEn, ptBR as dfPt, fr as dfFr, type Locale } from 'date-fns/locale';

export type Lang = 'es' | 'en' | 'pt' | 'fr';
export const LANGS: Array<{ code: Lang; label: string; locale: string; flag: string }> = [
    { code: 'es', label: 'Español', locale: 'es-CO', flag: 'ES' },
    { code: 'en', label: 'English', locale: 'en-US', flag: 'EN' },
    { code: 'pt', label: 'Português', locale: 'pt-BR', flag: 'PT' },
    { code: 'fr', label: 'Français', locale: 'fr-FR', flag: 'FR' },
];
const DICTS: Record<Lang, Record<string, string>> = { es: {}, en, pt, fr };
const KEY = 'als-idioma';

function detect(): Lang {
    try {
        const saved = localStorage.getItem(KEY) as Lang | null;
        if (saved && saved in DICTS) return saved;
    } catch { /* sin almacenamiento */ }
    const nav = (typeof navigator !== 'undefined' ? navigator.language : 'es').slice(0, 2) as Lang;
    return nav in DICTS ? nav : 'es';
}

let current: Lang = detect();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = (): Lang => current;
export const locale = (): string => LANGS.find(l => l.code === current)!.locale;
// Idioma para date-fns (calendario, "hace 2 dias").
export const dateLocale = (): Locale => ({ es: dfEs, en: dfEn, pt: dfPt, fr: dfFr } as const)[current];

export function tr(text: string): string {
    if (current === 'es') return text;
    return DICTS[current][text] ?? text;
}

export function setLang(lang: Lang) {
    if (lang === current) return;
    try { localStorage.setItem(KEY, lang); } catch { /* sin almacenamiento: solo dura esta pagina */ }
    current = lang;
    window.location.reload();
}
