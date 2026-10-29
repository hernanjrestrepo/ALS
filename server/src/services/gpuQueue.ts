/**
 * Fila de la GPU (Hernan, 2026-10-29: "muy demorado el cargue"). La GPU atiende una solicitud a
 * la vez; antes todas iban directo a Ollama y una lectura de planilla de un tecnico en campo
 * quedaba detras de informes, analisis de OIT y cotizaciones (31-105 s para 6 campos).
 *
 * Ahora toda llamada a Ollama pasa por aqui, una a la vez, y lo que una persona espera en
 * pantalla (lectura de planilla, chat de Ana, correccion de informe) va primero. Lo que ya esta
 * corriendo no se interrumpe. La prioridad se marca en el controlador con conPrioridad('alta')
 * y viaja sola hasta el servicio (AsyncLocalStorage); por defecto es 'baja'.
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AsyncLocalStorage } from 'async_hooks';

export type Prioridad = 'alta' | 'baja';

const contexto = new AsyncLocalStorage<Prioridad>();

/** Ejecuta fn con la prioridad dada para todas las llamadas a la IA que haga. */
export function conPrioridad<T>(prioridad: Prioridad, fn: () => T): T {
    return contexto.run(prioridad, fn);
}

export const prioridadActual = (): Prioridad => contexto.getStore() || 'baja';

interface Turno { prioridad: Prioridad; empezar: () => void }
const fila: Turno[] = [];
let ocupada = false;

function siguiente() {
    if (ocupada) return;
    const i = fila.findIndex(t => t.prioridad === 'alta');
    const turno = fila.splice(i >= 0 ? i : 0, 1)[0];
    if (!turno) return;
    ocupada = true;
    turno.empezar();
}

/** Corre fn cuando sea su turno en la GPU. */
export function enFila<T>(fn: () => Promise<T>, prioridad: Prioridad = prioridadActual()): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        fila.push({
            prioridad,
            empezar: () => {
                fn().then(resolve, reject).finally(() => { ocupada = false; siguiente(); });
            },
        });
        siguiente();
    });
}

/** axios.post a Ollama, por la fila. El timeout cuenta desde que le toca, no desde que espera. */
export function ollamaPost<T = any>(url: string, body: unknown, config?: AxiosRequestConfig, prioridad?: Prioridad): Promise<AxiosResponse<T>> {
    return enFila(() => axios.post<T>(url, body, config), prioridad);
}

/** Para el registro: cuantas solicitudes esperan. */
export const enEspera = () => fila.length;

/** Middleware: lo que haga esta ruta con la IA pasa primero (alguien espera en pantalla). */
export const prioridadAlta = (_req: unknown, _res: unknown, next: () => void) => conPrioridad('alta', next);
