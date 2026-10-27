import { describe, it, expect } from 'vitest';
import { serviceGroupName } from '../src/controllers/oit.controller';

const ai = JSON.stringify({ data: { services: [{ name: 'Monitoreo de Agua Subterránea (MATRIZAGUAS)' }, { name: 'Ruido Ambiental' }] } });

describe('grupo de servicio de los resultados de laboratorio', () => {
    it('traduce el numero que manda Serambiente al nombre del servicio', () => {
        expect(serviceGroupName(ai, '1')).toBe('Monitoreo de Agua Subterránea (MATRIZAGUAS)');
        expect(serviceGroupName(ai, ' 2 ')).toBe('Ruido Ambiental');
    });
    it('deja igual lo que no es numero o no existe', () => {
        expect(serviceGroupName(ai, 'General')).toBe('General');
        expect(serviceGroupName(ai, '3')).toBe('3');
        expect(serviceGroupName(null, '1')).toBe('1');
    });
});
