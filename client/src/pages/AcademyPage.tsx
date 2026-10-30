import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Search, CheckCircle2, ArrowRight, Sparkles, ClipboardCheck, Loader2, Inbox } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/features/auth/authStore';
import { allowedMenuHrefs } from '@/lib/areaMenus';
import { ICONOS, TONO, coincide, leerVistos, type AcademyData, type AcademyModulo } from '@/features/academy/academy';

import { tr } from '@/i18n';
// Xmart Academy (Hernan, 2026-10-24): que es ALS Xmart, quien es Paradixe y cada modulo explicado.
export default function AcademyPage() {
    const user = useAuthStore(s => s.user);
    const [data, setData] = useState<AcademyData | null>(null);
    const [error, setError] = useState(false);
    const [q, setQ] = useState('');
    const [soloMiArea, setSoloMiArea] = useState(false);
    const [area, setArea] = useState<string | null>(null);
    const vistos = useMemo(() => leerVistos(), []);

    useEffect(() => {
        api.get('/academy').then(r => setData(r.data)).catch(() => setError(true));
        api.get('/users/profile').then(r => setArea(r.data?.area || null)).catch(() => setArea(null));
    }, []);

    const allowed = allowedMenuHrefs(user?.role, area);
    const deMiArea = (m: AcademyModulo) => !allowed || !m.href || allowed.has(m.href) || m.grupo === 'Fundamentos';
    const modulos = (data?.modulos || []).filter(m => coincide(m, q) && (!soloMiArea || deMiArea(m)));
    const total = data?.modulos.length || 0;
    const hechos = (data?.modulos || []).filter(m => vistos.has(m.key)).length;
    const pct = total ? Math.round((hechos / total) * 100) : 0;
    const novedades = (data?.modulos || []).flatMap(m => m.novedades.map(n => ({ ...n, modulo: m }))).slice(0, 3);

    return (
        <div className="space-y-8 pb-12">
            {/* Portada */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002F6C] via-[#004CAB] to-[#0091DA] p-6 sm:p-10 text-white shadow-xl">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-24 right-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur">
                            <GraduationCap className="h-4 w-4" /> {tr("XMART ACADEMY")}
                        </div>
                        <h1 className="mt-4 text-3xl sm:text-4xl font-bold leading-tight">{tr("Aprende ALS Xmart, módulo por módulo")}</h1>
                        <p className="mt-3 text-sm sm:text-base text-blue-100">
                            {tr("Qué hace cada pantalla, cómo se usa paso a paso y atajos directos para ir a trabajar. Se actualiza con cada mejora del sistema y con las dudas más frecuentes del equipo.")}
                        </p>
                    </div>
                    <div className="w-full max-w-xs rounded-2xl bg-white/10 p-4 backdrop-blur">
                        <p className="text-xs uppercase tracking-wide text-blue-100">{tr("Tu avance")}</p>
                        <p className="mt-1 text-3xl font-bold">{pct}%</p>
                        <div className="mt-2 h-2 rounded-full bg-white/20">
                            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-white transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-blue-100">{hechos} de {total} {tr("módulos vistos")}</p>
                    </div>
                </div>
                <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
                    <Link to="/academy/als-xmart" className="group flex items-center gap-3 rounded-2xl bg-white/10 p-4 hover:bg-white/20 transition">
                        <Sparkles className="h-6 w-6 shrink-0" />
                        <div className="flex-1"><p className="font-semibold">{tr("¿Qué es ALS Xmart?")}</p><p className="text-xs text-blue-100">{tr("De la cotización al informe firmado, en 5 pasos.")}</p></div>
                        <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition" />
                    </Link>
                    <Link to="/academy/paradixe" className="group flex items-center gap-3 rounded-2xl bg-white/10 p-4 hover:bg-white/20 transition">
                        <ClipboardCheck className="h-6 w-6 shrink-0" />
                        <div className="flex-1"><p className="font-semibold">{tr("¿Quién es Paradixe?")}</p><p className="text-xs text-blue-100">{tr("Quién construye el sistema y cómo pedir cambios.")}</p></div>
                        <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition" />
                    </Link>
                </div>
            </section>

            {/* Buscar y filtrar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder={tr("¿Qué quieres aprender? Ej.: leer la planilla, aceptar propuesta, cotización…")}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#004CAB]/30" />
                </div>
                {allowed && (
                    <button onClick={() => setSoloMiArea(v => !v)}
                        className={`h-11 rounded-xl border px-4 text-sm font-medium transition ${soloMiArea ? 'border-[#004CAB] bg-[#004CAB] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                        {tr("Solo mi área")}{area ? ` (${area})` : ''}
                    </button>
                )}
                {user?.role === 'SUPER_ADMIN' && (
                    <Link to="/academy/propuestas" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Inbox className="h-4 w-4" /> {tr("Propuestas de la IA")}
                    </Link>
                )}
            </div>

            {novedades.length > 0 && !q && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="text-sm font-semibold text-emerald-900">{tr("Novedades recientes")}</p>
                    <ul className="mt-2 space-y-1.5">
                        {novedades.map(n => (
                            <li key={n.id} className="text-sm text-emerald-900">
                                <Link to={`/academy/${n.modulo.key}`} className="font-medium underline-offset-2 hover:underline">{n.modulo.titulo}</Link>: {n.titulo}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {!data && !error && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#004CAB]" /></div>}
            {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{tr("No se pudo cargar Xmart Academy. Recarga la página.")}</p>}

            {data && data.grupos.map(g => {
                const items = modulos.filter(m => m.grupo === g);
                if (!items.length) return null;
                return (
                    <section key={g} className="space-y-3">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{data.gruposNombre?.[g] ?? g}</h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {items.map(m => {
                                const Icon = ICONOS[m.key] || Sparkles;
                                const visto = vistos.has(m.key);
                                return (
                                    <Link key={m.key} to={`/academy/${m.key}`}
                                        className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#004CAB]/40 hover:shadow-lg">
                                        <div className="flex items-start gap-3">
                                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${TONO[m.grupo] || TONO.Fundamentos} text-white shadow`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-900">{m.titulo}</p>
                                                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{m.resumen}</p>
                                            </div>
                                            {visto && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-label={tr("Visto")} />}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                            <span>{m.pasos.length} paso{m.pasos.length === 1 ? '' : 's'}{m.novedades.length ? ` · ${m.novedades.length} novedad${m.novedades.length === 1 ? '' : 'es'}` : ''}</span>
                                            <span className="inline-flex items-center gap-1 font-medium text-[#004CAB] opacity-0 transition group-hover:opacity-100">{tr("Aprender")}{' '}<ArrowRight className="h-3.5 w-3.5" /></span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
            {data && !modulos.length && <p className="text-center text-sm text-slate-500 py-10">{tr("No hay módulos que coincidan con “")}{q}{tr("”. Prueba con otra palabra o pregúntale a Martha.")}</p>}
        </div>
    );
}
