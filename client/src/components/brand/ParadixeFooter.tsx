// Firma de marca Paradixe (Manual de Marca v1): fondo claro -> texto "PARADIXE"
// en Navy, sin isotipo (el isotipo es solo para fondo oscuro). Enlaza a paradixe.xyz.
export function ParadixeFooter() {
    return (
        <div className="w-full py-4 text-center">
            <a
                href="https://www.paradixe.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col items-center gap-0.5 group"
            >
                <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: '#12224B' }}
                >
                    PARADIXE
                </span>
                <span
                    className="text-[10px] group-hover:underline"
                    style={{ color: '#3E6BFF' }}
                >
                    www.paradixe.xyz
                </span>
            </a>
        </div>
    );
}
