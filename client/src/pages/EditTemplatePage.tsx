import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TemplateForm, type TemplateFormData } from '@/components/sampling/TemplateForm';

export default function EditTemplatePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<TemplateFormData>({ name: '', description: '', oitType: '', steps: [] });
    useEffect(() => {
        fetchTemplate();
    }, [id]);
    const fetchTemplate = async () => {
        try {
            const response = await api.get(`/sampling-templates/${id}`);
            const template = response.data;
            setFormData({
                name: template.name,
                description: template.description,
                oitType: template.oitType,
                steps: typeof template.steps === 'string' ? JSON.parse(template.steps) : template.steps
            });
        } catch (error) {
            console.error('Error fetching template:', error);
            toast.error('Error al cargar la plantilla');
            navigate('/sampling-templates');
        } finally {
            setIsLoading(false);
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.description || !formData.oitType) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }
        if (formData.steps.length === 0) {
            toast.error('Agrega al menos un paso a la plantilla');
            return;
        }
        try {
            setIsSaving(true);
            await api.put(`/sampling-templates/${id}`, formData);
            toast.success('Plantilla actualizada exitosamente');
            navigate('/sampling-templates');
        } catch (error) {
            console.error('Error updating template:', error);
            toast.error('Error al actualizar plantilla');
        } finally {
            setIsSaving(false);
        }
    };
    if (isLoading)
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-[300px]" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/sampling-templates')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Editar Plantilla</h2>
                            <p className="text-slate-500">Modifica el flujo de trabajo de muestreo</p>
                        </div>
                    </div>
                </div>
            </div>
            <TemplateForm
                formData={formData}
                setFormData={setFormData}
                isSubmitting={isSaving}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/sampling-templates')}
                pendingLabel="Guardando..."
                submitLabel="Guardar Cambios"
                stepDescription="Modifica los pasos del muestreo"
            />
        </div>
    );
}
