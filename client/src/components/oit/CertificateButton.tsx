import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface CertificateButtonProps {
    oitId: string;
    onGenerated?: () => void;
}

const STAGES = [
    { value: 'PLANEACION_ACEPTADA', label: 'Planeación Aceptada' },
    { value: 'MUESTREO_COMPLETADO', label: 'Muestreo Completado' },
    { value: 'LABORATORIO_COMPLETADO', label: 'Análisis de Laboratorio Completado' },
    { value: 'INFORME_ENTREGADO', label: 'Informe Final Entregado' },
];

export function CertificateButton({ oitId, onGenerated }: CertificateButtonProps) {
    const [open, setOpen] = useState(false);
    const [stage, setStage] = useState('PLANEACION_ACEPTADA');
    const [responsibleName, setResponsibleName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await api.post(`/oits/${oitId}/certificate`, { stage, responsibleName: responsibleName || undefined });
            toast.success('Constancia generada — disponible en la lista de informes');
            setOpen(false);
            onGenerated?.();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al generar la constancia');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-slate-600 hover:text-[#004CAB] hover:border-[#004CAB]">
                <Award className="mr-2 h-4 w-4" />
                Generar constancia
            </Button>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-[#004CAB]" />
                        Constancia de etapa
                    </DialogTitle>
                    <DialogDescription>Genera un certificado PDF de la etapa completada.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Etapa</Label>
                        <Select value={stage} onValueChange={setStage}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Responsable (opcional)</Label>
                        <Input value={responsibleName} onChange={e => setResponsibleName(e.target.value)} placeholder="Nombre" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleGenerate} disabled={isGenerating} className="bg-[#004CAB] hover:bg-[#003b85]">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                        Generar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
