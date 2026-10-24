import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Check, X, UserCheck, UserX } from 'lucide-react';

import { tr } from '@/i18n';
// Personal de monitoreo (reunion del 2026-10-23): Operaciones controla quien aparece al
// asignar ingenieros. El cargo define quien supervisa (jefe, coordinador, supervisor o
// planeador ven todas las OIT).
interface Staff {
    id: string;
    nombre: string;
    cargo: string;
    correo: string;
    activo: boolean;
    cuentaAls: { activa: boolean; rol: string } | null;
}

const SUPERVISA = /jefe|coordinador|supervisor|planeador/i;
const empty = { nombre: '', cargo: '', correo: '' };

export default function MonitoringStaffPage() {
    const [rows, setRows] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(empty);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('');

    const load = useCallback(async () => {
        try {
            const r = await api.get('/monitoring-staff');
            setRows(r.data);
        } catch (e: any) {
            toast.error(e.response?.data?.error || tr("No se pudo cargar el personal"));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const add = async () => {
        setSaving(true);
        try {
            await api.post('/monitoring-staff', form);
            toast.success(tr("Persona agregada"));
            setForm(empty);
            await load();
        } catch (e: any) {
            toast.error(e.response?.data?.error || tr("No se pudo agregar"));
        } finally {
            setSaving(false);
        }
    };

    const save = async (id: string, data: Partial<Staff>) => {
        setSaving(true);
        try {
            await api.put(`/monitoring-staff/${id}`, data);
            setEditing(null);
            await load();
        } catch (e: any) {
            toast.error(e.response?.data?.error || tr("No se pudo guardar"));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (s: Staff) => {
        if (!window.confirm(`¿Quitar a ${s.nombre} del personal de monitoreo? Dejará de aparecer al asignar ingenieros. Su cuenta de ALS no se borra.`)) return;
        try {
            await api.delete(`/monitoring-staff/${s.id}`);
            toast.success(tr("Persona quitada"));
            await load();
        } catch (e: any) {
            toast.error(e.response?.data?.error || tr("No se pudo quitar"));
        }
    };

    const visible = rows.filter(r => !filter || `${r.nombre} ${r.cargo} ${r.correo}`.toLowerCase().includes(filter.toLowerCase()));
    const sinCuenta = rows.filter(r => r.activo && !r.cuentaAls).length;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tr("Personal de monitoreo")}</h2>
                <p className="text-slate-500">
                    {tr("Solo estas personas aparecen al asignar ingenieros a una OIT. Jefe, coordinadores, supervisores y planeador ven todas las OIT.")}
                </p>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">{tr("Agregar persona")}</CardTitle>
                    <CardDescription>{tr("Para que pueda ser asignada también necesita una cuenta en ALS con ese mismo correo.")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-4">
                    <Input placeholder={tr("Nombre")} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                    <Input placeholder={tr("Cargo (ej. Ingeniero De Campo)")} value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} />
                    <Input placeholder={tr("Correo")} type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
                    <Button onClick={add} disabled={saving || !form.nombre || !form.cargo || !form.correo} className="bg-[#004CAB] hover:bg-[#003b85]">
                        <Plus className="h-4 w-4 mr-1" /> {tr("Agregar")}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base">{tr("Personal (")}{rows.filter(r => r.activo).length} {tr("activos)")}</CardTitle>
                        {sinCuenta > 0 && <CardDescription className="text-amber-700">{sinCuenta} {tr("persona(s) activa(s) sin cuenta en ALS: no pueden ser asignadas.")}</CardDescription>}
                    </div>
                    <Input placeholder={tr("Buscar")} value={filter} onChange={e => setFilter(e.target.value)} className="max-w-[220px]" />
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {loading ? <Skeleton className="h-40 w-full" /> : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b">
                                    <th className="py-2 pr-3">{tr("Nombre")}</th>
                                    <th className="py-2 pr-3">{tr("Cargo")}</th>
                                    <th className="py-2 pr-3">{tr("Correo")}</th>
                                    <th className="py-2 pr-3">{tr("Cuenta ALS")}</th>
                                    <th className="py-2 pr-3">{tr("Estado")}</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(s => (
                                    <tr key={s.id} className={`border-b last:border-0 ${s.activo ? '' : 'opacity-50'}`}>
                                        {editing === s.id ? (
                                            <>
                                                <td className="py-2 pr-3"><Input value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} className="h-8" /></td>
                                                <td className="py-2 pr-3"><Input value={editForm.cargo} onChange={e => setEditForm({ ...editForm, cargo: e.target.value })} className="h-8" /></td>
                                                <td className="py-2 pr-3"><Input value={editForm.correo} onChange={e => setEditForm({ ...editForm, correo: e.target.value })} className="h-8" /></td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="py-2 pr-3 font-medium text-slate-900">{s.nombre}</td>
                                                <td className="py-2 pr-3 text-slate-600">
                                                    {s.cargo} {SUPERVISA.test(s.cargo) && <Badge variant="secondary" className="ml-1 bg-indigo-50 text-indigo-700">{tr("ve todas las OIT")}</Badge>}
                                                </td>
                                                <td className="py-2 pr-3 text-slate-600">{s.correo}</td>
                                            </>
                                        )}
                                        <td className="py-2 pr-3">
                                            {s.cuentaAls
                                                ? <Badge variant="secondary" className={s.cuentaAls.activa ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}>{s.cuentaAls.activa ? tr("Sí") : tr("Desactivada")}</Badge>
                                                : <Badge variant="secondary" className="bg-amber-50 text-amber-700">{tr("Sin cuenta")}</Badge>}
                                        </td>
                                        <td className="py-2 pr-3">{s.activo ? tr("Activo") : tr("Inactivo")}</td>
                                        <td className="py-2 text-right whitespace-nowrap">
                                            {editing === s.id ? (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => save(s.id, editForm)} disabled={saving} title={tr("Guardar")}><Check className="h-4 w-4" /></Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)} title={tr("Cancelar")}><X className="h-4 w-4" /></Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => { setEditing(s.id); setEditForm({ nombre: s.nombre, cargo: s.cargo, correo: s.correo }); }} title={tr("Editar")}><Pencil className="h-4 w-4" /></Button>
                                                    <Button size="sm" variant="ghost" onClick={() => save(s.id, { activo: !s.activo })} title={s.activo ? 'Desactivar' : 'Activar'}>
                                                        {s.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => remove(s)} title={tr("Quitar")} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                                                </>
                                            )}
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
