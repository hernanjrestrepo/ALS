// Martha, la asistente IA de ALS Xmart (nombre e imagen elegidos por Hernan el 2026-10-30).
// La foto es una imagen generada con IA (no es una persona real) con el logo de ALS en la polo.
export const MARTHA = 'Martha';

export function MarthaAvatar({ size = 36, className = '' }: { size?: number; className?: string }) {
    return (
        <img src="/martha-avatar.jpg" alt={MARTHA} width={size} height={size}
            className={`rounded-full object-cover shrink-0 ${className}`} style={{ width: size, height: size }} />
    );
}
