import { useEffect, useRef, useState } from 'react';
import { Paperclip, Mic, Square, Loader2, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// Clip y microfono del chat (reunion del 27-oct: "no veo en el cuadro de dialogo el clip
// para colocar attachments y un microfono para que la persona no tenga que digitar").
// - Clip: cualquier archivo (PDF, Word, Excel, foto, texto). El servidor lo lee (con OCR si
//   es escaneado o foto) y el texto viaja con la pregunta.
// - Microfono: dictado del navegador (Web Speech) en espanol; el texto cae en la caja.

export interface ChatAttachment { name: string; text: string; ok: boolean; note?: string }

export function useChatAttachments() {
    const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
    const [reading, setReading] = useState(false);

    const addFiles = async (files: FileList | File[] | null) => {
        const list = Array.from(files || []);
        if (!list.length) return;
        setReading(true);
        try {
            const form = new FormData();
            list.slice(0, 6).forEach(f => form.append('files', f));
            const { data } = await api.post('/ai/attach', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 });
            const got: ChatAttachment[] = data?.attachments || [];
            setAttachments(prev => [...prev, ...got]);
            const bad = got.filter(a => !a.ok);
            if (bad.length) toast.warning(`No se pudo leer: ${bad.map(b => b.name).join(', ')}. ${bad[0].note || ''}`);
        } catch {
            toast.error('No se pudo leer el archivo. Intenta de nuevo.');
        } finally {
            setReading(false);
        }
    };

    return { attachments, reading, addFiles, remove: (i: number) => setAttachments(a => a.filter((_, j) => j !== i)), clear: () => setAttachments([]) };
}

// Solo los archivos leidos viajan con la pregunta.
export const readable = (list: ChatAttachment[]) => list.filter(a => a.ok).map(a => ({ name: a.name, text: a.text }));

export function ChatInputTools({ onFiles, onDictate, disabled, reading }: {
    onFiles: (f: FileList | null) => void; onDictate: (text: string) => void; disabled?: boolean; reading?: boolean;
}) {
    const [listening, setListening] = useState(false);
    const recRef = useRef<any>(null);
    const Speech = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

    useEffect(() => () => { try { recRef.current?.stop(); } catch { /* ya detenido */ } }, []);

    const toggleMic = () => {
        if (!Speech) { toast.error('Este navegador no permite dictar. Usa Chrome o Edge.'); return; }
        if (listening) { recRef.current?.stop(); return; }
        const rec = new Speech();
        rec.lang = 'es-CO';
        rec.interimResults = false;
        rec.continuous = true;
        rec.onresult = (e: any) => {
            const text = Array.from(e.results as ArrayLike<any>).slice(e.resultIndex).map((r: any) => r[0]?.transcript || '').join(' ').trim();
            if (text) onDictate(text);
        };
        rec.onerror = (e: any) => {
            setListening(false);
            if (e?.error === 'not-allowed') toast.error('Permite el micrófono en el navegador para dictar.');
        };
        rec.onend = () => setListening(false);
        recRef.current = rec;
        try { rec.start(); setListening(true); } catch { setListening(false); }
    };

    const base = 'h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100';
    return (
        <>
            <label className={`${base} cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`} title="Adjuntar archivos (PDF, Word, Excel, fotos...)">
                {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,image/*"
                    onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={toggleMic} disabled={disabled}
                className={`${base} ${listening ? 'bg-red-100 text-red-600 animate-pulse' : ''}`} title={listening ? 'Detener dictado' : 'Dictar con el micrófono'}>
                {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
        </>
    );
}

export function AttachmentChips({ items, onRemove }: { items: ChatAttachment[]; onRemove: (i: number) => void }) {
    if (!items.length) return null;
    return (
        <div className="flex flex-wrap gap-1.5 px-1 pb-1.5">
            {items.map((a, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border ${a.ok ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <FileText className="h-3 w-3" />
                    <span className="max-w-[140px] truncate">{a.name}</span>
                    <button type="button" onClick={() => onRemove(i)} title="Quitar"><X className="h-3 w-3" /></button>
                </span>
            ))}
        </div>
    );
}
