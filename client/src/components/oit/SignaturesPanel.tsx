import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PenLine, Loader2, Trash2, FileSignature, Upload } from 'lucide-react';
import { SignaturePad } from '@/components/oit/SignaturePad';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SignatureItem {
    id: string;
    signerName: string;
    signerRole: 'ALS' | 'CLIENTE';
    signatureData: string | null;
    documentUrl: string | null;
    createdAt: string;
}

const ROLE_LABELS: Record<string, string> = { ALS: 'Funcionario ALS', CLIENTE: 'Cliente' };

export function SignaturesPanel({ oitId }: { oitId: string }) {
    const [items, setItems] = useState<SignatureItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState<'draw' | 'upload'>('draw');
    const [signerName, setSignerName] = useState('');
    const [signerRole, setSignerRole] = useState<'ALS' | 'CLIENTE'>('CLIENTE');
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const load = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/oits/${oitId}/signatures`);
            setItems(res.data);
        } catch (error) {
            console.error('Error loading signatures:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, [oitId]);

    const reset = () => {
        setSignerName('');
        setSignatureData(null);
        setFile(null);
    };

    const handleSave = async () => {
        if (!signerName.trim()) {
            toast.error('Escribe el nombre de quien firma');
            return;
        }
        if (mode === 'draw' && !signatureData) {
            toast.error('Captura la firma en el recuadro');
            return;
        }
        if (mode === 'upload' && !file) {
            toast.error('Selecciona el documento firmado');
            return;
        }

        setIsSaving(true);
        try {
            if (mode === 'draw') {
                await api.post(`/oits/${oitId}/signatures`, { signerName, signerRole, signatureData });
            } else {
                const formData = new FormData();
                formData.append('signerName', signerName);
                formData.append('signerRole', signerRole);
                formData.append('file', file!);
                await api.post(`/oits/${oitId}/signatures/document`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            toast.success('Firma registrada');
            reset();
            load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al registrar la firma');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/signatures/${id}`);
            toast.success('Firma eliminada');
            load();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al eliminar');
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-[#004CAB]" />
                    Firmas de campo
                </CardTitle>
                <CardDescription>Firma del funcionario de ALS y del cliente, en pantalla o mediante documento ya firmado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Existing signatures */}
                {isLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : items.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                        {items.map(item => (
                            <div key={item.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{item.signerName}</p>
                                        <Badge variant="outline" className="text-[10px] mt-1">{ROLE_LABELS[item.signerRole]}</Badge>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {item.signatureData && (
                                    <img src={item.signatureData} alt="Firma" className="h-16 border border-slate-100 rounded bg-white" />
                                )}
                                {item.documentUrl && (
                                    <a href={item.documentUrl} target="_blank" rel="noreferrer" className="text-xs text-[#004CAB] hover:underline flex items-center gap-1">
                                        <Upload className="h-3 w-3" /> Ver documento firmado
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-2">Todavía no hay firmas registradas para esta OIT.</p>
                )}

                {/* Capture form */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant={mode === 'draw' ? 'default' : 'outline'} onClick={() => setMode('draw')} className={mode === 'draw' ? 'bg-[#004CAB] hover:bg-[#003b85]' : ''}>
                            <PenLine className="mr-1.5 h-3.5 w-3.5" /> Firmar en pantalla
                        </Button>
                        <Button type="button" size="sm" variant={mode === 'upload' ? 'default' : 'outline'} onClick={() => setMode('upload')} className={mode === 'upload' ? 'bg-[#004CAB] hover:bg-[#003b85]' : ''}>
                            <Upload className="mr-1.5 h-3.5 w-3.5" /> Subir documento firmado
                        </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nombre de quien firma</Label>
                            <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Nombre completo" />
                        </div>
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select value={signerRole} onValueChange={v => setSignerRole(v as 'ALS' | 'CLIENTE')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLIENTE">Cliente</SelectItem>
                                    <SelectItem value="ALS">Funcionario ALS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {mode === 'draw' ? (
                        <SignaturePad onChange={setSignatureData} />
                    ) : (
                        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} />
                    )}

                    <Button onClick={handleSave} disabled={isSaving} className="w-full bg-[#004CAB] hover:bg-[#003b85]">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                        Registrar firma
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
