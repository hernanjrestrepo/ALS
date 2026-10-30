import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText, Building2, Calendar, Download, Link2,
    Sparkles, Loader2, DollarSign, CheckCircle2,
    Clock, Hash, AlertTriangle, XCircle, Info, RefreshCw
} from 'lucide-react';
import { FeedbackModal, FeedbackButton } from '@/components/feedback/FeedbackModal';
import type { FeedbackCategory } from '@/components/feedback/FeedbackModal';
import { useAuthStore } from '@/features/auth/authStore';
import {
    MissingElementsCard, FindingDecisionPanel, InformativeFindingsTable,
    type FindingReview, type MissingResolution,
} from '@/components/quotations/QuotationReview';

import { tr } from '@/i18n';
interface Quotation {
    id: string;
    quotationNumber: string;
    description?: string;
    clientName?: string;
    services?: { id: string; name: string }[];
    fileUrl?: string;
    extractedText?: string;
    status: string;
    aiData?: string;
    complianceResult?: string;
    createdAt: string;
    updatedAt: string;
    linkedOITs?: { id: string; oitNumber: string; status: string; description?: string }[];
    approvedForOit?: boolean;
    findingReviews?: string;
    missingResolutions?: string;
    priorDecisions?: Record<string, { decision: string; comment: string; userName?: string; at: string; quotationNumber: string }>;
}

const parseJsonField = <T,>(raw?: string): T | null => {
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
};

// Resultados de antes del 2026-10-15 traen los hallazgos como texto suelto (por
// eso se veian tarjetas "INFO" vacias); los nuevos traen objetos.
const normalizeIssue = (issue: any) => typeof issue === 'string'
    ? { severity: 'WARNING', category: 'Observación', description: issue }
    : issue;

const SEVERITY_LABEL: Record<string, string> = { CRITICAL: 'INCUMPLE', WARNING: 'REVISAR', INFO: 'INFO' };

const PROBLEM_LABEL: Record<string, string> = {
    FALTANTE: tr("Sugerido (no cotizado)"),
    PARAMETRO_INCORRECTO: tr("Parámetro incorrecto"),
    NOMBRE_DISTINTO: tr("Nombre por confirmar"),
    MATRIZ: tr("Matriz distinta a la muestra"),
    LIMITE_CUANTIFICACION: tr("Límite de cuantificación"),
    OTRO: tr("Observación"),
};

// Numero temporal mientras el analisis lee el SIACOT del documento.
const isProvisionalNumber = (q: Quotation) => /^COT-\d+$/.test(q.quotationNumber) && q.status === 'ANALYZING';

export default function QuotationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { user } = useAuthStore();
    // Mismo permiso que el servidor (requireAdmin): Ana decide; los demas ven.
    const canReview = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    // Las respuestas de guardar no traen cliente/servicio: se conserva lo ya cargado.
    const onSaved = (updated: any) => setQuotation(prev => prev ? { ...prev, ...updated } : updated);

    // Feedback Modal State
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('QUOTATION_ANALYSIS');
    const [feedbackAiOutput, setFeedbackAiOutput] = useState('');
    const [feedbackTitle, setFeedbackTitle] = useState('');

    // Open feedback modal helper
    const openFeedbackModal = (category: FeedbackCategory, aiOutput: string, title: string) => {
        setFeedbackCategory(category);
        setFeedbackAiOutput(aiOutput);
        setFeedbackTitle(title);
        setFeedbackModalOpen(true);
    };

    const fetchQuotation = useCallback(async (silent = false) => {
        try {
            const response = await api.get(`/quotations/${id}`);
            setQuotation(response.data);
        } catch (error) {
            console.error('Error fetching quotation:', error);
            if (silent) return;
            toast.error(tr("No se pudo cargar la cotización"));
            navigate('/quotations');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (id) fetchQuotation();
    }, [id, fetchQuotation]);

    // Mientras analiza, la pantalla se actualiza sola: el 2026-10-15 el analisis
    // termino en 74 s y la pantalla siguio en "Analizando" hasta recargar (2 h).
    useEffect(() => {
        if (quotation?.status !== 'ANALYZING') return;
        const timer = setInterval(() => fetchQuotation(true), 4000);
        return () => clearInterval(timer);
    }, [quotation?.status, fetchQuotation]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            await api.post(`/quotations/${id}/analyze`);
            toast.success(tr("Análisis iniciado"));
            fetchQuotation();
        } catch (error) {
            console.error('Error analyzing quotation:', error);
            toast.error(tr("Error al iniciar análisis"));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            'PENDING': tr("Pendiente"),
            'ANALYZING': tr("Analizando"),
            'COMPLIANT': tr("Conforme"),
            'NON_COMPLIANT': tr("No Conforme"),
            'REVIEW_REQUIRED': tr("Revisión Requerida")
        };
        return statusMap[status] || status;
    };

    const parseAIData = () => {
        if (!quotation?.aiData) return null;
        try {
            return JSON.parse(quotation.aiData);
        } catch {
            return null;
        }
    };

    const parseComplianceResult = () => {
        if (!quotation?.complianceResult) return null;
        try {
            return JSON.parse(quotation.complianceResult);
        } catch {
            return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50/50 pb-12">
                <div className="bg-slate-50/50 border-b border-slate-200">
                    <div className="container mx-auto py-6">
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="container mx-auto py-8">
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!quotation) {
        return <div className="text-center text-slate-500 py-24">{tr("Cotización no encontrada")}</div>;
    }

    const aiData = parseAIData();
    const complianceResult = parseComplianceResult();
    const issues: any[] = Array.isArray(complianceResult?.issues) ? complianceResult.issues.map(normalizeIssue) : [];
    const parameterChecks: any[] = Array.isArray(complianceResult?.parameterChecks) ? complianceResult.parameterChecks : [];
    const findingReviews = parseJsonField<Record<string, FindingReview>>(quotation.findingReviews) || {};
    const missingResolutions = parseJsonField<Record<string, MissingResolution>>(quotation.missingResolutions) || {};
    const actionableIssues = issues.filter((i: any) => i.severity === 'CRITICAL' || i.severity === 'WARNING');
    const informativeIssues = issues.filter((i: any) => i.severity !== 'CRITICAL' && i.severity !== 'WARNING');
    // Veredicto con las decisiones de Ana aplicadas (lo calcula el servidor).
    const verdict: boolean | null | undefined = complianceResult?.effectiveStatus
        ? complianceResult.effectiveStatus === 'COMPLIANT' ? true
            : complianceResult.effectiveStatus === 'NON_COMPLIANT' ? false
                : complianceResult.compliant === null && !actionableIssues.length ? null : undefined
        : complianceResult?.compliant;
    const withException = verdict === true && actionableIssues.some((i: any) => findingReviews[i.key]?.decision === 'ACEPTADO');
    const missingItems: string[] = Array.isArray(aiData?.missing) ? aiData.missing.map((m: any) => String(m).trim()) : [];
    const missingPending = missingItems.filter(m => !missingResolutions[m]).length;
    // Con los faltantes subsanados en pantalla, el documento queda completo.
    const docStatus = aiData?.status === 'error' && missingItems.length && !missingPending
        ? ((aiData.alerts || []).length ? 'warning' : 'check')
        // La IA a veces marca "completo" y a la vez lista faltantes (SIACOT-20857).
        : aiData?.status === 'check' && missingPending ? 'warning' : aiData?.status;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header Section - Match OIT Style */}
            <div className="bg-slate-50/50 border-b border-slate-200">
                <div className="container mx-auto py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
                                    {quotation.quotationNumber}
                                </h1>
                                {isProvisionalNumber(quotation) && (
                                    <span className="text-xs text-slate-500">{tr("(número provisional, se reemplaza por el del documento)")}</span>
                                )}
                                <Badge variant={quotation.status === 'ANALYZING' ? 'secondary' : 'default'} className="text-xs px-2.5 py-0.5 font-medium">
                                    {quotation.status === 'ANALYZING' && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                                    {getStatusLabel(quotation.status)}
                                </Badge>
                            </div>
                            <p className="text-slate-500 text-sm max-w-2xl truncate flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {quotation.clientName || tr("Sin cliente asignado")}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{new Date(quotation.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                <Hash className="h-3.5 w-3.5" />
                                <span className="font-mono">{quotation.id.slice(0, 8)}</span>
                            </div>
                            {quotation.status === 'PENDING' && (
                                <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    {tr("Analizar con IA")}
                                </Button>
                            )}
                            {quotation.fileUrl && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/api/files/${quotation.fileUrl}#view=FitH`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        {tr("PDF")}
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-8 space-y-8">
                {/* Analysis Alert */}
                {quotation.status === 'ANALYZING' && (
                    <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        </div>
                        <div>
                            <p className="font-semibold text-blue-900">{tr("Analizando cotización...")}</p>
                            <p className="text-sm text-blue-700 mt-0.5">{tr("La IA está extrayendo información. Esto puede tomar unos momentos; la pantalla se actualiza sola al terminar.")}</p>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="info" className="w-full">
                    {/* Tabs - Match OIT Style */}
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4 bg-white p-1 rounded-xl sm:rounded-full border border-slate-200 shadow-sm h-auto transition-all duration-300">
                            <TabsTrigger value="info" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <FileText className="mr-2 h-4 w-4" /> {tr("Info")}
                            </TabsTrigger>
                            <TabsTrigger value="analysis" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Sparkles className="mr-2 h-4 w-4" /> {tr("Análisis")}
                            </TabsTrigger>
                            <TabsTrigger value="compliance" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> {tr("Cumplimiento")}
                            </TabsTrigger>
                            <TabsTrigger value="linked" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Link2 className="mr-2 h-4 w-4" /> {tr("OITs")}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Info Tab */}
                    <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Main Info Card */}
                            <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>{tr("Información General")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tr("Número de Cotización")}</strong>
                                            <p className="text-lg font-medium text-slate-900">{quotation.quotationNumber}</p>
                                            {isProvisionalNumber(quotation) && (
                                                <p className="text-xs text-slate-500">{tr("Provisional: se reemplaza por el número del documento al terminar el análisis.")}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tr("Estado")}</strong>
                                            <p className="text-lg font-medium text-slate-900">{getStatusLabel(quotation.status)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tr("Cliente")}</strong>
                                            <p className="text-lg font-medium text-slate-900 flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-slate-400" />
                                                {quotation.clientName || '-'}
                                            </p>
                                        </div>
                                        {!!quotation.services?.length && (
                                            <div className="space-y-1">
                                                <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tr("Servicios")}</strong>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {quotation.services.map(s => (
                                                        <span key={s.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-700">{s.name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tr("Fecha de Creación")}</strong>
                                            <p className="text-lg font-medium text-slate-900 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {new Date(quotation.createdAt).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                        {quotation.description && (
                                            <div className="col-span-2 space-y-1">
                                                <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tr("Descripción")}</strong>
                                                <p className="text-slate-700 leading-relaxed">{quotation.description}</p>
                                            </div>
                                        )}
                                    </div>

                                    {quotation.fileUrl && (
                                        <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                                            <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-colors">
                                                <div>
                                                    <strong className="block text-xs font-semibold text-slate-500 mb-1">{tr("Archivo")}</strong>
                                                    <span className="text-sm text-slate-700 truncate block max-w-[150px]">
                                                        {tr("Documento PDF cargado")}
                                                    </span>
                                                </div>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a
                                                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/api/files/${quotation.fileUrl}#view=FitH`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Stats Card */}
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm h-fit">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-indigo-600" />
                                        {tr("Resumen")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <Link2 className="h-5 w-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{tr("OITs Vinculadas")}</p>
                                            <p className="text-lg font-medium text-slate-900 mt-1">{quotation.linkedOITs?.length || 0}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{tr("Análisis IA")}</p>
                                            <p className="text-sm font-medium text-slate-900 mt-1">
                                                {aiData ? tr("Completado") : tr("Pendiente")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{tr("Cumplimiento")}</p>
                                            <p className="text-sm font-medium text-slate-900 mt-1">
                                                {complianceResult ? tr("Verificado") : tr("Sin verificar")}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Analysis Tab */}
                    <TabsContent value="analysis" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {aiData ? (
                            <div className="space-y-6">
                                {/* Feedback Button */}
                                <div className="flex justify-end">
                                    <FeedbackButton
                                        onClick={() => openFeedbackModal(
                                            'QUOTATION_ANALYSIS',
                                            JSON.stringify(aiData, null, 2),
                                            `Análisis de Cotización ${quotation?.quotationNumber}`
                                        )}
                                    />
                                </div>
                                {/* Status Banner */}
                                <div className={`rounded-xl p-6 border ${docStatus === 'check' ? 'bg-green-50 border-green-200' :
                                    docStatus === 'error' ? 'bg-red-50 border-red-200' :
                                        'bg-amber-50 border-amber-200'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${docStatus === 'check' ? 'bg-green-100' :
                                            docStatus === 'error' ? 'bg-red-100' :
                                                'bg-amber-100'
                                            }`}>
                                            {docStatus === 'check' ? (
                                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                            ) : (
                                                <Sparkles className={`h-6 w-6 ${docStatus === 'error' ? 'text-red-600' : 'text-amber-600'}`} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-semibold ${docStatus === 'check' ? 'text-green-900' :
                                                docStatus === 'error' ? 'text-red-900' :
                                                    'text-amber-900'
                                                }`}>
                                                {docStatus === 'check' ? tr("Documento Completo") :
                                                    docStatus === 'error' ? tr("Requiere Revisión") :
                                                        tr("Atención Requerida")}
                                            </h3>
                                            <p className={`text-sm ${docStatus === 'check' ? 'text-green-700' :
                                                docStatus === 'error' ? 'text-red-700' :
                                                    'text-amber-700'
                                                }`}>
                                                {docStatus === 'check' ? (missingItems.length && !missingPending ? tr("Los elementos faltantes ya se subsanaron") : tr("El análisis no encontró problemas críticos")) :
                                                    docStatus === 'error' ? tr("Se detectaron elementos faltantes importantes") :
                                                        tr("Hay algunos elementos que requieren atención")}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Extracted Info */}
                                    {(aiData.rawResponse || aiData.description) && (() => {
                                        try {
                                            const rawData = aiData.rawResponse ? JSON.parse(aiData.rawResponse) : {};
                                            return (
                                                <Card className="border-slate-200 shadow-sm">
                                                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                                        <CardTitle className="text-base flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-indigo-600" />
                                                            {tr("Información Extraída")}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4 space-y-3">
                                                        {(aiData.description || aiData.location) && (
                                                            <div className="py-2 border-b border-slate-100 text-sm text-slate-700 space-y-1">
                                                                {aiData.description && <p>{aiData.description}</p>}
                                                                {aiData.location && <p className="text-slate-500">{tr("Ubicación")}: {aiData.location}</p>}
                                                            </div>
                                                        )}
                                                        {rawData.offer_id && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">{tr("ID Oferta")}</span>
                                                                <span className="font-medium text-slate-900">{rawData.offer_id}</span>
                                                            </div>
                                                        )}
                                                        {rawData.date && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">{tr("Fecha")}</span>
                                                                <span className="font-medium text-slate-900">{rawData.date}</span>
                                                            </div>
                                                        )}
                                                        {rawData.sender && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">{tr("Remitente")}</span>
                                                                <span className="font-medium text-slate-900">{rawData.sender}</span>
                                                            </div>
                                                        )}
                                                        {rawData.position && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">{tr("Cargo")}</span>
                                                                <span className="font-medium text-slate-900">{rawData.position}</span>
                                                            </div>
                                                        )}
                                                        {rawData.contact_commercial?.name && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">{tr("Ejecutivo Comercial")}</span>
                                                                <span className="font-medium text-slate-900">{rawData.contact_commercial.name}</span>
                                                            </div>
                                                        )}
                                                        {rawData.contact_info?.email_general && (
                                                            <div className="flex justify-between items-center py-2">
                                                                <span className="text-sm text-slate-500">{tr("Email")}</span>
                                                                <span className="font-medium text-slate-900 text-sm">{rawData.contact_info.email_general}</span>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        } catch {
                                            return null;
                                        }
                                    })()}

                                    {/* Services - Only show if services exist */}
                                    {aiData.services && aiData.services.length > 0 ? (
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-blue-600" />
                                                    {tr("Servicios Detectados")}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="space-y-3">
                                                    {aiData.services.map((service: any, idx: number) => (
                                                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <p className="font-medium text-slate-900">{service.name}</p>
                                                            {service.proposedDate && (
                                                                <p className="text-sm text-slate-500 mt-1">
                                                                    {tr("Fecha propuesta:")}{' '}{service.proposedDate}
                                                                </p>
                                                            )}
                                                            {service.duration && (
                                                                <p className="text-sm text-slate-500">
                                                                    {tr("Duración:")}{' '}{service.duration} {tr("día(s)")}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : aiData.rawResponse && (
                                        /* AI Commentary when no services detected */
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                                    {tr("Comentarios del Análisis")}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                {(() => {
                                                    try {
                                                        const rawData = JSON.parse(aiData.rawResponse);
                                                        return (
                                                            <div className="space-y-3 text-sm text-slate-700">
                                                                {rawData.decision_rule?.map((rule: any, idx: number) => (
                                                                    <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                                        <p className="font-medium text-blue-900 mb-1">{tr("📋 Regla de Decisión")}</p>
                                                                        <p className="text-blue-800">{rule.description}</p>
                                                                    </div>
                                                                ))}
                                                                {rawData.confidentiality?.map((conf: any, idx: number) => (
                                                                    <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-100">
                                                                        <p className="font-medium text-green-900 mb-1">{tr("🔒 Confidencialidad")}</p>
                                                                        <p className="text-green-800">{conf.description}</p>
                                                                    </div>
                                                                ))}
                                                                {rawData.equipment_availability?.map((eq: any, idx: number) => (
                                                                    <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                                        <p className="font-medium text-amber-900 mb-1">{tr("🔧 Disponibilidad de Equipos")}</p>
                                                                        <p className="text-amber-800">{eq.description}</p>
                                                                    </div>
                                                                ))}
                                                                {!rawData.decision_rule && !rawData.confidentiality && !rawData.equipment_availability && (
                                                                    <p className="text-slate-600 italic">
                                                                        {tr("El documento fue analizado correctamente. No se encontraron servicios específicos pero la información general fue extraída exitosamente.")}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    } catch {
                                                        return (
                                                            <p className="text-sm text-slate-600 italic">
                                                                {tr("El documento fue analizado. Revise la información extraída para más detalles.")}
                                                            </p>
                                                        );
                                                    }
                                                })()}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Alerts & Missing */}
                                {((aiData.alerts && aiData.alerts.length > 0) || (aiData.missing && aiData.missing.length > 0)) && (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {aiData.alerts && aiData.alerts.length > 0 && (
                                            <Card className="border-amber-200 shadow-sm">
                                                <CardHeader className="bg-amber-50">
                                                    <CardTitle className="text-base text-amber-900">{tr("⚠️ Alertas")}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-4">
                                                    <ul className="space-y-2">
                                                        {aiData.alerts.map((alert: string, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                                                                <span className="text-amber-500 mt-0.5">•</span>
                                                                {alert}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        )}
                                        {missingItems.length > 0 && (
                                            <MissingElementsCard
                                                quotationId={quotation.id}
                                                missing={missingItems}
                                                resolutions={missingResolutions}
                                                canEdit={canReview}
                                                onSaved={onSaved}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Location */}
                                {aiData.location && (
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardContent className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider">{tr("Ubicación")}</p>
                                                    <p className="font-medium text-slate-900">{aiData.location}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">{tr("No hay análisis disponible")}</h3>
                                    <p className="text-slate-500 max-w-md mt-2">
                                        {tr("Esta cotización aún no ha sido analizada por IA. Haz clic en \"Analizar con IA\" para obtener un análisis detallado.")}
                                    </p>
                                    {quotation.status === 'PENDING' && (
                                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="mt-4">
                                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            {tr("Analizar ahora")}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Compliance Tab */}
                    <TabsContent value="compliance" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {quotation.fileUrl && quotation.status !== 'ANALYZING' && (
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
                                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    {tr("Volver a analizar")}
                                </Button>
                            </div>
                        )}
                        {complianceResult ? (
                            <div className="space-y-6">
                                {/* Score & Status Banner */}
                                <div className={`rounded-xl p-6 border ${verdict === true ? 'bg-green-50 border-green-200' :
                                    verdict === false ? 'bg-red-50 border-red-200' :
                                        verdict === null ? 'bg-slate-50 border-slate-200' :
                                            'bg-amber-50 border-amber-200'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${verdict === true ? 'bg-green-100' :
                                                verdict === false ? 'bg-red-100' :
                                                    verdict === null ? 'bg-slate-100' :
                                                        'bg-amber-100'
                                                }`}>
                                                {verdict === true ? (
                                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                                ) : verdict === false ? (
                                                    <XCircle className="h-8 w-8 text-red-600" />
                                                ) : verdict === null ? (
                                                    <Info className="h-8 w-8 text-slate-600" />
                                                ) : (
                                                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-xl font-bold ${verdict === true ? 'text-green-900' :
                                                    verdict === false ? 'text-red-900' :
                                                        verdict === null ? 'text-slate-900' :
                                                            'text-amber-900'
                                                    }`}>
                                                    {verdict === true ? (withException ? tr("CONFORME CON EXCEPCIÓN APROBADA") : tr("CONFORME")) :
                                                        verdict === false ? tr("NO CONFORME") :
                                                            verdict === null ? tr("SIN VEREDICTO NORMATIVO (matriz descriptiva)") :
                                                                tr("REQUIERE REVISIÓN")}
                                                </h3>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {tr("Verificado:")}{' '}{complianceResult.analyzedAt ?
                                                        new Date(complianceResult.analyzedAt).toLocaleString('es-ES') : 'N/A'}
                                                </p>
                                                {Array.isArray(complianceResult.comparedAgainst) ? (
                                                    <p className="text-xs text-slate-500">
                                                        {tr("Comparada contra:")}{' '}{complianceResult.comparedAgainst.length
                                                            ? complianceResult.comparedAgainst.join('; ')
                                                            : tr("ningún artículo (ver hallazgos)")}
                                                        {complianceResult.sampleMatrix && ` · Muestra: ${complianceResult.sampleMatrix}`}
                                                    </p>
                                                ) : complianceResult.standardsCount !== undefined && (
                                                    <p className="text-xs text-slate-500">
                                                        {tr("Normas verificadas:")}{' '}{complianceResult.standardsCount}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Score Circle */}
                                        {complianceResult.score !== undefined && (
                                            <div className="text-center">
                                                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${complianceResult.score >= 80 ? 'border-green-500 bg-green-50' :
                                                    complianceResult.score >= 50 ? 'border-amber-500 bg-amber-50' :
                                                        'border-red-500 bg-red-50'
                                                    }`}>
                                                    <span className={`text-2xl font-bold ${complianceResult.score >= 80 ? 'text-green-700' :
                                                        complianceResult.score >= 50 ? 'text-amber-700' :
                                                            'text-red-700'
                                                        }`}>{complianceResult.score}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{tr("Puntuación")}</p>
                                                {complianceResult.coverage && (
                                                    <p className="text-[11px] text-slate-500" title={tr("Parámetros del artículo que se cotizaron")}>
                                                        {tr("Cotizados")}{' '}{complianceResult.coverage.quoted} de {complianceResult.coverage.total}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {complianceResult.coverage && (
                                        <p className="mt-3 text-xs text-slate-500">
                                            {tr("La puntuación mide lo cotizado: de los parámetros cotizados, cuántos están sin observaciones (un hallazgo aceptado cuenta como resuelto). Los sugeridos por la norma no cotizados no restan.")}
                                        </p>
                                    )}
                                    {actionableIssues.length > 0 && (
                                        <p className={`mt-2 text-sm font-medium ${complianceResult.pendingDecisions ? 'text-amber-800' : 'text-green-800'}`}>
                                            {complianceResult.pendingDecisions
                                                ? `${complianceResult.pendingDecisions} de ${actionableIssues.length} hallazgo(s) sin decisión final (pendientes o en revisión). La cotización queda habilitada para OIT cuando todos estén aceptados.`
                                                : quotation.approvedForOit ? tr("Todos los hallazgos tienen decisión. Habilitada para OIT.") : tr("Todos los hallazgos tienen decisión.")}
                                        </p>
                                    )}
                                    {/* Summary */}
                                    {complianceResult.summary && (
                                        <p className="mt-4 text-sm text-slate-700 bg-white/50 p-3 rounded-lg">
                                            {complianceResult.summary}
                                        </p>
                                    )}
                                </div>

                                {/* Issues List - Detailed */}
                                {actionableIssues.length > 0 && (
                                    <Card className="border-red-200 shadow-sm">
                                        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
                                            <CardTitle className="text-base flex items-center gap-2 text-red-900">
                                                <XCircle className="h-5 w-5" />
                                                {tr("Hallazgos que requieren decisión (")}{actionableIssues.length})
                                            </CardTitle>
                                            <CardDescription>
                                                {issues.filter((i: any) => i.severity === 'CRITICAL').length} incumplimientos
                                                {' · '}{issues.filter((i: any) => i.severity === 'WARNING').length} {tr("por revisar")}
                                                {' · '}{informativeIssues.length} {tr("informativos (en el cuadro de abajo)")}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-3">
                                            {actionableIssues.map((issue: any, idx: number) => (
                                                <div key={idx} className={`p-4 rounded-lg border ${issue.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                                                    issue.severity === 'WARNING' ? 'bg-amber-50 border-amber-200' :
                                                        'bg-blue-50 border-blue-200'
                                                    }`}>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${issue.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                                                            issue.severity === 'WARNING' ? 'bg-amber-500 text-white' :
                                                                'bg-blue-500 text-white'
                                                            }`}>
                                                            {SEVERITY_LABEL[issue.severity] || tr("INFO")}
                                                        </span>
                                                        {issue.matrix && (
                                                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">{tr("Servicio")}: {issue.matrix}</span>
                                                        )}
                                                        {issue.category && (
                                                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{issue.category}</span>
                                                        )}
                                                        {issue.parameter && (
                                                            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                                                🔬 {issue.parameter}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-2 font-medium text-slate-900">{issue.description}</p>
                                                    {issue.normReference && (
                                                        <p className="mt-1 text-xs text-slate-600 bg-slate-100 p-2 rounded">
                                                            📋 <strong>{tr("Norma:")}</strong> {issue.normReference}
                                                        </p>
                                                    )}
                                                    {issue.location && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            📍 <strong>{tr("Ubicación:")}</strong> {issue.location}
                                                        </p>
                                                    )}
                                                    {issue.recommendation && (
                                                        <p className="mt-2 text-sm text-green-800 bg-green-50 p-2 rounded border border-green-200">
                                                            💡 <strong>{tr("Acción:")}</strong> {issue.recommendation}
                                                        </p>
                                                    )}
                                                    {issue.key && complianceResult.effectiveStatus && !complianceResult.error && (
                                                        <FindingDecisionPanel
                                                            key={`${issue.key}-${findingReviews[issue.key]?.at || ''}`}
                                                            quotationId={quotation.id}
                                                            issueKey={issue.key}
                                                            review={findingReviews[issue.key]}
                                                            prior={quotation.priorDecisions?.[issue.key]}
                                                            canEdit={canReview && quotation.status !== 'ANALYZING'}
                                                            onSaved={onSaved}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {informativeIssues.length > 0 && (
                                    <InformativeFindingsTable issues={informativeIssues} parameterChecks={parameterChecks} />
                                )}

                                {/* Revision por parametro del articulo comparado */}
                                {parameterChecks.length > 0 && (
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="bg-slate-50">
                                            <CardTitle className="text-base text-slate-800">
                                                {tr("Parámetros del artículo (")}{parameterChecks.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b">
                                                        <th className="py-2 pr-3">{tr("Parámetro (norma)")}</th>
                                                        <th className="py-2 pr-3">{tr("Límite norma")}</th>
                                                        <th className="py-2 pr-3">{tr("Cotizado como")}</th>
                                                        <th className="py-2 pr-3">{tr("Lím. cuantificación")}</th>
                                                        <th className="py-2">{tr("Resultado")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parameterChecks.map((c: any, idx: number) => (
                                                        <tr key={idx} className="border-b last:border-0 align-top">
                                                            <td className="py-2 pr-3 font-medium text-slate-900">{c.normParameter}</td>
                                                            <td className="py-2 pr-3 text-slate-600">{c.normLimit || '-'}</td>
                                                            <td className="py-2 pr-3 text-slate-600">{c.quotedAs || '—'}</td>
                                                            <td className="py-2 pr-3 text-slate-600">{c.quotedLoq || '-'}</td>
                                                            <td className="py-2">
                                                                {(c.problems || []).length === 0 ? (
                                                                    <span className="inline-flex items-center gap-1 text-green-700">
                                                                        <CheckCircle2 className="h-4 w-4" /> {tr("Correcto")}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-800">
                                                                        {(c.problems || []).map((p: any) => PROBLEM_LABEL[p.type] || p.type).join(', ')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Missing Parameters & Recommendations */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Missing Parameters */}
                                    {complianceResult.missingParameters && complianceResult.missingParameters.length > 0 && (
                                        <Card className="border-amber-200 shadow-sm">
                                            <CardHeader className="bg-amber-50">
                                                <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    {tr("Parámetros Faltantes (")}{complianceResult.missingParameters.length})
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <ul className="space-y-3">
                                                    {complianceResult.missingParameters.map((param: any, idx: number) => (
                                                        <li key={idx} className="p-3 bg-amber-50 rounded border border-amber-200">
                                                            {typeof param === 'string' ? (
                                                                <span className="text-sm text-amber-800">{param}</span>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    <p className="font-bold text-amber-900">🔬 {param.parameter}</p>
                                                                    {param.norm && <p className="text-xs text-amber-700">{tr("📋 Norma:")}{' '}{param.norm}</p>}
                                                                    {param.article && <p className="text-xs text-amber-600">{tr("📌 Artículo:")}{' '}{param.article}</p>}
                                                                    {param.requiredMethod && <p className="text-xs text-amber-600">{tr("🧪 Método:")}{' '}{param.requiredMethod}</p>}
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {complianceResult.recommendations && complianceResult.recommendations.length > 0 && (
                                        <Card className="border-blue-200 shadow-sm">
                                            <CardHeader className="bg-blue-50">
                                                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                                                    {tr("💡 Recomendaciones")}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <ul className="space-y-2">
                                                    {complianceResult.recommendations.map((rec: any, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-800 p-2 bg-blue-50 rounded">
                                                            <span className="text-blue-500 mt-0.5">→</span>
                                                            {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Compliant Items */}
                                {complianceResult.compliantItems && complianceResult.compliantItems.length > 0 && (
                                    <Card className="border-green-200 shadow-sm">
                                        <CardHeader className="bg-green-50">
                                            <CardTitle className="text-base flex items-center gap-2 text-green-900">
                                                <CheckCircle2 className="h-4 w-4" />
                                                {tr("Requisitos Cumplidos (")}{complianceResult.compliantItems.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <ul className="grid md:grid-cols-2 gap-2">
                                                {complianceResult.compliantItems.map((item: any, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                        {typeof item === 'string' ? item : JSON.stringify(item)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Applied Standards */}
                                {complianceResult.appliedStandards && complianceResult.appliedStandards.length > 0 && (
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="bg-slate-50">
                                            <CardTitle className="text-base text-slate-700">
                                                {tr("📚 Normas Aplicadas")}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="flex flex-wrap gap-2">
                                                {complianceResult.appliedStandards.map((std: any, idx: number) => (
                                                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                                                        {typeof std === 'string' ? std : (std.title || std.name || JSON.stringify(std))}
                                                    </span>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">{tr("Sin verificación de cumplimiento")}</h3>
                                    <p className="text-slate-500 max-w-md mt-2">
                                        {tr("No se ha realizado una verificación de cumplimiento para esta cotización.")}
                                    </p>
                                </CardContent>
                            </Card>
                        )
                        }
                    </TabsContent>

                    {/* Linked OITs Tab */}
                    <TabsContent value="linked" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Link2 className="h-5 w-5 text-blue-600" />
                                    {tr("OITs Vinculadas")}
                                </CardTitle>
                                <CardDescription>
                                    {tr("Se vinculan solas: cuando llega una OIT del Sistema Serambiente que trae este número de cotización.")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!!quotation.linkedOITs?.length && !quotation.approvedForOit && (
                                    <div className="mb-4 flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        {tr("Ya hay OIT creadas con esta cotización, pero la cotización todavía no está aprobada contra la norma (ver pestaña Cumplimiento).")}
                                    </div>
                                )}
                                {quotation.linkedOITs && quotation.linkedOITs.length > 0 ? (
                                    <div className="grid gap-3">
                                        {quotation.linkedOITs.map(oit => (
                                            <button
                                                key={oit.id}
                                                onClick={() => navigate(`/oits/${oit.id}`)}
                                                className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left shadow-sm"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
                                                            {oit.oitNumber}
                                                        </p>
                                                        {oit.description && (
                                                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{oit.description}</p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline">{oit.status}</Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <Link2 className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-700 mb-2">{tr("Sin OITs vinculadas")}</h3>
                                        <p className="text-slate-500 max-w-md">
                                            {tr("Esta cotización aún no ha sido vinculada a ninguna orden de inspección.")}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent >
                </Tabs >
            </div >

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                category={feedbackCategory}
                aiOutput={feedbackAiOutput}
                title={feedbackTitle}
            />
        </div >
    );
}
