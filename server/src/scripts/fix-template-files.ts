import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const PREDEFINED_MAPPINGS: Record<string, string> = {
    // Standard Mappings based on keywords
    'AIRE': 'FO-PO-PSM-66-18 FORMATO PARA LA ELABORACIÓN DE INFORMES DE CALIDAD DE AIRE-plantilla.docx',
    'RUIDO': 'FO-PO-PSM-65-09 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE EMISIÓN DE RUIDO Y RUIDO AMBIENTAL-plantilla.docx',
    'FUENTES FIJAS': 'FO-PO-PSM-67-11 FORMATO PARA LA ELABORACIÓN DE INFORMES DE FUENTES FIJAS-plantilla.docx',
    'AGUA': 'FO-PO-PSM-64-09 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE CARACTERIZACIÓN DE RESPEL-plantilla.docx', // Fallback for now
    'OLORES': 'FO-PO-PSM-66-19 FORMATO PARA LA ELABORACIÓN DE INFORMES DE OLORES OFENSIVOS-plantilla.docx',
    'BIOTA': 'FO-PO-PSM-66-18 FORMATO PARA LA ELABORACIÓN DE INFORMES DE CALIDAD DE AIRE-plantilla.docx', // Fallback
};

async function main() {
    console.log('Updating template file paths...');

    // 1. Get all templates
    const templates = await prisma.samplingTemplate.findMany();
    console.log(`Found ${templates.length} templates.`);

    for (const t of templates) {
        let filename = t.reportTemplateFile;

        // Try to match if missing
        if (!filename) {
            const upperName = t.name.toUpperCase();
            const upperType = (t.oitType || '').toUpperCase();

            // Match by Type
            if (upperType.includes('AIRE')) filename = PREDEFINED_MAPPINGS['AIRE'];
            else if (upperType.includes('RUIDO')) filename = PREDEFINED_MAPPINGS['RUIDO'];
            else if (upperType.includes('FUENTE')) filename = PREDEFINED_MAPPINGS['FUENTES FIJAS'];
            else if (upperType.includes('AGUA')) filename = PREDEFINED_MAPPINGS['AGUA'];
            else if (upperType.includes('OLOR')) filename = PREDEFINED_MAPPINGS['OLORES'];

            // Match by Name if Type failed
            if (!filename) {
                if (upperName.includes('AIRE') || upperName.includes('TSP') || upperName.includes('PM10')) filename = PREDEFINED_MAPPINGS['AIRE'];
                else if (upperName.includes('RUIDO')) filename = PREDEFINED_MAPPINGS['RUIDO'];
                else if (upperName.includes('FUENTE') || upperName.includes('ISOCINETICO')) filename = PREDEFINED_MAPPINGS['FUENTES FIJAS'];
                else if (upperName.includes('AGUA') || upperName.includes('VERTIMIENTO')) filename = PREDEFINED_MAPPINGS['AGUA'];
            }
        }

        // Update if found
        if (filename) {
            await prisma.samplingTemplate.update({
                where: { id: t.id },
                data: { reportTemplateFile: filename }
            });
            console.log(`Updated ${t.name} -> ${filename}`);
        } else {
            console.warn(`Could not find a file for ${t.name} (${t.oitType})`);
            // Force fallback to AIRE for any unknown to ensure DOCX generation
            await prisma.samplingTemplate.update({
                where: { id: t.id },
                data: { reportTemplateFile: PREDEFINED_MAPPINGS['AIRE'] } // Ultimate fallback
            });
            console.log(`Updated ${t.name} -> Forced Fallback to AIRE`);
        }
    }

    console.log('Done.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
