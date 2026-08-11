import { TemplateDataMapper } from './src/config/templateDataMapper';
import { docxService } from './src/services/docx.service';
import fs from 'fs';
import path from 'path';

async function test() {
    const oitData = {
        oitNumber: 'OT-13958-1-A-2026',
        description: 'Monitoreo de Agua Residual Doméstica',
        location: 'Barranquilla, Atlántico',
        scheduledDate: new Date('2026-05-05'),
        quotation: { clientName: 'TERNIUM COLOMBIA S.A.S.' },
        aiData: JSON.stringify({
            cliente: 'TERNIUM COLOMBIA S.A.S.',
            nit: '900.123.456-1',
            contrato: 'Contrato No. 2026-001',
            tituloInforme: 'AGUA RESIDUAL DOMÉSTICA',
            tipoEstudio: 'de Agua Residual Doméstica',
            tipoMatriz: 'Agua Residual Doméstica',
            numeroPuntos: '1 (uno)',
            duracionMuestreo: '8 horas',
            parametrosAnalizados: 'pH, Temperatura, DBO5, DQO, SST, Coliformes Totales, Fósforo Total, Nitrógeno Total',
            ubicacion: {
                ciudad: 'Barranquilla',
                departamento: 'Atlántico',
                direccion: 'Km 48 + 600 mts vía Palmar de Varela – Ponedera, Atlántico',
                ciudadDepartamento: 'Barranquilla, Atlántico'
            },
            clima: {
                temperatura: '28.5',
                humedad: '78',
                precipitacion: '800',
                clasificacion: 'Tropical húmedo (Aw)'
            },
            otrosDatos: {
                correo: 'ambiental@ternium.com.co',
                representante: 'Melissa M. Sequeda Barros',
                telefono: '(605) 444-7799 / 321 585 3096',
                actividadEconomica: 'Fabricación de productos de hierro y acero'
            },
            puntos: [
                {
                    id: 'V00',
                    nombre: 'Vertimiento PTAR',
                    descripcion: 'Punto de vertimiento ubicado a la salida de la PTAR de la planta Ternium, sobre el caño Las Compañías. El punto se encontraba seco al momento de la visita.',
                    idMuestra: 'M-001-2026',
                    hora: '08:30',
                    latitud: '10.9685° N',
                    longitud: '74.7813° W',
                    norte: '1.703.245',
                    este: '917.832',
                    fotoDescripcion: 'Vista general del punto de vertimiento PTAR'
                },
                {
                    id: 'V01',
                    nombre: 'Punto Aguas Arriba',
                    fotoDescripcion: 'Vista del punto aguas arriba del vertimiento'
                }
            ],
            resultados: [
                { parametro: 'pH', valor: 7.5, unidad: 'Unidades de pH' },
                { parametro: 'Temperatura', valor: 28.3, unidad: '°C' },
                { parametro: 'Oxigeno disuelto', valor: 5.2, unidad: 'mg O2/L' },
                { parametro: '%Saturación Oxigeno', valor: 80, unidad: '%' },
                { parametro: 'Conductividad', valor: 150, unidad: 'µS/cm' },
                { parametro: 'Alcalinidad', valor: 100, unidad: 'mg/L' },
                { parametro: 'Dureza Total', valor: 120, unidad: 'mg/L' },
                { parametro: 'Demanda Bioquímica de Oxigeno (DBO5)', valor: 15, unidad: 'mg/L' },
                { parametro: 'Demanda Química de Oxigeno (DQO)', valor: 45, unidad: 'mg/L' },
                { parametro: 'Fósforo Total', valor: 2.1, unidad: 'mg/L' },
                { parametro: 'Nitrógeno Total', valor: 12, unidad: 'mg/L' },
                { parametro: 'Sólidos Suspendidos Totales (SST)', valor: 50, unidad: 'mg/L' },
                { parametro: 'Coliformes Totales', valor: 5000, unidad: 'NMP/100mL' }
            ]
        })
    };

    const templatesDir = path.join(__dirname, 'templates/reports');
    const templates = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx') && !f.includes('.backup'));

    for (const templateName of templates) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Testing: ${templateName.substring(0, 60)}...`);
        console.log(`${'='.repeat(80)}`);

        try {
            const mapper = new TemplateDataMapper(templateName, oitData, oitData.aiData!);
            const data = await mapper.generateDataAsync();

            const allEntries = Object.entries(data);
            const filled = allEntries.filter(([, v]) => v && v !== '');
            const empty = allEntries.filter(([, v]) => !v || v === '');

            console.log(`\nFILLED (${filled.length}):`);
            filled.forEach(([k, v]) => {
                const val = typeof v === 'string' ? v.substring(0, 60) : `[${typeof v}]`;
                console.log(`  ${k}: ${val}`);
            });

            if (empty.length > 0) {
                console.log(`\nEMPTY (${empty.length}):`);
                empty.forEach(([k]) => console.log(`  ${k}`));
            } else {
                console.log('\n** ALL FIELDS FILLED **');
            }

            const buffer = await docxService.generateDocument(templateName, data);
            const shortName = templateName.replace('-plantilla.docx', '').replace(' FORMATO PARA LA ELABORACIÓN DE ', '_').replace(/ /g, '_');
            const outputPath = path.join(__dirname, 'output_samples', `TEST_${shortName}.docx`);
            if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, buffer);
            console.log(`\nOutput: ${outputPath}`);
        } catch (e: any) {
            console.error(`Error: ${e.message}\n${e.stack}`);
        }
    }
}

test();
