import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusChartProps {
    data: { status: string; label: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
    COMPLETED: '#059669',
    IN_PROGRESS: '#D97706',
    PENDING: '#94A3B8',
    ANALYZING: '#004CAB',
    REVIEW_REQUIRED: '#EA580C',
    SCHEDULED: '#7C3AED',
};

export function StatusChart({ data }: StatusChartProps) {
    if (data.length === 0) {
        return (
            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="text-slate-900">Distribución por estado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500">Sin datos suficientes todavía.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
                <CardTitle className="text-slate-900">Distribución por estado</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="count"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={2}
                            >
                                {data.map((entry) => (
                                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748B'} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number, name: string) => [`${value} OIT${value === 1 ? '' : 's'}`, name]}
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: 12, color: '#475569' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
