import { describe, it, expect } from 'vitest';
import { parseRecipients } from '../src/controllers/distribution-list.controller';

describe('parseRecipients', () => {
    it('ignores entries without an email', () => {
        const result = parseRecipients([{ name: 'Sin correo' }, { name: 'Con correo', email: 'a@b.com' }]);
        expect(result).toEqual([{ name: 'Con correo', email: 'a@b.com', required: true }]);
    });

    it('trims whitespace around email and name', () => {
        const result = parseRecipients([{ name: '  Jorge Restrepo  ', email: '  jorgerestrepo@obengroup.com  ' }]);
        expect(result).toEqual([{ name: 'Jorge Restrepo', email: 'jorgerestrepo@obengroup.com', required: true }]);
    });

    it('defaults required to true unless explicitly false', () => {
        const result = parseRecipients([
            { name: 'Requerido', email: 'a@x.com' },
            { name: 'Opcional', email: 'b@x.com', required: false },
        ]);
        expect(result.map(r => r.required)).toEqual([true, false]);
    });

    it('returns an empty list for non-array input', () => {
        expect(parseRecipients(undefined)).toEqual([]);
        expect(parseRecipients('not an array')).toEqual([]);
        expect(parseRecipients(null)).toEqual([]);
    });

    it('drops entries with an empty or whitespace-only email', () => {
        const result = parseRecipients([{ name: 'X', email: '   ' }, { name: 'Y', email: 'y@z.com' }]);
        expect(result).toEqual([{ name: 'Y', email: 'y@z.com', required: true }]);
    });
});
