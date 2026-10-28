import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { tr } from '@/i18n';

// Trazabilidad de la OIT (reunion del 27-oct): de la cotizacion al informe, con fecha y hora de cada paso.
interface Ev { at: string; label: string; detail?: string; who?: string }

const fmt = (iso: string) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function TraceabilityCard({ oitId }: { oitId: string }) {
    const [events, setEvents] = useState<Ev[] | null>(null);

    useEffect(() => {
        api.get(`/oits/${oitId}/traceability`).then(r => setEvents(r.data?.events || [])).catch(() => setEvents([]));
    }, [oitId]);

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-indigo-600" />{tr('Trazabilidad')}</CardTitle>
            </CardHeader>
            <CardContent>
                {!events && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                {events && events.length === 0 && <p className="text-sm text-slate-500">{tr('Sin movimientos registrados.')}</p>}
                {events && events.length > 0 && (
                    <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                        {events.map((e, i) => (
                            <li key={i} className="ml-4">
                                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                                <p className="text-sm font-medium text-slate-900">{e.label}</p>
                                <p className="text-xs text-slate-500">{fmt(e.at)}{e.detail ? ` · ${e.detail}` : ''}{e.who ? ` · ${e.who}` : ''}</p>
                            </li>
                        ))}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}
