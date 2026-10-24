// Xmart Academy: tipos, iconos y progreso (el contenido viene de /api/academy).
import {
    Sparkles, Building2, Beaker, Receipt, HelpCircle, Mail, FileText, CalendarClock, ClipboardCheck, Calendar,
    Box, FileBarChart, ShieldCheck, Workflow, Scale, BarChart3, Bot, Bell, HardHat, Users, Settings, Compass, type LucideIcon,
} from 'lucide-react';

export interface AcademyPaso { titulo: string; detalle: string }
export interface AcademyPregunta { pregunta: string; respuesta: string }
export interface AcademyPublicada { id: string; titulo: string; contenido: string; decididoEn: string | null }
export interface AcademyModulo {
    key: string;
    href: string | null;
    titulo: string;
    grupo: string;
    resumen: string;
    paraQue: string;
    quienes: string[];
    pasos: AcademyPaso[];
    reglas: string[];
    preguntas: AcademyPregunta[];
    captura: string | null;
    novedades: AcademyPublicada[];
    preguntasAprobadas: AcademyPublicada[];
}
export interface AcademyData { grupos: string[]; modulos: AcademyModulo[] }

export interface MarcaCaptura { x: number; y: number; titulo: string; texto: string }

export const ICONOS: Record<string, LucideIcon> = {
    'als-xmart': Sparkles, paradixe: Compass, clientes: Building2, servicios: Beaker, cotizaciones: Receipt,
    'consultas-parametros': HelpCircle, 'listas-distribucion': Mail, oits: FileText, agenda: CalendarClock,
    muestreo: ClipboardCheck, calendario: Calendar, recursos: Box, informes: FileBarChart, calidad: ShieldCheck,
    plantillas: Workflow, normas: Scale, analitica: BarChart3, ana: Bot, notificaciones: Bell,
    'personal-monitoreo': HardHat, usuarios: Users, configuracion: Settings,
};

// Tono por grupo (fondo del icono y acento).
export const TONO: Record<string, string> = {
    'Fundamentos': 'from-[#004CAB] to-[#0091DA]',
    'Comercial': 'from-amber-500 to-orange-500',
    'Operación': 'from-emerald-500 to-teal-600',
    'Informes y calidad': 'from-violet-500 to-fuchsia-500',
    'Base técnica': 'from-sky-500 to-cyan-600',
    'Seguimiento': 'from-indigo-500 to-blue-600',
    'Administración': 'from-slate-500 to-slate-700',
};

// Progreso: comodidad por persona en su navegador (si no hay almacenamiento, no pasa nada).
const VISTOS_KEY = 'als-academy-vistos';
export function leerVistos(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(VISTOS_KEY) || '[]')); } catch { return new Set(); }
}
export function marcarVisto(key: string): Set<string> {
    const s = leerVistos();
    s.add(key);
    try { localStorage.setItem(VISTOS_KEY, JSON.stringify([...s])); } catch { /* sin almacenamiento */ }
    return s;
}

export const fold = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function coincide(m: AcademyModulo, q: string): boolean {
    if (!q.trim()) return true;
    const text = fold([m.titulo, m.resumen, m.paraQue, ...m.pasos.map(p => `${p.titulo} ${p.detalle}`), ...m.preguntas.map(p => p.pregunta), ...m.preguntasAprobadas.map(p => p.titulo)].join(' '));
    return fold(q).split(/\s+/).filter(Boolean).every(w => text.includes(w));
}
