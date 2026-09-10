import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface NonConformity {
    id: string;
    title: string;
    description: string;
    severity: 'MENOR' | 'MAYOR' | 'CRITICA';
    status: 'ABIERTA' | 'EN_TRATAMIENTO' | 'CERRADA';
    detectedBy: string | null;
    resolution: string | null;
    closedAt: string | null;
    createdAt: string;
}

const SEVERITY_STYLES: Record<string, string> = {
    MENOR: 'bg-amber-50 text-amber-700 border-amber-200',
    MAYOR: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICA: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_STYLES: Record<string, string> = {
    ABIERTA: 'bg-red-50 text-red-700 border-red-200',
    EN_TRATAMIENTO: 'bg-amber-50 text-amber-700 border-amber-200',
    CERRADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function NonConformitiesPanel({ oitId }: { oitId: string }) {
    const [items, setItems] = useState<NonConformity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [resolutionText, setResolutionText] = useState('');

    const [form, setForm] = useState({ title: '', description: '', severity: 'MENOR', detectedBy: '' });

    const load = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/oits/${oitId}/non-conformities`);
            setItems(res.data);
        } catch (error) {
            console.error('Error loading non-conformities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, [oitId]);

    const handleCreate = async () => {
        if (!form.title.trim() || !form.description.trim()) {
            toast.error('Título y descripción son obligatorios');
            return;
        }
        setIsSaving(true);
        try {
            await api.post(`/oits/${oitId}/non-conformities`, form);
            toast.success('No conformidad registrada');
            setIsCreateOpen(false);
            setForm({ title: '', description: '', severity: 'MENOR', detectedBy: '' });
            load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al registrar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await api.put(`/non-conformities/${id}`, { status });
            toast.success('Estado actualizado');
            load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al actualizar estado');
        }
    };

    const handleClose = async () => {
        if (!resolvingId) return;
        if (!resolutionText.trim()) {
            toast.error('Describe cómo se resolvió antes de cerrar');
            return;
        }
        try {
            await api.put(`/non-conformities/${resolvingId}`, { status: 'CERRADA', resolution: resolutionText });
            toast.success('No conformidad cerrada');
            setResolvingId(null);
            setResolutionText('');
            load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al cerrar');
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        No Conformidades
                    </CardTitle>
                    <CardDescription>Hallazgos que no cumplen lo esperado, con seguimiento hasta el cierre.</CardDescription>
                </div>
                <Button size="sm" className="bg-[#004CAB] hover:bg-[#003b85]" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">No hay no conformidades registradas para esta OIT.</div>
                ) : (
                    <div className="space-y-3">
                        {items.map(item => (
                            <div key={item.id} className="border border-slate-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-slate-900">{item.title}</p>
                                        <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <Badge className={`${SEVERITY_STYLES[item.severity]} border`}>{item.severity}</Badge>
                                        <Badge className={`${STATUS_STYLES[item.status]} border`}>{item.status.replace('_', ' ')}</Badge>
                                    </div>
                                </div>
                                {item.detectedBy && <p className="text-xs text-slate-400">Detectado por: {item.detectedBy}</p>}
                                {item.resolution && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2 text-sm text-emerald-800">
                                        <strong>Resolución:</strong> {item.resolution}
                                    </div>
                                )}
                                {item.status !== 'CERRADA' && (
                                    <div className="flex items-center gap-2 pt-1">
                                        {item.status === 'ABIERTA' && (
                                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, 'EN_TRATAMIENTO')}>
                                                Pasar a en tratamiento
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => setResolvingId(item.id)}>
                                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Cerrar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Create dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Registrar No Conformidad</DialogTitle>
                        <DialogDescription>Documenta el hallazgo para hacerle seguimiento hasta el cierre.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej. Límite de cuantificación no cumple la norma" />
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalla el hallazgo" rows={4} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Severidad</Label>
                                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MENOR">Menor</SelectItem>
                                        <SelectItem value="MAYOR">Mayor</SelectItem>
                                        <SelectItem value="CRITICA">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Detectado por (opcional)</Label>
                                <Input value={form.detectedBy} onChange={e => setForm({ ...form, detectedBy: e.target.value })} placeholder="Nombre" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={isSaving} className="bg-[#004CAB] hover:bg-[#003b85]">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Registrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close/resolve dialog */}
            <Dialog open={!!resolvingId} onOpenChange={(open) => !open && setResolvingId(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Cerrar No Conformidad</DialogTitle>
                        <DialogDescription>Describe cómo se resolvió antes de cerrarla.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea value={resolutionText} onChange={e => setResolutionText(e.target.value)} placeholder="Resolución aplicada" rows={4} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResolvingId(null)}>Cancelar</Button>
                        <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
