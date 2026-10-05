import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Presentation, Sheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const PALETTE = ['#004CAB', '#00A3A6', '#F59E0B', '#7C3AED', '#DC2626', '#059669', '#DB2777', '#475569'];

interface ChartSpec {
    type: 'bar' | 'line' | 'pie';
    title: string;
    labels: string[];
    series: Array<{ name: string; data: number[] }>;
}

const num = (v: unknown) => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
};

/** Misma validacion que el servidor (assistantExport.normalizeChart). */
function parseChart(raw: string): ChartSpec | null {
    let o: any;
    try { o = JSON.parse(raw.trim()); } catch { return null; }
    if (!o || typeof o !== 'object') return null;
    const labels: string[] = Array.isArray(o.labels) ? o.labels.map(String) : [];
    if (!labels.length) return null;
    let series: ChartSpec['series'] = [];
    if (Array.isArray(o.series)) {
        series = o.series.filter((s: any) => s && Array.isArray(s.data)).map((s: any, i: number) => ({ name: String(s.name || `Serie ${i + 1}`), data: labels.map((_, k) => num(s.data[k])) }));
    } else if (Array.isArray(o.data) || Array.isArray(o.values)) {
        const d = o.data || o.values;
        series = [{ name: String(o.name || o.title || 'Valor'), data: labels.map((_, k) => num(d[k])) }];
    }
    if (!series.length) return null;
    const t = String(o.type || 'bar').toLowerCase();
    const type = /pie|torta|pastel|dona|donut/.test(t) ? 'pie' : /line|linea|línea/.test(t) ? 'line' : 'bar';
    return { type, title: String(o.title || ''), labels, series };
}

function ChartBlock({ chart, compact }: { chart: ChartSpec; compact?: boolean }) {
    const rows = chart.labels.map((label, i) => {
        const row: Record<string, string | number> = { label };
        chart.series.forEach(s => { row[s.name] = s.data[i] ?? 0; });
        return row;
    });
    const height = compact ? 220 : 300;
    return (
        <div className="my-3 rounded-xl border border-slate-200 bg-white p-3 not-prose">
            {chart.title && <p className="mb-2 text-center text-sm font-semibold text-slate-800">{chart.title}</p>}
            <div style={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'pie' ? (
                        <PieChart>
                            <Pie data={rows} dataKey={chart.series[0].name} nameKey="label" outerRadius={compact ? 70 : 100} label={!compact}>
                                {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                    ) : chart.type === 'line' ? (
                        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                            {chart.series.map((s, i) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.5} dot={{ r: 3 }} />)}
                        </LineChart>
                    ) : (
                        <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={rows.length > 5 ? -25 : 0} textAnchor={rows.length > 5 ? 'end' : 'middle'} height={rows.length > 5 ? 60 : 30} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                            {chart.series.map((s, i) => <Bar key={s.name} dataKey={s.name} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />)}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

const FORMATS = [
    { id: 'pdf', label: 'PDF', icon: FileText },
    { id: 'pptx', label: 'PowerPoint', icon: Presentation },
    { id: 'xlsx', label: 'Excel', icon: Sheet },
] as const;

/** Botones para descargar la respuesta como PDF, PowerPoint o Excel. */
export function ExportButtons({ content, compact }: { content: string; compact?: boolean }) {
    const [busy, setBusy] = useState<string | null>(null);

    const download = async (format: string) => {
        setBusy(format);
        try {
            const res = await api.post('/ai/export', { format, content }, { responseType: 'blob', timeout: 120000 });
            const cd = String(res.headers['content-disposition'] || '');
            const name = cd.match(/filename="?([^"]+)"?/)?.[1] || `informe.${format}`;
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('No se pudo generar el documento. Intenta de nuevo.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!compact && <span className="text-[11px] text-slate-400">Descargar:</span>}
            {FORMATS.map(f => (
                <button
                    key={f.id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => download(f.id)}
                    title={`Descargar como ${f.label}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-[#004CAB] hover:text-[#004CAB] disabled:opacity-50"
                >
                    {busy === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <f.icon className="h-3 w-3" />}
                    {f.label}
                </button>
            ))}
        </div>
    );
}

/** Respuesta del asistente: Markdown con tablas, graficas (bloques ```chart) y descarga. */
export function AssistantMessage({ content, compact, exportable = true }: { content: string; compact?: boolean; exportable?: boolean }) {
    return (
        <div className={compact ? 'text-sm' : 'text-sm leading-relaxed'}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ className, children }) {
                        const lang = /language-(\w+)/.exec(className || '')?.[1];
                        const text = String(children ?? '');
                        if (lang === 'chart' || lang === 'grafica' || lang === 'json') {
                            const chart = parseChart(text);
                            if (chart) return <ChartBlock chart={chart} compact={compact} />;
                            if (lang !== 'json') return null;
                        }
                        return <code className="rounded bg-slate-200/70 px-1 py-0.5 text-[0.85em]">{children}</code>;
                    },
                    pre: ({ children }) => <div className="my-1">{children}</div>,
                    table: ({ children }) => (
                        <div className="my-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full border-collapse text-left text-xs">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-[#004CAB] text-white">{children}</thead>,
                    th: ({ children }) => <th className="px-2.5 py-1.5 font-semibold">{children}</th>,
                    td: ({ children }) => <td className="border-t border-slate-100 px-2.5 py-1.5 align-top">{children}</td>,
                    h1: ({ children }) => <h3 className="mb-1 mt-2 text-base font-bold text-slate-900">{children}</h3>,
                    h2: ({ children }) => <h4 className="mb-1 mt-3 text-sm font-bold text-[#004CAB]">{children}</h4>,
                    h3: ({ children }) => <h5 className="mb-1 mt-2 text-sm font-semibold text-slate-800">{children}</h5>,
                    p: ({ children }) => <p className="my-1.5">{children}</p>,
                    ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
                    a: ({ children, href }) => (!href || href === '#') ? null : <a href={href} target="_blank" rel="noreferrer" className="text-[#004CAB] underline">{children}</a>,
                }}
            >
                {content}
            </ReactMarkdown>
            {exportable && content.trim().length > 40 && <ExportButtons content={content} compact={compact} />}
        </div>
    );
}
