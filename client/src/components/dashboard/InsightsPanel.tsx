import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InsightsPanelProps {
    stuckOITs: any[];
    completedOITs: number;
    totalOITs: number;
    statusBreakdown: { status: string; label: string; count: number }[];
}

export function InsightsPanel({ stuckOITs, completedOITs, totalOITs, statusBreakdown }: InsightsPanelProps) {
    const completionRate = totalOITs > 0 ? Math.round((completedOITs / totalOITs) * 100) : 0;
    const topStatus = statusBreakdown[0];

    const insights: { icon: any; text: ReactNode; tone: 'warn' | 'ok' | 'info' }[] = [];

    if (stuckOITs.length > 0) {
        insights.push({
            icon: AlertTriangle,
            tone: 'warn',
            text: (
                <>
                    <strong>{stuckOITs.length}</strong> OIT{stuckOITs.length === 1 ? '' : 's'} llevan más de 5 días sin
                    avanzar de estado. <Link to="/oits" className="underline hover:text-amber-900">Revisar</Link>.
                </>
            ),
        });
    } else if (totalOITs > 0) {
        insights.push({
            icon: CheckCircle2,
            tone: 'ok',
            text: 'Ninguna OIT lleva más de 5 días estancada en el mismo estado.',
        });
    }

    if (totalOITs > 0) {
        insights.push({
            icon: TrendingUp,
            tone: 'info',
            text: (
                <>
                    <strong>{completionRate}%</strong> de las OITs totales están completadas ({completedOITs} de {totalOITs}).
                </>
            ),
        });
    }

    if (topStatus && totalOITs > 0) {
        insights.push({
            icon: Sparkles,
            tone: 'info',
            text: (
                <>
                    El estado más frecuente es <strong>{topStatus.label}</strong>, con {topStatus.count} OIT{topStatus.count === 1 ? '' : 's'}.
                </>
            ),
        });
    }

    if (insights.length === 0) {
        insights.push({
            icon: Sparkles,
            tone: 'info',
            text: 'Aún no hay suficientes OITs para generar observaciones.',
        });
    }

    const toneClasses: Record<string, string> = {
        warn: 'bg-amber-50 border-amber-100 text-amber-800',
        ok: 'bg-emerald-50 border-emerald-100 text-emerald-800',
        info: 'bg-[#E6EEF8] border-[#c9dbf0] text-[#003b85]',
    };

    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#004CAB]" />
                    Observaciones
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {insights.map((insight, i) => {
                    const Icon = insight.icon;
                    return (
                        <div key={i} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${toneClasses[insight.tone]}`}>
                            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{insight.text}</span>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
