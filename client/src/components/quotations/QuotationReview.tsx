import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Info, Pencil } from 'lucide-react';

// Pedido de Hernan (2026-10-19, SIACOT-20857): faltantes subsanables en pantalla,
// decision de Ana por hallazgo con comentario, e informativos en un cuadro resumen.

export type FindingDecision = 'ACEPTADO' | 'EN_REVISION' | 'RECHAZADO';

export interface FindingReview {
    decision: FindingDecision;
    comment: string;
    userName?: string;
    at: string;
    history?: Array<Omit<FindingReview, 'history'>>;
}

export interface MissingResolution {
    value: string;
    userName?: string;
    at: string;
}

export const DECISION_INFO: Record<FindingDecision, { label: string; hint: string; badge: string; button: string }> = {
    ACEPTADO: {
        label: 'Aceptado con justificación',
        hint: 'Procede así. Escribe por qué se acepta (queda como excepción aprobada).',
        badge: 'bg-green-600 text-white',
        button: 'border-green-300 text-green-800 hover:bg-green-50 data-[active=true]:bg-green-600 data-[active=true]:text-white',
    },
    EN_REVISION: {
        label: 'En revisión',
        hint: 'Se está verificando (con el cliente, el laboratorio o el área técnica). Escribe qué se revisa y con quién.',
        badge: 'bg-amber-500 text-white',
        button: 'border-amber-300 text-amber-800 hover:bg-amber-50 data-[active=true]:bg-amber-500 data-[active=true]:text-white',
    },
    RECHAZADO: {
        label: 'Rechazado',
        hint: 'No procede: la cotización debe corregirse. Escribe qué hay que cambiar.',
        badge: 'bg-red-600 text-white',
        button: 'border-red-300 text-red-800 hover:bg-red-50 data-[active=true]:bg-red-600 data-[active=true]:text-white',
    },
};

const when = (iso: string) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });

function errorText(error: any, fallback: string) {
    return error?.response?.data?.error || fallback;
}

// ---------------------------------------------------------------- Faltantes

// Un faltante que es una fecha se llena con calendario (Hernan, 2026-10-23).
const isDateItem = (item: string) => /\b(fecha|date)\b/i.test(item);

// La IA a veces deja el faltante en ingles ("proposed execution date"); se muestra en
// espanol. La clave guardada sigue siendo el texto original.
const ITEM_ES: Array<[RegExp, string]> = [
    [/proposed (execution|start|service) date/i, 'Fecha propuesta de ejecución'],
    [/sampling (site )?address|exact address/i, 'Dirección exacta del sitio de muestreo'],
    [/contact (person|name)/i, 'Persona de contacto'],
    [/delivery date/i, 'Fecha de entrega'],
];
const itemLabel = (item: string) => ITEM_ES.find(([re]) => re.test(item))?.[1] || item;
const dateLabel = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : v;

function MissingRow({ quotationId, item, resolution, canEdit, onSaved }: {
    quotationId: string; item: string; resolution?: MissingResolution; canEdit: boolean; onSaved: (q: any) => void;
}) {
    const [value, setValue] = useState(resolution?.value || '');
    const [editing, setEditing] = useState(!resolution);
    const [saving, setSaving] = useState(false);
    const isDate = isDateItem(item);

    const save = async (raw = value) => {
        if (!raw.trim()) return;
        setSaving(true);
        try {
            const { data } = await api.put(`/quotations/${quotationId}/missing`, { item, value: raw.trim() });
            onSaved(data);
            setEditing(false);
            toast.success('Elemento subsanado');
        } catch (error) {
            toast.error(errorText(error, 'No se pudo guardar'));
        } finally {
            setSaving(false);
        }
    };

    if (resolution && !editing) {
        return (
            <li className="flex items-start gap-2 text-sm p-2 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-slate-500 line-through decoration-slate-300">{itemLabel(item)}</p>
                    <p className="font-medium text-green-900 break-words">{isDate ? dateLabel(resolution.value) : resolution.value}</p>
                    <p className="text-xs text-green-700">Subsanado por {resolution.userName || 'usuario'} · {when(resolution.at)}</p>
                </div>
                {canEdit && (
                    <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-700" title="Editar">
                        <Pencil className="h-4 w-4" />
                    </button>
                )}
            </li>
        );
    }

    return (
        <li className="text-sm p-2 rounded-lg border border-red-200 bg-white space-y-1.5">
            <p className="text-red-800 flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span>{itemLabel(item)}</p>
            {canEdit && (
                <div className="flex gap-2">
                    {isDate ? (
                        <Input
                            type="date"
                            value={value}
                            // Al elegir el dia en el calendario queda guardado.
                            onChange={e => { setValue(e.target.value); if (e.target.value) save(e.target.value); }}
                            onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                            className="h-8 text-sm w-48 cursor-pointer"
                            disabled={saving}
                        />
                    ) : (
                        <Input
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
                            placeholder="Escribe el dato y presiona Enter"
                            className="h-8 text-sm"
                            disabled={saving}
                        />
                    )}
                    {saving && <Loader2 className="h-4 w-4 animate-spin text-slate-400 self-center" />}
                </div>
            )}
        </li>
    );
}

export function MissingElementsCard({ quotationId, missing, resolutions, canEdit, onSaved }: {
    quotationId: string; missing: string[]; resolutions: Record<string, MissingResolution>; canEdit: boolean; onSaved: (q: any) => void;
}) {
    const pending = missing.filter(m => !resolutions[m.trim()]).length;
    return (
        <Card className={pending ? 'border-red-200 shadow-sm' : 'border-green-200 shadow-sm'}>
            <CardHeader className={pending ? 'bg-red-50' : 'bg-green-50'}>
                <CardTitle className={`text-base ${pending ? 'text-red-900' : 'text-green-900'}`}>
                    {pending ? `❌ Elementos Faltantes (${pending} de ${missing.length} pendientes)` : `✅ Elementos faltantes subsanados (${missing.length})`}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <ul className="space-y-2">
                    {missing.map(item => (
                        <MissingRow key={item} quotationId={quotationId} item={item.trim()} resolution={resolutions[item.trim()]} canEdit={canEdit} onSaved={onSaved} />
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

// ---------------------------------------------------------------- Decision por hallazgo

export function FindingDecisionPanel({ quotationId, issueKey, review, canEdit, onSaved }: {
    quotationId: string; issueKey: string; review?: FindingReview; canEdit: boolean; onSaved: (q: any) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [decision, setDecision] = useState<FindingDecision | null>(review?.decision || null);
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!decision || comment.trim().length < 3) return;
        setSaving(true);
        try {
            const { data } = await api.put(`/quotations/${quotationId}/findings`, { key: issueKey, decision, comment: comment.trim() });
            onSaved(data);
            setEditing(false);
            setComment('');
            toast.success('Decisión registrada');
        } catch (error) {
            toast.error(errorText(error, 'No se pudo registrar la decisión'));
        } finally {
            setSaving(false);
        }
    };

    const showForm = canEdit && (editing || !review);

    return (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {review && (
                <div className="text-sm">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${DECISION_INFO[review.decision].badge}`}>
                        {DECISION_INFO[review.decision].label.toUpperCase()}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">{review.userName || 'Usuario'} · {when(review.at)}</span>
                    <p className="mt-1 text-slate-800 bg-white/70 p-2 rounded border border-slate-200 whitespace-pre-wrap">{review.comment}</p>
                    {review.history && review.history.length > 0 && (
                        <details className="mt-1 text-xs text-slate-500">
                            <summary className="cursor-pointer">Decisiones anteriores ({review.history.length})</summary>
                            <ul className="mt-1 space-y-1">
                                {[...review.history].reverse().map((h, idx) => (
                                    <li key={idx}>{DECISION_INFO[h.decision]?.label || h.decision} — {h.userName || 'Usuario'}, {when(h.at)}: {h.comment}</li>
                                ))}
                            </ul>
                        </details>
                    )}
                    {canEdit && !editing && (
                        <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => { setEditing(true); setDecision(review.decision); }}>
                            Cambiar decisión
                        </Button>
                    )}
                </div>
            )}
            {!review && !canEdit && <p className="text-xs text-slate-500">Pendiente de decisión del laboratorio.</p>}
            {showForm && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Decisión:</p>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(DECISION_INFO) as FindingDecision[]).map(d => (
                            <button
                                key={d}
                                type="button"
                                data-active={decision === d}
                                onClick={() => setDecision(d)}
                                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${DECISION_INFO[d].button}`}
                            >
                                {DECISION_INFO[d].label}
                            </button>
                        ))}
                    </div>
                    {decision && <p className="text-xs text-slate-500">{DECISION_INFO[decision].hint}</p>}
                    <Textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Comentario (obligatorio)"
                        className="text-sm min-h-[60px] bg-white"
                        disabled={saving}
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={save} disabled={saving || !decision || comment.trim().length < 3}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar decisión
                        </Button>
                        {review && (
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setComment(''); setDecision(review.decision); }} disabled={saving}>
                                Cancelar
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------- Informativos

export function InformativeFindingsTable({ issues, parameterChecks }: { issues: any[]; parameterChecks: any[] }) {
    const limitOf = (parameter?: string) => parameterChecks.find(c => c.normParameter === parameter)?.normLimit;
    return (
        <Card className="border-blue-200 shadow-sm">
            <CardHeader className="bg-blue-50">
                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                    <Info className="h-4 w-4" />
                    Informativos ({issues.length})
                </CardTitle>
                <CardDescription>
                    No cuentan como incumplimiento ni requieren decisión. Los sugeridos por la norma son parámetros del artículo que no se cotizaron: confirmar con el cliente si los necesita.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b">
                            <th className="py-1.5 pr-3 w-8">#</th>
                            <th className="py-1.5 pr-3">Parámetro</th>
                            <th className="py-1.5 pr-3">Límite norma</th>
                            <th className="py-1.5">Observación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {issues.map((issue, idx) => (
                            <tr key={issue.key || idx} className="border-b last:border-0 align-top">
                                <td className="py-1.5 pr-3 text-slate-400">{idx + 1}</td>
                                <td className="py-1.5 pr-3 font-medium text-slate-900">{issue.parameter || '—'}</td>
                                <td className="py-1.5 pr-3 text-slate-600">{limitOf(issue.parameter) || '-'}</td>
                                <td className="py-1.5 text-slate-600">{issue.parameter ? issue.category : issue.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
