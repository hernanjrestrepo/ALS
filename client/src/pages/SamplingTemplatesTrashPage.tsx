import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, RotateCcw, Workflow, Clock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/date';

interface TrashedTemplate {
    id: string;
    name: string;
    description: string;
    oitType: string;
    steps: string;
    deletedAt: string;
    expiresAt: string;
    daysRemaining: number;
}

export default function SamplingTemplatesTrashPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<TrashedTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTrash();
    }, []);

    const fetchTrash = async () => {
        try {
            const response = await api.get('/sampling-templates/trash');
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching trash:', error);
            toast.error('No se pudo cargar la papelera');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (id: string, name: string) => {
        try {
            await api.post(`/sampling-templates/${id}/restore`);
            setTemplates(templates.filter(t => t.id !== id));
            toast.success(`"${name}" restaurada correctamente`);
        } catch (error) {
            console.error('Error restoring template:', error);
            toast.error('Error al restaurar la plantilla');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/sampling-templates')}
                    className="h-8 w-8"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Papelera de Reciclaje</h2>
                    <p className="text-slate-500">
                        Plantillas eliminadas. Se pueden recuperar hasta 90 días después de eliminarse.
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4" />
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-slate-50/50 border-slate-100">
                                    <TableHead className="w-[250px] py-3 px-4 font-medium text-slate-500">Nombre</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Tipo OIT</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Eliminada</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Días restantes</TableHead>
                                    <TableHead className="text-right py-3 px-4 font-medium text-slate-500">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(2)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[200px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                            <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : templates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Trash2 className="h-8 w-8 text-slate-300" />
                                                <p>La papelera está vacía</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    templates.map((template) => (
                                        <TableRow key={template.id} className="hover:bg-slate-50/50 transition-colors">
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
                                            <TableCell className="py-3 px-4 text-slate-600">
                                                {formatDate(new Date(template.deletedAt), 'es-CO')}
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                <Badge variant="outline" className={template.daysRemaining <= 7 ? 'border-red-200 text-red-600 bg-red-50' : 'bg-slate-50'}>
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {template.daysRemaining} {template.daysRemaining === 1 ? 'día' : 'días'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 px-4 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-slate-200"
                                                    onClick={() => handleRestore(template.id, template.name)}
                                                >
                                                    <RotateCcw className="mr-2 h-4 w-4" />
                                                    Restaurar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
