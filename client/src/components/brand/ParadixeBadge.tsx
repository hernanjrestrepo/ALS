// Firma de Paradixe en la esquina inferior derecha de toda la aplicacion: el logo (blanco) sobre el azul
// marino de la marca, enlazado a la web. Va a la izquierda del boton de Martha para no taparse con el.
export function ParadixeBadge({ besideChat }: { besideChat: boolean }) {
    return (
        <a
            href="https://www.paradixe.xyz/es/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Paradixe"
            title="Paradixe"
            className={`fixed bottom-6 ${besideChat ? 'right-[8rem]' : 'right-6'} z-40 flex h-9 items-center rounded-full px-4 shadow-lg opacity-90 transition hover:opacity-100 hover:scale-105`}
            style={{ backgroundColor: '#12224B', marginBottom: besideChat ? '26px' : 0 }}
        >
            <img src="/paradixe-logo.png" alt="Paradixe" className="h-3.5 w-auto" />
        </a>
    );
}
