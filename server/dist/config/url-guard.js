"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertSafeExternalUrl = exports.isPrivateAddress = void 0;
const dns_1 = __importDefault(require("dns"));
const net_1 = __importDefault(require("net"));
const isPrivateIPv4 = (ip) => {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0)
        return true;
    if (a === 169 && b === 254)
        return true; // link-local + cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    if (a === 192 && b === 168)
        return true;
    if (a === 100 && b >= 64 && b <= 127)
        return true; // carrier-grade NAT
    if (a >= 224)
        return true; // multicast / reserved
    return false;
};
const isPrivateIPv6 = (ip) => {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::')
        return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd'))
        return true; // unique local
    if (normalized.startsWith('fe80'))
        return true; // link-local
    if (normalized.startsWith('::ffff:'))
        return isPrivateIPv4(normalized.replace('::ffff:', ''));
    return false;
};
const isPrivateAddress = (ip) => net_1.default.isIPv4(ip) ? isPrivateIPv4(ip) : isPrivateIPv6(ip);
exports.isPrivateAddress = isPrivateAddress;
/**
 * Validates that a user-supplied URL is safe to fetch server-side: only
 * http(s), and never pointing at loopback, private, link-local or cloud
 * metadata addresses (SSRF protection).
 */
const assertSafeExternalUrl = (rawUrl) => __awaiter(void 0, void 0, void 0, function* () {
    let url;
    try {
        url = new URL(rawUrl);
    }
    catch (_a) {
        throw new Error('URL inválida');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Solo se permiten URLs http o https');
    }
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (net_1.default.isIP(hostname)) {
        if ((0, exports.isPrivateAddress)(hostname)) {
            throw new Error('La URL apunta a una dirección de red interna');
        }
        return url;
    }
    const addresses = yield dns_1.default.promises.lookup(hostname, { all: true });
    if (addresses.length === 0 || addresses.some(({ address }) => (0, exports.isPrivateAddress)(address))) {
        throw new Error('La URL apunta a una dirección de red interna');
    }
    return url;
});
exports.assertSafeExternalUrl = assertSafeExternalUrl;
