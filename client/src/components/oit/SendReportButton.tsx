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
import { Mail, Loader2, Send } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SendReportButtonProps {
    oitId: string;
    oitNumber: string;
    disabled?: boolean;
}

export function SendReportButton({ oitId, oitNumber, disabled }: SendReportButtonProps) {
    const [open, setOpen] = useState(false);
    const [recipients, setRecipients] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        const emails = recipients
            .split(/[,;\s]+/)
            .map(e => e.trim())
            .filter(Boolean);

        if (emails.length === 0) {
            toast.error('Escribe al menos un correo destinatario');
            return;
        }

        setIsSending(true);
        try {
            const response = await api.post(`/oits/${oitId}/send-report`, { recipients: emails });
            const { attachmentsSent, missing } = response.data;
            toast.success(`Informe enviado con ${attachmentsSent?.length || 0} anexo(s)`);
            if (missing?.length > 0) {
                toast.warning(`${missing.length} anexo(s) no se encontraron y no se incluyeron: ${missing.join(', ')}`);
            }
            setOpen(false);
            setRecipients('');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al enviar el informe');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className="text-slate-600 hover:text-[#004CAB] hover:border-[#004CAB]"
            >
                <Mail className="mr-2 h-4 w-4" />
                Enviar informe
            </Button>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-[#004CAB]" />
                        Enviar informe — OIT {oitNumber}
                    </DialogTitle>
                    <DialogDescription>
                        Se enviará el informe final y todos sus anexos generados (planillas, resultados, comunicados) como adjuntos.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    <Label htmlFor="recipients">Destinatarios</Label>
                    <Input
                        id="recipients"
                        placeholder="cliente@empresa.com, contacto2@empresa.com"
                        value={recipients}
                        onChange={(e) => setRecipients(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Separa varios correos con coma o espacio.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSend} disabled={isSending} className="bg-[#004CAB] hover:bg-[#003b85]">
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enviar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
