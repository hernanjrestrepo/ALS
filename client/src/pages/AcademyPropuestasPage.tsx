import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Check, X, RefreshCcw, Loader2, Code2, MessagesSquare } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/features/auth/authStore';

interface Propuesta {
    id: string; modulo: string; tipo: 'NOVEDAD' | 'PREGUNTA'; titulo: string; contenido: string; evidencia: string;
    estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'; decididoPor: string | null; decididoEn: string | null; createdAt: string;
}
const ESTADOS = [['PENDIENTE', 'Por aprobar'], ['APROBADA', 'Aprobadas'], ['RECHAZADA', 'Rechazadas']] as const;

// Lo que la IA propone para Xmart Academy solo se publica si Hernan lo aprueba (2026-10-24).
export default function AcademyPropuestasPage() {
    const user = useAuthStore(s => s.user);
    const [estado, setEstado] = useState<string>('PENDIENTE');
    const [items, setItems] = useState<Propuesta[] | null>(null);
    const [edits, setEdits] = useState<Record<string, { titulo: string; contenido: string }>>({});
    const [busy, setBusy] = useState('');

    const cargar = (e = estado) => { setItems(null); api.get('/academy/propuestas', { params: { estado: e } }).then(r => setItems(r.data)).catch(() => setItems([])); };
    useEffect(() => { cargar(estado); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [estado]);
    if (user?.role !== 'SUPER_ADMIN') return <Navigate to="/academy" replace />;

    const decidir = async (p: Propuesta, aprobar: boolean) => {
        setBusy(p.id);
        try {
            await api.post(`/academy/propuestas/${p.id}/decision`, { aprobar, ...(edits[p.id] || {}) });
            toast.success(aprobar ? 'Publicado en Xmart Academy' : 'Propuesta rechazada');
            setItems(list => (list || []).filter(x => x.id !== p.id));
        } catch {
            toast.error('No se pudo guardar la decisión');
        } finally { setBusy(''); }
    };
    const buscar = async () => {
        setBusy('buscar');
        try { const r = await api.post('/academy/propuestas/buscar'); toast.success(r.data?.message || 'Buscando propuestas'); }
        catch { toast.error('No se pudo iniciar la búsqueda'); }
        finally { setBusy(''); }
    };
    const valor = (p: Propuesta) => edits[p.id] || { titulo: p.titulo, contenido: p.contenido };

    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-16">
            <Link to="/academy" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#004CAB]"><ArrowLeft className="h-4 w-4" /> Xmart Academy</Link>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Propuestas de la IA</h1>
                    <p className="text-sm text-slate-600">Novedades por cambios del sistema y preguntas frecuentes del equipo. Nada se publica sin tu aprobación; puedes corregir el texto antes.</p>
                </div>
                <button onClick={buscar} disabled={busy === 'buscar'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    {busy === 'buscar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Buscar propuestas ahora
                </button>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                {ESTADOS.map(([k, label]) => (
                    <button key={k} onClick={() => setEstado(k)} className={`rounded-lg px-3 py-1.5 text-sm ${estado === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                ))}
            </div>

            {!items && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#004CAB]" /></div>}
            {items && !items.length && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No hay propuestas en esta lista.</p>}

            {items?.map(p => (
                <article key={p.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${p.tipo === 'NOVEDAD' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                            {p.tipo === 'NOVEDAD' ? <Code2 className="h-3.5 w-3.5" /> : <MessagesSquare className="h-3.5 w-3.5" />}
                            {p.tipo === 'NOVEDAD' ? 'Novedad del sistema' : 'Pregunta frecuente'}
                        </span>
                        <Link to={`/academy/${p.modulo}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">{p.modulo}</Link>
                        <span className="text-slate-400">{new Date(p.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</span>
                        {p.decididoPor && <span className="text-slate-400">· {p.estado === 'APROBADA' ? 'Aprobada' : 'Rechazada'} por {p.decididoPor}</span>}
                    </div>
                    {p.estado === 'PENDIENTE' ? (
                        <>
                            <input value={valor(p).titulo} onChange={e => setEdits(s => ({ ...s, [p.id]: { ...valor(p), titulo: e.target.value } }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004CAB]/30" />
                            <textarea value={valor(p).contenido} onChange={e => setEdits(s => ({ ...s, [p.id]: { ...valor(p), contenido: e.target.value } }))} rows={4}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004CAB]/30" />
                        </>
                    ) : (
                        <div>
                            <p className="font-semibold text-slate-900">{p.titulo}</p>
                            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{p.contenido}</p>
                        </div>
                    )}
                    <details className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        <summary className="cursor-pointer font-medium text-slate-700">De dónde sale</summary>
                        <p className="mt-2 whitespace-pre-line">{p.evidencia}</p>
                    </details>
                    {p.estado === 'PENDIENTE' && (
                        <div className="flex justify-end gap-2">
                            <button onClick={() => decidir(p, false)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Rechazar</button>
                            <button onClick={() => decidir(p, true)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprobar y publicar
                            </button>
                        </div>
                    )}
                </article>
            ))}
        </div>
    );
}
