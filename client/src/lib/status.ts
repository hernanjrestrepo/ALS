export const oitListStatusColors: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING: 'bg-slate-50 text-slate-700 border-slate-200',
    ANALYZING: 'bg-blue-50 text-blue-700 border-blue-200',
    REVIEW_REQUIRED: 'bg-orange-50 text-orange-700 border-orange-200',
    ERROR: 'bg-red-50 text-red-700 border-red-200'
};

export const oitListStatusLabels: Record<string, string> = {
    COMPLETED: 'COMPLETADA',
    IN_PROGRESS: 'EN PROGRESO',
    PENDING: 'PENDIENTE',
    ANALYZING: 'ANALIZANDO',
    REVIEW_REQUIRED: 'REVISIÓN REQUERIDA',
    ERROR: 'ERROR'
};

export const oitStatusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completada',
    ANALYZING: 'Analizando',
    SCHEDULED: 'Programada',
    UPLOADING: 'Subiendo'
};

export const quotationStatusStyles: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    ANALYZING: 'bg-blue-50 text-blue-700 border-blue-200',
    COMPLIANT: 'bg-green-50 text-green-700 border-green-200',
    NON_COMPLIANT: 'bg-red-50 text-red-700 border-red-200',
    REVIEW_REQUIRED: 'bg-orange-50 text-orange-700 border-orange-200'
};

export const quotationStatusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    ANALYZING: 'Analizando',
    COMPLIANT: 'Conforme',
    NON_COMPLIANT: 'No Conforme',
    REVIEW_REQUIRED: 'Revisión'
};

export const quotationDetailStatusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    ANALYZING: 'Analizando',
    COMPLIANT: 'Conforme',
    NON_COMPLIANT: 'No Conforme',
    REVIEW_REQUIRED: 'Revisión Requerida'
};

export const resourceStatusColors: Record<string, string> = {
    AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    IN_USE: 'bg-amber-50 text-amber-700 border-amber-200',
    MAINTENANCE: 'bg-red-50 text-red-700 border-red-200'
};

export const resourceStatusLabels: Record<string, string> = {
    AVAILABLE: 'Disponible',
    IN_USE: 'En uso',
    MAINTENANCE: 'Mantenimiento'
};

export function getStatusLabel(status: string, labels: Record<string, string>): string {
    return labels[status] || status;
}

export function getStatusColor(status: string, colors: Record<string, string>): string {
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
}
