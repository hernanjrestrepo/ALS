import { describe, it, expect } from 'vitest';
import { normalizeDocumentUrl, readIntegrationPayload } from '../src/utils/integrationPayload';

const req = (body: any, extra: any = {}) => ({ body, query: {}, headers: {}, ...extra } as any);

describe('normalizeDocumentUrl', () => {
    it('repara la URL mal armada que envio Serambiente el 20-sep', () => {
        expect(normalizeDocumentUrl('https://sistemaserambiente.comPDF/OIT-OT-14841-SV_INGENIERIAS_S_A_S.pdf'))
            .toBe('https://sistemaserambiente.com/serambiente/PDF/OIT-OT-14841-SV_INGENIERIAS_S_A_S.pdf');
    });
    it('agrega /serambiente/ cuando falta pero hay barra', () => {
        expect(normalizeDocumentUrl('https://sistemaserambiente.com/PDF/OIT-OT-1.pdf'))
            .toBe('https://sistemaserambiente.com/serambiente/PDF/OIT-OT-1.pdf');
    });
    it('no toca URLs correctas', () => {
        const ok = 'https://sistemaserambiente.com/serambiente/PDF/OIT-OT-14081-ALS.pdf';
        expect(normalizeDocumentUrl(ok)).toBe(ok);
        const lab = 'https://sistemaserambiente.com/public/OT-14674-1_27042OK.pdf';
        expect(normalizeDocumentUrl(lab)).toBe(lab);
    });
    it('repara resultados de laboratorio pegados al dominio y quita comillas/espacios', () => {
        expect(normalizeDocumentUrl(' "https://sistemaserambiente.compublic/OT-1.pdf" '))
            .toBe('https://sistemaserambiente.com/public/OT-1.pdf');
    });
});

describe('readIntegrationPayload', () => {
    it('lee JSON normal', () => {
        const p = readIntegrationPayload(req({ OT: '14841', DOCUMENTO: 'https://x.com/a.pdf' }));
        expect(p.OT).toBe('14841');
        expect(p.DOCUMENTO).toBe('https://x.com/a.pdf');
    });
    it('acepta nombres en minuscula y alias', () => {
        const p = readIntegrationPayload(req({ ot: 14841, url: 'https://x.com/a.pdf' }));
        expect(p.OT).toBe('14841');
        expect(p.DOCUMENTO).toBe('https://x.com/a.pdf');
    });
    it('acepta JSON llegado como texto plano', () => {
        const p = readIntegrationPayload(req('{"OT":"1","DOCUMENTO":"https://x.com/a.pdf"}'));
        expect(p.DOCUMENTO).toBe('https://x.com/a.pdf');
    });
    it('acepta campos en la query string', () => {
        const p = readIntegrationPayload(req({}, { query: { OT: '2', DOCUMENTO: 'https://x.com/b.pdf' } }));
        expect(p.OT).toBe('2');
        expect(p.DOCUMENTO).toBe('https://x.com/b.pdf');
    });
    it('reporta los campos recibidos cuando falta DOCUMENTO', () => {
        const p = readIntegrationPayload(req({ OT: '3', foo: 'bar' }, { headers: { 'content-type': 'application/json' } }));
        expect(p.DOCUMENTO).toBeUndefined();
        expect(p.keys).toEqual(['OT', 'foo']);
        expect(p.contentType).toBe('application/json');
    });
});
