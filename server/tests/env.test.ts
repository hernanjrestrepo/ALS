import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('dotenv', () => ({ default: { config: () => ({}) } }));

import { getJwtSecret, getAllowedOrigins } from '../src/config/env';

const STRONG = 'a'.repeat(32);

beforeEach(() => {
    vi.unstubAllEnvs();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('getJwtSecret', () => {
    it('returns a strong secret', () => {
        vi.stubEnv('JWT_SECRET', STRONG);
        expect(getJwtSecret()).toBe(STRONG);
    });

    it.each([
        ['unset', undefined],
        ['empty', ''],
        ['too short', 'a'.repeat(31)],
        ['a known weak value', 'supersecretkey'],
        ['a known weak value in mixed case', 'ChangeMe']
    ])('throws when the secret is %s', (_label, value) => {
        vi.stubEnv('JWT_SECRET', value as string);
        expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
    });
});

describe('getAllowedOrigins', () => {
    it('includes the app defaults when nothing is configured', () => {
        const origins = getAllowedOrigins();

        expect(origins).toContain('http://localhost:1612');
        expect(origins).toContain('https://als.paradixe.xyz');
    });

    it('adds configured origins, trims whitespace and de-duplicates', () => {
        vi.stubEnv('CORS_ORIGINS', 'https://a.example, https://b.example ,https://a.example');
        vi.stubEnv('FRONTEND_URL', 'https://als.paradixe.xyz');

        const origins = getAllowedOrigins();

        expect(origins).toContain('https://a.example');
        expect(origins).toContain('https://b.example');
        expect(origins.filter((o) => o === 'https://a.example')).toHaveLength(1);
        expect(origins.filter((o) => o === 'https://als.paradixe.xyz')).toHaveLength(1);
        expect(origins).not.toContain('');
    });
});
