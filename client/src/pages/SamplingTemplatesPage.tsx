import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Workflow, Trash2, Edit, Eye, ListChecks, FileText, FileSearch, History, RotateCcw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface TemplateStep {
    id: string;
    title: string;
    description: string;
}

interface SamplingTemplate {
    id: string;
    name: string;
    description: string;
    oitType: string;
    steps: string;
    reportTemplateFile?: string | null;
    createdAt: string;
}

interface TemplateVersion {
    id: string;
    versionNumber: number;
    name: string;
    description: string;
    oitType: string;
    reportTemplateFile?: string | null;
    createdAt: string;
}

export default function SamplingTemplatesPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<SamplingTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<SamplingTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewTemplate, setViewTemplate] = useState<SamplingTemplate | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SamplingTemplate | null>(null);
    const [versions, setVersions] = useState<TemplateVersion[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [restoreVersionTarget, setRestoreVersionTarget] = useState<TemplateVersion | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        filterTemplates();
    }, [searchTerm, templates]);

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/sampling-templates');
            setTemplates(response.data);
            setFilteredTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('No se pudieron cargar las plantillas');
            setTemplates([]);
            setFilteredTemplates([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterTemplates = () => {
        if (!searchTerm) {
            setFilteredTemplates(templates);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = templates.filter(t =>
            t.name.toLowerCase().includes(lowerTerm) ||
            t.description.toLowerCase().includes(lowerTerm) ||
            t.oitType.toLowerCase().includes(lowerTerm)
        );
        setFilteredTemplates(filtered);
    };

    useEffect(() => {
        if (!viewTemplate) {
            setVersions([]);
            return;
        }
        setIsLoadingVersions(true);
        api.get(`/sampling-templates/${viewTemplate.id}/versions`)
            .then(res => setVersions(res.data))
            .catch(err => {
                console.error('Error fetching versions:', err);
                setVersions([]);
            })
            .finally(() => setIsLoadingVersions(false));
    }, [viewTemplate]);

    const confirmRestoreVersion = async () => {
        if (!restoreVersionTarget || !viewTemplate) return;
        try {
            const response = await api.post(`/sampling-templates/${viewTemplate.id}/versions/${restoreVersionTarget.id}/restore`);
            setTemplates(templates.map(t => t.id === viewTemplate.id ? response.data : t));
            setViewTemplate(response.data);
            toast.success(`Restaurada la versión ${restoreVersionTarget.versionNumber}`);
        } catch (error) {
            console.error('Error restoring version:', error);
            toast.error('Error al restaurar la versión');
        } finally {
            setRestoreVersionTarget(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/sampling-templates/${deleteTarget.id}`);
            setTemplates(templates.filter(t => t.id !== deleteTarget.id));
            toast.success('Plantilla movida a la papelera. Se puede recuperar durante 90 días.');
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Error al eliminar plantilla');
        } finally {
            setDeleteTarget(null);
        }
    };

    const parseSteps = (stepsJson: string): TemplateStep[] => {
        try {
            return JSON.parse(stepsJson);
        } catch {
            return [];
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Plantillas de Muestreo</h2>
                    <p className="text-slate-500">
                        Define flujos de trabajo reutilizables para diferentes tipos de OIT.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/sampling-templates/trash')}
                        className="border-slate-200"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Papelera
                    </Button>
                    <Button
                        onClick={() => navigate('/sampling-templates/create')}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Plantilla
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar plantillas..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-slate-50/50 border-slate-100">
                                    <TableHead className="w-[250px] py-3 px-4 font-medium text-slate-500">Nombre</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Tipo OIT</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Descripción</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Pasos</TableHead>
                                    <TableHead className="text-right py-3 px-4 font-medium text-slate-500">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[200px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[300px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                            <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredTemplates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Workflow className="h-8 w-8 text-slate-300" />
                                                <p>No hay plantillas definidas</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTemplates.map((template) => {
                                        const steps = parseSteps(template.steps);
                                        return (
                                            <TableRow key={template.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <TableCell className="py-3 px-4 font-medium text-slate-900">
                                                    <div className="flex items-center gap-2">
                                                        <Workflow className="h-4 w-4 text-slate-400" />
                                                        {template.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-4">
                                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                                                        {template.oitType}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-slate-600 max-w-md truncate">
                                                    {template.description}
                                                </TableCell>
                                                <TableCell className="py-3 px-4">
                                                    <Badge variant="outline" className="bg-slate-50">
                                                        {steps.length} {steps.length === 1 ? 'paso' : 'pasos'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-slate-900"
                                                            title="Ver"
                                                            onClick={() => setViewTemplate(template)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-slate-900"
                                                            title="Editar"
                                                            onClick={() => navigate(`/sampling-templates/edit/${template.id}`)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                            title="Eliminar"
                                                            onClick={() => setDeleteTarget(template)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Diálogo "Ver" — solo lectura */}
            <Dialog open={!!viewTemplate} onOpenChange={(open) => !open && setViewTemplate(null)}>
                <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Workflow className="h-4 w-4 text-slate-400" />
                            {viewTemplate?.name}
                        </DialogTitle>
                        <DialogDescription>{viewTemplate?.description}</DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="detalles" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="shrink-0 w-fit">
                            <TabsTrigger value="detalles">Detalles</TabsTrigger>
                            <TabsTrigger value="historial">
                                Historial de versiones
                                {versions.length > 0 && (
                                    <Badge variant="outline" className="ml-1.5 h-5 px-1.5 bg-slate-50">{versions.length}</Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="detalles" className="space-y-4 overflow-y-auto pr-1 mt-3">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                                {viewTemplate?.oitType}
                            </Badge>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <FileText className="h-4 w-4" />
                                    Plantilla de informe asociada
                                </div>
                                {viewTemplate?.reportTemplateFile ? (
                                    <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
                                        <p className="text-sm text-slate-700 break-words">
                                            {viewTemplate.reportTemplateFile}
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 border-slate-200"
                                            onClick={() => {
                                                const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
                                                window.open(`${base}/api/files/preview/${encodeURIComponent(viewTemplate!.reportTemplateFile!)}`, '_blank');
                                            }}
                                        >
                                            <FileSearch className="mr-1.5 h-3.5 w-3.5" />
                                            Ver documento
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">
                                        Esta plantilla no tiene un informe (.docx) asociado todavía.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <ListChecks className="h-4 w-4" />
                                    Pasos del flujo
                                </div>
                                <ol className="space-y-2">
                                    {viewTemplate && parseSteps(viewTemplate.steps).map((step, i) => (
                                        <li key={step.id ?? i} className="text-sm bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
                                            <span className="font-medium text-slate-900">{i + 1}. {step.title}</span>
                                            {step.description && (
                                                <p className="text-slate-500 mt-0.5">{step.description}</p>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </TabsContent>

                        <TabsContent value="historial" className="overflow-y-auto pr-1 mt-3">
                            {isLoadingVersions ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-14 w-full" />
                                    <Skeleton className="h-14 w-full" />
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                                    <History className="h-8 w-8 text-slate-300" />
                                    <p className="text-sm">Todavía no hay cambios guardados en esta plantilla.</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {versions.map((v) => (
                                        <li key={v.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-white shrink-0">v{v.versionNumber}</Badge>
                                                    <span className="text-sm font-medium text-slate-900 truncate">{v.name}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {new Date(v.createdAt).toLocaleString('es-CO')}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 border-slate-200"
                                                onClick={() => setRestoreVersionTarget(v)}
                                            >
                                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                                Restaurar
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Confirmación antes de restaurar una versión anterior */}
            <AlertDialog open={!!restoreVersionTarget} onOpenChange={(open) => !open && setRestoreVersionTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restaurar la versión {restoreVersionTarget?.versionNumber}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El estado actual de "{viewTemplate?.name}" se guardará como una nueva versión antes de
                            restaurar, así que nada se pierde y puedes deshacer esto después.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRestoreVersion}>
                            Restaurar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirmación antes de eliminar */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de eliminar esta plantilla?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{deleteTarget?.name}" se moverá a la papelera de reciclaje y podrás recuperarla
                            durante los próximos 90 días. Después de ese plazo se eliminará de forma permanente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
