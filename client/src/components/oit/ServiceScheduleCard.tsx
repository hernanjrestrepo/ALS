import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Calendar, Clock, Users, Pencil, Check, X, ChevronDown, Sparkles, Plus } from 'lucide-react';
import { scheduleDays, rangeDays, withDays, formatDays } from '@/lib/scheduleDays';

interface ServiceSchedule {
    name: string;
    date: string;
    extraDates?: string[]; // dias adicionales (monitoreo de varios dias)
    time: string;
    engineerIds: string[];
    confirmed: boolean;
}

interface Engineer {
    id: string;
    name: string;
}

interface ServiceScheduleCardProps {
    serviceId: string;
    schedule: ServiceSchedule;
    engineers: Engineer[];
    onUpdate: (serviceId: string, schedule: ServiceSchedule) => void;
}

export function ServiceScheduleCard({ serviceId, schedule, engineers, onUpdate }: ServiceScheduleCardProps) {
    const [isEditing, setIsEditing] = useState(!schedule.confirmed);
    const [localSchedule, setLocalSchedule] = useState<ServiceSchedule>(schedule);

    const handleConfirm = () => {
        onUpdate(serviceId, { ...localSchedule, confirmed: true });
        setIsEditing(false);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setLocalSchedule(schedule);
        setIsEditing(false);
    };

    const toggleEngineer = (engineerId: string) => {
        const newEngineers = localSchedule.engineerIds.includes(engineerId)
            ? localSchedule.engineerIds.filter(id => id !== engineerId)
            : [...localSchedule.engineerIds, engineerId];

        setLocalSchedule({ ...localSchedule, engineerIds: newEngineers });
    };

    // Dias del monitoreo: uno, un rango (lunes a viernes) o dias sueltos.
    const days = scheduleDays(localSchedule);
    const [newDay, setNewDay] = useState('');
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    const [weekdaysOnly, setWeekdaysOnly] = useState(true);
    const setDays = (list: string[]) => setLocalSchedule(s => withDays(s, list));
    const addDay = () => { if (newDay) { setDays([...days, newDay]); setNewDay(''); } };
    const addRange = () => {
        const list = rangeDays(rangeFrom, rangeTo, weekdaysOnly);
        if (list.length) { setDays([...days, ...list]); setRangeFrom(''); setRangeTo(''); }
    };
    const removeDay = (d: string) => setDays(days.filter(x => x !== d));

    const selectedEngineers = engineers.filter(e => localSchedule.engineerIds.includes(e.id));
    const isConfirmed = schedule.confirmed && !isEditing;

    return (
        <Card className={`transition-all ${isConfirmed
            ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
            : 'border-slate-200 hover:border-indigo-300'
            }`}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-700 font-bold text-sm">
                                {schedule.name.substring(0, 2).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">{schedule.name}</h4>
                            {isConfirmed && (
                                <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirmado
                                </Badge>
                            )}
                        </div>
                    </div>
                    {isConfirmed && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEdit}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isEditing || !isConfirmed ? (
                    <div className="space-y-4">
                        {/* AI Suggested Values - Always visible until first confirmation */}
                        {!isConfirmed && schedule.date && (
                            <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700">
                                <Sparkles className="h-3 w-3" />
                                <span>
                                    💡 Sugerencia IA: {(() => {
                                        const [y, m, d] = schedule.date.split('-').map(Number);
                                        return new Date(y, m - 1, d).toLocaleDateString('es-ES');
                                    })()} a las {schedule.time}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Primer día
                                </Label>
                                <Input
                                    type="date"
                                    value={localSchedule.date}
                                    onChange={(e) => setDays([e.target.value, ...days.filter(d => d !== localSchedule.date)])}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    Hora
                                </Label>
                                <Input
                                    type="time"
                                    value={localSchedule.time}
                                    onChange={(e) => setLocalSchedule({ ...localSchedule, time: e.target.value })}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        {/* Varios dias: dias sueltos o rango */}
                        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                            <Label className="text-sm font-medium">Días del monitoreo ({days.length})</Label>
                            {days.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {days.map(d => (
                                        <Badge key={d} variant="secondary" className="bg-indigo-50 text-indigo-700 gap-1">
                                            {new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {days.length > 1 && (
                                                <button type="button" onClick={() => removeDay(d)} className="ml-0.5 hover:text-red-600" title="Quitar día">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <Input type="date" value={newDay} onChange={e => setNewDay(e.target.value)} className="h-8 w-40" />
                                <Button type="button" variant="outline" size="sm" onClick={addDay} disabled={!newDay}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar día
                                </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-500">Rango:</span>
                                <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="h-8 w-40" />
                                <span className="text-xs text-slate-500">a</span>
                                <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="h-8 w-40" />
                                <label className="flex items-center gap-1 text-xs text-slate-600">
                                    <input type="checkbox" checked={weekdaysOnly} onChange={e => setWeekdaysOnly(e.target.checked)} /> Solo lunes a viernes
                                </label>
                                <Button type="button" variant="outline" size="sm" onClick={addRange} disabled={!rangeFrom || !rangeTo}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar rango
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                Ingenieros Asignados
                            </Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-9">
                                        <span className="text-sm">
                                            {selectedEngineers.length > 0
                                                ? `${selectedEngineers.length} seleccionado${selectedEngineers.length > 1 ? 's' : ''}`
                                                : 'Seleccionar ingenieros'}
                                        </span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-full">
                                    <DropdownMenuLabel>Seleccionar personal</DropdownMenuLabel>
                                    {engineers.map(eng => (
                                        <DropdownMenuCheckboxItem
                                            key={eng.id}
                                            checked={localSchedule.engineerIds.includes(eng.id)}
                                            onCheckedChange={() => toggleEngineer(eng.id)}
                                        >
                                            {eng.name}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {selectedEngineers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {selectedEngineers.map(eng => (
                                        <Badge key={eng.id} variant="secondary" className="text-xs">
                                            {eng.name}
                                            <button
                                                onClick={() => toggleEngineer(eng.id)}
                                                className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={handleConfirm}
                                disabled={!localSchedule.date || !localSchedule.time || localSchedule.engineerIds.length === 0}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Check className="h-4 w-4 mr-1" />
                                {schedule.confirmed ? 'Guardar Cambios' : 'Confirmar Programación'}
                            </Button>
                            {isEditing && schedule.confirmed && (
                                <Button variant="outline" onClick={handleCancel}>
                                    <X className="h-4 w-4 mr-1" />
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                                {days.length > 1 ? `${days.length} días: ${formatDays(days)}` : (() => {
                                    // Parse manually to avoid UTC conversion shifts
                                    const [y, m, d] = localSchedule.date.split('-').map(Number);
                                    const localDate = new Date(y, m - 1, d);
                                    return localDate.toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                })()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{localSchedule.time}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                                <Users className="h-4 w-4 text-green-600" />
                                <span className="font-medium">Personal asignado:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedEngineers.map(eng => (
                                    <Badge
                                        key={eng.id}
                                        variant="secondary"
                                        className="bg-green-100 text-green-700"
                                    >
                                        {eng.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
