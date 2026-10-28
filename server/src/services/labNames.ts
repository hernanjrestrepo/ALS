// Nombre de parametro listo para comparar: sin tildes, sin prefijo de matriz ("Aguas",
// "Agua Potable") ni signos. "AguasNitritos" -> "nitritos".
export function normalizeParameterName(name: string): string {
    return String(name || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/\((.*?)\)/g, ' ')
        .replace(/^(aguas?|agua potable|agua residual|agua superficial|agua subterranea)(?=[a-z])/, '')
        .replace(/[^a-z0-9 +]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
