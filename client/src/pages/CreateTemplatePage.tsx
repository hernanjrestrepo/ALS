import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { TemplateForm, type TemplateFormData } from '@/components/sampling/TemplateForm';

export default function CreateTemplatePage() {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<TemplateFormData>({ name: '', description: '', oitType: '', steps: [] });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.description || !formData.oitType) { toast.error('Por favor completa todos los campos requeridos'); return; }
        if (formData.steps.length === 0) { toast.error('Agrega al menos un paso a la plantilla'); return; }
        try { setIsCreating(true); await api.post('/sampling-templates', formData); toast.success('Plantilla creada exitosamente'); navigate('/sampling-templates'); }
        catch (error) { console.error('Error creating template:', error); toast.error('Error al crear plantilla'); }
        finally { setIsCreating(false); }
    };
    return <div className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold tracking-tight text-slate-900">Nueva Plantilla de Muestreo</h2><p className="text-slate-500">Define un flujo de trabajo reutilizable con pasos versátiles</p></div></div><TemplateForm formData={formData} setFormData={setFormData} isSubmitting={isCreating} onSubmit={handleSubmit} onCancel={() => navigate('/sampling-templates')} pendingLabel="Creando..." submitLabel="Crear Plantilla" stepDescription="Define los pasos versátiles que se seguirán durante el muestreo" /></div>;
}
