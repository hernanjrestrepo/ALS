import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, FlaskConical, CheckCircle2, CircleDashed, CircleAlert } from 'lucide-react';
import api from '@/lib/api';
import { tr } from '@/i18n';

// Panel de laboratorio (reunion del 27-oct con Sirys y Juan): por OIT, que servicios ya
// tienen resultados, de quien son (ALS o tercero) y cuales faltan por cargar o por marcar
// como "cargue completo". Al tocar una OIT se abre su pestana Informe.

type State = 'SIN_RESULTADOS' | 'PARCIAL' | 'COMPLETO';
interface Svc { key: string; name: string; state: State; files: Array<{ file: string; origin: string }>; issues: string[] }
interface Row { id: string; oitNumber: string; clientName?: string; estado: State; services: Svc[]; summary: { total: number; completos: number; conResultados: number } }
interface Overview { totals: { oit: number; sinResultados: number; parciales: number; completas: number }; rows: Row[] }

const FILTERS: Array<{ key: 'ALL' | State; label: string }> = [
    { key: 'ALL', label: tr('Todas') },
    { key: 'SIN_RESULTADOS', label: tr('Sin resultados') },
    { key: 'PARCIAL', label: tr('Por cerrar') },
    { key: 'COMPLETO', label: tr('Completas') },
];

const STATE_UI: Record<State, { label: string; cls: string; Icon: any }> = {
    SIN_RESULTADOS: { label: tr('Sin resultados'), cls: 'bg-amber-50 text-amber-800 border-amber-200', Icon: CircleAlert },
    PARCIAL: { label: tr('Falta cargue completo'), cls: 'bg-sky-50 text-sky-800 border-sky-200', Icon: CircleDashed },
    COMPLETO: { label: tr('Completo'), cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', Icon: CheckCircle2 },
};

const fold = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function LabPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'ALL' | State>('SIN_RESULTADOS');
    const [query, setQuery] = useState('');

    useEffect(() => {
        api.get('/lab/overview').then(r => setData(r.data)).catch(() => setError(tr('No se pudo cargar el panel de laboratorio.')));
    }, []);

    const rows = useMemo(() => {
        const term = fold(query.trim());
        return (data?.rows || []).filter(r => (filter === 'ALL' || r.estado === filter)
            && (!term || [r.oitNumber, r.clientName, ...r.services.map(s => s.name)].some(v => fold(v).includes(term))));
    }, [data, filter, query]);

    if (error) return <p className="text-center text-red-600 py-16">{error}</p>;
    if (!data) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

    const t = data.totals;
    const cards: Array<{ key: 'ALL' | State; n: number; label: string }> = [
        { key: 'ALL', n: t.oit, label: tr('OIT con laboratorio') },
        { key: 'SIN_RESULTADOS', n: t.sinResultados, label: tr('Sin resultados') },
        { key: 'PARCIAL', n: t.parciales, label: tr('Por cerrar') },
        { key: 'COMPLETO', n: t.completas, label: tr('Completas') },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-indigo-600" />
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{tr('Laboratorio')}</h1>
                    <p className="text-sm text-slate-500">{tr('Qué servicios ya tienen resultados y cuáles faltan. Toca una OIT para cargar o cerrar.')}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {cards.map(c => (
                    <button key={c.key} onClick={() => setFilter(c.key)}
                        className={`text-left rounded-xl border p-3 bg-white transition ${filter === c.key ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
                        <p className="text-2xl font-bold text-slate-900">{c.n}</p>
                        <p className="text-xs text-slate-500">{c.label}</p>
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={tr('Buscar por OIT, cliente o servicio...')} className="pl-9 bg-white" />
                </div>
                <div className="flex gap-1">
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`text-xs rounded-full px-3 py-1.5 border ${filter === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{f.label}</button>
                    ))}
                </div>
            </div>

            {rows.length === 0 && <p className="text-center text-slate-500 py-12">{tr('No hay OIT en este filtro.')}</p>}
            <div className="space-y-2">
                {rows.map(r => (
                    <Card key={r.id} className="border-slate-200 shadow-sm hover:border-indigo-300 transition cursor-pointer" onClick={() => navigate(`/oits/${r.id}?tab=report`)}>
                        <CardContent className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{r.oitNumber}</span>
                                <span className="text-sm text-slate-600 truncate flex-1">{r.clientName || ''}</span>
                                <span className="text-xs text-slate-500">{r.summary.completos}/{r.summary.total}</span>
                            </div>
                            <div className="space-y-1">
                                {r.services.map(s => {
                                    const ui = STATE_UI[s.state];
                                    const als = s.files.filter(f => f.origin === 'ALS').length;
                                    const ter = s.files.filter(f => f.origin === 'TERCERO').length;
                                    return (
                                        <div key={s.key} className="flex items-center gap-2 text-xs">
                                            <Badge variant="outline" className={`gap-1 shrink-0 ${ui.cls}`}><ui.Icon className="h-3 w-3" />{ui.label}</Badge>
                                            <span className="truncate flex-1 text-slate-700">{s.name}</span>
                                            {als > 0 && <span className="text-slate-500 shrink-0">ALS {als}</span>}
                                            {ter > 0 && <span className="text-purple-700 shrink-0">{tr('Terceros')} {ter}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
