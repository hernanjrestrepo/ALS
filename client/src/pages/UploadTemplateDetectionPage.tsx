import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowLeft,
    Upload,
    Sparkles,
    Loader2,
    FileSearch,
    CheckCircle2,
    Download,
    AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';

interface TagCandidate {
    id: string;
    phrase: string;
    occurrences: number;
    suggestedTagName: string;
    suggestedSource: string;
    suggestedField: string;
    suggestedDescription: string;
    included: boolean;
}

interface ReplacementReport {
    phrase: string;
    tagName: string;
    occurrencesReplaced: number;
}

export default function UploadTemplateDetectionPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<TagCandidate[]>([]);
    const [totalFromAI, setTotalFromAI] = useState(0);

    const [applyReport, setApplyReport] = useState<ReplacementReport[] | null>(null);
    const [outputFilename, setOutputFilename] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setCandidates([]);
            setApplyReport(null);
            setUploadedFilename(null);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const response = await api.post('/template-detection/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadedFilename(response.data.filename);
            setTotalFromAI(response.data.totalCandidatesFromAI);
            setCandidates(
                response.data.candidates.map((c: any) => ({ ...c, included: true }))
            );
            if (response.data.candidates.length === 0) {
                notify.info('La IA no detectó candidatos a tag verificables en este documento.');
            } else {
                notify.success(`Se detectaron ${response.data.candidates.length} candidatos a tag.`);
            }
        } catch (error) {
            console.error('Error analyzing template:', error);
            notify.error('No se pudo analizar la plantilla');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const updateCandidate = (id: string, patch: Partial<TagCandidate>) => {
        setCandidates(candidates.map(c => (c.id === id ? { ...c, ...patch } : c)));
    };

    const handleApply = async () => {
        if (!uploadedFilename) return;
        const selected = candidates.filter(c => c.included);
        if (selected.length === 0) {
            notify.error('Selecciona al menos un candidato para aplicar');
            return;
        }
        setIsApplying(true);
        try {
            const response = await api.post('/template-detection/apply', {
                filename: uploadedFilename,
                replacements: selected.map(c => ({ phrase: c.phrase, tagName: c.suggestedTagName })),
                outputName: selectedFile?.name.replace('.docx', '-tagged.docx'),
            });
            setApplyReport(response.data.report);
            setOutputFilename(response.data.outputFilename);
            notify.success(
                `${response.data.totalReplaced} tags aplicados, ${response.data.totalFailed} no encontrados.`
            );
        } catch (error) {
            console.error('Error applying tags:', error);
            notify.error('No se pudieron aplicar los tags');
        } finally {
            setIsApplying(false);
        }
    };

    const handlePreview = () => {
        if (!outputFilename) return;
        const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        window.open(`${base}/api/files/preview/${encodeURIComponent(outputFilename)}`, '_blank');
    };

    const handleDownload = () => {
        if (!outputFilename) return;
        const base = (api.defaults.baseURL || '').replace(/\/api$/, '');
        window.open(`${base}/uploads/${outputFilename}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/sampling-templates')} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Detección Automática de Tags</h2>
                    <p className="text-slate-500">
                        Sube un formato de informe sin tags y deja que la IA sugiera dónde van los marcadores de automatización.
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Upload className="h-4 w-4 text-slate-400" />
                        1. Subir formato
                    </CardTitle>
                    <CardDescription>Archivo .docx sin tags de automatización</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx"
                        onChange={handleFileSelect}
                        className="max-w-md bg-white border-slate-200"
                    />
                    <Button
                        onClick={handleAnalyze}
                        disabled={!selectedFile || isAnalyzing}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Analizar con IA
                    </Button>
                </CardContent>
            </Card>

            {candidates.length > 0 && (
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileSearch className="h-4 w-4 text-slate-400" />
                            2. Revisar candidatos
                        </CardTitle>
                        <CardDescription>
                            {candidates.length} de {totalFromAI} candidatos sugeridos por la IA pasaron la validación
                            (existen literalmente en el documento). Edita el nombre del tag o descártalos antes de aplicar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100">
                                        <TableHead className="w-10 py-3 px-4"></TableHead>
                                        <TableHead className="py-3 px-4 font-medium text-slate-500">Frase detectada</TableHead>
                                        <TableHead className="py-3 px-4 font-medium text-slate-500">Nombre del tag</TableHead>
                                        <TableHead className="py-3 px-4 font-medium text-slate-500">Fuente</TableHead>
                                        <TableHead className="py-3 px-4 font-medium text-slate-500">Ocurrencias</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {candidates.map((c) => (
                                        <TableRow key={c.id} className={!c.included ? 'opacity-40' : ''}>
                                            <TableCell className="py-2 px-4">
                                                <Checkbox
                                                    checked={c.included}
                                                    onCheckedChange={(checked) => updateCandidate(c.id, { included: !!checked })}
                                                />
                                            </TableCell>
                                            <TableCell className="py-2 px-4 text-sm text-slate-700 max-w-xs truncate" title={c.phrase}>
                                                {c.phrase}
                                            </TableCell>
                                            <TableCell className="py-2 px-4">
                                                <Input
                                                    value={c.suggestedTagName}
                                                    onChange={(e) => updateCandidate(c.id, { suggestedTagName: e.target.value })}
                                                    className="h-8 text-xs font-mono bg-white border-slate-200"
                                                />
                                            </TableCell>
                                            <TableCell className="py-2 px-4">
                                                <Select
                                                    value={c.suggestedSource}
                                                    onValueChange={(v) => updateCandidate(c.id, { suggestedSource: v })}
                                                >
                                                    <SelectTrigger className="h-8 w-28 text-xs bg-white border-slate-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="OIT">OIT</SelectItem>
                                                        <SelectItem value="AI">AI</SelectItem>
                                                        <SelectItem value="DATE">DATE</SelectItem>
                                                        <SelectItem value="STATIC">STATIC</SelectItem>
                                                        <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="py-2 px-4">
                                                <Badge variant="outline" className="bg-slate-50">{c.occurrences}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="p-4 border-t border-slate-100">
                            <Button
                                onClick={handleApply}
                                disabled={isApplying}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isApplying ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                Aplicar tags seleccionados
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {applyReport && (
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            3. Resultado
                        </CardTitle>
                        <CardDescription>
                            Este archivo aún no está conectado a ninguna Plantilla de Muestreo en producción —
                            revísalo y, si está correcto, súbelo manualmente como plantilla de informe desde
                            Plantillas de Muestreo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="border-slate-200" onClick={handlePreview}>
                                <FileSearch className="mr-2 h-4 w-4" />
                                Ver documento con tags
                            </Button>
                            <Button variant="outline" className="border-slate-200" onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar .docx
                            </Button>
                        </div>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            {applyReport.map((r, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md border ${r.occurrencesReplaced > 0
                                        ? 'bg-emerald-50 border-emerald-100'
                                        : 'bg-amber-50 border-amber-100'
                                        }`}
                                >
                                    <span className="truncate flex-1">{r.phrase}</span>
                                    <code className="text-xs text-slate-500">{`{${r.tagName}}`}</code>
                                    {r.occurrencesReplaced > 0 ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shrink-0">
                                            {r.occurrencesReplaced}x
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 shrink-0">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            No encontrado
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
