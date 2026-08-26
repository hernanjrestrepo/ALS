import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { StandardForm, type StandardFormData } from '@/components/standards/StandardForm';
export default function CreateStandardPage() {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState<StandardFormData>({ title: '', description: '', type: 'OIT' });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.description) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }
        try {
            setIsCreating(true);
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('type', formData.type);
            if (selectedFile) data.append('file', selectedFile);
            await api.post('/standards', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Norma creada exitosamente');
            navigate('/standards');
        } catch (error) {
            console.error('Error creating standard:', error);
            toast.error('Error al crear norma');
        } finally {
            setIsCreating(false);
        }
    };
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Nueva Norma</h2>
                    <p className="text-slate-500">Define un nuevo criterio de revisión para OITs o Cotizaciones</p>
                </div>
            </div>
            <StandardForm
                formData={formData}
                setFormData={setFormData}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isSubmitting={isCreating}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/standards')}
                pendingLabel="Creando..."
                submitLabel="Crear Norma"
            />
        </div>
    );
}
