import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, FileText, Workflow, Trash2, TrendingUp, Users, FileSearch } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    AreaChart,
    Area,
    Cell,
} from 'recharts';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/date';

interface DashboardMetrics {
    totalOITs: number;
    totalReports: number;
    activeTemplatesCount: number;
    trashedTemplatesCount: number;
    oitsByStatus: Record<string, number>;
    reportsByMonth: Array<{ month: string; count: number }>;
    reportsByMatrix: Array<{ name: string; count: number }>;
    topClients: Array<{ name: string; count: number }>;
    recentReports: Array<{ id: string; name: string; type: string; oitNumber: string; createdAt: string }>;
}

// Paleta consistente con el resto de ALS (slate + indigo/blue), no una paleta nueva.
const CHART_COLOR = '#4f46e5'; // indigo-600
const STATUS_COLORS: Record<string, string> = {
    COMPLETED: '#059669', // emerald-600
    IN_PROGRESS: '#4f46e5', // indigo-600
    SCHEDULED: '#0891b2', // cyan-600
    ANALYZING: '#7c3aed', // violet-600
    REVIEW_REQUIRED: '#ea580c', // orange-600
    PENDING: '#64748b', // slate-500
    UPLOADING: '#94a3b8', // slate-400
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    UPLOADING: 'Subiendo',
    ANALYZING: 'Analizando',
    REVIEW_REQUIRED: 'Requiere revisión',
    SCHEDULED: 'Programada',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada',
};

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/dashboard')
            .then(res => setMetrics(res.data))
            .catch(err => console.error('Error fetching analytics:', err))
            .finally(() => setIsLoading(false));
    }, []);

    const statusData = metrics
        ? Object.entries(metrics.oitsByStatus).map(([status, count]) => ({
            status,
            label: STATUS_LABELS[status] || status,
            count,
        }))
        : [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analítica</h2>
                <p className="text-slate-500">
                    Métricas de OITs, informes generados y uso de plantillas.
                </p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Total OITs', value: metrics?.totalOITs, icon: FileText, color: 'text-slate-600' },
                    { title: 'Informes generados', value: metrics?.totalReports, icon: FileSearch, color: 'text-indigo-600' },
                    { title: 'Plantillas activas', value: metrics?.activeTemplatesCount, icon: Workflow, color: 'text-emerald-600' },
                    { title: 'En papelera', value: metrics?.trashedTemplatesCount, icon: Trash2, color: 'text-slate-400' },
                ].map((kpi) => (
                    <Card key={kpi.title} className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">{kpi.title}</p>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-16 mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value ?? 0}</p>
                                )}
                            </div>
                            <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-70`} />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Informes por mes */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                            Informes generados por mes
                        </CardTitle>
                        <CardDescription>Basado en el historial de versiones de informes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : !metrics?.reportsByMonth.length ? (
                            <EmptyState text="Todavía no se han generado informes" />
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={metrics.reportsByMonth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                        labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                                    />
                                    <Area type="monotone" dataKey="count" name="Informes" stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.12} strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* OITs por estado */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4 text-indigo-600" />
                            OITs por estado
                        </CardTitle>
                        <CardDescription>Distribución actual del flujo de trabajo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : !statusData.length ? (
                            <EmptyState text="No hay OITs registradas" />
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={statusData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                    <Bar dataKey="count" name="OITs" radius={[0, 4, 4, 0]}>
                                        {statusData.map((entry) => (
                                            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Informes por matriz */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Workflow className="h-4 w-4 text-indigo-600" />
                            Informes por matriz
                        </CardTitle>
                        <CardDescription>Top 10 tipos de informe más generados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : !metrics?.reportsByMatrix.length ? (
                            <EmptyState text="Todavía no se han generado informes" />
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={metrics.reportsByMatrix} margin={{ bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} angle={-35} textAnchor="end" interval={0} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                    <Bar dataKey="count" name="Informes" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Top clientes */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4 text-indigo-600" />
                            OITs por cliente
                        </CardTitle>
                        <CardDescription>Top 10 clientes con más OITs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : !metrics?.topClients.length ? (
                            <EmptyState text="No hay cotizaciones con cliente asociado" />
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={metrics.topClients} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                    <Bar dataKey="count" name="OITs" fill="#0891b2" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Informes recientes */}
            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-base">Informes generados recientemente</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-slate-50/50 border-slate-100">
                                <TableHead className="py-3 px-4 font-medium text-slate-500">Informe</TableHead>
                                <TableHead className="py-3 px-4 font-medium text-slate-500">OIT</TableHead>
                                <TableHead className="py-3 px-4 font-medium text-slate-500">Tipo</TableHead>
                                <TableHead className="py-3 px-4 font-medium text-slate-500">Fecha</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[200px]" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    </TableRow>
                                ))
                            ) : !metrics?.recentReports.length ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                        Todavía no se han generado informes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                metrics.recentReports.map((r) => (
                                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                                        <TableCell className="py-3 px-4 font-medium text-slate-900">{r.name}</TableCell>
                                        <TableCell className="py-3 px-4 text-slate-600">{r.oitNumber}</TableCell>
                                        <TableCell className="py-3 px-4">
                                            <Badge variant="outline" className="uppercase text-xs bg-slate-50">{r.type}</Badge>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-slate-600">
                                            {formatDateTime(new Date(r.createdAt), 'es-CO')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 h-64 text-slate-400">
            <BarChart3 className="h-8 w-8 text-slate-300" />
            <p className="text-sm">{text}</p>
        </div>
    );
}
