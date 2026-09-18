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
import { Building2, Loader2, Plus, Pencil, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface ClientData {
    id: string;
    name: string;
    nit?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    notes?: string;
    contractorManualUrl?: string;
    proceduresUrl?: string;
    policiesUrl?: string;
    createdAt: string;
}

const emptyForm = {
    name: '', nit: '', contactName: '', contactEmail: '', contactPhone: '', address: '', notes: '',
};

export default function ClientsPage() {
    const [clients, setClients] = useState<ClientData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState<{ contractorManual?: File; procedures?: File; policies?: File }>({});
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Error al cargar clientes');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setFiles({});
        setIsFormOpen(true);
    };

    const openEdit = (client: ClientData) => {
        setEditingId(client.id);
        setForm({
            name: client.name, nit: client.nit || '', contactName: client.contactName || '',
            contactEmail: client.contactEmail || '', contactPhone: client.contactPhone || '',
            address: client.address || '', notes: client.notes || '',
        });
        setFiles({});
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('El nombre del cliente es obligatorio');
            return;
        }
        setIsSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([key, value]) => fd.append(key, value));
            if (files.contractorManual) fd.append('contractorManual', files.contractorManual);
            if (files.procedures) fd.append('procedures', files.procedures);
            if (files.policies) fd.append('policies', files.policies);

            if (editingId) {
                await api.put(`/clients/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Cliente actualizado exitosamente');
            } else {
                await api.post('/clients', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Cliente creado exitosamente');
            }
            setIsFormOpen(false);
            fetchClients();
        } catch (error: any) {
            console.error('Error saving client:', error);
            toast.error(error.response?.data?.message || 'Error al guardar cliente');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (client: ClientData) => {
        if (!window.confirm(`¿Eliminar el cliente "${client.name}"? Esta acción no se puede deshacer.`)) return;
        setDeletingId(client.id);
        try {
            await api.delete(`/clients/${client.id}`);
            setClients(clients.filter(c => c.id !== client.id));
            toast.success('Cliente eliminado');
        } catch (error: any) {
            console.error('Error deleting client:', error);
            toast.error(error.response?.data?.message || 'Error al eliminar cliente');
        } finally {
            setDeletingId(null);
        }
    };

    const docCount = (c: ClientData) => [c.contractorManualUrl, c.proceduresUrl, c.policiesUrl].filter(Boolean).length;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
                        <p className="text-sm text-slate-500">Base de clientes y su documentación requerida</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge className="bg-blue-100 text-blue-800 border border-blue-200">{clients.length} clientes</Badge>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#004CAB] hover:bg-[#003b85] text-white" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Cliente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                                <DialogDescription>Datos de contacto y documentación requerida antes de generar cotizaciones.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label>Nombre *</Label>
                                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ecopetrol S.A." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>NIT</Label>
                                        <Input value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} placeholder="900.123.456-7" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teléfono</Label>
                                        <Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contacto</Label>
                                        <Input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Correo de contacto</Label>
                                        <Input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Dirección</Label>
                                        <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Notas</Label>
                                        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                    <p className="text-sm font-medium text-slate-700">Documentación del cliente</p>
                                    <div className="grid gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Manual de contratistas</Label>
                                            <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFiles({ ...files, contractorManual: e.target.files?.[0] })} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Procedimientos</Label>
                                            <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFiles({ ...files, procedures: e.target.files?.[0] })} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Políticas</Label>
                                            <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFiles({ ...files, policies: e.target.files?.[0] })} />
                                        </div>
                                    </div>
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
                    <CardTitle className="text-lg font-medium text-slate-900">Clientes registrados</CardTitle>
                    <CardDescription>Un cliente debe existir aquí, con su documentación, antes de poder generarle una cotización.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {clients.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">No hay clientes registrados todavía.</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">NIT</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Documentación</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clients.map(client => (
                                    <tr key={client.id} className="hover:bg-slate-50/50">
                                        <td className="p-4">
                                            <p className="text-sm font-medium text-slate-900">{client.name}</p>
                                            {client.address && <p className="text-xs text-slate-400">{client.address}</p>}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">{client.nit || '—'}</td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {client.contactName || '—'}
                                            {client.contactEmail && <p className="text-xs text-slate-400">{client.contactEmail}</p>}
                                        </td>
                                        <td className="p-4">
                                            {docCount(client) === 3 ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />Completa
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 border">
                                                    <FileText className="h-3 w-3 mr-1" />{docCount(client)}/3 documentos
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(client)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                    <Pencil className="h-4 w-4 mr-1" />Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(client)} disabled={deletingId === client.id} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                                                    {deletingId === client.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" />Eliminar</>}
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
