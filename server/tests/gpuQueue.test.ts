import { describe, it, expect } from 'vitest';
import { enFila, conPrioridad, prioridadActual, enEspera } from '../src/services/gpuQueue';

const tarea = (log: string[], nombre: string, ms = 20) => () => new Promise<string>(r => setTimeout(() => { log.push(nombre); r(nombre); }, ms));

describe('fila de la GPU', () => {
    it('atiende una a la vez y lo urgente que espera pasa antes que lo de fondo', async () => {
        const log: string[] = [];
        let activas = 0, maxActivas = 0;
        const medida = (n: string) => async () => { activas++; maxActivas = Math.max(maxActivas, activas); await tarea(log, n)(); activas--; return n; };
        const p1 = enFila(medida('informe-1'), 'baja');      // ya corriendo: no se interrumpe
        const p2 = enFila(medida('informe-2'), 'baja');
        const p3 = enFila(medida('analisis-oit'), 'baja');
        const p4 = enFila(medida('planilla-tecnico'), 'alta');
        await Promise.all([p1, p2, p3, p4]);
        expect(maxActivas).toBe(1);
        expect(log).toEqual(['informe-1', 'planilla-tecnico', 'informe-2', 'analisis-oit']);
        expect(enEspera()).toBe(0);
    });

    it('la prioridad marcada en la ruta llega al servicio sin pasarla por parametro', async () => {
        expect(prioridadActual()).toBe('baja');
        const dentro = await conPrioridad('alta', async () => { await new Promise(r => setTimeout(r, 5)); return prioridadActual(); });
        expect(dentro).toBe('alta');
    });

    it('un error no deja la fila trabada', async () => {
        await expect(enFila(async () => { throw new Error('ollama caido'); })).rejects.toThrow('ollama caido');
        await expect(enFila(async () => 'ok')).resolves.toBe('ok');
    });
});
