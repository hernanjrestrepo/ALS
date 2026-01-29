import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const PLANILLAS_DIR = path.join(__dirname, '../../uploads/PLANILLAS');

// Definición de tipos de pasos
type StepType = 'TEXT' | 'INPUT' | 'IMAGE' | 'DOCUMENT' | 'CHECKBOX' | 'SIGNATURE' | 'TABLE' | 'GPS';

interface Step {
    type: StepType;
    title: string;
    description?: string;
    required?: boolean;
    inputType?: 'text' | 'number' | 'date' | 'time' | 'datetime';
    unit?: string;
    placeholder?: string;
    options?: string[];
}

const BASE_12_STEPS: Step[] = [
    { type: 'TEXT', title: 'Inspección de Sitio', description: 'Verificar condiciones de seguridad y acceso' },
    { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
    { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
    { type: 'INPUT', title: 'Responsable', inputType: 'text', required: true },
    { type: 'INPUT', title: 'Fecha y Hora', inputType: 'datetime', required: true },
    { type: 'GPS', title: 'Ubicación GPS', required: true },
    { type: 'IMAGE', title: 'Foto de Referencia', required: true },
    { type: 'TEXT', title: 'Toma de Datos', description: 'Registro de parámetros específicos' },
    { type: 'INPUT', title: 'Parámetro Principal', inputType: 'number' },
    { type: 'CHECKBOX', title: 'Verificación de Equipos', options: ['Calibrado', 'Verificado', 'Limpio'] },
    { type: 'IMAGE', title: 'Foto de Cadena de Custodia' } as any,
    { type: 'SIGNATURE', title: 'Firma del Técnico', required: true }
];

const BASE_11_STEPS: Step[] = BASE_12_STEPS.slice(0, 11);

const MASTER_CATALOG = [
    { name: 'Fuentes Fijas - Informe', oitType: 'Fuentes Fijas', description: 'Informe final de fuentes fijas', steps: BASE_12_STEPS },
    { name: 'Fuentes Fijas - Previo', oitType: 'Fuentes Fijas', description: 'Estudio previo isocinético', steps: BASE_12_STEPS },
    { name: 'Partículas Viables', oitType: 'Aire', description: 'Muestreo de partículas viables (Microbiología aire)', steps: BASE_12_STEPS },
    { name: 'Olores Ofensivos', oitType: 'Aire', description: 'Evaluación de olores ofensivos', steps: BASE_12_STEPS },
    { name: 'Calidad de Aire', oitType: 'Aire', description: 'Monitoreo de calidad de aire (PM10, PM2.5, Gases)', steps: BASE_12_STEPS },
    { name: 'Ruido - Emisión y Ambiental', oitType: 'Ruido', description: 'Estudio combinado de emisión y ruido ambiental', steps: BASE_12_STEPS },
    { name: 'Ruido - Intradomiciliario', oitType: 'Ruido', description: 'Estudio de inmisión de ruido intradomiciliario', steps: BASE_12_STEPS },
    { name: 'Ruido - Ambiental', oitType: 'Ruido', description: 'Estudio de ruido ambiental en área de influencia', steps: BASE_12_STEPS },
    { name: 'Ruido - Emisión', oitType: 'Ruido', description: 'Estudio de emisión de ruido de fuentes específicas', steps: BASE_12_STEPS },
    { name: 'Punto Seco', oitType: 'Residuos', description: 'Informe de punto seco', steps: BASE_11_STEPS },
    { name: 'Caracterización de RESPEL', oitType: 'Residuos', description: 'Estudio y caracterización de residuos peligrosos', steps: BASE_11_STEPS }
];

const FOLDER_MAP: Record<string, string> = {
    'AGUA': 'AGUA',
    'BIOTA': 'BIOTA',
    'CALIDAD DEL AIRE': 'AIRE',
    'LODOS': 'LODOS',
    'RUIDO': 'RUIDO',
    'SEDIMENTOS': 'SEDIMENTOS',
    'SUELO': 'SUELO'
};

async function main() {
    console.log('🚀 Iniciando Sincronización Total de Plantillas...\n');

    await prisma.samplingTemplate.deleteMany({});
    console.log('🗑️ Base de datos de plantillas limpiada.\n');

    // 1. Inserción de Catálogo Maestro
    console.log('📜 Registrando Catálogo Maestro (11 plantillas)...');
    for (const item of MASTER_CATALOG) {
        await prisma.samplingTemplate.create({
            data: {
                name: item.name,
                oitType: item.oitType,
                description: item.description,
                steps: JSON.stringify(item.steps)
            }
        });
        console.log(`   ✨ ${item.name}`);
    }

    // 2. Inserción de Planillas por Archivo
    console.log('\n📁 Registrando Planillas de Carpetas...');
    if (fs.existsSync(PLANILLAS_DIR)) {
        const folders = Object.keys(FOLDER_MAP);
        for (const folder of folders) {
            const folderPath = path.join(PLANILLAS_DIR, folder);
            if (!fs.existsSync(folderPath)) continue;

            const files = fs.readdirSync(folderPath);
            for (const file of files) {
                if (!file.match(/\.(xlsx|xls|doc|docx)$/i)) continue;

                let cleanName = file
                    .replace(/^[A-Z0-9-]+\s+/, '') // Quitar código inicial
                    .replace(/\.(xlsx|xls|doc|docx)$/i, '') // Quitar extensión
                    .replace(/\s*\(\d+\)\s*$/, '') // Quitar (1), (2)
                    .trim();

                // Evitar duplicados con el catálogo maestro si tienen el mismo nombre
                const exists = await prisma.samplingTemplate.findFirst({
                    where: { name: cleanName }
                });

                if (exists) {
                    console.log(`   ⏩ Saltando duplicado: ${cleanName}`);
                    continue;
                }

                await prisma.samplingTemplate.create({
                    data: {
                        name: cleanName,
                        oitType: FOLDER_MAP[folder],
                        description: `Formato específico sincronizado desde ${folder}/${file}`,
                        steps: JSON.stringify(BASE_11_STEPS)
                    }
                });
                console.log(`   ✨ ${folder}: ${cleanName}`);
            }
        }
    }

    const total = await prisma.samplingTemplate.count();
    console.log(`\n✅ Sincronización completada. Total de plantillas disponibles: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
