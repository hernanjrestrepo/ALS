import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Upload, Loader2, CheckCircle2, Download, Sparkles, AlertTriangle, FileCheck, FileText, X, RefreshCcw } from 'lucide-react';
import { notify } from '@/lib/notify';
import api from '@/lib/api';
// import { useAuthStore } from '@/features/auth/authStore'; // Unused
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FeedbackModal, FeedbackButton } from '@/components/feedback/FeedbackModal';

interface ReportGeneratorProps {
    oitId: string;
    finalReportUrl?: string | null;
    initialLabAnalysis?: any;
    initialSheetUrl?: string | null;
    initialSheetAnalysis?: any;
    serviceGroup?: string; // New: optional service group name
}

export function ReportGenerator({
    oitId,
    finalReportUrl: initialReportUrl,
    initialLabAnalysis,
    initialSheetUrl,
    initialSheetAnalysis,
    serviceGroup = 'General'
}: ReportGeneratorProps) {
    // General State
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalReportUrl, setFinalReportUrl] = useState<string | null>(null);
    const [reportGenerated, setReportGenerated] = useState(false);
    const [reportList, setReportList] = useState<Array<{ name: string; url: string; type: string }>>([]);

    // Sampling Sheet State
    const [sheetUrls, setSheetUrls] = useState<string[]>(() => {
        if (!initialSheetUrl) return [];
        try {
            const parsed = JSON.parse(initialSheetUrl);
            if (Array.isArray(parsed)) return serviceGroup === 'General' ? parsed : [];
            return parsed[serviceGroup] || [];
        } catch { return serviceGroup === 'General' ? [initialSheetUrl] : []; }
    });
    const [sheetAnalysis, setSheetAnalysis] = useState<any>(() => {
        if (!initialSheetAnalysis) return null;
        if (typeof initialSheetAnalysis === 'object' && !Array.isArray(initialSheetAnalysis) && initialSheetAnalysis !== null) {
            // Check if it's a grouped analysis or a single analysis object
            if (initialSheetAnalysis.summary && initialSheetAnalysis.quality) return initialSheetAnalysis;
            return initialSheetAnalysis[serviceGroup] || null;
        }
        return serviceGroup === 'General' ? initialSheetAnalysis : null;
    });
    const [isUploadingSheet, setIsUploadingSheet] = useState(false);
    const [isSheetDragging, setIsSheetDragging] = useState(false);

    // Lab Results State
    const [labUrls, setLabUrls] = useState<string[]>(() => {
        return []; // Will start empty, parent should ideally pass oit.labResultsUrl if we want persistence
    });
    const [labAnalysis, setLabAnalysis] = useState<any>(() => {
        if (!initialLabAnalysis) return null;
        if (typeof initialLabAnalysis === 'object' && !Array.isArray(initialLabAnalysis)) {
            return initialLabAnalysis[serviceGroup] || null;
        }
        return serviceGroup === 'General' ? initialLabAnalysis : null;
    });
    const [isUploadingLab, setIsUploadingLab] = useState(false);
    const [isLabDragging, setIsLabDragging] = useState(false);

    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

    const formatReportUrl = (url: string) => {
        if (url.startsWith('http') || url.startsWith('blob:')) return url;
        const baseUrl = (api.defaults.baseURL || '').replace(/\/api$/, '');
        return `${baseUrl}/${url.replace(/^uploads\//, 'uploads/')}`;
    };

    // Initialize Report URL
    useEffect(() => {
        if (initialReportUrl) {
            try {
                const parsed = JSON.parse(initialReportUrl);
                if (Array.isArray(parsed)) {
                    // Filter reports that match our service group name
                    const filtered = parsed.filter((r: any) => r.name.toLowerCase().includes(serviceGroup.toLowerCase()));
                    if (filtered.length > 0) {
                        setReportList(filtered);
                        setReportGenerated(true);
                    } else if (serviceGroup === 'General') {
                        setReportList(parsed);
                        setReportGenerated(true);
                    }
                } else {
                    setFinalReportUrl(formatReportUrl(initialReportUrl));
                    setReportGenerated(true);
                }
            } catch {
                if (serviceGroup === 'General') {
                    if (initialReportUrl.startsWith('http') || initialReportUrl.startsWith('blob:')) {
                        setFinalReportUrl(initialReportUrl);
                    } else {
                        const baseUrl = (api.defaults.baseURL || '').replace(/\/api$/, '');
                        setFinalReportUrl(`${baseUrl}/${initialReportUrl.replace(/^uploads\//, 'uploads/')}`);
                    }
                    setReportGenerated(true);
                }
            }
        }
    }, [initialReportUrl, serviceGroup]);

    // Initialize Analyses
    useEffect(() => {
        if (initialSheetAnalysis) {
            if (typeof initialSheetAnalysis === 'object' && !Array.isArray(initialSheetAnalysis) && initialSheetAnalysis[serviceGroup]) {
                setSheetAnalysis(initialSheetAnalysis[serviceGroup]);
            } else if (serviceGroup === 'General') {
                setSheetAnalysis(initialSheetAnalysis);
            }
        }
        if (initialLabAnalysis) {
            if (typeof initialLabAnalysis === 'object' && !Array.isArray(initialLabAnalysis) && initialLabAnalysis[serviceGroup]) {
                setLabAnalysis(initialLabAnalysis[serviceGroup]);
            } else if (serviceGroup === 'General') {
                setLabAnalysis(initialLabAnalysis);
            }
        }
    }, [initialSheetAnalysis, initialLabAnalysis, serviceGroup]);

    // Polling for Analyses
    useEffect(() => {
        let intervalId: any;

        const needSheetAnalysis = sheetUrls.length > 0 && !sheetAnalysis;
        const needLabAnalysis = labUrls.length > 0 && !labAnalysis;

        if (needSheetAnalysis || needLabAnalysis) {
            intervalId = setInterval(async () => {
                try {
                    console.log('Polling for OIT analysis...');
                    const response = await api.get(`/oits/${oitId}`);
                    const data = response.data;

                    if (data.samplingSheetAnalysis) {
                        const parsed = typeof data.samplingSheetAnalysis === 'string'
                            ? JSON.parse(data.samplingSheetAnalysis)
                            : data.samplingSheetAnalysis;

                        const groupAnalysis = (parsed && typeof parsed === 'object') ? parsed[serviceGroup] : (serviceGroup === 'General' ? parsed : null);
                        if (groupAnalysis && !sheetAnalysis) {
                            setSheetAnalysis(groupAnalysis);
                            notify.success(`¡Análisis de planillas ${serviceGroup} completado!`);
                        }
                    }

                    if (data.labResultsAnalysis) {
                        const parsed = typeof data.labResultsAnalysis === 'string'
                            ? JSON.parse(data.labResultsAnalysis)
                            : data.labResultsAnalysis;

                        const groupAnalysis = (parsed && typeof parsed === 'object') ? parsed[serviceGroup] : (serviceGroup === 'General' ? parsed : null);
                        if (groupAnalysis && !labAnalysis) {
                            setLabAnalysis(groupAnalysis);
                            notify.success(`¡Análisis de laboratorio ${serviceGroup} completado!`);
                        }
                    }

                    // Update URLs
                    if (data.samplingSheetUrl) {
                        try {
                            const parsed = JSON.parse(data.samplingSheetUrl);
                            const urls = Array.isArray(parsed) ? (serviceGroup === 'General' ? parsed : []) : (parsed[serviceGroup] || []);
                            setSheetUrls(urls);
                        } catch { if (serviceGroup === 'General') setSheetUrls([data.samplingSheetUrl]); }
                    }
                    if (data.labResultsUrl) {
                        try {
                            const parsed = JSON.parse(data.labResultsUrl);
                            const urls = Array.isArray(parsed) ? (serviceGroup === 'General' ? parsed : []) : (parsed[serviceGroup] || []);
                            setLabUrls(urls);
                        } catch { if (serviceGroup === 'General') setLabUrls([data.labResultsUrl]); }
                    }

                } catch (error) {
                    console.error('Error polling OIT:', error);
                }
            }, 5000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [oitId, sheetUrls, sheetAnalysis, labUrls, labAnalysis, serviceGroup]);

    // --- Sampling Sheet Handlers ---
    const handleSheetDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsSheetDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleSheetUpload(file);
    };

    const handleSheetUpload = async (file: File) => {
        setIsUploadingSheet(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('group', serviceGroup); // New: pass group context
            const response = await api.post(`/oits/${oitId}/sampling-sheets`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            try {
                const parsed = JSON.parse(response.data.samplingSheetUrl);
                const urls = Array.isArray(parsed) ? (serviceGroup === 'General' ? parsed : []) : (parsed[serviceGroup] || []);
                setSheetUrls(urls);
            } catch {
                if (serviceGroup === 'General') setSheetUrls([response.data.samplingSheetUrl]);
            }

            notify.success(`Planilla para ${serviceGroup} subida. Actualizando análisis...`);
        } catch (error: any) {
            console.error('Error uploading sheets:', error);
            notify.error(error.response?.data?.error || 'Error al subir planillas');
        } finally {
            setIsUploadingSheet(false);
        }
    };

    // --- Lab Results Handlers ---
    const handleLabDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsLabDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleLabUpload(file);
    };

    const handleLabUpload = async (file: File) => {
        setIsUploadingLab(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('group', serviceGroup); // New: pass group context
            const response = await api.post(`/oits/${oitId}/lab-results`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            try {
                const parsed = JSON.parse(response.data.labResultsUrl);
                const urls = Array.isArray(parsed) ? (serviceGroup === 'General' ? parsed : []) : (parsed[serviceGroup] || []);
                setLabUrls(urls);
            } catch {
                if (serviceGroup === 'General') setLabUrls([response.data.labResultsUrl]);
            }

            // Backend might return analysis immediately or we poll
            if (response.data && response.data.labResultsAnalysis) {
                const parsedAnalyses = typeof response.data.labResultsAnalysis === 'string' ? JSON.parse(response.data.labResultsAnalysis) : response.data.labResultsAnalysis;
                const groupAnalysis = (parsedAnalyses && typeof parsedAnalyses === 'object') ? parsedAnalyses[serviceGroup] : (serviceGroup === 'General' ? parsedAnalyses : null);
                if (groupAnalysis) setLabAnalysis(groupAnalysis);
            }
            notify.success(`Resultados para ${serviceGroup} cargados. Analizando...`);
        } catch (error) {
            console.error('Error uploading lab results:', error);
            notify.error('Error al cargar resultados');
        } finally {
            setIsUploadingLab(false);
        }
    };

    // --- Remove File Handlers ---
    const handleSheetRemove = async (urlToRemove: string) => {
        try {
            const response = await api.delete(`/oits/${oitId}/sampling-sheets`, {
                data: { fileUrl: urlToRemove, group: serviceGroup }
            });
            try {
                const parsed = JSON.parse(response.data.samplingSheetUrl);
                const urls = Array.isArray(parsed) ? (serviceGroup === 'General' ? parsed : []) : (parsed[serviceGroup] || []);
                setSheetUrls(urls);
            } catch {
                setSheetUrls([]);
            }
            setSheetAnalysis(null); // Reset analysis since files changed
            notify.success('Archivo eliminado');
        } catch (error) {
            console.error('Error removing sheet:', error);
            notify.error('Error al eliminar archivo');
        }
    };

    const handleLabRemove = async (urlToRemove: string) => {
        try {
            const response = await api.delete(`/oits/${oitId}/lab-results`, {
                data: { fileUrl: urlToRemove, group: serviceGroup }
            });
            try {
                const parsed = JSON.parse(response.data.labResultsUrl);
                const urls = Array.isArray(parsed) ? (serviceGroup === 'General' ? parsed : []) : (parsed[serviceGroup] || []);
                setLabUrls(urls);
            } catch {
                setLabUrls([]);
            }
            setLabAnalysis(null); // Reset analysis since files changed
            notify.success('Archivo eliminado');
        } catch (error) {
            console.error('Error removing lab result:', error);
            notify.error('Error al eliminar archivo');
        }
    };

    // --- Report Generation ---
    const handleGenerateReport = async () => {
        if (!labAnalysis && labUrls.length === 0 && !reportGenerated) {
            notify.error('Se requieren resultados de laboratorio para generar el informe');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await api.post(`/oits/${oitId}/generate-final-report`);

            if (response.data.reports && Array.isArray(response.data.reports)) {
                setReportList(response.data.reports);
                setReportGenerated(true);
                notify.success(`Se han generado ${response.data.reports.length} informes correctamente`);
            } else {
                notify.error('Respuesta inesperada del servidor');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            notify.error('Error al generar informe');
        } finally {
            setIsGenerating(false);
        }
    };

    // Helper for Quality Badge
    const getQualityBadge = (quality: string) => {
        if (quality === 'buena') return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Buena Calidad</Badge>;
        if (quality === 'deficiente') return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Deficiente</Badge>;
        return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Regular</Badge>;
    };

    // Render File Input
    const renderFileInput = (
        title: string,
        description: string,
        icon: any,
        urls: string[],
        isUploading: boolean,
        isDragging: boolean,
        setIsDragging: (v: boolean) => void,
        handleDrop: (e: React.DragEvent) => void,
        handleUpload: (f: File) => void,
        accept: string,
        onRemove: (url: string) => void
    ) => (
        <Card className={`border-slate-200 shadow-sm transition-all ${isDragging ? 'border-indigo-400 ring-2 ring-indigo-50' : 'hover:border-indigo-300'}`}>
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    {icon}
                    {title}
                    <Badge variant="secondary" className="ml-auto text-xs font-normal">
                        {urls.length} archivo(s)
                    </Badge>
                </CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {/* File List */}
                {urls.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {urls.map((url, idx) => {
                            const cleanName = url.split('/').pop() || 'Archivo';
                            return (
                                <div key={idx} className="group flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs border border-slate-100 hover:bg-slate-100 transition-colors">
                                    <FileText className="h-3 w-3 text-slate-400" />
                                    <span className="truncate flex-1 text-slate-600">{cleanName}</span>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 group-hover:hidden" />
                                    <button
                                        type="button"
                                        onClick={() => onRemove(url)}
                                        className="hidden group-hover:flex h-4 w-4 rounded-full bg-red-100 hover:bg-red-200 items-center justify-center transition-colors"
                                        title="Eliminar archivo"
                                    >
                                        <X className="h-2.5 w-2.5 text-red-600" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Drop Zone */}
                <div
                    className={`relative w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer bg-white
                        ${isDragging ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-400'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        accept={accept}
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mb-1" />
                            <p className="text-[10px] font-medium text-slate-600">Subiendo...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-600">
                            <Upload className="h-5 w-5 mb-1 opacity-50" />
                            <p className="text-[10px] font-semibold">Agregar archivo</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* 1. INPUTS SECTION */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Left: Planilla */}
                {renderFileInput(
                    "1. Planillas de Campo",
                    "Sube las planillas de muestreo para análisis.",
                    <FileCheck className="h-4 w-4 text-indigo-600" />,
                    sheetUrls,
                    isUploadingSheet,
                    isSheetDragging,
                    setIsSheetDragging,
                    handleSheetDrop,
                    handleSheetUpload,
                    ".pdf,.xlsx,.xls",
                    handleSheetRemove
                )}

                {/* Right: Lab Results */}
                {renderFileInput(
                    "2. Reporte de Laboratorio",
                    "Sube los resultados oficiales del laboratorio.",
                    <FileText className="h-4 w-4 text-purple-600" />,
                    labUrls,
                    isUploadingLab,
                    isLabDragging,
                    setIsLabDragging,
                    handleLabDrop,
                    handleLabUpload,
                    ".pdf,.xlsx,.csv",
                    handleLabRemove
                )}
            </div>

            {/* 2. ANALYSIS CARDS SECTION */}
            {/* 2. ANALYSIS CARDS SECTION */}
            {(sheetAnalysis || labAnalysis || isUploadingSheet || isUploadingLab) && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Sheet Analysis Result */}
                    <Card className="border-indigo-100 shadow-sm bg-white flex flex-col h-full">
                        <CardHeader className="pb-3 bg-indigo-50/30 border-b border-indigo-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-500" />
                                    Análisis de Planillas
                                </CardTitle>
                                {sheetAnalysis && getQualityBadge(sheetAnalysis.quality)}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1">
                            {!sheetAnalysis ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                                    {isUploadingSheet ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin mb-2 text-indigo-400" />
                                            <p className="text-xs">Analizando planillas...</p>
                                        </>
                                    ) : (
                                        <p className="text-xs">Esperando archivo...</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <p className="text-slate-700">{sheetAnalysis.summary}</p>
                                    {sheetAnalysis.findings?.length > 0 && (
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <p className="font-medium text-amber-900 text-xs mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Hallazgos</p>
                                            <ul className="list-disc pl-4 space-y-1 text-xs text-amber-800">
                                                {sheetAnalysis.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Lab Analysis Result */}
                    <Card className="border-purple-100 shadow-sm bg-white flex flex-col h-full">
                        <CardHeader className="pb-3 bg-purple-50/30 border-b border-purple-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    Análisis de Laboratorio
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Resultados</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1">
                            {!labAnalysis ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                                    {isUploadingLab ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin mb-2 text-purple-400" />
                                            <p className="text-xs">Interpretando resultados...</p>
                                        </>
                                    ) : (
                                        <p className="text-xs">Esperando archivo...</p>
                                    )}
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-slate max-w-none max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {typeof labAnalysis === 'string' ? labAnalysis : labAnalysis.rawText || JSON.stringify(labAnalysis)}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 3. GENERATE REPORT BUTTON */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                <div className="text-center max-w-lg">
                    <h3 className="text-lg font-semibold text-slate-900">Generar Informe Final</h3>
                    <p className="text-sm text-slate-500">
                        El sistema combinará la información de las planillas de campo y los resultados de laboratorio interpretados por IA.
                    </p>
                </div>

                {reportGenerated ? (
                    <div className="w-full max-w-md space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-md mb-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <p className="text-sm font-medium text-emerald-900">Informes Generados ({reportList.length || 1})</p>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {reportList.length > 0 ? (
                                reportList.map((report, idx) => {
                                    const reportUrl = report.url.startsWith('http') ? report.url : `${(api.defaults.baseURL || '').replace(/\/api$/, '')}/${report.url.replace(/^uploads\//, 'uploads/')}`;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg group hover:border-indigo-300 transition-all shadow-sm">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500">
                                                    {report.name.startsWith('Comunicado') ? <FileCheck className="h-4 w-4" /> : report.type === 'docx' ? <FileText className="h-4 w-4" /> : <FileBarChart className="h-4 w-4" />}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 truncate">{report.name}</span>
                                            </div>
                                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                <a href={reportUrl} download title="Descargar informe">
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileBarChart className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700">Informe General</span>
                                    </div>
                                    <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <a href={finalReportUrl || '#'} download>
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setReportGenerated(false)}>
                                <RefreshCcw className="mr-2 h-4 w-4" /> Regenerar Todos
                            </Button>
                        </div>
                        <div className="pt-2">
                            <FeedbackButton onClick={() => setFeedbackModalOpen(true)} className="w-full" label="Reportar problema en informes" />
                        </div>
                    </div>
                ) : (
                    <Button
                        size="lg"
                        className="w-full max-w-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                        onClick={handleGenerateReport}
                        disabled={isGenerating || (labUrls.length === 0)}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generando Documento...
                            </>
                        ) : (
                            <>
                                <FileBarChart className="mr-2 h-5 w-5" /> Generar Informe Consolidado
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                oitId={oitId}
                category="REPORT"
                aiOutput={typeof labAnalysis === 'string' ? labAnalysis : JSON.stringify(labAnalysis)}
                title="Feedback del Informe"
                fields={[
                    { name: 'general', value: '', label: 'Comentario General' }
                ]}
            />
        </div>
    );
}
