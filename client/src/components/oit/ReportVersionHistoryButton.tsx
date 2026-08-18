import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { History, RotateCcw, Download } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';

interface ReportVersion {
    id: string;
    name: string;
    versionNumber: number;
    url: string;
    type: string;
    isActive: boolean;
    createdAt: string;
}

interface ReportVersionHistoryButtonProps {
    oitId: string;
    reportName: string;
    onActivated?: () => void;
}

export function ReportVersionHistoryButton({ oitId, reportName, onActivated }: ReportVersionHistoryButtonProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [versions, setVersions] = useState<ReportVersion[]>([]);
    const [activatingId, setActivatingId] = useState<string | null>(null);

    const loadVersions = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/oits/${oitId}/report-versions`);
            const all: ReportVersion[] = response.data;
            setVersions(all.filter(v => v.name === reportName));
        } catch (error) {
            console.error('Error fetching report versions:', error);
            notify.error('No se pudo cargar el historial de versiones');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpen = () => {
        setOpen(true);
        loadVersions();
    };

    const handleActivate = async (versionId: string) => {
        setActivatingId(versionId);
        try {
            await api.post(`/oits/${oitId}/report-versions/${versionId}/activate`);
            notify.success('Versión reactivada');
            await loadVersions();
            onActivated?.();
        } catch (error) {
            console.error('Error activating version:', error);
            notify.error('Error al reactivar la versión');
        } finally {
            setActivatingId(null);
        }
    };

    const baseUrl = (api.defaults.baseURL || '').replace(/\/api$/, '');

    return (
        <>
            <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                title="Historial de versiones"
                onClick={handleOpen}
            >
                <History className="h-4 w-4" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-4 w-4 text-slate-400" />
                            Historial de versiones
                        </DialogTitle>
                        <DialogDescription>{reportName}</DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-1 space-y-2">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                            </>
                        ) : versions.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-6">
                                No hay versiones anteriores registradas para este informe.
                            </p>
                        ) : (
                            versions.map((v) => {
                                const reportUrl = v.url.startsWith('http')
                                    ? v.url
                                    : `${baseUrl}/uploads/${v.url.replace(/^uploads\//, '')}`;
                                return (
                                    <div
                                        key={v.id}
                                        className={`flex items-center justify-between gap-2 border rounded-md px-3 py-2 ${v.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'
                                            }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-white shrink-0">v{v.versionNumber}</Badge>
                                                {v.isActive && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shrink-0">
                                                        Activa
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {new Date(v.createdAt).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600">
                                                <a href={reportUrl} download title="Descargar esta versión">
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            {!v.isActive && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-slate-200"
                                                    disabled={activatingId === v.id}
                                                    onClick={() => handleActivate(v.id)}
                                                >
                                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                                    Activar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
