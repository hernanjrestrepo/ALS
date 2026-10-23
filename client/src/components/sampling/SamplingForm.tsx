import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import api from '@/lib/api';
import { savePhoto, deletePhoto, listPhotos, clearPhotos, type StoredPhoto } from '@/lib/samplingPhotos';
import {
    MapPin, LogIn, LogOut, Camera, X, Loader2, CheckCircle2, AlertTriangle, Lock, Pencil, CloudOff, Send, ArrowLeft,
} from 'lucide-react';

// Formulario de muestreo (rediseno pedido por Hernan, 2026-10-23: "pesimo ese
// formulario, dificil de diligenciar"). Antes: un paso a la vez, bloqueados en orden,
// "Guardar y Validar" en cada campo y volver a escribir lo que ya trae la OIT.
// Ahora:
//  - Datos de la OIT arriba, fijos (cliente, OT, servicio, sitio, fecha programada).
//    Solo el responsable se puede cambiar, explicando el motivo.
//  - "Llegué al sitio" / "Salgo del sitio" por jornada: GPS + fecha y hora real. Un
//    muestreo de varios dias tiene varias jornadas. Fecha de fin = al terminar.
//  - Alertas (sin GPS, lejos del sitio, fuera de hora) no bloquean: se reportan.
//  - Las secciones de la plantilla, todas a la vista, en cualquier orden, con fotos
//    opcionales; se guarda solo en el telefono y funciona sin senal.
//  - La IA revisa todo una sola vez al enviar (en el servidor).
// El envio conserva la forma de OIT.samplingData.steps que leen el informe y la IA.

export interface SamplingFormStep { step: any; index: number }

interface GpsFix { lat: number; lng: number; accuracy: number }
interface FieldWarning { code: string; message: string; at: string }
interface VisitPoint { at: string; gps: GpsFix | null }
interface Visit { arrival: VisitPoint; departure?: VisitPoint; warnings: FieldWarning[] }

interface Draft {
    values: Record<number, any>;
    comments: Record<number, string>;
    responsable?: { value: string; reason: string };
    pendingSubmit?: boolean;
    endAt?: string;
}

interface Props {
    oit: any;
    service: { id: string; name: string; templateIds?: string[] };
    schedule: { date?: string; time?: string; engineerIds?: string[] };
    steps: SamplingFormStep[];
    engineers: Array<{ id: string; name: string }>;
    canEdit: boolean;
    onChangeService: () => void;
    onSubmitted: () => void;
}

const fold = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

type HeaderKind = 'cliente' | 'ot' | 'responsable' | 'inicio' | 'fin' | 'coordenadas';
function headerKind(step: any): HeaderKind | null {
    const t = fold(step?.title);
    if (t === 'cliente') return 'cliente';
    if (/^numero (de )?(ot|oit)$/.test(t)) return 'ot';
    if (t === 'responsable en campo') return 'responsable';
    if (t === 'fecha de inicio') return 'inicio';
    if (t === 'fecha de fin') return 'fin';
    if (/^coordenadas/.test(t)) return 'coordenadas';
    return null;
}

const fmt = (iso?: string) => iso
    ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
const fmtGps = (g: GpsFix | null) => g ? `${g.lat.toFixed(6)}, ${g.lng.toFixed(6)} (±${Math.round(g.accuracy)} m)` : 'sin GPS';

function getGps(): Promise<GpsFix | null> {
    return new Promise(resolve => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
    });
}

// Coordenadas del sitio solo si la OIT las trae como "lat, lng" (casi siempre es una
// direccion en texto, y entonces no hay contra que comparar).
function siteCoords(location?: string): { lat: number; lng: number } | null {
    const parts = String(location || '').split(',').map(s => parseFloat(s.trim()));
    return parts.length === 2 && parts.every(n => !isNaN(n)) ? { lat: parts[0], lng: parts[1] } : null;
}

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Hora programada como instante (la Agenda guarda fecha y hora de Colombia, UTC-5).
const scheduledInstant = (date?: string, time?: string) => date ? new Date(`${date}T${time || '09:00'}:00-05:00`) : null;

function arrivalWarnings(gps: GpsFix | null, at: Date, oit: any, schedule: Props['schedule'], isFirst: boolean): FieldWarning[] {
    const out: FieldWarning[] = [];
    const now = at.toISOString();
    if (!gps) {
        out.push({ code: 'SIN_GPS', message: 'Llegada registrada sin ubicación GPS (permiso denegado o sin señal de GPS).', at: now });
    } else {
        if (gps.accuracy > 100) out.push({ code: 'GPS_IMPRECISO', message: `GPS impreciso al llegar (±${Math.round(gps.accuracy)} m).`, at: now });
        const site = siteCoords(oit?.location);
        if (site) {
            const d = distanceM(gps, site);
            if (d > 200) out.push({ code: 'LEJOS_DEL_SITIO', message: `Llegada a ${d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`} del sitio de la OIT.`, at: now });
        }
    }
    const planned = scheduledInstant(schedule.date, schedule.time);
    if (isFirst && planned) {
        const diffMin = Math.round((at.getTime() - planned.getTime()) / 60000);
        if (Math.abs(diffMin) > 60) {
            const h = Math.floor(Math.abs(diffMin) / 60), m = Math.abs(diffMin) % 60;
            out.push({ code: 'FUERA_DE_HORA', message: `Llegada ${h ? `${h} h ` : ''}${m} min ${diffMin > 0 ? 'después' : 'antes'} de la hora programada (${fmt(planned.toISOString())}).`, at: now });
        }
    }
    return out;
}

function readJson<T>(key: string, fallback: T): T {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function writeJson(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin espacio: se mantiene en memoria */ }
}

const hasValue = (v: unknown) => v !== undefined && v !== null && v !== '' && v !== false;

export function SamplingForm({ oit, service, schedule, steps, engineers, canEdit, onChangeService, onSubmitted }: Props) {
    const draftKey = `sampling_form_${oit.id}_${service.id}`;
    const visitsKey = `sampling_visits_${oit.id}`;
    const photoGroup = `${oit.id}:${service.id}`;

    const submitted = useMemo(() => {
        try { return JSON.parse(oit.samplingData || '{}')?.services?.[service.id] || null; } catch { return null; }
    }, [oit.samplingData, service.id]);

    const plannedEngineers = useMemo(() => {
        const names = (schedule.engineerIds || []).map(id => engineers.find(e => e?.id === id)?.name).filter(Boolean) as string[];
        return [...new Set(names)].join(', ');
    }, [schedule.engineerIds, engineers]);

    // Borrador: lo guardado en el telefono; si no hay, lo ya enviado (para corregir y reenviar).
    const [draft, setDraft] = useState<Draft>(() => {
        const local = readJson<Draft | null>(draftKey, null);
        if (local) return local;
        const values: Record<number, any> = {}, comments: Record<number, string> = {};
        for (const s of submitted?.steps || []) {
            if (typeof s.stepIndex !== 'number' || s.synthetic) continue;
            if (hasValue(s.value)) values[s.stepIndex] = s.value;
            if (s.comment) comments[s.stepIndex] = s.comment;
        }
        return { values, comments };
    });
    const [visits, setVisits] = useState<Visit[]>(() => readJson<Visit[]>(visitsKey, []));
    const [photos, setPhotos] = useState<StoredPhoto[]>([]);
    const [busy, setBusy] = useState<'' | 'arrival' | 'departure' | 'submit'>('');
    const [editingResponsable, setEditingResponsable] = useState(false);
    const [missing, setMissing] = useState<number[]>([]);
    const [online, setOnline] = useState(navigator.onLine);

    useEffect(() => { writeJson(draftKey, draft); }, [draftKey, draft]);
    useEffect(() => { writeJson(visitsKey, visits); }, [visitsKey, visits]);
    useEffect(() => { listPhotos(photoGroup).then(setPhotos).catch(() => setPhotos([])); }, [photoGroup]);

    const responsable = draft.responsable?.value ?? plannedEngineers;
    const responsableChanged = !!draft.responsable && draft.responsable.value.trim() !== plannedEngineers.trim();

    const headerSteps = steps.filter(s => headerKind(s.step));
    const sections = steps.filter(s => !headerKind(s.step));
    const openVisit = visits.length && !visits[visits.length - 1].departure ? visits[visits.length - 1] : null;
    const firstArrival = visits[0]?.arrival;
    const allWarnings = visits.flatMap(v => v.warnings);
    const planned = scheduledInstant(schedule.date, schedule.time);

    const setValue = (index: number, value: any) => setDraft(d => ({ ...d, values: { ...d.values, [index]: value } }));
    const setComment = (index: number, value: string) => setDraft(d => ({ ...d, comments: { ...d.comments, [index]: value } }));

    // ------------------------------------------------------------ jornadas
    const registerArrival = async () => {
        setBusy('arrival');
        const gps = await getGps();
        const at = new Date();
        const warnings = arrivalWarnings(gps, at, oit, schedule, visits.length === 0);
        setVisits(v => [...v, { arrival: { at: at.toISOString(), gps }, warnings }]);
        setBusy('');
        if (warnings.length) toast.warning(`Llegada registrada con ${warnings.length} alerta(s). Se reportan; puedes seguir.`);
        else toast.success('Llegada registrada');
    };

    const departurePoint = async (): Promise<{ point: VisitPoint; warning?: FieldWarning }> => {
        const gps = await getGps();
        const at = new Date().toISOString();
        return { point: { at, gps }, warning: gps ? undefined : { code: 'SIN_GPS_SALIDA', message: 'Salida registrada sin ubicación GPS.', at } };
    };

    const registerDeparture = async () => {
        if (!openVisit) return;
        setBusy('departure');
        const { point, warning } = await departurePoint();
        setVisits(v => v.map((visit, i) => i === v.length - 1 ? { ...visit, departure: point, warnings: warning ? [...visit.warnings, warning] : visit.warnings } : visit));
        setBusy('');
        toast.success('Salida registrada. Al volver otro día, marca de nuevo "Llegué al sitio".');
    };

    // ------------------------------------------------------------ fotos
    const addPhotos = async (index: number, files: FileList | null) => {
        if (!files?.length) return;
        const added: StoredPhoto[] = [];
        for (const f of Array.from(files)) {
            const p: StoredPhoto = { id: `${photoGroup}:${index}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, group: photoGroup, stepIndex: index, name: f.name, type: f.type, blob: f, takenAt: new Date().toISOString() };
            try { await savePhoto(p); added.push(p); } catch { toast.error('No se pudo guardar la foto en el teléfono'); }
        }
        setPhotos(ps => [...ps, ...added]);
    };
    const removePhoto = async (id: string) => {
        await deletePhoto(id).catch(() => undefined);
        setPhotos(ps => ps.filter(p => p.id !== id));
    };

    // ------------------------------------------------------------ envio
    const sectionFilled = (s: SamplingFormStep) => hasValue(draft.values[s.index]) || photos.some(p => p.stepIndex === s.index);

    const buildSteps = (endAt: string, files: Record<number, string[]>, closedVisits: Visit[]) => {
        const arrival = closedVisits[0]?.arrival;
        const plannedText = schedule.date ? `${schedule.date} ${schedule.time || '09:00'}` : '';
        const headerValue = (kind: HeaderKind): any => ({
            cliente: oit.clientName || '',
            ot: String(oit.oitNumber || ''),
            responsable,
            inicio: plannedText,
            fin: fmt(endAt),
            coordenadas: arrival?.gps ? `${arrival.gps.lat.toFixed(6)}, ${arrival.gps.lng.toFixed(6)}` : 'Sin GPS',
        })[kind];
        const list: any[] = steps.map(({ step, index }) => {
            const kind = headerKind(step);
            const base = { description: step.description || step.title, title: step.title, stepId: step.id, stepType: step.type, stepIndex: index, timestamp: endAt };
            if (kind) {
                const fromOit = kind === 'responsable'
                    ? { source: 'la Agenda', originalValue: plannedEngineers, changed: responsableChanged, reason: responsableChanged ? draft.responsable?.reason : undefined }
                    : { source: kind === 'fin' || kind === 'coordenadas' ? 'el registro en sitio' : kind === 'inicio' ? 'la Agenda' : 'la OIT', locked: true };
                return {
                    ...base,
                    value: headerValue(kind),
                    comment: kind === 'responsable' && responsableChanged ? `Cambio respecto a la Agenda (decía «${plannedEngineers}»): ${draft.responsable?.reason}` : '',
                    fromOit,
                };
            }
            return { ...base, value: draft.values[index] ?? '', comment: draft.comments[index] || '', files: files[index] || [] };
        });
        const warnings = closedVisits.flatMap(v => v.warnings);
        list.push(
            { description: 'Fecha y hora real (llegada al sitio)', value: arrival ? `${fmt(arrival.at)} — GPS ${fmtGps(arrival.gps)}` : 'Sin registro', synthetic: true },
            { description: 'Jornadas en sitio', value: closedVisits.map((v, i) => `${i + 1}) ${fmt(v.arrival.at)} → ${fmt(v.departure?.at)}`).join('; ') || 'Sin registro', synthetic: true },
            { description: 'Alertas de campo', value: warnings.length ? warnings.map(w => w.message).join(' · ') : 'Sin alertas', synthetic: true },
        );
        return { list, warnings };
    };

    const submit = async (endAtOverride?: string) => {
        setBusy('submit');
        try {
            // Cierra la jornada abierta con la salida de este momento.
            let closed = visits;
            if (openVisit) {
                const { point, warning } = await departurePoint();
                closed = visits.map((v, i) => i === visits.length - 1 ? { ...v, departure: point, warnings: warning ? [...v.warnings, warning] : v.warnings } : v);
                setVisits(closed);
            }
            const endAt = endAtOverride || draft.endAt || new Date().toISOString();
            if (!navigator.onLine) {
                setDraft(d => ({ ...d, pendingSubmit: true, endAt }));
                toast.warning('Sin señal: el muestreo quedó guardado en el teléfono y se envía solo al recuperar conexión.');
                return;
            }
            const files: Record<number, string[]> = {};
            for (const p of photos) {
                const form = new FormData();
                form.append('file', new File([p.blob], p.name || 'foto.jpg', { type: p.type || 'image/jpeg' }));
                const res = await api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (res.data?.filename) (files[p.stepIndex] ||= []).push(res.data.filename);
            }
            const { list, warnings } = buildSteps(endAt, files, closed);
            const res = await api.post(`/oits/${oit.id}/submit-sampling`, {
                serviceKey: service.id,
                serviceName: service.name,
                templateIds: service.templateIds || [],
                steps: list,
                visits: closed,
                warnings,
                realStartAt: closed[0]?.arrival.at,
                endAt,
                completedAt: endAt,
                location: oit.location,
            });
            localStorage.removeItem(draftKey);
            await clearPhotos(photoGroup).catch(() => undefined);
            if (!res.data?.pendingServices?.length) localStorage.removeItem(visitsKey);
            setDraft({ values: {}, comments: {} });
            setPhotos([]);
            toast.success(res.data?.message || 'Muestreo enviado');
            onSubmitted();
        } catch (error: any) {
            console.error('Error enviando el muestreo', error);
            setDraft(d => ({ ...d, pendingSubmit: true, endAt: d.endAt || endAtOverride || new Date().toISOString() }));
            toast.error(error?.response?.data?.error || 'No se pudo enviar. Quedó guardado en el teléfono; se reintenta al tener conexión.');
        } finally {
            setBusy('');
        }
    };

    const finish = () => {
        if (!visits.length) {
            toast.error('Primero marca "Llegué al sitio".');
            return;
        }
        const required = sections.filter(s => s.step.required && !sectionFilled(s)).map(s => s.index);
        setMissing(required);
        if (required.length) {
            toast.error(`Faltan ${required.length} dato(s) obligatorio(s), marcados en rojo.`);
            document.getElementById(`seccion-${required[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (responsableChanged && (draft.responsable?.reason || '').trim().length < 3) {
            toast.error('Cambiaste el responsable: escribe el motivo.');
            setEditingResponsable(true);
            return;
        }
        submit();
    };

    // Reintento automatico de un envio pendiente al recuperar la senal.
    const submitRef = useRef(submit);
    submitRef.current = submit;
    useEffect(() => {
        const up = () => { setOnline(true); if (readJson<Draft | null>(draftKey, null)?.pendingSubmit) submitRef.current(); };
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        if (navigator.onLine && draft.pendingSubmit) submitRef.current();
        return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey]);

    const filledCount = sections.filter(sectionFilled).length;

    // ------------------------------------------------------------ pantalla
    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-28">
            <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={onChangeService} className="text-indigo-700 px-2">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Servicios
                </Button>
                {!online && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-100 rounded-full px-3 py-1">
                        <CloudOff className="h-3.5 w-3.5" /> Sin señal: todo se guarda en el teléfono
                    </span>
                )}
            </div>

            {draft.pendingSubmit && (
                <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <CloudOff className="h-4 w-4 mt-0.5 shrink-0" />
                    Muestreo terminado y pendiente de envío. Se envía solo cuando haya conexión.
                    {online && <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => submit()} disabled={!!busy}>Enviar ahora</Button>}
                </div>
            )}
            {submitted && !draft.pendingSubmit && (
                <div className="flex items-start gap-2 text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    Este servicio ya se envió el {fmt(submitted.completedAt)}. Si lo envías de nuevo, reemplaza el envío anterior.
                </div>
            )}

            {/* Datos de la OIT */}
            <Card className="border-indigo-100 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-900">{service.name}</CardTitle>
                    <p className="text-xs text-slate-500">Datos de la OIT y la Agenda. No se diligencian.</p>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <Fixed label="Cliente" value={oit.clientName || 'No viene en la OIT'} />
                    <Fixed label="Número OT" value={oit.oitNumber} />
                    <Fixed label="Sitio" value={oit.location || '—'} />
                    <Fixed label="Fecha de inicio (programada)" value={planned ? fmt(planned.toISOString()) : 'Sin programar'} />
                    <div className="sm:col-span-2">
                        <p className="text-xs text-slate-500">Responsable en campo</p>
                        {!editingResponsable ? (
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900">{responsable || 'Sin asignar en la Agenda'}</p>
                                {canEdit && <button className="text-slate-400 hover:text-indigo-600" title="Cambiar responsable" onClick={() => setEditingResponsable(true)}><Pencil className="h-3.5 w-3.5" /></button>}
                            </div>
                        ) : (
                            <div className="space-y-2 mt-1">
                                <Input value={responsable} onChange={e => setDraft(d => ({ ...d, responsable: { value: e.target.value, reason: d.responsable?.reason || '' } }))} />
                                {responsableChanged && (
                                    <Textarea
                                        value={draft.responsable?.reason || ''}
                                        onChange={e => setDraft(d => ({ ...d, responsable: { value: d.responsable?.value ?? plannedEngineers, reason: e.target.value } }))}
                                        placeholder={`Motivo del cambio (la Agenda dice «${plannedEngineers || 'sin asignar'}»)`}
                                        className="min-h-[56px] text-sm"
                                    />
                                )}
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setEditingResponsable(false)}>Listo</Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setDraft(d => ({ ...d, responsable: undefined })); setEditingResponsable(false); }}>Volver al de la Agenda</Button>
                                </div>
                            </div>
                        )}
                        {responsableChanged && !editingResponsable && <p className="text-xs text-amber-700">Cambiado respecto a la Agenda. Motivo: {draft.responsable?.reason || '(falta escribirlo)'}</p>}
                    </div>
                </CardContent>
            </Card>

            {/* Jornadas en sitio */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-900 flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-600" /> En sitio</CardTitle>
                    <p className="text-xs text-slate-500">Al llegar y al salir se registran la ubicación GPS, la fecha y la hora real. Si el muestreo dura varios días, márcalo cada día.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {visits.map((v, i) => (
                        <div key={i} className="text-sm border border-slate-200 rounded-lg p-3 space-y-1">
                            <p className="font-medium text-slate-800">Jornada {i + 1}</p>
                            <p className="text-slate-700"><LogIn className="inline h-3.5 w-3.5 mr-1 text-green-600" />Llegada {fmt(v.arrival.at)} · <span className="text-slate-500">{fmtGps(v.arrival.gps)}</span></p>
                            <p className="text-slate-700"><LogOut className="inline h-3.5 w-3.5 mr-1 text-slate-500" />{v.departure ? <>Salida {fmt(v.departure.at)} · <span className="text-slate-500">{fmtGps(v.departure.gps)}</span></> : <span className="text-indigo-700">En sitio</span>}</p>
                            {v.warnings.map((w, j) => (
                                <p key={j} className="text-xs text-amber-800 flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{w.message}</p>
                            ))}
                        </div>
                    ))}
                    {canEdit && (
                        openVisit ? (
                            <Button variant="outline" className="w-full h-12" onClick={registerDeparture} disabled={!!busy}>
                                {busy === 'departure' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                                Salgo del sitio (fin de la jornada)
                            </Button>
                        ) : (
                            <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700" onClick={registerArrival} disabled={!!busy}>
                                {busy === 'arrival' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                                {visits.length ? 'Llegué al sitio (nueva jornada)' : 'Llegué al sitio'}
                            </Button>
                        )
                    )}
                    {firstArrival && <p className="text-xs text-slate-500">Fecha y hora real: {fmt(firstArrival.at)}</p>}
                </CardContent>
            </Card>

            {/* Secciones de la plantilla */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-700">Registro del muestreo</h3>
                <span className="text-xs text-slate-500">{filledCount} de {sections.length} con datos</span>
            </div>
            {sections.map(s => (
                <Section
                    key={s.index}
                    item={s}
                    value={draft.values[s.index]}
                    comment={draft.comments[s.index] || ''}
                    photos={photos.filter(p => p.stepIndex === s.index)}
                    isMissing={missing.includes(s.index) && !sectionFilled(s)}
                    disabled={!canEdit}
                    onValue={v => setValue(s.index, v)}
                    onComment={v => setComment(s.index, v)}
                    onAddPhotos={files => addPhotos(s.index, files)}
                    onRemovePhoto={removePhoto}
                />
            ))}
            {headerSteps.length === 0 && sections.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-8">Esta plantilla no tiene pasos.</p>
            )}

            {allWarnings.length > 0 && (
                <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                    <p className="font-semibold">Alertas que se reportan al enviar ({allWarnings.length})</p>
                    {allWarnings.map((w, i) => <p key={i}>• {w.message}</p>)}
                </div>
            )}

            {canEdit && (
                <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 p-3 pr-24 sm:pr-28">
                    <div className="max-w-3xl mx-auto flex items-center gap-3">
                        <p className="text-xs text-slate-500 flex-1">Se guarda solo en el teléfono. Al terminar se registra la fecha de fin y la IA revisa todo.</p>
                        <Button className="h-11 bg-green-600 hover:bg-green-700" onClick={finish} disabled={!!busy}>
                            {busy === 'submit' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            Terminar muestreo
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Fixed({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <p className="text-xs text-slate-500 flex items-center gap-1"><Lock className="h-3 w-3" />{label}</p>
            <p className="font-medium text-slate-900 break-words">{value}</p>
        </div>
    );
}

function Section({ item, value, comment, photos, isMissing, disabled, onValue, onComment, onAddPhotos, onRemovePhoto }: {
    item: SamplingFormStep; value: any; comment: string; photos: StoredPhoto[]; isMissing: boolean; disabled: boolean;
    onValue: (v: any) => void; onComment: (v: string) => void; onAddPhotos: (f: FileList | null) => void; onRemovePhoto: (id: string) => void;
}) {
    const { step, index } = item;
    const inputId = `campo-${index}`;
    const filled = hasValue(value) || photos.length > 0;
    const [showComment, setShowComment] = useState(!!comment);
    const photoIds = photos.map(p => p.id).join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const urls = useMemo(() => photos.map(p => ({ id: p.id, url: URL.createObjectURL(p.blob), image: (p.type || '').startsWith('image/') })), [photoIds]);
    useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u.url)), [urls]);

    const field = () => {
        switch (step.type) {
            case 'INPUT':
                return (
                    <div className="relative">
                        <Input id={inputId} type={step.inputType || 'text'} inputMode={step.inputType === 'number' ? 'decimal' : undefined}
                            value={value ?? ''} onChange={e => onValue(e.target.value)} placeholder={step.placeholder || ''} disabled={disabled} className="h-11 text-base" />
                        {step.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{step.unit}</span>}
                    </div>
                );
            case 'CHECKBOX':
                return (
                    <label className="flex items-center gap-3 text-sm text-slate-800">
                        <Checkbox checked={!!value} onCheckedChange={c => onValue(!!c)} disabled={disabled} />
                        {step.label || step.description || 'Realizado'}
                    </label>
                );
            case 'TEXT':
                return <p className="text-sm text-slate-600 whitespace-pre-wrap">{step.content || step.description}</p>;
            case 'IMAGE':
            case 'DOCUMENT':
                return null; // la evidencia es la foto/archivo
            default:
                return (
                    <Textarea id={inputId} value={value ?? ''} onChange={e => onValue(e.target.value)} disabled={disabled}
                        placeholder="Qué se hizo y qué se encontró" className="min-h-[72px] text-base" />
                );
        }
    };

    return (
        <Card id={`seccion-${index}`} className={`shadow-sm ${isMissing ? 'border-red-300 ring-1 ring-red-200' : filled ? 'border-green-200' : 'border-slate-200'}`}>
            <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                    {filled ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <span className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0" />}
                    <div className="min-w-0">
                        <label htmlFor={inputId} className="font-semibold text-slate-900">
                            {step.title}{step.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {step.description && step.type !== 'TEXT' && <p className="text-xs text-slate-500">{step.description}</p>}
                        {isMissing && <p className="text-xs text-red-600 font-medium">Dato obligatorio</p>}
                    </div>
                </div>
                {field()}
                {urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {urls.map(u => (
                            <div key={u.id} className="relative h-16 w-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                {u.image ? <img src={u.url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] p-1 block">Archivo</span>}
                                {!disabled && <button className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5" onClick={() => onRemovePhoto(u.id)} title="Quitar"><X className="h-3 w-3" /></button>}
                            </div>
                        ))}
                    </div>
                )}
                {!disabled && (
                    <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full px-3 py-1.5 cursor-pointer">
                            <Camera className="h-3.5 w-3.5" /> {step.type === 'DOCUMENT' ? 'Adjuntar archivo' : 'Agregar fotos'}{step.type === 'IMAGE' || step.type === 'DOCUMENT' ? '' : ' (opcional)'}
                            <input type="file" multiple className="hidden" accept={step.type === 'DOCUMENT' ? '.pdf,.doc,.docx,.xlsx,image/*' : 'image/*'}
                                capture={step.type === 'DOCUMENT' ? undefined : 'environment'} onChange={e => { onAddPhotos(e.target.files); e.target.value = ''; }} />
                        </label>
                        {!showComment && (
                            <button className="text-xs text-slate-500 hover:text-slate-800 px-2" onClick={() => setShowComment(true)}>+ Observación</button>
                        )}
                    </div>
                )}
                {showComment && (
                    <Textarea value={comment} onChange={e => onComment(e.target.value)} disabled={disabled} placeholder="Observación (opcional)" className="min-h-[56px] text-sm" />
                )}
            </CardContent>
        </Card>
    );
}
