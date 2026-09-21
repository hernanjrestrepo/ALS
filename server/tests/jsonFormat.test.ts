import { describe, it, expect } from 'vitest';
import { jsonFormat } from '../src/services/ai.service';

describe('jsonFormat', () => {
    it('no fuerza format:json en modelos gpt-oss (devuelven respuesta vacia)', () => {
        expect(jsonFormat('gpt-oss:latest')).toEqual({});
        expect(jsonFormat('gpt-oss:120b-cloud')).toEqual({});
    });
    it('mantiene format:json en los demas modelos', () => {
        expect(jsonFormat('serambiente:latest')).toEqual({ format: 'json' });
        expect(jsonFormat('mistral:latest')).toEqual({ format: 'json' });
    });
});
