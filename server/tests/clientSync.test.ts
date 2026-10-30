import { describe, it, expect, vi } from 'vitest';
vi.mock('@prisma/client', () => ({ PrismaClient: class { } }));
import { extractClientCard, upsertClientFromCard, nitBase, nameKey } from '../src/services/clientSync';

// Texto real de una OIT de Sistema Serambiente (asi sale del PDF).
const OIT = 'INFORMACIÓN BÁSICA DEL CLIENTE\nNOMBRE EMPRESA:TECNOLOGIA Y CONSULTORÍAS AMBIENTALES S.A.S.\nNIT:901180611-1\nDIRECCIÓN:MANZANA 13 # MZ 13 CA 1 URB NUEVO TEJARES DEL LIBERTADOR tconsultoriasambientales@gmail.com\nCONTACTO:ISABEL MARINA PARDO\nCIUDAD/DEPARTAMENTO:SANTA MARTA/MAGDALENA\nTELÉFONO:CELULAR:323 579639\nMAIL:tconsultoriasambientales@gmail.com\nINFORME A NOMBRE DE:\nCONTACTO DE COMPRAS:\nTELÉFONO CONTACTO DE COMPRAS:CELULAR:\nMAIL CONTACTO DE COMPRAS:\n';

describe('clientes desde la OIT', () => {
    it('lee la ficha del cliente del PDF de la OIT', () => {
        expect(extractClientCard(OIT)).toEqual({
            name: 'TECNOLOGIA Y CONSULTORÍAS AMBIENTALES S.A.S.',
            nit: '901180611-1',
            address: 'MANZANA 13 # MZ 13 CA 1 URB NUEVO TEJARES DEL LIBERTADOR',
            contactName: 'ISABEL MARINA PARDO',
            contactEmail: 'tconsultoriasambientales@gmail.com',
            contactPhone: '323 579639',
            city: 'SANTA MARTA/MAGDALENA',
        });
    });

    it('no toma la etiqueta siguiente como valor cuando un campo viene vacio', () => {
        const c = extractClientCard('NOMBRE EMPRESA:ACME\nNIT:900111222-3\nCONTACTO:\nCIUDAD/DEPARTAMENTO:CALI\nTELÉFONO:6024445566CELULAR:\nMAIL:\n');
        expect(c.contactName).toBeNull();
        expect(c.contactEmail).toBeNull();
        expect(c.contactPhone).toBe('6024445566');
    });

    it('el mismo NIT con o sin digito de verificacion es el mismo cliente', () => {
        expect(nitBase('900.640.166-4')).toBe(nitBase('900640166'));
        expect(nameKey('Microambiental Ingeniería S.A.S')).toBe(nameKey('MICROAMBIENTAL INGENIERIA SAS'));
    });

    function fakeDb(clients: any[]) {
        return {
            client: {
                findMany: vi.fn(async () => clients),
                create: vi.fn(async ({ data }: any) => { clients.push({ id: 'n' + clients.length, ...data }); }),
                update: vi.fn(async ({ where, data }: any) => { Object.assign(clients.find(c => c.id === where.id), data); }),
            },
        } as any;
    }

    it('crea el cliente si no existe y no lo duplica la segunda vez', async () => {
        const clients: any[] = [];
        const db = fakeDb(clients);
        expect(await upsertClientFromCard(extractClientCard(OIT), db)).toBe('creado');
        expect(await upsertClientFromCard(extractClientCard(OIT), db)).toBe('sin_cambios');
        expect(clients).toHaveLength(1);
        expect(clients[0].notes).toContain('SANTA MARTA');
    });

    it('completa solo los campos vacios de un cliente existente (no pisa lo escrito a mano)', async () => {
        const clients: any[] = [{ id: 'c1', name: 'Tecnologia y Consultorias', nit: '901180611', contactName: 'Pedro (lo escribio Ana)', contactEmail: null, contactPhone: null, address: null }];
        const db = fakeDb(clients);
        expect(await upsertClientFromCard(extractClientCard(OIT), db)).toBe('completado');
        expect(clients[0].contactName).toBe('Pedro (lo escribio Ana)');
        expect(clients[0].contactEmail).toBe('tconsultoriasambientales@gmail.com');
        expect(clients).toHaveLength(1);
    });

    it('sin nombre o sin NIT no crea nada', async () => {
        const db = fakeDb([]);
        expect(await upsertClientFromCard(extractClientCard('NOMBRE EMPRESA:ACME\n'), db)).toBe('sin_datos');
        expect(db.client.create).not.toHaveBeenCalled();
    });
});
