import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

const PLANILLAS_DIR = path.join(__dirname, '../../uploads/PLANILLAS');

// Categorize by folder name to OIT Type
const CATEGORY_MAP: Record<string, string> = {
    'AGUA': 'AGUA',
    'BIOTA': 'BIOTA',
    'CALIDAD DEL AIRE': 'AIRE',
    'LODOS': 'LODOS',
    'RUIDO': 'RUIDO',
    'SEDIMENTOS': 'SEDIMENTOS',
    'SUELO': 'SUELO'
};

// Base steps per category (copied from create-sampling-templates.ts)
const BASE_STEPS: Record<string, any[]> = {
    'AGUA': [
        { type: 'TEXT', title: 'Instrucciones Generales', description: 'Verificar equipos de protección personal, revisar plan de monitoreo y confirmar puntos de muestreo con el cliente.' },
        { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true, placeholder: 'Nombre del cliente' },
        { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true, placeholder: 'Orden de trabajo' },
        { type: 'INPUT', title: 'Responsable en Campo', inputType: 'text', required: true },
        { type: 'INPUT', title: 'Fecha de Muestreo', inputType: 'date', required: true },
        { type: 'GPS', title: 'Coordenadas del Punto', required: true },
        { type: 'IMAGE', title: 'Foto del Punto de Muestreo', allowMultiple: true, requireGPS: true, maxImages: 5 },
        { type: 'TEXT', title: '--- PARÁMETROS IN SITU ---' },
        { type: 'INPUT', title: 'pH', inputType: 'number', unit: 'upH' },
        { type: 'INPUT', title: 'Conductividad', inputType: 'number', unit: 'µS/cm' },
        { type: 'INPUT', title: 'Temperatura', inputType: 'number', unit: '°C' },
        { type: 'SIGNATURE', title: 'Firma del Técnico', required: true }
    ],
    'AIRE': [
        { type: 'TEXT', title: 'Instrucciones', description: 'Verificar condiciones meteorológicas y ubicar equipos.' },
        { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
        { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
        { type: 'INPUT', title: 'Fecha de Inicio', inputType: 'datetime', required: true },
        { type: 'GPS', title: 'Coordenadas de la Estación', required: true },
        { type: 'IMAGE', title: 'Foto de la Estación', allowMultiple: true, requireGPS: true },
        { type: 'SIGNATURE', title: 'Firma del Técnico', required: true }
    ],
    'RUIDO': [
        { type: 'TEXT', title: 'Instrucciones', description: 'Verificar calibración del sonómetro.' },
        { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
        { type: 'INPUT', title: 'ID Sonómetro', inputType: 'text', required: true },
        { type: 'GPS', title: 'Coordenadas Punto', required: true },
        { type: 'INPUT', title: 'LAeq Punto 1', inputType: 'number', unit: 'dB(A)' },
        { type: 'SIGNATURE', title: 'Firma del Técnico', required: true }
    ]
    // Default steps for others will be a simple generic set
};

const GENERIC_STEPS = [
    { type: 'TEXT', title: 'Instrucciones', description: 'Siga los procedimientos establecidos para este tipo de muestreo.' },
    { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
    { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
    { type: 'INPUT', title: 'Responsable en Campo', inputType: 'text', required: true },
    { type: 'INPUT', title: 'Fecha de Muestreo', inputType: 'date', required: true },
    { type: 'GPS', title: 'Coordenadas', required: true },
    { type: 'IMAGE', title: 'Evidencia Fotográfica', allowMultiple: true, requireGPS: true },
    { type: 'SIGNATURE', title: 'Firma del Técnico', required: true }
];

async function syncAllPlanillas() {
    console.log('🔄 Iniciando sincronización de todas las planillas...\n');

    const categories = Object.keys(CATEGORY_MAP);
    let totalSynced = 0;

    for (const folder of categories) {
        const folderPath = path.join(PLANILLAS_DIR, folder);
        if (!fs.existsSync(folderPath)) continue;

        console.log(`📁 Procesando carpeta: ${folder}`);
        const files = fs.readdirSync(folderPath);

        for (const file of files) {
            if (!file.match(/\.(xlsx|xls|doc|docx)$/i)) continue;

            // CLEAN NAME LOGIC:
            // 1. Remove code pattern like FO-PO-PSM-00-00
            // 2. Remove extension
            // 3. Remove versioning like (1), (2)
            // 4. Clean extra spaces
            let cleanName = file
                .replace(/^[A-Z0-9-]+\s+/, '') // Remove code at start
                .replace(/\.(xlsx|xls|doc|docx)$/i, '') // Remove extension
                .replace(/\s*\(\d+\)\s*$/, '') // Remove (N) at end
                .trim();

            const oitType = CATEGORY_MAP[folder];
            const steps = BASE_STEPS[oitType] || GENERIC_STEPS;

            // Check if exists
            const existing = await prisma.samplingTemplate.findFirst({
                where: { name: cleanName }
            });

            const description = `Formato oficial para ${cleanName} [Archivo original: ${file}]`;

            if (existing) {
                await prisma.samplingTemplate.update({
                    where: { id: existing.id },
                    data: {
                        oitType,
                        description,
                        steps: JSON.stringify(steps),
                        updatedAt: new Date()
                    }
                });
                console.log(`   ✅ Actualizada: ${cleanName}`);
            } else {
                await prisma.samplingTemplate.create({
                    data: {
                        name: cleanName,
                        description,
                        oitType,
                        steps: JSON.stringify(steps)
                    }
                });
                console.log(`   ✨ Creada: ${cleanName}`);
            }
            totalSynced++;
        }
    }

    console.log(`\n🎉 Sincronización completada. Total de planillas en DB: ${totalSynced}`);
}

syncAllPlanillas()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
