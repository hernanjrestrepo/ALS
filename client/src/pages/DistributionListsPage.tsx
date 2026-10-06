import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Loader2, Plus, Pencil, Trash2, X, Users } from 'lucide-react';
import api from '@/lib/api';

interface Recipient {
    name: string;
    email: string;
    required: boolean;
}

interface DistributionListData {
    id: string;
    name: string;
    purpose: string;
    clientId?: string | null;
    notes?: string | null;
    recipients: Recipient[];
    createdAt: string;
}

const emptyForm = { name: '', purpose: '', notes: '' };
const emptyRecipient: Recipient = { name: '', email: '', required: true };

export default function DistributionListsPage() {
    const [lists, setLists] = useState<DistributionListData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [recipients, setRecipients] = useState<Recipient[]>([{ ...emptyRecipient }]);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        try {
            const response = await api.get('/distribution-lists');
            setLists(response.data);
        } catch (error) {
            console.error('Error fetching distribution lists:', error);
            toast.error('Error al cargar las listas de distribución');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setRecipients([{ ...emptyRecipient }]);
        setIsFormOpen(true);
    };

    const openEdit = (list: DistributionListData) => {
        setEditingId(list.id);
        setForm({ name: list.name, purpose: list.purpose, notes: list.notes || '' });
        setRecipients(list.recipients.length ? list.recipients.map(r => ({ ...r })) : [{ ...emptyRecipient }]);
        setIsFormOpen(true);
    };

    const updateRecipient = (idx: number, patch: Partial<Recipient>) => {
        setRecipients(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
    };

    const addRecipientRow = () => setRecipients(prev => [...prev, { ...emptyRecipient }]);
    const removeRecipientRow = (idx: number) => setRecipients(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        if (!form.name.trim() || !form.purpose.trim()) {
            toast.error('El nombre y el propósito son obligatorios');
            return;
        }
        const validRecipients = recipients.filter(r => r.email.trim());
        if (validRecipients.length === 0) {
            toast.error('Agrega al menos un destinatario con correo');
            return;
        }
        setIsSaving(true);
        try {
            const payload = { ...form, recipients: validRecipients };
            if (editingId) {
                await api.put(`/distribution-lists/${editingId}`, payload);
                toast.success('Lista actualizada exitosamente');
            } else {
                await api.post('/distribution-lists', payload);
                toast.success('Lista creada exitosamente');
            }
            setIsFormOpen(false);
            fetchLists();
        } catch (error: any) {
            console.error('Error saving distribution list:', error);
            toast.error(error.response?.data?.message || 'Error al guardar la lista');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (list: DistributionListData) => {
        if (!window.confirm(`¿Eliminar la lista "${list.name}"? Esta acción no se puede deshacer.`)) return;
        setDeletingId(list.id);
        try {
            await api.delete(`/distribution-lists/${list.id}`);
            setLists(lists.filter(l => l.id !== list.id));
            toast.success('Lista eliminada');
        } catch (error: any) {
            console.error('Error deleting distribution list:', error);
            toast.error(error.response?.data?.message || 'Error al eliminar la lista');
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
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Listas de Distribución</h1>
                        <p className="text-sm text-slate-500">A quién se le envía cada tipo de correo (factura, informes, cotizaciones...)</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge className="bg-blue-100 text-blue-800 border border-blue-200">{lists.length} {lists.length === 1 ? 'lista' : 'listas'}</Badge>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#004CAB] hover:bg-[#003b85] text-white" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Lista
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Editar Lista de Distribución' : 'Nueva Lista de Distribución'}</DialogTitle>
                                <DialogDescription>Define a quién se le envía este tipo de correo.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label>Nombre *</Label>
                                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Facturación - Oben Group" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Propósito *</Label>
                                        <Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Factura" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Notas</Label>
                                        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-700">Destinatarios</p>
                                        <Button type="button" variant="outline" size="sm" onClick={addRecipientRow}>
                                            <Plus className="h-3.5 w-3.5 mr-1" />Agregar
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {recipients.map((r, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    className="flex-1"
                                                    placeholder="Nombre"
                                                    value={r.name}
                                                    onChange={e => updateRecipient(idx, { name: e.target.value })}
                                                />
                                                <Input
                                                    className="flex-1"
                                                    type="email"
                                                    placeholder="correo@dominio.com"
                                                    value={r.email}
                                                    onChange={e => updateRecipient(idx, { email: e.target.value })}
                                                />
                                                <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                                                    <Checkbox checked={r.required} onCheckedChange={(v) => updateRecipient(idx, { required: v !== false })} />
                                                    Requerido
                                                </label>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeRecipientRow(idx)} disabled={recipients.length === 1} className="text-slate-400 hover:text-red-600">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
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
                    <CardTitle className="text-lg font-medium text-slate-900">Listas registradas</CardTitle>
                    <CardDescription>Se usan para saber a quién enviar cada correo (factura, informes, cotizaciones) sin depender de un único contacto por cliente.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {lists.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">No hay listas de distribución todavía.</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Lista</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Propósito</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Destinatarios</th>
                                    <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lists.map(list => (
                                    <tr key={list.id} className="hover:bg-slate-50/50">
                                        <td className="p-4">
                                            <p className="text-sm font-medium text-slate-900">{list.name}</p>
                                            {list.notes && <p className="text-xs text-slate-400">{list.notes}</p>}
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">{list.purpose}</Badge>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                                {list.recipients.length} {list.recipients.length === 1 ? 'destinatario' : 'destinatarios'}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {list.recipients.slice(0, 4).map((r, i) => (
                                                    <Badge key={i} variant="outline" className={`text-[10px] ${r.required ? 'border-slate-300 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
                                                        {r.name || r.email}{!r.required && ' (opcional)'}
                                                    </Badge>
                                                ))}
                                                {list.recipients.length > 4 && (
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400">+{list.recipients.length - 4} más</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(list)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                    <Pencil className="h-4 w-4 mr-1" />Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(list)} disabled={deletingId === list.id} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                                                    {deletingId === list.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" />Eliminar</>}
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
