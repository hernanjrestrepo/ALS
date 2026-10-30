// Martha, la asistente IA de ALS Xmart (nombre e imagen elegidos por Hernan el 2026-10-30).
// La foto es una imagen generada con IA (no es una persona real) con el logo de ALS en la polo.
export const MARTHA = 'Martha';

export function MarthaAvatar({ size = 36, className = '' }: { size?: number; className?: string }) {
    return (
        // Desde 120 px se usa la foto completa (se ve la polo con el logo de ALS).
        <img src={size >= 120 ? '/martha.jpg' : '/martha-avatar.jpg'} alt={MARTHA} width={size} height={size}
            className={`rounded-full object-cover shrink-0 ${className}`} style={{ width: size, height: size }} />
    );
}
