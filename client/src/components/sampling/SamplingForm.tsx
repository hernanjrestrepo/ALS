import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAT_MESSAGE_EVENT } from '@/components/shared/ChatWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import api from '@/lib/api';
import { savePhoto, deletePhoto, listPhotos, clearPhotos, type StoredPhoto } from '@/lib/samplingPhotos';
import {
    MapPin, LogIn, LogOut, Camera, Paperclip, X, Loader2, CheckCircle2, AlertTriangle, Lock, Pencil, CloudOff, Send, ArrowLeft,
    ScanText, MessageSquarePlus,
} from 'lucide-react';

// Formulario de muestreo (rediseno pedido por Hernan, 2026-10-23: "pesimo ese
// formulario, dificil de diligenciar"; "lo van a registrar desde un celular... veo
// demasiado espacio desperdiciado"). Antes: un paso a la vez, bloqueados en orden,
// "Guardar y Validar" en cada campo y volver a escribir lo que ya trae la OIT.
// Ahora:
//  - Datos de la OIT arriba, fijos (cliente, OT, servicio, sitio, fecha programada).
//    Solo el responsable se puede cambiar, explicando el motivo.
//  - "Llegue al sitio" / "Salgo del sitio" por jornada: GPS + fecha y hora real. Un
//    muestreo de varios dias tiene varias jornadas. Fecha de fin = al terminar.
//  - Alertas (sin GPS, lejos del sitio, fuera de hora) no bloquean: se reportan.
//  - Secciones de la plantilla a la vista, en cualquier orden. Cuando un paso tiene
//    varios parametros (pH, conductividad, temperatura...), cada uno tiene su campo.
//  - Foto de la planilla de campo -> la IA (en la GPU del servidor) llena los campos.
//  - Fotos opcionales por seccion (camara o clip); se guarda solo en el telefono y
//    funciona sin senal. La IA revisa todo una sola vez al enviar.
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
    fromSheet?: string[]; // claves de campos llenados desde la foto de la planilla
    sheetFiles?: string[]; // fotos de la planilla ya subidas (evidencia)
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

// ------------------------------------------------------------ varios parametros por paso
interface SubField { key: string; label: string; unit?: string; numeric: boolean }

const UNITS: Array<[RegExp, string, boolean]> = [
    [/^ph$/, 'unid.', true],
    [/conductividad/, 'µS/cm', true],
    [/temperatura/, '°C', true],
    [/oxigeno disuelto|^od$/, 'mg/L', true],
    [/turbiedad|turbidez/, 'NTU', true],
    [/solidos disueltos|^tds$/, 'mg/L', true],
    [/humedad/, '%', true],
    [/viento/, 'm/s', true],
    [/presion/, 'hPa', true],
    [/profundidad/, 'cm', true],
    [/caudal/, 'L/s', true],
    [/lluvia|precipitacion/, '', false],
];

// "pH, conductividad, temperatura, oxígeno disuelto" o "Registrar clima (Lluvia, Viento,
// Humedad)" -> un campo por parametro. Solo si hay una lista real (al menos una coma).
export function subFieldsFor(step: any): SubField[] | null {
    if (step?.type && !['INPUT', 'TEXT_INPUT'].includes(step.type) && step.type !== undefined) return null;
    const desc = String(step?.description || '');
    const inParens = /\(([^)]*,[^)]*)\)/.exec(desc)?.[1];
    const list = inParens || (desc.includes(',') ? desc : '');
    if (!list) return null;
    const items = list.split(/,|\s+y\s+/).map(s => s.trim()).filter(Boolean);
    if (items.length < 2 || items.some(i => i.length > 32 || i.split(/\s+/).length > 4)) return null;
    return items.map((label, i) => {
        const f = fold(label);
        const unit = UNITS.find(([re]) => re.test(f));
        return { key: `p${i}`, label: label.charAt(0).toUpperCase() + label.slice(1), unit: unit?.[1] || undefined, numeric: !!unit?.[2] };
    });
}

const subText = (subs: SubField[], value: any) => subs
    .filter(s => String(value?.[s.key] ?? '').trim())
    .map(s => `${s.label}: ${String(value[s.key]).trim()}${s.unit ? ` ${s.unit}` : ''}`).join('; ');

// ------------------------------------------------------------ utilidades
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

const hasValue = (v: unknown): boolean => {
    if (v && typeof v === 'object') return Object.values(v as Record<string, unknown>).some(x => String(x ?? '').trim() !== '');
    return v !== undefined && v !== null && v !== '' && v !== false;
};

// Fotos del celular: a JPEG de maximo 1600 px (menos datos en campo; el servidor acepta JPG/PNG).
async function toJpeg(file: File, max = 1600): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
        return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch {
        return file;
    }
}

// Valores leidos de la planilla: llenan solo lo vacio (nunca pisan lo escrito a mano) y
// quedan marcados para revisar. Funcion pura: React puede llamarla dos veces.
function applySheetValues(d: Draft, values: Record<string, string>, files: string[]) {
    const next: Draft = { ...d, values: { ...d.values }, fromSheet: [...(d.fromSheet || [])], sheetFiles: [...(d.sheetFiles || []), ...files] };
    let skipped = 0;
    for (const [key, val] of Object.entries(values)) {
        const [idxText, sub] = key.split('.');
        const idx = Number(idxText);
        if (sub) {
            const cur = next.values[idx] && typeof next.values[idx] === 'object' ? { ...next.values[idx] } : {};
            if (String(cur[sub] ?? '').trim()) { skipped++; continue; }
            cur[sub] = val;
            next.values[idx] = cur;
        } else {
            if (hasValue(next.values[idx])) { skipped++; continue; }
            next.values[idx] = val;
        }
        next.fromSheet!.push(key);
    }
    return { next, skipped };
}

// Boton de camara + clip (Hernan: "puede ser un boton para fotos o un clip").
function PhotoButtons({ onFiles, accept = 'image/*', disabled, small }: { onFiles: (f: FileList | null) => void; accept?: string; disabled?: boolean; small?: boolean }) {
    const cls = `inline-flex items-center justify-center rounded-full text-indigo-700 bg-indigo-50 hover:bg-indigo-100 ${small ? 'h-8 w-8' : 'h-9 w-9'} ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`;
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <label className={cls} title="Tomar foto">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <label className={cls} title="Adjuntar desde el teléfono">
                <Paperclip className="h-4 w-4" />
                <input type="file" accept={accept} multiple className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
            </label>
        </div>
    );
}

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
            const v = s.measurementsRaw ?? s.value;
            if (hasValue(v)) values[s.stepIndex] = v;
            if (s.comment) comments[s.stepIndex] = s.comment;
        }
        return { values, comments };
    });
    const [visits, setVisits] = useState<Visit[]>(() => readJson<Visit[]>(visitsKey, []));
    const [photos, setPhotos] = useState<StoredPhoto[]>([]);
    const [busy, setBusy] = useState<'' | 'arrival' | 'departure' | 'submit' | 'sheet'>('');
    const [editingResponsable, setEditingResponsable] = useState(false);
    const [missing, setMissing] = useState<number[]>([]);
    const [online, setOnline] = useState(navigator.onLine);
    const [sheetEnabled, setSheetEnabled] = useState(false);

    useEffect(() => { writeJson(draftKey, draft); }, [draftKey, draft]);
    useEffect(() => { writeJson(visitsKey, visits); }, [visitsKey, visits]);
    useEffect(() => { listPhotos(photoGroup).then(setPhotos).catch(() => setPhotos([])); }, [photoGroup]);
    useEffect(() => { api.get('/oits/sheet-reader/status').then(r => setSheetEnabled(!!r.data?.enabled)).catch(() => setSheetEnabled(false)); }, []);

    const responsable = draft.responsable?.value ?? plannedEngineers;
    const responsableChanged = !!draft.responsable && draft.responsable.value.trim() !== plannedEngineers.trim();

    const sections = steps.filter(s => !headerKind(s.step));
    const subsByIndex = useMemo(() => Object.fromEntries(sections.map(s => [s.index, subFieldsFor(s.step)])) as Record<number, SubField[] | null>, [sections]);
    const openVisit = visits.length && !visits[visits.length - 1].departure ? visits[visits.length - 1] : null;
    const firstArrival = visits[0]?.arrival;
    const allWarnings = visits.flatMap(v => v.warnings);
    const planned = scheduledInstant(schedule.date, schedule.time);
    const fromSheet = new Set(draft.fromSheet || []);

    const unmark = (key: string) => fromSheet.has(key) ? (draft.fromSheet || []).filter(k => k !== key) : draft.fromSheet;
    const setValue = (index: number, value: any) => setDraft(d => ({ ...d, values: { ...d.values, [index]: value }, fromSheet: unmark(String(index)) }));
    const setSubValue = (index: number, key: string, value: string) => setDraft(d => ({
        ...d, values: { ...d.values, [index]: { ...(d.values[index] && typeof d.values[index] === 'object' ? d.values[index] : {}), [key]: value } }, fromSheet: unmark(`${index}.${key}`),
    }));
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
    const storePhotos = async (index: number, files: FileList | File[] | null) => {
        const list = files ? Array.from(files) : [];
        const added: StoredPhoto[] = [];
        for (const original of list) {
            const f = await toJpeg(original);
            const p: StoredPhoto = { id: `${photoGroup}:${index}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, group: photoGroup, stepIndex: index, name: f.name, type: f.type, blob: f, takenAt: new Date().toISOString() };
            try { await savePhoto(p); added.push(p); } catch { toast.error('No se pudo guardar la foto en el teléfono'); }
        }
        setPhotos(ps => [...ps, ...added]);
        return added;
    };
    const removePhoto = async (id: string) => {
        await deletePhoto(id).catch(() => undefined);
        setPhotos(ps => ps.filter(p => p.id !== id));
    };

    // ------------------------------------------------------------ foto de la planilla
    const SHEET_INDEX = -1; // fotos de la planilla guardadas en el telefono (evidencia)
    // Dudas de la ultima lectura (lo que no se encontro o no se pudo leer); tambien se preguntan en el chat.
    const [sheetDoubts, setSheetDoubts] = useState<string[]>([]);
    const readSheet = async (files: FileList | null) => {
        if (!files?.length) return;
        const stored = await storePhotos(SHEET_INDEX, files);
        if (!navigator.onLine) {
            toast.warning('Sin señal: la foto de la planilla quedó guardada. Vuelve a leerla cuando haya conexión.');
            return;
        }
        const fields = sections.flatMap(s => {
            const subs = subsByIndex[s.index];
            if (subs) return subs.map(sf => ({ key: `${s.index}.${sf.key}`, label: `${s.step.title} — ${sf.label}`, unit: sf.unit }));
            if (s.step.type === 'IMAGE' || s.step.type === 'DOCUMENT' || s.step.type === 'TEXT' || s.step.type === 'CHECKBOX') return [];
            return [{ key: String(s.index), label: s.step.title, unit: s.step.unit, hint: s.step.description }];
        });
        if (!fields.length) return;
        setBusy('sheet');
        try {
            const form = new FormData();
            stored.forEach(p => form.append('images', new File([p.blob], p.name, { type: p.type })));
            form.append('fields', JSON.stringify(fields));
            const { data } = await api.post(`/oits/${oit.id}/read-sheet`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 360000 });
            const values: Record<string, string> = data?.values || {};
            const doubts: string[] = Array.isArray(data?.doubts) ? data.doubts : [];
            setSheetDoubts(doubts);
            if (doubts.length) {
                window.dispatchEvent(new CustomEvent(CHAT_MESSAGE_EVENT, {
                    detail: {
                        content: [
                            `Leí la planilla y tengo ${doubts.length === 1 ? 'una duda' : `${doubts.length} dudas`}:`,
                            '',
                            ...doubts.map(d => `- ${d}`),
                            '',
                            'Puedes completar esos datos en el formulario.',
                        ].join('\n'),
                    },
                }));
            }
            const { skipped } = applySheetValues(draft, values, []);
            setDraft(d => applySheetValues(d, values, data?.files || []).next);
            // La foto ya quedo en el servidor como evidencia: se quita de los pendientes del telefono.
            for (const p of stored) await removePhoto(p.id);
            const filled = Object.keys(values).length - skipped;
            if (!Object.keys(values).length) toast.warning('No se leyeron datos de la planilla. Prueba con una foto más clara y de frente, o adjunta el archivo original (PDF, Word o Excel).');
            else toast.success(`${filled} dato(s) leídos de la planilla${skipped ? `; ${skipped} no se cambiaron porque ya estaban escritos` : ''}. Revisa los marcados en azul.`);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'No se pudo leer la planilla. La foto quedó guardada como evidencia.');
        } finally {
            setBusy('');
        }
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
            const subs = subsByIndex[index];
            const raw = draft.values[index];
            const readKeys = (draft.fromSheet || []).filter(k => k === String(index) || k.startsWith(`${index}.`));
            return {
                ...base,
                value: subs ? subText(subs, raw) : (raw ?? ''),
                ...(subs ? {
                    measurements: subs.map(sf => ({ name: sf.label, value: String(raw?.[sf.key] ?? '').trim(), unit: sf.unit || '' })).filter(m => m.value),
                    measurementsRaw: raw,
                } : {}),
                comment: draft.comments[index] || '',
                files: files[index] || [],
                ...(readKeys.length ? { fromSheet: true } : {}),
            };
        });
        const warnings = closedVisits.flatMap(v => v.warnings);
        list.push(
            { description: 'Fecha y hora real (llegada al sitio)', value: arrival ? `${fmt(arrival.at)} — GPS ${fmtGps(arrival.gps)}` : 'Sin registro', synthetic: true },
            { description: 'Jornadas en sitio', value: closedVisits.map((v, i) => `${i + 1}) ${fmt(v.arrival.at)} → ${fmt(v.departure?.at)}`).join('; ') || 'Sin registro', synthetic: true },
            { description: 'Alertas de campo', value: warnings.length ? warnings.map(w => w.message).join(' · ') : 'Sin alertas', synthetic: true },
        );
        const sheetFiles = [...(draft.sheetFiles || []), ...(files[SHEET_INDEX] || [])];
        if (sheetFiles.length) list.push({ description: 'Planilla de campo (foto)', value: `${sheetFiles.length} foto(s)`, files: sheetFiles, synthetic: true });
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
    const sheetPhotos = photos.filter(p => p.stepIndex === SHEET_INDEX);

    // ------------------------------------------------------------ pantalla
    return (
        <div className="max-w-2xl mx-auto space-y-2.5 pb-24 -mx-1 sm:mx-auto">
            <div className="flex items-center justify-between gap-2">
                <button onClick={onChangeService} className="inline-flex items-center text-sm text-indigo-700 py-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Servicios
                </button>
                {!online && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
                        <CloudOff className="h-3 w-3" /> Sin señal: se guarda en el teléfono
                    </span>
                )}
            </div>

            {draft.pendingSubmit && (
                <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <CloudOff className="h-4 w-4 shrink-0" />
                    <span className="flex-1">Terminado y pendiente de envío; se envía solo al tener conexión.</span>
                    {online && <Button size="sm" variant="outline" className="h-7" onClick={() => submit()} disabled={!!busy}>Enviar</Button>}
                </div>
            )}
            {submitted && !draft.pendingSubmit && (
                <div className="flex items-center gap-2 text-xs text-green-900 bg-green-50 border border-green-200 rounded-lg p-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Enviado el {fmt(submitted.completedAt)}. Si lo envías de nuevo, reemplaza el anterior.
                </div>
            )}

            {/* Datos de la OIT */}
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
                <p className="font-semibold text-slate-900 text-sm leading-tight">{service.name}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 text-xs">
                    <Fixed label="Cliente" value={oit.clientName || 'No viene en la OIT'} wide />
                    <Fixed label="OT" value={oit.oitNumber} />
                    <Fixed label="Inicio programado" value={planned ? fmt(planned.toISOString()) : 'Sin programar'} />
                    <Fixed label="Sitio" value={oit.location || '—'} wide />
                    <div className="col-span-2">
                        <p className="text-[11px] text-slate-500">Responsable en campo</p>
                        {!editingResponsable ? (
                            <div className="flex items-center gap-1.5">
                                <p className="font-medium text-slate-900">{responsable || 'Sin asignar en la Agenda'}</p>
                                {canEdit && <button className="text-slate-400 hover:text-indigo-600 p-1" title="Cambiar responsable" onClick={() => setEditingResponsable(true)}><Pencil className="h-3.5 w-3.5" /></button>}
                            </div>
                        ) : (
                            <div className="space-y-1.5 mt-1">
                                <Input value={responsable} className="h-9 text-sm" onChange={e => setDraft(d => ({ ...d, responsable: { value: e.target.value, reason: d.responsable?.reason || '' } }))} />
                                {responsableChanged && (
                                    <Textarea
                                        value={draft.responsable?.reason || ''}
                                        onChange={e => setDraft(d => ({ ...d, responsable: { value: d.responsable?.value ?? plannedEngineers, reason: e.target.value } }))}
                                        placeholder={`Motivo del cambio (la Agenda dice «${plannedEngineers || 'sin asignar'}»)`}
                                        className="min-h-[48px] text-sm"
                                    />
                                )}
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="h-7" onClick={() => setEditingResponsable(false)}>Listo</Button>
                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { setDraft(d => ({ ...d, responsable: undefined })); setEditingResponsable(false); }}>Volver al de la Agenda</Button>
                                </div>
                            </div>
                        )}
                        {responsableChanged && !editingResponsable && <p className="text-[11px] text-amber-700">Cambiado. Motivo: {draft.responsable?.reason || '(falta escribirlo)'}</p>}
                    </div>
                </div>
            </div>

            {/* Jornadas en sitio */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <p className="font-semibold text-sm text-slate-900">En sitio</p>
                    {firstArrival && <span className="ml-auto text-[11px] text-slate-500">Hora real: {fmt(firstArrival.at)}</span>}
                </div>
                {visits.map((v, i) => (
                    <div key={i} className="text-xs border border-slate-100 bg-slate-50 rounded-lg px-2 py-1.5">
                        <p className="text-slate-700"><span className="font-medium">Día {i + 1}</span> · <LogIn className="inline h-3 w-3 text-green-600" /> {fmt(v.arrival.at)} · {v.departure ? <><LogOut className="inline h-3 w-3" /> {fmt(v.departure.at)}</> : <span className="text-indigo-700">en sitio</span>}</p>
                        <p className="text-[11px] text-slate-500">{fmtGps(v.arrival.gps)}</p>
                        {v.warnings.map((w, j) => (
                            <p key={j} className="text-[11px] text-amber-800 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{w.message}</p>
                        ))}
                    </div>
                ))}
                {canEdit && (
                    openVisit ? (
                        <Button variant="outline" className="w-full h-10" onClick={registerDeparture} disabled={!!busy}>
                            {busy === 'departure' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                            Salgo del sitio (fin del día)
                        </Button>
                    ) : (
                        <Button className="w-full h-10 bg-indigo-600 hover:bg-indigo-700" onClick={registerArrival} disabled={!!busy}>
                            {busy === 'arrival' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                            {visits.length ? 'Llegué al sitio (otro día)' : 'Llegué al sitio'}
                        </Button>
                    )
                )}
            </div>

            {/* Foto de la planilla */}
            {canEdit && sheetEnabled && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 flex items-center gap-3">
                    <ScanText className="h-5 w-5 text-indigo-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-900">Leer la planilla de campo</p>
                        <p className="text-[11px] text-indigo-800">Toma la foto o adjunta la planilla (foto, PDF, Word o Excel) y se llenan los campos. Revisa lo leído (en azul).</p>
                    </div>
                    {busy === 'sheet' ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> : <PhotoButtons onFiles={readSheet} disabled={!!busy} accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,image/*" />}
                </div>
            )}
            {sheetDoubts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">Dudas de la planilla ({sheetDoubts.length})</p>
                    <ul className="mt-1 list-disc pl-5 space-y-0.5 text-[13px]">
                        {sheetDoubts.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                </div>
            )}
            {sheetPhotos.length > 0 && (
                <Thumbs photos={sheetPhotos} onRemove={canEdit ? removePhoto : undefined} label="Planilla guardada en el teléfono (sin leer aún)" />
            )}

            {/* Secciones de la plantilla */}
            <div className="flex items-center justify-between px-1 pt-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro</p>
                <span className="text-[11px] text-slate-500">{filledCount} de {sections.length} con datos</span>
            </div>
            {sections.map(s => (
                <Section
                    key={s.index}
                    item={s}
                    subs={subsByIndex[s.index]}
                    value={draft.values[s.index]}
                    comment={draft.comments[s.index] || ''}
                    photos={photos.filter(p => p.stepIndex === s.index)}
                    fromSheet={fromSheet}
                    isMissing={missing.includes(s.index) && !sectionFilled(s)}
                    disabled={!canEdit}
                    onValue={v => setValue(s.index, v)}
                    onSubValue={(k, v) => setSubValue(s.index, k, v)}
                    onComment={v => setComment(s.index, v)}
                    onAddPhotos={files => storePhotos(s.index, files)}
                    onRemovePhoto={removePhoto}
                />
            ))}

            {allWarnings.length > 0 && (
                <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
                    <p className="font-semibold">Alertas que se reportan al enviar ({allWarnings.length})</p>
                    {allWarnings.map((w, i) => <p key={i}>• {w.message}</p>)}
                </div>
            )}

            {canEdit && (
                <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-2 pr-20 sm:pr-28">
                    <div className="max-w-2xl mx-auto flex items-center gap-2">
                        <p className="text-[11px] leading-tight text-slate-500 flex-1">Guardado en el teléfono. Al terminar se toma la fecha de fin y la IA revisa todo.</p>
                        <Button className="h-10 bg-green-600 hover:bg-green-700 px-3" onClick={finish} disabled={!!busy}>
                            {busy === 'submit' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                            Terminar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Fixed({ label, value, wide }: { label: string; value: any; wide?: boolean }) {
    return (
        <div className={wide ? 'col-span-2' : ''}>
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Lock className="h-2.5 w-2.5" />{label}</p>
            <p className="font-medium text-slate-900 break-words leading-snug">{value}</p>
        </div>
    );
}

function Thumbs({ photos, onRemove, label }: { photos: StoredPhoto[]; onRemove?: (id: string) => void; label?: string }) {
    const ids = photos.map(p => p.id).join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const urls = useMemo(() => photos.map(p => ({ id: p.id, url: URL.createObjectURL(p.blob), image: (p.type || '').startsWith('image/') })), [ids]);
    useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u.url)), [urls]);
    return (
        <div>
            {label && <p className="text-[11px] text-slate-500 mb-1">{label}</p>}
            <div className="flex flex-wrap gap-1.5">
                {urls.map(u => (
                    <div key={u.id} className="relative h-14 w-14 rounded-md overflow-hidden border border-slate-200 bg-slate-50">
                        {u.image ? <img src={u.url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] p-1 block">Archivo</span>}
                        {onRemove && <button className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5" onClick={() => onRemove(u.id)} title="Quitar"><X className="h-3 w-3" /></button>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Section({ item, subs, value, comment, photos, fromSheet, isMissing, disabled, onValue, onSubValue, onComment, onAddPhotos, onRemovePhoto }: {
    item: SamplingFormStep; subs: SubField[] | null; value: any; comment: string; photos: StoredPhoto[]; fromSheet: Set<string>; isMissing: boolean; disabled: boolean;
    onValue: (v: any) => void; onSubValue: (k: string, v: string) => void; onComment: (v: string) => void; onAddPhotos: (f: FileList | null) => void; onRemovePhoto: (id: string) => void;
}) {
    const { step, index } = item;
    const inputId = `campo-${index}`;
    const filled = hasValue(value) || photos.length > 0;
    const [showComment, setShowComment] = useState(!!comment);
    const sheetCls = (key: string) => fromSheet.has(key) ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-200' : '';

    const field = () => {
        if (subs) {
            const v = value && typeof value === 'object' ? value : {};
            return (
                <div className="grid grid-cols-2 gap-2">
                    {subs.map(sf => (
                        <label key={sf.key} className="block">
                            <span className="text-[11px] text-slate-600">{sf.label}</span>
                            <div className="relative">
                                <Input type="text" inputMode={sf.numeric ? 'decimal' : 'text'} value={v[sf.key] ?? ''} disabled={disabled}
                                    onChange={e => onSubValue(sf.key, e.target.value)}
                                    className={`h-10 text-base ${sf.unit ? 'pr-12' : ''} ${sheetCls(`${index}.${sf.key}`)}`} />
                                {sf.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">{sf.unit}</span>}
                            </div>
                        </label>
                    ))}
                </div>
            );
        }
        switch (step.type) {
            case 'INPUT': {
                const isDate = ['date', 'time', 'datetime-local'].includes(step.inputType);
                return (
                    <div className="relative">
                        <Input id={inputId} type={isDate ? step.inputType : 'text'} inputMode={step.inputType === 'number' ? 'decimal' : undefined}
                            value={value ?? ''} onChange={e => onValue(e.target.value)} placeholder={step.placeholder || ''} disabled={disabled}
                            className={`h-10 text-base ${step.unit ? 'pr-12' : ''} ${sheetCls(String(index))}`} />
                        {step.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">{step.unit}</span>}
                    </div>
                );
            }
            case 'CHECKBOX':
                return (
                    <label className="flex items-center gap-2.5 text-sm text-slate-800">
                        <Checkbox checked={!!value} onCheckedChange={c => onValue(!!c)} disabled={disabled} />
                        {step.label || 'Realizado'}
                    </label>
                );
            case 'TEXT':
                return <p className="text-xs text-slate-600 whitespace-pre-wrap">{step.content || step.description}</p>;
            case 'IMAGE':
            case 'DOCUMENT':
                return photos.length ? null : <p className="text-xs text-slate-500">Toma o adjunta la evidencia.</p>;
            default:
                return (
                    <Textarea id={inputId} value={value ?? ''} onChange={e => onValue(e.target.value)} disabled={disabled}
                        placeholder="Qué se hizo y qué se encontró" rows={2} className={`min-h-[44px] text-base py-2 ${sheetCls(String(index))}`} />
                );
        }
    };

    return (
        <div id={`seccion-${index}`} className={`rounded-xl border bg-white p-3 space-y-2 ${isMissing ? 'border-red-300 ring-1 ring-red-200' : filled ? 'border-green-200' : 'border-slate-200'}`}>
            <div className="flex items-start gap-2">
                {filled ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" /> : <span className="h-4 w-4 mt-0.5 rounded-full border-2 border-slate-300 shrink-0" />}
                <div className="min-w-0 flex-1">
                    <label htmlFor={inputId} className="block font-semibold text-sm text-slate-900 leading-tight">
                        {step.title}{step.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {step.description && !subs && step.type !== 'TEXT' && <p className="text-[11px] text-slate-500 leading-tight">{step.description}</p>}
                    {isMissing && <p className="text-[11px] text-red-600 font-medium">Dato obligatorio</p>}
                </div>
                {!disabled && (
                    <div className="flex items-center gap-1.5">
                        {!showComment && (
                            <button className="h-8 w-8 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" title="Agregar observación" onClick={() => setShowComment(true)}>
                                <MessageSquarePlus className="h-4 w-4" />
                            </button>
                        )}
                        <PhotoButtons small onFiles={onAddPhotos} accept={step.type === 'DOCUMENT' ? '.pdf,.doc,.docx,.xlsx,image/*' : 'image/*'} />
                    </div>
                )}
            </div>
            {field()}
            {photos.length > 0 && <Thumbs photos={photos} onRemove={disabled ? undefined : onRemovePhoto} />}
            {showComment && (
                <Textarea value={comment} onChange={e => onComment(e.target.value)} disabled={disabled} placeholder="Observación (opcional)" rows={2} className="min-h-[40px] text-sm py-2" />
            )}
        </div>
    );
}
