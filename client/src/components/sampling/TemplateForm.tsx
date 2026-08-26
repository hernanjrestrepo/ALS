import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Trash2, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TemplateStep } from '@/types/sampling';
import { StepTypeBuilder } from '@/components/sampling/StepTypeBuilder';
import { getStepIcon } from '@/lib/stepIcons';
import { toast } from 'sonner';

export interface TemplateFormData {
    name: string;
    description: string;
    oitType: string;
    steps: TemplateStep[];
}

interface TemplateFormProps {
    formData: TemplateFormData;
    setFormData: Dispatch<SetStateAction<TemplateFormData>>;
    isSubmitting: boolean;
    onSubmit: (event: FormEvent) => void;
    onCancel: () => void;
    pendingLabel: string;
    submitLabel: string;
    stepDescription: string;
}

export function TemplateForm({ formData, setFormData, isSubmitting, onSubmit, onCancel, pendingLabel, submitLabel, stepDescription }: TemplateFormProps) {
    const handleAddStep = (step: TemplateStep) => {
        const stepWithOrder = { ...step, order: formData.steps.length };
        setFormData({ ...formData, steps: [...formData.steps, stepWithOrder] });
        toast.success('Paso agregado');
    };

    const handleRemoveStep = (stepId: string) => {
        setFormData({ ...formData, steps: formData.steps.filter(s => s.id !== stepId) });
    };

    return (
        <form onSubmit={onSubmit}>
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white">
                    <CardHeader className="border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900">Información de la Plantilla</h3>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre de la Plantilla *</Label>
                                <Input id="name" placeholder="Ej: Muestreo de Agua Potable" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="oitType">Tipo de OIT *</Label>
                                <Input id="oitType" placeholder="Ej: AGUA, SUELO, AIRE" value={formData.oitType} onChange={(e) => setFormData({ ...formData, oitType: e.target.value.toUpperCase() })} required />
                                <p className="text-xs text-slate-500">La IA usará este tipo para seleccionar automáticamente la plantilla apropiada.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descripción *</Label>
                                <Textarea id="description" placeholder="Describe cuándo usar esta plantilla..." className="h-24 resize-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
                            </div>
                        </div>
                        <div className="border-t pt-6">
                            <div className="mb-4">
                                <h4 className="font-semibold text-slate-900">Pasos del Flujo de Trabajo</h4>
                                <p className="text-sm text-slate-500">{stepDescription}</p>
                            </div>
                            {formData.steps.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {formData.steps.map((step, index) => (
                                        <div key={step.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-3 flex-1">
                                                <GripVertical className="h-4 w-4 text-slate-400" />
                                                <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">{index + 1}</div>
                                                {getStepIcon(step.type)}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">{step.type}</Badge>
                                                        <p className="font-medium text-slate-900">{step.title}</p>
                                                    </div>
                                                    {step.description && <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>}
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveStep(step.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <StepTypeBuilder onAddStep={handleAddStep} />
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="border-b border-slate-100"><h3 className="font-semibold text-slate-900">Resumen</h3></CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Nombre:</span><span className="font-medium text-slate-900">{formData.name || '-'}</span></div>
                                <div className="flex items-center justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Tipo:</span><span className="font-medium text-slate-900">{formData.oitType || '-'}</span></div>
                                <div className="flex items-center justify-between py-2"><span className="text-slate-500">Pasos:</span><span className="font-medium text-slate-900">{formData.steps.length}</span></div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white"><Save className="mr-2 h-4 w-4" />{isSubmitting ? pendingLabel : submitLabel}</Button>
                                <Button type="button" variant="outline" onClick={onCancel} className="w-full">Cancelar</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </form>
    );
}
