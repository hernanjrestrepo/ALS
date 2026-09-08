import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrendChartProps {
    data: { month: string; count: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
                <CardTitle className="text-slate-900">OITs creadas por mes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                                formatter={(value: number) => [`${value} OIT${value === 1 ? '' : 's'}`, 'Creadas']}
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                                cursor={{ fill: '#E6EEF8' }}
                            />
                            <Bar dataKey="count" fill="#004CAB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
