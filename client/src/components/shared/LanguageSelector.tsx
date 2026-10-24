import { Globe } from 'lucide-react';
import { LANGS, getLang, setLang, tr, type Lang } from '@/i18n';

// Selector de idioma (es, en, pt, fr). "compact" = solo el codigo, para el encabezado.
export function LanguageSelector({ compact, className = '' }: { compact?: boolean; className?: string }) {
    return (
        <label className={`relative inline-flex items-center gap-1.5 text-sm text-slate-600 ${className}`} title={tr("Idioma")}>
            <Globe className="h-4 w-4 shrink-0" />
            <select
                aria-label={tr("Idioma")}
                value={getLang()}
                onChange={e => setLang(e.target.value as Lang)}
                className={`cursor-pointer appearance-none rounded-md bg-transparent py-1 pr-1 font-medium text-slate-700 hover:text-slate-900 focus:outline-none ${compact ? 'w-9' : 'border border-slate-200 px-2'}`}
            >
                {LANGS.map(l => <option key={l.code} value={l.code}>{compact ? l.flag : l.label}</option>)}
            </select>
        </label>
    );
}
