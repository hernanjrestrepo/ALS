import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ExternalLink, MessageCircle, CheckCircle2, Users, Lightbulb, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { CHAT_DRAFT_EVENT } from '@/components/shared/ChatWidget';
import { ICONOS, TONO, marcarVisto, leerVistos, type AcademyData, type MarcaCaptura } from '@/features/academy/academy';

const fecha = (d: string | null) => (d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }) : '');

// Un modulo de Xmart Academy: para que sirve, captura con marcas, pasos, reglas, preguntas y novedades.
export default function AcademyModulePage() {
    const { key } = useParams();
    const [data, setData] = useState<AcademyData | null>(null);
    const [marcas, setMarcas] = useState<Record<string, MarcaCaptura[]>>({});
    const [activa, setActiva] = useState<number | null>(null);
    const [capturaOk, setCapturaOk] = useState(true);
    const [visto, setVisto] = useState(false);

    useEffect(() => {
        api.get('/academy').then(r => setData(r.data)).catch(() => setData({ grupos: [], modulos: [] }));
        fetch('/academy/marcas.json').then(r => (r.ok ? r.json() : {})).then(setMarcas).catch(() => setMarcas({}));
    }, []);
    useEffect(() => { setActiva(null); setCapturaOk(true); setVisto(leerVistos().has(key || '')); window.scrollTo(0, 0); }, [key]);

    if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#004CAB]" /></div>;
    const idx = data.modulos.findIndex(m => m.key === key);
    const m = data.modulos[idx];
    if (!m) return (
        <div className="py-20 text-center">
            <p className="text-slate-600">Ese módulo no existe.</p>
            <Link to="/academy" className="mt-3 inline-block text-[#004CAB] underline">Volver a Xmart Academy</Link>
        </div>
    );
    const Icon = ICONOS[m.key] || Sparkles;
    const prev = data.modulos[idx - 1];
    const next = data.modulos[idx + 1];
    const puntos = (m.captura && marcas[m.captura]) || [];
    const preguntas = [...m.preguntasAprobadas.map(p => ({ pregunta: p.titulo, respuesta: p.contenido })), ...m.preguntas];
    const preguntarAna = () => window.dispatchEvent(new CustomEvent(CHAT_DRAFT_EVENT, { detail: { text: `Sobre "${m.titulo}": ` } }));

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
            <Link to="/academy" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#004CAB]"><ArrowLeft className="h-4 w-4" /> Xmart Academy</Link>

            <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${TONO[m.grupo] || TONO.Fundamentos} text-white shadow-lg`}>
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{m.grupo}</p>
                    <h1 className="text-2xl font-bold text-slate-900">{m.titulo}</h1>
                    <p className="mt-1 text-slate-600">{m.resumen}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                    {m.href && (
                        <Link to={m.href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#004CAB] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#003d8a]">
                            Ir al módulo <ExternalLink className="h-4 w-4" />
                        </Link>
                    )}
                    <button onClick={preguntarAna} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <MessageCircle className="h-4 w-4" /> Pregúntale a Ana
                    </button>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 md:col-span-2">
                    <h2 className="text-sm font-semibold text-[#004CAB]">Para qué sirve</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{m.paraQue}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#004CAB]"><Users className="h-4 w-4" /> Quiénes lo usan</h2>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                        {m.quienes.map(q => <li key={q} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{q}</li>)}
                    </ul>
                </div>
            </section>

            {m.captura && capturaOk && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#004CAB]">Así se ve</h2>
                        <span className="text-[11px] text-slate-400">Datos de ejemplo{puntos.length ? ' · toca los números' : ''}</span>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        <img src={`/academy/${m.captura}`} alt={`Pantalla de ${m.titulo}`} className="w-full" onError={() => setCapturaOk(false)} />
                        {puntos.map((p, i) => (
                            <button key={i} onClick={() => setActiva(activa === i ? null : i)}
                                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg ring-4 transition ${activa === i ? 'bg-amber-500 ring-amber-200 scale-110' : 'bg-[#004CAB] ring-[#004CAB]/25 hover:scale-110 animate-pulse'}`}
                                aria-label={p.titulo}>
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    {puntos.length > 0 && (
                        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                            {puntos.map((p, i) => (
                                <li key={i}>
                                    <button onClick={() => setActiva(i)} className={`w-full rounded-lg border p-2.5 text-left text-sm transition ${activa === i ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <span className="font-semibold text-slate-900">{i + 1}. {p.titulo}</span>
                                        <span className="block text-xs text-slate-600">{p.texto}</span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-[#004CAB]">Paso a paso</h2>
                <ol className="mt-4 space-y-0">
                    {m.pasos.map((p, i) => (
                        <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                            {i < m.pasos.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200" />}
                            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${TONO[m.grupo] || TONO.Fundamentos} text-sm font-bold text-white`}>{i + 1}</span>
                            <div className="pt-1">
                                <p className="font-medium text-slate-900">{p.titulo.replace(/^\d+\.\s*/, '')}</p>
                                <p className="mt-0.5 text-sm text-slate-600">{p.detalle}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            {m.reglas.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Lightbulb className="h-4 w-4" /> Tenga en cuenta</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                        {m.reglas.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </section>
            )}

            {preguntas.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="text-sm font-semibold text-[#004CAB]">Preguntas frecuentes</h2>
                    <div className="mt-3 divide-y divide-slate-100">
                        {preguntas.map((p, i) => (
                            <details key={i} className="group py-3">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-900">
                                    {p.pregunta}
                                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                                </summary>
                                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{p.respuesta}</p>
                            </details>
                        ))}
                    </div>
                </section>
            )}

            {m.novedades.length > 0 && (
                <section className="rounded-2xl border border-emerald-200 bg-white p-5">
                    <h2 className="text-sm font-semibold text-emerald-700">Novedades</h2>
                    <ul className="mt-3 space-y-3">
                        {m.novedades.map(n => (
                            <li key={n.id} className="rounded-xl bg-emerald-50/60 p-3">
                                <p className="text-sm font-medium text-slate-900">{n.titulo}</p>
                                <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{n.contenido}</p>
                                <p className="mt-1 text-[11px] text-slate-400">{fecha(n.decididoEn)}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="flex flex-col items-center gap-4 pt-2">
                <button onClick={() => { marcarVisto(m.key); setVisto(true); }} disabled={visto}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${visto ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                    <CheckCircle2 className="h-4 w-4" /> {visto ? 'Módulo visto' : 'Marcar como visto'}
                </button>
                <div className="flex w-full items-center justify-between gap-3 text-sm">
                    {prev ? <Link to={`/academy/${prev.key}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-[#004CAB]"><ArrowLeft className="h-4 w-4" /> {prev.titulo}</Link> : <span />}
                    {next ? <Link to={`/academy/${next.key}`} className="inline-flex items-center gap-1 text-right text-slate-600 hover:text-[#004CAB]">{next.titulo} <ArrowRight className="h-4 w-4" /></Link> : <span />}
                </div>
            </div>
        </div>
    );
}
