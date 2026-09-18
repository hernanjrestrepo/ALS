import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Beaker, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface ServiceData {
    id: string;
    name: string;
    description?: string;
    oitType?: string;
    active: boolean;
}

const emptyForm = { name: '', description: '', oitType: '' };

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const response = await api.get('/services');
            setServices(response.data);
        } catch (error) {
            console.error('Error fetching services:', error);
            toast.error('Error al cargar servicios');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setIsFormOpen(true);
    };

    const openEdit = (service: ServiceData) => {
        setEditingId(service.id);
        setForm({ name: service.name, description: service.description || '', oitType: service.oitType || '' });
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('El nombre del servicio es obligatorio');
            return;
        }
        setIsSaving(true);
        try {
            if (editingId) {
                await api.put(`/services/${editingId}`, form);
                toast.success('Servicio actualizado');
            } else {
                await api.post('/services', form);
                toast.success('Servicio creado');
            }
            setIsFormOpen(false);
            fetchServices();
        } catch (error: any) {
            console.error('Error saving service:', error);
            toast.error(error.response?.data?.message || 'Error al guardar servicio');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (service: ServiceData) => {
        if (!window.confirm(`¿Eliminar el servicio "${service.name}"?`)) return;
        setDeletingId(service.id);
        try {
            await api.delete(`/services/${service.id}`);
            setServices(services.filter(s => s.id !== service.id));
            toast.success('Servicio eliminado');
        } catch (error: any) {
            console.error('Error deleting service:', error);
            toast.error(error.response?.data?.message || 'Error al eliminar servicio');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Beaker className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Servicios</h1>
                        <p className="text-sm text-slate-500">Catálogo de servicios ambientales que se pueden cotizar</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">{services.length} servicios</Badge>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#004CAB] hover:bg-[#003b85] text-white" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Servicio
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
                                <DialogDescription>Servicios disponibles para cotizar a los clientes.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre *</Label>
                                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Muestreo de agua subterránea" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Matriz ambiental</Label>
                                    <Input value={form.oitType} onChange={e => setForm({ ...form, oitType: e.target.value })} placeholder="Agua, Aire, Suelo, Biota..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-medium text-slate-900">Servicios disponibles</CardTitle>
                    <CardDescription>Se usan al crear cotizaciones desde el módulo de Clientes.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {services.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">No hay servicios registrados todavía.</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Servicio</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Matriz</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {services.map(service => (
                                    <tr key={service.id} className="hover:bg-slate-50/50">
                                        <td className="p-4 text-sm font-medium text-slate-900">{service.name}</td>
                                        <td className="p-4">{service.oitType && <Badge variant="outline">{service.oitType}</Badge>}</td>
                                        <td className="p-4 text-sm text-slate-500 max-w-md truncate">{service.description}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(service)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                    <Pencil className="h-4 w-4 mr-1" />Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(service)} disabled={deletingId === service.id} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                                                    {deletingId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" />Eliminar</>}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
