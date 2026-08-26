import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { StandardForm, type StandardFormData } from '@/components/standards/StandardForm';
export default function EditStandardPage() {
    const { id } = useParams(); const navigate = useNavigate(); const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false); const [selectedFile, setSelectedFile] = useState<File | null>(null); const [formData, setFormData] = useState<StandardFormData>({ title: '', description: '', type: 'OIT' });
    useEffect(() => { fetchStandard(); }, [id]);
    const fetchStandard = async () => { try { const response = await api.get(`/standards/${id}`); const standard = response.data; setFormData({ title: standard.title, description: standard.description, type: standard.type }); } catch (error) { console.error('Error fetching standard:', error); toast.error('Error al cargar la norma'); navigate('/standards'); } finally { setIsLoading(false); } };
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!formData.title || !formData.description) { toast.error('Por favor completa todos los campos requeridos'); return; } try { setIsSaving(true); const data = new FormData(); data.append('title', formData.title); data.append('description', formData.description); data.append('type', formData.type); if (selectedFile) data.append('file', selectedFile); await api.put(`/standards/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Norma actualizada exitosamente'); navigate('/standards'); } catch (error) { console.error('Error updating standard:', error); toast.error('Error al actualizar norma'); } finally { setIsSaving(false); } };
    if (isLoading) return <div className="space-y-6"><Skeleton className="h-12 w-[300px]" /><Skeleton className="h-[500px] w-full" /></div>;
    return <div className="space-y-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate('/standards')}><ArrowLeft className="h-5 w-5" /></Button><div><h2 className="text-2xl font-bold tracking-tight text-slate-900">Editar Norma</h2><p className="text-slate-500">Modifica el criterio de revisión</p></div></div></div><StandardForm formData={formData} setFormData={setFormData} selectedFile={selectedFile} setSelectedFile={setSelectedFile} isSubmitting={isSaving} onSubmit={handleSubmit} onCancel={() => navigate('/standards')} pendingLabel="Guardando..." submitLabel="Guardar Cambios" showReplaceNote /></div>;
}
