import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

import { tr } from '@/i18n';
interface Consultation {
    id: string;
    normParameter: string;
    quotedAs: string;
    normReference?: string | null;
    quotationNumber?: string | null;
    status: 'PENDIENTE' | 'RESPONDIDA';
    answerSame?: boolean | null;
    answerNote?: string | null;
    answeredAt?: string | null;
    createdAt: string;
}

export default function ParameterConsultationsPage() {
    const [items, setItems] = useState<Consultation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        try {
            const response = await api.get('/quotations/parameter-consultations');
            setItems(response.data);
        } catch (error) {
            console.error('Error loading parameter consultations:', error);
            toast.error(tr("No se pudieron cargar las consultas"));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const answer = async (id: string, same: boolean) => {
        setSavingId(id);
        try {
            const note = (notes[id] || '').trim();
            await api.post(`/quotations/parameter-consultations/${id}/answer`, { same, note: note || undefined });
            toast.success(same
                ? 'Registrado: son el mismo parámetro. Aplica a los próximos análisis.'
                : 'Registrado: son parámetros distintos.');
            await load();
        } catch (error: any) {
            console.error('Error answering consultation:', error);
            toast.error(error.response?.data?.error || tr("No se pudo registrar la respuesta"));
        } finally {
            setSavingId(null);
        }
    };

    const pending = items.filter(i => i.status === 'PENDIENTE');
    const answered = items.filter(i => i.status === 'RESPONDIDA');

    const renderItem = (c: Consultation) => (
        <Card key={c.id} className="border-slate-200 shadow-sm">
            <CardContent className="pt-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    {c.status === 'PENDIENTE'
                        ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{tr("Pendiente")}</Badge>
                        : c.answerSame
                            ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{tr("Mismo parámetro")}</Badge>
                            : <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{tr("Parámetro distinto")}</Badge>}
                    {c.quotationNumber && <span className="text-xs text-slate-500">{tr("Cotización")}{' '}{c.quotationNumber}</span>}
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">{tr("La norma pide")}</p>
                        <p className="font-medium text-slate-900">{c.normParameter}{c.normReference ? ` (límite ${c.normReference})` : ''}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">{tr("La cotización trae")}</p>
                        <p className="font-medium text-slate-900">{c.quotedAs}</p>
                    </div>
                </div>
                <p className="text-sm text-slate-700">{tr("¿Es el mismo parámetro?")}</p>
                <Textarea
                    placeholder={tr("Nota opcional (cómo lo nombra el laboratorio, método, etc.)")}
                    value={notes[c.id] ?? c.answerNote ?? ''}
                    onChange={(e) => setNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                    rows={2}
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        onClick={() => answer(c.id, true)}
                        disabled={savingId === c.id}
                        variant={c.answerSame === true ? 'default' : 'outline'}
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> {tr("Sí, es el mismo")}
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => answer(c.id, false)}
                        disabled={savingId === c.id}
                        variant={c.answerSame === false ? 'destructive' : 'outline'}
                    >
                        <XCircle className="mr-2 h-4 w-4" /> {tr("No, es distinto")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <HelpCircle className="h-6 w-6 text-slate-500" /> {tr("Consultas de parámetros")}
                </h2>
                <p className="text-slate-500">
                    {tr("Cuando el sistema no puede decidir si dos nombres son el mismo parámetro, la pregunta llega aquí. Su respuesta se usa en los siguientes análisis de cotizaciones.")}
                </p>
            </div>

            {isLoading ? (
                <Skeleton className="h-40 w-full" />
            ) : (
                <>
                    <section className="space-y-3">
                        <h3 className="text-lg font-semibold text-slate-900">{tr("Pendientes (")}{pending.length})</h3>
                        {pending.length === 0 && (
                            <Card className="border-slate-200"><CardHeader><CardDescription>{tr("No hay consultas pendientes.")}</CardDescription></CardHeader></Card>
                        )}
                        {pending.map(renderItem)}
                    </section>

                    {answered.length > 0 && (
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-900">{tr("Respondidas (")}{answered.length})</h3>
                            {answered.map(renderItem)}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
