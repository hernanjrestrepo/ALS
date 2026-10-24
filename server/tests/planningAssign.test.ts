import { describe, it, expect } from 'vitest';
import { planAssignments, serviceMatrix, isDeskService, Person } from '../src/services/planningAssign';

const people: Person[] = [
    { id: 'a', name: 'Armando', cargo: 'Ingeniero De Campo', supervises: false },
    { id: 'b', name: 'Beto', cargo: 'Ingeniero De Campo', supervises: false },
    { id: 'j', name: 'Jesus', cargo: 'Supervisor De Operaciones', supervises: true },
];
const resources = { 'Aguas': 64, 'Calidad del aire': 412, 'Ruido': 14, 'Fuentes fijas': 52, 'Hidrobiología y Biota': 79 };

describe('matriz y servicios de escritorio', () => {
    it('reconoce la matriz por el nombre del servicio (nombres reales de ALS)', () => {
        expect(serviceMatrix('Monitoreo de Agua Subterránea (MATRIZAGUAS)')).toBe('Aguas');
        expect(serviceMatrix('Análisis de sedimentos marinos')).toBe('Aguas');
        expect(serviceMatrix('Emisión de Ruido (4 puntos)')).toBe('Ruido');
        expect(serviceMatrix('Calidad de Aire (4 estaciones)')).toBe('Calidad del aire');
        expect(serviceMatrix('Fuentes Fijas (1 punto)')).toBe('Fuentes fijas');
        expect(serviceMatrix('Biota Terrestre – Mantenimiento de flora epifita')).toBe('Hidrobiología y Biota');
        expect(serviceMatrix('Servicio sin matriz conocida')).toBeNull();
    });
    it('ICA, RUA y geodatabase son de escritorio', () => {
        expect(isDeskService('Elaboración del Informe de Cumplimiento Ambiental (ICA)')).toBe(true);
        expect(isDeskService('Generación del reporte Registro Único Ambiental (RUA)')).toBe(true);
        expect(isDeskService('Consultoría – Geodatabase temática (Servicio 2)')).toBe(true);
        expect(isDeskService('Monitoreo de Agua Superficial')).toBe(false);
    });
});

describe('planAssignments', () => {
    it('asigna a quien esta libre y con menos carga; la hora por defecto es 8:00', () => {
        const r = planAssignments({
            services: [{ key: 's1', name: 'Monitoreo de Agua Superficial', date: '2026-10-27' }],
            people, busyByDay: { '2026-10-20': ['a'] }, resourcesByType: resources,
        });
        expect(r.services[0]).toMatchObject({ engineerIds: ['b'], time: '08:00', confirmed: true, flags: [] });
        expect(r.flags).toEqual([]);
    });

    it('no asigna a quien ya esta programado ese dia en otra OIT', () => {
        const r = planAssignments({
            services: [{ key: 's1', name: 'Calidad de Aire', date: '2026-10-27' }],
            people, busyByDay: { '2026-10-27': ['a', 'b'] }, resourcesByType: resources,
        });
        expect(r.services[0].engineerIds).toEqual(['j']);
        expect(r.flags[0]).toContain('solo quedó libre personal supervisor');
    });

    it('bandera roja si no hay nadie libre', () => {
        const r = planAssignments({
            services: [{ key: 's1', name: 'Ruido Ambiental', date: '2026-10-27' }],
            people, busyByDay: { '2026-10-27': ['a', 'b', 'j'] }, resourcesByType: resources,
        });
        expect(r.services[0].engineerIds).toEqual([]);
        expect(r.flags[0]).toBe('No hay personal libre para «Ruido Ambiental» el 27/10/2026 (faltan 1).');
    });

    it('varios dias: la persona debe estar libre todos los dias', () => {
        const r = planAssignments({
            services: [{ key: 's1', name: 'Monitoreo de agua subterránea', date: '2026-10-26', extraDates: ['2026-10-29'] }],
            people, busyByDay: { '2026-10-29': ['a'] }, resourcesByType: resources,
        });
        expect(r.services[0].engineerIds).toEqual(['b']);
    });

    it('dos servicios el mismo dia no se asignan a la misma persona', () => {
        const r = planAssignments({
            services: [
                { key: 's1', name: 'Monitoreo de Agua Potable', date: '2026-10-27' },
                { key: 's2', name: 'Calidad de Aire', date: '2026-10-27' },
            ],
            people, busyByDay: {}, resourcesByType: resources,
        });
        expect(r.services[0].engineerIds).toEqual(['a']);
        expect(r.services[1].engineerIds).toEqual(['b']);
    });

    it('bandera roja si no hay equipos de la matriz', () => {
        const r = planAssignments({
            services: [{ key: 's1', name: 'Ruido Ambiental', date: '2026-10-27' }],
            people, busyByDay: {}, resourcesByType: { 'Aguas': 3 },
        });
        expect(r.flags).toContain('Sin equipos disponibles de Ruido para «Ruido Ambiental».');
        expect(r.services[0].engineerIds).toEqual(['a']); // el personal igual se asigna
    });

    it('servicio de escritorio: sin ingeniero ni equipo ni alertas', () => {
        const r = planAssignments({
            services: [{ key: 's1', name: 'Elaboración de fichas ICA', date: '2026-10-27' }],
            people, busyByDay: {}, resourcesByType: {},
        });
        expect(r.services[0]).toMatchObject({ desk: true, engineerIds: [], flags: [] });
    });

    it('servicio sin fecha queda marcado', () => {
        const r = planAssignments({ services: [{ key: 's1', name: 'Calidad de Aire', date: '' }], people, busyByDay: {}, resourcesByType: resources });
        expect(r.flags).toContain('«Calidad de Aire» no tiene fecha.');
    });
});
