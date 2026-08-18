// Firma de marca Paradixe (Manual de Marca v1): "by Paradixe" como una sola
// unidad enlazada (texto + wordmark), no un logo y un link por separado.
// Fondo claro -> texto "PARADIXE" en Navy, sin isotipo (el isotipo es solo
// para fondo oscuro).
export function ParadixeFooter() {
    return (
        <div className="w-full py-4 text-center">
            <a
                href="https://www.paradixe.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-baseline gap-1.5 hover:opacity-80 transition-opacity"
            >
                <span className="text-xs text-slate-400">by</span>
                <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: '#12224B' }}
                >
                    PARADIXE
                </span>
            </a>
        </div>
    );
}
