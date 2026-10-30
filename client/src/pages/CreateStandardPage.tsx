import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, FileText } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

import { tr } from '@/i18n';
import { InputWithTools } from '@/components/ui/input-tools';
export default function CreateStandardPage() {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'OIT'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.description) {
            toast.error(tr("Por favor completa todos los campos requeridos"));
            return;
        }

        try {
            setIsCreating(true);
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('type', formData.type);
            if (selectedFile) {
                data.append('file', selectedFile);
            }

            await api.post('/standards', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(tr("Norma creada exitosamente"));
            navigate('/standards');
        } catch (error) {
            console.error('Error creating standard:', error);
            toast.error(tr("Error al crear norma"));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tr("Nueva Norma")}</h2>
                    <p className="text-slate-500">{tr("Define un nuevo criterio de revisión para OITs o Cotizaciones")}</p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">{tr("Información de la Norma")}</h3>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">{tr("Título *")}</Label>
                                    <InputWithTools
                                        id="title"
                                        placeholder={tr("Ej: Verificación de Muestras de Agua")}
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="type">{tr("Tipo de Documento *")}</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={tr("Selecciona el tipo")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OIT">{tr("OIT")}</SelectItem>
                                            <SelectItem value="QUOTATION">{tr("Cotización")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">{tr("Descripción / Criterios *")}</Label>
                                    <Textarea
                                        id="description"
                                        placeholder={tr("Describe los criterios que debe cumplir el documento...")}
                                        className="h-40 resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                    <p className="text-xs text-slate-500">
                                        {tr("Especifica los requisitos, condiciones y criterios que deben cumplirse según esta norma.")}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardHeader className="border-b border-slate-100">
                                <h3 className="font-semibold text-slate-900">{tr("Documento de Referencia")}</h3>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="file">{tr("Archivo PDF (Opcional)")}</Label>
                                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 transition-colors">
                                            <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                            <Input
                                                id="file"
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                className="cursor-pointer"
                                            />
                                            {selectedFile && (
                                                <p className="text-sm text-slate-600 mt-2">
                                                    {selectedFile.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <Button
                                        type="submit"
                                        disabled={isCreating}
                                        className="w-full bg-[#004CAB] hover:bg-[#003b85] text-white"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isCreating ? tr("Creando...") : tr("Crear Norma")}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate('/standards')}
                                        className="w-full"
                                    >
                                        {tr("Cancelar")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
