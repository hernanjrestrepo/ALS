// Prueba la logica de varios dias del cliente (archivo puro, sin dependencias).
import { describe, it, expect } from 'vitest';
import { scheduleDays, rangeDays, withDays, formatDays } from '../../client/src/lib/scheduleDays';

describe('monitoreo de varios dias', () => {
    it('lo ya programado (un solo dia) sigue igual', () => {
        expect(scheduleDays({ date: '2026-10-30' })).toEqual(['2026-10-30']);
    });
    it('dias sueltos: lunes y jueves, sin repetir y en orden', () => {
        expect(scheduleDays({ date: '2026-10-29', extraDates: ['2026-10-26', '2026-10-29'] })).toEqual(['2026-10-26', '2026-10-29']);
    });
    it('rango de lunes a viernes salta el fin de semana', () => {
        expect(rangeDays('2026-10-23', '2026-10-27')).toEqual(['2026-10-23', '2026-10-26', '2026-10-27']);
        expect(rangeDays('2026-10-23', '2026-10-25', false)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    });
    it('rango invertido o fechas invalidas no agregan nada', () => {
        expect(rangeDays('2026-10-27', '2026-10-23')).toEqual([]);
        expect(rangeDays('x', '2026-10-23')).toEqual([]);
    });
    it('withDays deja el primer dia en date y el resto en extraDates', () => {
        expect(withDays({ date: '', time: '08:00' } as any, ['2026-10-29', '2026-10-26'])).toEqual({ date: '2026-10-26', extraDates: ['2026-10-29'], time: '08:00' });
    });
    it('texto corto de los dias', () => {
        expect(formatDays(['2026-10-26'])).toBe('26/10/2026');
        expect(formatDays(['2026-10-26', '2026-10-27', '2026-10-29'])).toBe('26/10, 27/10 y 29/10/2026');
    });
});
