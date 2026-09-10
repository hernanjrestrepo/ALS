import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onChange: (dataUrl: string | null) => void;
}

// Captura de firma dibujada a mano en pantalla (tableta/celular/mouse), sin
// depender de ninguna libreria externa - solo canvas nativo.
export function SignaturePad({ onChange }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const point = 'touches' in e ? e.touches[0] : e;
        return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    };

    const start = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasDrawn(true);
    };

    const stop = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas && hasDrawn) {
            onChange(canvas.toDataURL('image/png'));
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHasDrawn(false);
        onChange(null);
    };

    return (
        <div className="space-y-2">
            <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={380}
                    height={160}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={start}
                    onMouseMove={draw}
                    onMouseUp={stop}
                    onMouseLeave={stop}
                    onTouchStart={start}
                    onTouchMove={draw}
                    onTouchEnd={stop}
                />
            </div>
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Firma con el dedo, lápiz óptico o mouse.</p>
                <Button type="button" size="sm" variant="ghost" onClick={clear} className="text-slate-500">
                    <Eraser className="mr-1.5 h-3.5 w-3.5" /> Limpiar
                </Button>
            </div>
        </div>
    );
}
