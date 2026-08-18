import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { MessageSquareText, Sparkles, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReportChatDialogProps {
    oitId: string;
    reportName: string;
    group?: string;
    onApproved?: () => void;
}

export function ReportChatDialog({ oitId, reportName, group = 'General', onApproved }: ReportChatDialogProps) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [currentMarkdown, setCurrentMarkdown] = useState<string | null>(null);
    const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);

    const reset = () => {
        setMessage('');
        setCurrentMarkdown(null);
        setProposedMarkdown(null);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) reset();
    };

    const handleSend = async () => {
        if (!message.trim()) return;
        setIsLoading(true);
        try {
            const response = await api.post(`/oits/${oitId}/report-chat`, {
                reportName,
                group,
                message,
                currentMarkdown: proposedMarkdown || currentMarkdown || undefined,
            });
            setCurrentMarkdown(response.data.currentMarkdown);
            setProposedMarkdown(response.data.proposedMarkdown);
            setMessage('');
        } catch (error) {
            console.error('Error requesting report change:', error);
            notify.error('No se pudo generar la propuesta de cambio');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!proposedMarkdown) return;
        setIsApproving(true);
        try {
            await api.post(`/oits/${oitId}/report-chat/approve`, {
                reportName,
                group,
                approvedMarkdown: proposedMarkdown,
            });
            notify.success('Informe actualizado. Se creó una nueva versión.');
            onApproved?.();
            setOpen(false);
            reset();
        } catch (error) {
            console.error('Error approving report change:', error);
            notify.error('No se pudo aplicar el cambio aprobado');
        } finally {
            setIsApproving(false);
        }
    };

    const handleDiscard = () => {
        setProposedMarkdown(null);
    };

    return (
        <>
            <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                title="Chat con IA para pedir cambios"
                onClick={() => setOpen(true)}
            >
                <MessageSquareText className="h-4 w-4" />
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                            Pedir cambios con IA
                        </DialogTitle>
                        <DialogDescription>{reportName}</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                        {!proposedMarkdown ? (
                            <div className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-3 py-3">
                                Describe el cambio que necesitas en este informe (ej. "cambia la recomendación de
                                la conclusión para sugerir muestreo trimestral" o "agrega una nota sobre el clima
                                seco en el resumen ejecutivo"). La IA propone el informe completo revisado — nada
                                se guarda hasta que apruebes.
                            </div>
                        ) : (
                            <div className="border border-indigo-100 bg-indigo-50/40 rounded-md p-4 prose prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposedMarkdown}</ReactMarkdown>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 space-y-2 pt-2 border-t border-slate-100">
                        {proposedMarkdown && (
                            <div className="flex items-center gap-2">
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleApprove}
                                    disabled={isApproving}
                                >
                                    {isApproving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                    )}
                                    Aprobar y regenerar informe
                                </Button>
                                <Button variant="outline" className="border-slate-200" onClick={handleDiscard}>
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Descartar propuesta
                                </Button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Textarea
                                placeholder={proposedMarkdown ? 'Pide otro ajuste sobre esta propuesta...' : 'Describe el cambio que necesitas...'}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                className="min-h-[44px] resize-none border-slate-200"
                                rows={2}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={isLoading || !message.trim()}
                                className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white h-11"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
