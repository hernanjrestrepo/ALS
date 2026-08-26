import { describe, it, expect, vi, beforeEach } from 'vitest';

const lookup = vi.fn();

vi.mock('dns', () => ({
    default: { promises: { lookup: (...args: unknown[]) => lookup(...args) } }
}));

import { assertSafeExternalUrl, isPrivateAddress } from '../src/config/url-guard';

beforeEach(() => {
    lookup.mockReset();
});

describe('isPrivateAddress', () => {
    it.each([
        '10.0.0.1',
        '127.0.0.1',
        '0.0.0.0',
        '169.254.169.254',
        '172.16.0.1',
        '172.31.255.255',
        '192.168.1.1',
        '100.64.0.1',
        '239.255.255.250',
        '::1',
        'fd00::1',
        'fe80::1',
        '::ffff:127.0.0.1'
    ])('treats %s as internal', (ip) => {
        expect(isPrivateAddress(ip)).toBe(true);
    });

    it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '100.63.255.255', '2606:4700::1111'])(
        'treats %s as public',
        (ip) => {
            expect(isPrivateAddress(ip)).toBe(false);
        }
    );
});

describe('assertSafeExternalUrl', () => {
    it('rejects non-http(s) schemes without resolving DNS', async () => {
        await expect(assertSafeExternalUrl('file:///etc/passwd')).rejects.toThrow(
            'Solo se permiten URLs http o https'
        );
        expect(lookup).not.toHaveBeenCalled();
    });

    it('rejects malformed URLs', async () => {
        await expect(assertSafeExternalUrl('not a url')).rejects.toThrow('URL inválida');
    });

    it('rejects literal internal addresses without resolving DNS', async () => {
        await expect(assertSafeExternalUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
            'La URL apunta a una dirección de red interna'
        );
        expect(lookup).not.toHaveBeenCalled();
    });

    it('rejects a hostname that resolves to an internal address', async () => {
        lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

        await expect(assertSafeExternalUrl('http://internal.example/doc.pdf')).rejects.toThrow(
            'La URL apunta a una dirección de red interna'
        );
    });

    it('rejects a hostname with no resolved addresses', async () => {
        lookup.mockResolvedValue([]);

        await expect(assertSafeExternalUrl('https://nowhere.example/doc.pdf')).rejects.toThrow(
            'La URL apunta a una dirección de red interna'
        );
    });

    it('allows a public hostname and returns the parsed URL', async () => {
        lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

        const url = await assertSafeExternalUrl('https://example.com/doc.pdf?x=1');

        expect(url.hostname).toBe('example.com');
        expect(url.toString()).toBe('https://example.com/doc.pdf?x=1');
        expect(lookup).toHaveBeenCalledWith('example.com', { all: true });
    });
});
