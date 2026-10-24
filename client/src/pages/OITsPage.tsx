import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Upload, CheckCircle2, AlertCircle, Receipt, ArrowUpDown } from 'lucide-react';
import { useOITs } from '@/hooks/useOITs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/authStore';
import { canManageOITs } from '@/types/auth';

import { tr } from '@/i18n';
interface Quotation {
    id: string;
    quotationNumber: string;
    clientName?: string;
    approvedForOit?: boolean;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
    { value: 'oitNumber-desc', label: tr("Número de OIT (más reciente primero)") },
    { value: 'oitNumber-asc', label: tr("Número de OIT (más antiguo primero)") },
    { value: 'createdAt-desc', label: tr("Fecha de creación en ALS (más reciente primero)") },
    { value: 'createdAt-asc', label: tr("Fecha de creación en ALS (más antiguo primero)") },
    { value: 'updatedAt-desc', label: tr("Última actualización") },
    { value: 'status-asc', label: tr("Estado") },
];

export default function OITsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('oitNumber-desc');
    const [sortBy, sortDir] = sortOption.split('-');
    // La lista se carga una vez y se filtra aqui mientras se escribe: antes cada tecla
    // pedia la lista al servidor y una respuesta vieja (la de la caja vacia) podia
    // llegar de ultima y mostrar todas (2026-10-23).
    const { oits: allOits, isLoading, error } = useOITs(undefined, sortBy, sortDir);
    const oits = useMemo(() => {
        const fold = (v: unknown) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const term = fold(searchQuery.trim());
        if (!term) return allOits;
        return allOits.filter(o => [o.oitNumber, o.description, o.clientName, o.clientNit, o.quotationRef, o.location].some(v => fold(v).includes(term)));
    }, [allOits, searchQuery]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();
    const currentUser = useAuthStore((state: any) => state.user);
    const canCreate = currentUser && canManageOITs(currentUser.role);

    // Quotations for selector
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

    const [formData, setFormData] = useState({
        oitFile: null as File | null,
        quotationId: '' as string,
    });

    // Fetch quotations when dialog opens
    useEffect(() => {
        if (isDialogOpen) {
            fetchQuotations();
        }
    }, [isDialogOpen]);

    const fetchQuotations = async () => {
        setIsLoadingQuotations(true);
        try {
            const response = await api.get('/quotations');
            setQuotations(response.data);
        } catch (error) {
            console.error('Error fetching quotations:', error);
            toast.error(tr("Error al cargar cotizaciones"));
        } finally {
            setIsLoadingQuotations(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'PENDING': return 'bg-slate-50 text-slate-700 border-slate-200';
            case 'ANALYZING': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'REVIEW_REQUIRED': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'REVIEW_NEEDED': return 'bg-red-50 text-red-700 border-red-200';
            case 'ERROR': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'COMPLETADA';
            case 'IN_PROGRESS': return tr("EN MUESTREO");
            case 'PENDING': return 'PENDIENTE';
            case 'ANALYZING': return 'ANALIZANDO';
            case 'REVIEW_REQUIRED': return tr("PENDIENTE DE APROBACIÓN");
            case 'REVIEW_NEEDED': return tr("REQUIERE REVISIÓN");
            case 'ERROR': return 'ERROR';
            default: return status;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['application/pdf', 'text/plain'];
            if (!validTypes.includes(file.type)) {
                toast.error(tr("Solo se permiten archivos PDF o TXT"));
                return;
            }
            setFormData(prev => ({ ...prev, oitFile: file }));
        }
    };

    const handleCreateAsync = async () => {
        if (!formData.oitFile) {
            toast.error(tr("Por favor sube el documento OIT"));
            return;
        }

        setIsProcessing(true);
        const uploadData = new FormData();
        uploadData.append('oitFile', formData.oitFile);
        if (formData.quotationId) {
            uploadData.append('quotationId', formData.quotationId);
        }
        uploadData.append('description', 'Análisis en curso...');

        try {
            const response = await api.post('/oits/async', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const createdOIT = response.data;
            toast.success(tr("OIT creada. Iniciando análisis..."));
            setIsDialogOpen(false);
            resetForm();
            navigate(`/oits/${createdOIT.id}`);
        } catch (error: any) {
            console.error('Error creating OIT:', error);
            toast.error(error.response?.data?.error || error.response?.data?.message || tr("Error al crear OIT"));
        } finally {
            setIsProcessing(false);
        }
    };

    const resetForm = () => {
        setFormData({ oitFile: null, quotationId: '' });
        setIsDialogOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tr("OITs")}</h2>
                    <p className="text-slate-500">{tr("Gestiona y rastrea registros de inspección.")}</p>
                </div>
                {canCreate && <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsDialogOpen(open);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#004CAB] hover:bg-[#003b85] text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            {tr("Nueva OIT")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{tr("Crear Nueva OIT")}</DialogTitle>
                            <DialogDescription>
                                {tr("Sube el documento OIT y selecciona una cotización existente (opcional).")}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* OIT Document Card */}
                                <div className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${formData.oitFile
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
                                    }`}>
                                    <input
                                        id="oitFile"
                                        type="file"
                                        accept=".pdf,.txt"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center text-center pointer-events-none">
                                        {formData.oitFile ? (
                                            <>
                                                <CheckCircle2 className="h-12 w-12 text-emerald-600 mb-3" />
                                                <p className="font-semibold text-emerald-900 mb-1">{tr("Documento OIT")}</p>
                                                <p className="text-sm text-emerald-700 break-all px-2">{formData.oitFile.name}</p>
                                                <p className="text-xs text-emerald-600 mt-2">{(formData.oitFile.size / 1024 / 1024).toFixed(2)} {tr("MB")}</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-12 w-12 text-slate-400 mb-3" />
                                                <p className="font-semibold text-slate-700 mb-1">{tr("Documento OIT *")}</p>
                                                <p className="text-sm text-slate-500">{tr("Click para subir PDF o TXT")}</p>
                                                <p className="text-xs text-slate-400 mt-2">{tr("Máx. 10MB")}</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Quotation Selector */}
                                <div className="border-2 border-slate-200 rounded-lg p-6 bg-slate-50">
                                    <div className="flex flex-col items-center text-center">
                                        <Receipt className="h-12 w-12 text-slate-400 mb-3" />
                                        <p className="font-semibold text-slate-700 mb-3">{tr("Cotización (Opcional)")}</p>
                                        <Select
                                            value={formData.quotationId}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, quotationId: value }))}
                                        >
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder={isLoadingQuotations ? "Cargando..." : "Seleccionar cotización"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {quotations.map(q => (
                                                    <SelectItem key={q.id} value={q.id} disabled={!q.approvedForOit}>
                                                        {q.quotationNumber} {q.clientName ? `- ${q.clientName}` : ''}
                                                        {!q.approvedForOit ? tr(" (sin aprobar contra la norma)") : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 mt-2">
                                            O <a href="/quotations" className="text-blue-600 hover:underline">{tr("crea una nueva")}</a>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-blue-900 mb-1">{tr("Análisis Automático")}</p>
                                        <p className="text-sm text-blue-800">
                                            {tr("Al crear la OIT, la IA analizará el documento en segundo plano para extraer información y recursos.")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>{tr("Cancelar")}</Button>
                            <Button
                                onClick={handleCreateAsync}
                                disabled={isProcessing || !formData.oitFile}
                                className="bg-[#004CAB] hover:bg-[#003b85]"
                            >
                                {isProcessing ? tr("Creando...") : tr("Crear OIT")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>}
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder={tr("Buscar por número, cliente, NIT o cotización...")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors w-full"
                            />
                        </div>
                        <Select value={sortOption} onValueChange={setSortOption}>
                            <SelectTrigger className="w-full sm:w-72 bg-white border-slate-200 text-slate-600">
                                <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                <SelectValue placeholder={tr("Ordenar por...")} />
                            </SelectTrigger>
                            <SelectContent>
                                {SORT_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop Headers */}
                    <div className="hidden sm:flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex-1">{tr("OIT / Descripción")}</div>
                        <div className="w-32 text-right" title={tr("Fecha en que la orden se cargó en ALS Xmart. No es la fecha de emisión de la OIT.")}>{tr("Cargada en Xmart")}</div>
                        <div className="w-32 text-right">{tr("Estado")}</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="p-4 space-y-4">
                                {/* Skeletons */}
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-9 w-9 rounded-full" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-[200px]" />
                                                <Skeleton className="h-3 w-[150px]" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-6 w-[100px]" />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 text-red-600">{error}</div>
                        ) : oits.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">{tr("No se encontraron OITs")}</div>
                        ) : (
                            oits.map((oit) => (
                                <div
                                    key={oit.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/50 transition-colors cursor-pointer group gap-4 sm:gap-0"
                                    onClick={() => navigate(`/oits/${oit.id}`)}
                                >
                                    <div className="flex items-center gap-4 w-full sm:flex-1 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <FileText className="h-4 w-4 text-slate-500 group-hover:text-slate-900" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{oit.oitNumber || `OIT-${oit.id.slice(0, 8)}`}</p>
                                            {oit.clientName && <p className="text-xs font-medium text-slate-700 truncate max-w-[200px] sm:max-w-[400px]">{oit.clientName}</p>}
                                            <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-[400px]">{oit.description || tr("Sin descripción")}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pl-14 sm:pl-0">
                                        <div className="sm:w-32 sm:text-right">
                                            <span className="text-xs text-slate-400 font-mono" title={tr("Fecha en que la orden se cargó en ALS Xmart")}>
                                                {new Date(oit.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="sm:w-32 sm:text-right flex justify-end">
                                            <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(oit.status)}`}>
                                                {getStatusLabel(oit.status)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
