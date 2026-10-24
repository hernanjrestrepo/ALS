import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => ({ PrismaClient: class { } }));
vi.mock('../src/services/ai.service', () => ({ aiService: {} }));

import { instruccionIdioma } from '../src/controllers/ai.controller';

describe('Ana responde en el idioma elegido', () => {
    it('ingles, portugues y frances agregan la instruccion; espanol no', () => {
        expect(instruccionIdioma('en')).toContain('English');
        expect(instruccionIdioma('pt-BR')).toContain('Português');
        expect(instruccionIdioma('fr')).toContain('Français');
        expect(instruccionIdioma('es')).toBe('');
        expect(instruccionIdioma(undefined)).toBe('');
        expect(instruccionIdioma('xx')).toBe('');
    });
});
