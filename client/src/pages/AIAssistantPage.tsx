import { ChatInputTools, AttachmentChips, useChatAttachments, readable } from '@/components/shared/ChatInputTools';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Loader2, User, Database, FileText, Beaker, AlertTriangle } from 'lucide-react';
import { MarthaAvatar } from '@/components/shared/MarthaAvatar';
import api from '@/lib/api';
import { AssistantMessage } from '@/components/shared/AssistantMessage';

import { tr } from '@/i18n';
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface SystemContext {
    oitsCount: number;
    resourcesCount: number;
    standardsCount: number;
    pendingOits: number;
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const files = useChatAttachments();
    const [context, setContext] = useState<SystemContext | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load system context on mount
    useEffect(() => {
        loadSystemContext();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSystemContext = async () => {
        try {
            const [oitsRes, resourcesRes, standardsRes] = await Promise.all([
                api.get('/oits'),
                api.get('/resources'),
                api.get('/standards')
            ]);

            const oits = oitsRes.data;
            setContext({
                oitsCount: oits.length,
                resourcesCount: resourcesRes.data.length,
                standardsCount: standardsRes.data.length,
                pendingOits: oits.filter((o: any) => ['PENDING', 'ANALYZING', 'REVIEW_REQUIRED', 'REVIEW_NEEDED'].includes(o.status)).length
            });
        } catch (error) {
            console.error('Error loading context:', error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };
        const sent = readable(files.attachments);
        if (sent.length) userMessage.content = `${input}\n\n📎 ${sent.map(a => a.name).join(', ')}`;

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        files.clear();
        setIsLoading(true);

        try {
            const response = await api.post('/ai/chat', {
                message: input,
                attachments: sent,
                history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
            });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.response || 'No pude generar una respuesta. Intenta de nuevo.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error(tr("Error al enviar mensaje"));

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="p-3 h-[calc(100vh-120px)] flex flex-col overflow-hidden">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MarthaAvatar size={36} />
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Martha <span className="text-sm font-normal text-slate-500">· {tr("Asistente IA")}</span></h1>
                    </div>
                </div>

                {/* Compact Context Badges */}
                {context && (
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                            <Database className="h-3 w-3 mr-1" />
                            {context.oitsCount}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5">
                            <Beaker className="h-3 w-3 mr-1" />
                            {context.resourcesCount}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-0.5">
                            <FileText className="h-3 w-3 mr-1" />
                            {context.standardsCount}
                        </Badge>
                        {context.pendingOits > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0.5">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {context.pendingOits}
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* Chat Container */}
            <Card className="flex-1 flex flex-col border-slate-200 shadow-sm overflow-hidden min-h-0">
                {/* Messages Area */}
                <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <MarthaAvatar size={112} className="mb-4 shadow-lg" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">{tr("¡Hola! Soy Martha, tu asistente de ALS")}</h3>
                            <p className="text-sm text-slate-500 max-w-md mb-6">
                                {tr("Tengo acceso completo a la información del sistema. Puedo ayudarte con:")}
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                <button
                                    onClick={() => setInput('¿Cuántas OITs hay pendientes?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">{tr("Estado de OITs")}</p>
                                    <p className="text-xs text-slate-500">{tr("Consultar pendientes, progreso")}</p>
                                </button>
                                <button
                                    onClick={() => setInput('¿Qué equipos tenemos para monitoreo de ruido?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">{tr("Consultar recursos")}</p>
                                    <p className="text-xs text-slate-500">{tr("Equipos, disponibilidad")}</p>
                                </button>
                                <button
                                    onClick={() => setInput('¿Cuáles son los límites de ruido según la norma?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">{tr("Normativas")}</p>
                                    <p className="text-xs text-slate-500">{tr("Límites, requerimientos")}</p>
                                </button>
                                <button
                                    onClick={() => setInput('¿Cómo va el muestreo de la OIT más reciente?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">{tr("Seguimiento")}</p>
                                    <p className="text-xs text-slate-500">{tr("Progreso de muestreos")}</p>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <MarthaAvatar size={32} />
                                    )}
                                    <div
                                        className={`${message.role === 'user' ? 'max-w-[70%]' : 'max-w-[85%] min-w-0'} rounded-2xl px-4 py-3 ${message.role === 'user'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-900'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <AssistantMessage content={message.content} />
                                        ) : (
                                            <p className="text-sm">{message.content}</p>
                                        )}
                                    </div>
                                    {message.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                            <User className="h-4 w-4 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <MarthaAvatar size={32} />
                                    <div className="bg-slate-100 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                            <span className="text-sm text-slate-500">{tr("Pensando...")}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </CardContent>

                {/* Input Area */}
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <AttachmentChips items={files.attachments} onRemove={files.remove} />
                    <div className="flex items-center gap-2">
                        <ChatInputTools onFiles={files.addFiles} onDictate={t => setInput(prev => (prev ? prev + ' ' : '') + t)} disabled={isLoading} reading={files.reading} />
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={tr("Escribe tu pregunta...")}
                            className="flex-1 bg-white border-slate-200 focus:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
