import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/authStore';
import { useTemplateTests } from '@/hooks/useTemplateTests';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Beaker, Download, MessageSquare, Trash2, CheckCircle2, XCircle,
  AlertTriangle, MinusCircle, FileJson, StickyNote, FileText,
  Search, Send, ChevronRight, Eye, MessageCirclePlus, Loader2,
} from 'lucide-react';
import { type TestStatus, type CommentPriority, TEMPLATE_TEST_ITEMS } from '@/types/testing';
import { formatDateTime } from '@/lib/date';

/* ------------------------------------------------------------------ */
/*  Config helpers                                                      */
/* ------------------------------------------------------------------ */
const statusConfig: Record<TestStatus, { label: string; icon: typeof CheckCircle2; cls: string; badge: string }> = {
  pending:   { label: 'Pendiente', icon: MinusCircle,     cls: 'text-slate-500',  badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  tested:    { label: 'Testeado',  icon: CheckCircle2,    cls: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed:    { label: 'Fallido',   icon: XCircle,           cls: 'text-red-600',    badge: 'bg-red-50 text-red-700 border-red-200' },
  not_applicable: { label: 'N/A', icon: AlertTriangle,     cls: 'text-amber-600',  badge: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const priorityConfig: Record<CommentPriority, { label: string; cls: string }> = {
  low:      { label: 'Baja',    cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  medium:   { label: 'Media',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  high:     { label: 'Alta',    cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Crítica', cls: 'bg-red-50 text-red-700 border-red-200' },
};

/* ------------------------------------------------------------------ */
/*  Comment Modal                                                       */
/* ------------------------------------------------------------------ */
function CommentModal({
  open,
  onClose,
  prefillTag,
  prefillText,
  position,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  prefillTag?: string;
  prefillText?: string;
  position?: { page: number; x: number; y: number };
  onSave: (text: string, field?: string, priority?: CommentPriority) => void;
}) {
  const [text, setText] = useState('');
  const [field, setField] = useState('');
  const [priority, setPriority] = useState<CommentPriority>('medium');

  useEffect(() => {
    if (open) {
      setField(prefillTag || '');
      setText(prefillText ? `Texto seleccionado: "${prefillText}"\n\n` : '');
      setPriority('medium');
    }
  }, [open, prefillTag, prefillText]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCirclePlus className="h-5 w-5 text-slate-600" />
            Agregar comentario / corrección
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Campo / placeholder"
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="h-9 text-xs font-mono bg-slate-50 border-slate-200 flex-1"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CommentPriority)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          {prefillTag && (
            <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Placeholder seleccionado</p>
              <span className="inline-block rounded bg-white border border-slate-200 px-2 py-1 text-xs font-mono text-blue-700">{'{'}{prefillTag}{'}'}</span>
            </div>
          )}
          {prefillText && !prefillTag && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
              <p className="text-[11px] text-yellow-700 uppercase tracking-wider mb-1">Texto seleccionado</p>
              <p className="text-xs text-slate-700 italic truncate">"{prefillText}"</p>
            </div>
          )}
          {position && (
            <div className="rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2">
              <p className="text-[11px] text-indigo-700 uppercase tracking-wider mb-1">Posición en el documento</p>
              <p className="text-xs text-slate-700">Página {position.page} — coords ({Math.round(position.x)}, {Math.round(position.y)})</p>
            </div>
          )}
          <Textarea
            placeholder="Describe el error o corrección..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px] text-sm bg-slate-50 border-slate-200"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button
              size="sm"
              disabled={!text.trim()}
              onClick={() => {
                onSave(text.trim(), field.trim() || undefined, priority);
                onClose();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function TemplateTestsPage() {
  const { user } = useAuthStore();
  const {
    tests, isLoaded, stats,
    updateStatus, toggleErrors, addComment, removeComment, exportTests,
  } = useTemplateTests();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestStatus | 'all'>('all');

  // Image viewer state
  const [pages, setPages] = useState<Array<{ page: number; url: string }>>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTag, setModalTag] = useState<string | undefined>(undefined);
  const [modalText, setModalText] = useState<string | undefined>(undefined);
  const [modalPos, setModalPos] = useState<{ page: number; x: number; y: number } | undefined>(undefined);

  const selectedTemplate = TEMPLATE_TEST_ITEMS.find((t) => t.templateId === selectedTemplateId);
  const test = tests.find((t) => t.templateId === selectedTemplateId);

  // Load images when template changes
  useEffect(() => {
    if (!selectedTemplate) {
      setPages([]);
      return;
    }
    setLoadingPages(true);
    setPages([]);
    api
      .get(`/files/preview-images/${encodeURIComponent(selectedTemplate.fileName)}`)
      .then((res) => {
        setPages(res.data.pages || []);
        // page reset
      })
      .catch(() => {
        setPages([]);
        toast.error('No se pudieron cargar las imágenes del preview');
      })
      .finally(() => setLoadingPages(false));
  }, [selectedTemplateId, selectedTemplate?.fileName]);

  const filtered = tests.filter((t) => {
    const matchesSearch = t.matrix.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>, pageNum: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // %
    const y = ((e.clientY - rect.top) / rect.height) * 100;  // %
    setModalTag(undefined);
    setModalText(undefined);
    setModalPos({ page: pageNum, x, y });
    setModalOpen(true);
  };

  const handleExportJson = () => {
    const data = exportTests(user?.name);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `als-template-tests-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('JSON descargado');
  };

  const handleExportMd = () => {
    const data = exportTests(user?.name);
    let md = `# Correcciones de Templates — ALS\n\n`;
    md += `**Exportado:** ${formatDateTime(new Date(data.exportedAt), 'es-CO')}\n`;
    md += `**Por:** ${data.exportedBy || 'N/A'}\n\n`;
    md += `## Resumen\n\n| Métrica | Valor |\n|---------|-------|\n`;
    md += `| Total | ${data.tests.length} |\n`;
    md += `| Testeados | ${data.tests.filter((t) => t.status === 'tested').length} |\n`;
    md += `| Fallidos | ${data.tests.filter((t) => t.status === 'failed').length} |\n`;
    md += `| Con errores | ${data.tests.filter((t) => t.hasErrors).length} |\n`;
    md += `| Comentarios | ${data.tests.reduce((a, t) => a + t.comments.length, 0)} |\n\n`;
    md += `## Detalle\n\n`;
    for (const t of data.tests) {
      if (t.comments.length === 0 && !t.hasErrors) continue;
      md += `### ${t.matrix} \`(${t.fileName})\`\n\n`;
      md += `- Estado: ${statusConfig[t.status as TestStatus]?.label || t.status}\n`;
      md += `- Errores: ${t.hasErrors ? 'Sí' : 'No'}\n`;
      t.comments.forEach((c) => {
        md += `  - **${priorityConfig[c.priority as CommentPriority]?.label || c.priority}**`;
        if (c.field) md += ` \`{${c.field}}\``;
        md += ` — ${c.text.replace(/\n/g, ' ')}\n`;
      });
      md += `\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `als-template-correcciones-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Markdown descargado');
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-6 -my-6">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">QA Templates Docxtemplater</h1>
            <p className="text-xs text-slate-500 hidden md:inline">Clickea en cualquier parte del documento para agregar un pin/comentario.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={handleExportJson}>
              <FileJson className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={handleExportMd}>
              <StickyNote className="h-3.5 w-3.5" /> MD
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-6 py-2">
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-slate-500">Total <strong className="text-slate-900">{stats.total}</strong></span>
          <span className="text-[11px] text-amber-600">Pendientes <strong>{stats.pending}</strong></span>
          <span className="text-[11px] text-emerald-600">Testeados <strong>{stats.tested}</strong></span>
          <span className="text-[11px] text-red-600">Fallidos <strong>{stats.failed}</strong></span>
          <span className="text-[11px] text-blue-600">Comentarios <strong>{stats.totalComments}</strong></span>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Template list ── */}
        <div className="w-[300px] flex flex-col border-r border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 text-xs bg-slate-50 border-slate-200"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700"
            >
              <option value="all">Todos</option>
              <option value="pending">Pend</option>
              <option value="tested">OK</option>
              <option value="failed">Fail</option>
              <option value="not_applicable">N/A</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((t) => {
              const cfg = statusConfig[t.status];
              const Icon = cfg.icon;
              const active = selectedTemplateId === t.templateId;
              return (
                <button
                  key={t.templateId}
                  onClick={() => setSelectedTemplateId(active ? null : t.templateId)}
                  className={cn(
                    'w-full text-left flex items-start gap-2.5 px-3 py-2.5 border-b border-slate-50 transition-colors hover:bg-slate-50',
                    active && 'bg-slate-50'
                  )}
                >
                  <div className={cn('mt-0.5 h-6 w-6 shrink-0 rounded flex items-center justify-center', cfg.badge)}>
                    <Icon className={cn('h-3.5 w-3.5', cfg.cls)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900 truncate">{t.matrix}</p>
                      {t.comments.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                          <MessageSquare className="h-2.5 w-2.5" />{t.comments.length}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{t.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[10px]', cfg.cls)}>{cfg.label}</span>
                      {t.hasErrors && <span className="text-[10px] text-red-500 font-medium">● Errores</span>}
                    </div>
                  </div>
                  <ChevronRight className={cn('h-3.5 w-3.5 text-slate-300 mt-1 shrink-0', active && 'text-slate-700')} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: Image viewer ── */}
        <div className="flex-1 min-w-0 bg-slate-100/50 relative overflow-y-auto">
          {selectedTemplate ? (
            <>
              {/* Toolbar */}
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-b-md bg-white/90 backdrop-blur border-b border-slate-200 px-3 py-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700">{selectedTemplate.matrix}</span>
                  <span className="text-[10px] font-mono text-slate-400">{pages.length} páginas</span>
                </div>
                <a
                  href={`/api/files/download/${encodeURIComponent(selectedTemplate.fileName)}`}
                  download
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download className="h-3 w-3" /> DOCX
                </a>
              </div>

              {loadingPages ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Generando preview...</p>
                </div>
              ) : pages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">No hay imágenes de preview para este template</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6 px-4">
                  {pages.map((pg) => (
                    <div
                      key={pg.page}
                      className="relative group rounded-lg shadow-md border border-slate-300 bg-white overflow-hidden cursor-crosshair"
                      style={{ maxWidth: '850px', width: '100%' }}
                    >
                      {/* Page label */}
                      <div className="absolute top-2 left-2 z-10 rounded bg-slate-900/70 text-white text-[10px] px-1.5 py-0.5 font-mono">
                        Pág. {pg.page}
                      </div>
                      <img
                        src={pg.url}
                        alt={`Página ${pg.page}`}
                        className="w-full h-auto block"
                        onClick={(e) => handleImageClick(e, pg.page)}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FileText className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm">Selecciona un template de la izquierda para ver el preview</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Comments panel ── */}
        <div className="w-[320px] flex flex-col border-l border-slate-200 bg-white shrink-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              Correcciones
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {test?.comments.length || 0} comentarios en este template
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {selectedTemplate && test && (
              <>
                <div className="flex items-center gap-2 pb-2">
                  <select
                    value={test.status}
                    onChange={(e) => updateStatus(selectedTemplate.templateId, e.target.value as TestStatus)}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 flex-1"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="tested">Testeado ✓</option>
                    <option value="failed">Fallido ✗</option>
                    <option value="not_applicable">N/A</option>
                  </select>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={test.hasErrors}
                      onChange={() => toggleErrors(selectedTemplate.templateId)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                    Errores
                  </label>
                </div>
                <Separator />
              </>
            )}

            {!selectedTemplate && (
              <div className="text-center text-xs text-slate-400 py-8">
                Selecciona un template para ver sus comentarios.
              </div>
            )}

            {selectedTemplate && test && test.comments.length === 0 && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500">Sin comentarios.</p>
                <p className="text-[11px] text-slate-400 mt-1">Haz clic en cualquier página del preview para agregar un comentario con posición.</p>
              </div>
            )}

            {selectedTemplate && test?.comments.map((c) => {
              const pri = priorityConfig[c.priority];
              return (
                <div key={c.id} className="group rounded-lg border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={cn('text-[10px] px-1 py-0 border', pri.cls)}>
                        {pri.label}
                      </Badge>
                      {c.field && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                          {'{'}{c.field}{'}'}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => removeComment(selectedTemplate.templateId, c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap break-words leading-relaxed">{c.text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatDateTime(new Date(c.createdAt), 'es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Resumen global</p>
              <div className="space-y-1">
                {tests.filter((t) => t.comments.length > 0 || t.hasErrors).map((t) => (
                  <button
                    key={t.templateId}
                    onClick={() => setSelectedTemplateId(t.templateId)}
                    className={cn(
                      'w-full text-left rounded-md px-2 py-1.5 text-[11px] transition-colors',
                      selectedTemplateId === t.templateId ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span className="font-medium">{t.matrix}</span>
                    {t.comments.length > 0 && <span className="ml-1 text-slate-400">({t.comments.length})</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CommentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        prefillTag={modalTag}
        prefillText={modalText}
        position={modalPos}
        onSave={(text, field, priority) => {
          if (selectedTemplateId) {
            addComment(selectedTemplateId, text, field, priority);
            toast.success('Comentario guardado');
          }
        }}
      />
    </div>
  );
}
