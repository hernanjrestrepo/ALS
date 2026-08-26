import dns from 'dns';
import net from 'net';

const isPrivateIPv4 = (ip: string): boolean => {
    const [a, b] = ip.split('.').map(Number);

    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast / reserved

    return false;
};

const isPrivateIPv6 = (ip: string): boolean => {
    const normalized = ip.toLowerCase();

    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local
    if (normalized.startsWith('fe80')) return true; // link-local
    if (normalized.startsWith('::ffff:')) return isPrivateIPv4(normalized.replace('::ffff:', ''));

    return false;
};

export const isPrivateAddress = (ip: string): boolean =>
    net.isIPv4(ip) ? isPrivateIPv4(ip) : isPrivateIPv6(ip);

/**
 * Validates that a user-supplied URL is safe to fetch server-side: only
 * http(s), and never pointing at loopback, private, link-local or cloud
 * metadata addresses (SSRF protection).
 */
export const assertSafeExternalUrl = async (rawUrl: string): Promise<URL> => {
    let url: URL;

    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error('URL inválida');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Solo se permiten URLs http o https');
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '');

    if (net.isIP(hostname)) {
        if (isPrivateAddress(hostname)) {
            throw new Error('La URL apunta a una dirección de red interna');
        }
        return url;
    }

    const addresses = await dns.promises.lookup(hostname, { all: true });

    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
        throw new Error('La URL apunta a una dirección de red interna');
    }

    return url;
};
