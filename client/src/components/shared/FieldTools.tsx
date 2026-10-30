import { useEffect, useRef, useState } from 'react';
import { Paperclip, Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { tr, locale } from '@/i18n';

// Microfono y clip para TODOS los cuadros de escritura (Hernan, 2026-10-30: "cualquier cuadro de
// escritura o de dialogo debe tener siempre el microfono y un clip para colocar attachments").
// - Microfono: dictado del navegador en el idioma elegido; el texto cae en el cuadro.
// - Clip: cualquier archivo (PDF, Word, Excel, foto, texto). El servidor lo lee (con OCR si es
//   escaneado o foto) y su texto se agrega al cuadro, marcado con el nombre del archivo.

/** Cambia el valor de un cuadro controlado por React y avisa a React (si no, el cambio se pierde al escribir). */
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Texto nuevo a continuacion del que ya hay (con un espacio o salto de linea de por medio). */
export function appendText(current: string, text: string, newline = false): string {
    const base = String(current || '').replace(/\s+$/, '');
    return base ? `${base}${newline ? '\n' : ' '}${text}` : text;
}

export function FieldTools({ onText, disabled, className = '' }: { onText: (text: string, kind: 'voz' | 'archivo') => void; disabled?: boolean; className?: string }) {
    const [listening, setListening] = useState(false);
    const [reading, setReading] = useState(false);
    const recRef = useRef<any>(null);
    const Speech = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

    useEffect(() => () => { try { recRef.current?.stop(); } catch { /* ya detenido */ } }, []);

    const toggleMic = () => {
        if (!Speech) { toast.error(tr("Este navegador no permite dictar. Usa Chrome o Edge.")); return; }
        if (listening) { recRef.current?.stop(); return; }
        const rec = new Speech();
        rec.lang = locale();
        rec.interimResults = false;
        rec.continuous = true;
        rec.onresult = (e: any) => {
            const text = Array.from(e.results as ArrayLike<any>).slice(e.resultIndex).map((r: any) => r[0]?.transcript || '').join(' ').trim();
            if (text) onText(text, 'voz');
        };
        rec.onerror = (e: any) => {
            setListening(false);
            if (e?.error === 'not-allowed') toast.error(tr("Permite el micrófono en el navegador para dictar."));
        };
        rec.onend = () => setListening(false);
        recRef.current = rec;
        try { rec.start(); setListening(true); } catch { setListening(false); }
    };

    const addFiles = async (files: FileList | null) => {
        const list = Array.from(files || []).slice(0, 4);
        if (!list.length) return;
        setReading(true);
        try {
            const form = new FormData();
            list.forEach(f => form.append('files', f));
            const { data } = await api.post('/ai/attach', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 });
            const got: Array<{ name: string; text: string; ok: boolean; note?: string }> = data?.attachments || [];
            got.filter(a => a.ok && a.text.trim()).forEach(a => onText(`[${tr("Adjunto")}: ${a.name}]\n${a.text.trim().slice(0, 4000)}`, 'archivo'));
            const bad = got.filter(a => !a.ok);
            if (bad.length) toast.warning(`${tr("No se pudo leer")}: ${bad.map(b => b.name).join(', ')}. ${bad[0].note || ''}`);
        } catch {
            toast.error(tr("No se pudo leer el archivo. Intenta de nuevo."));
        } finally {
            setReading(false);
        }
    };

    const base = 'h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100';
    return (
        <span className={`inline-flex items-center gap-0.5 ${className}`}>
            <label className={`${base} cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`} title={tr("Adjuntar archivos (PDF, Word, Excel, fotos...)")}>
                {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,image/*"
                    onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={toggleMic} disabled={disabled}
                className={`${base} ${listening ? 'bg-red-100 text-red-600 animate-pulse' : ''}`}
                title={listening ? tr("Detener dictado") : tr("Dictar con el micrófono")}>
                {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
        </span>
    );
}
