import fs from 'fs';
import path from 'path';
import { docxService } from './src/services/docx.service';
import { TemplateDataMapper } from './src/config/templateDataMapper';

const mockOITBase = {
    oitNumber: "OT-13630",
    description: "Monitoreo de Calidad de Aire y Ruido Ambiental - Campaña Anual 2024",
    location: "La Dorada, Caldas",
    scheduledDate: new Date(),
    stepValidations: JSON.stringify({}),
    aiData: JSON.stringify({})
};

const templates = [
    {
        name: "CALIDAD_AIRE",
        file: "FO-PO-PSM-66-18 FORMATO PARA LA ELABORACIÓN DE INFORMES DE CALIDAD DE AIRE-plantilla.docx",
        aiData: {
            cliente: "BIOGER S.A.S. E.S.P.",
            nit: "900.222.333-4",
            tituloInforme: "INFORME TÉCNICO DE CALIDAD DE AIRE - RS LA DORADA",
            estaciones: [
                { codigo: "CA-01", nombre: "Entrada Relleno Sanitario", norte: "624151.00", este: "1051242.00" },
                { codigo: "CA-02", nombre: "Vía de Acceso", norte: "624200.00", este: "1051300.00" }
            ],
            resultados: [
                { parametro: "PM10", valor: 45.2, unidad: "ug/m3", limite: 75, cumplimiento: "CUMPLE" },
                { parametro: "PM2.5", valor: 12.5, unidad: "ug/m3", limite: 37, cumplimiento: "CUMPLE" },
                { parametro: "PST", valor: 88.4, unidad: "ug/m3", limite: 100, cumplimiento: "CUMPLE" },
                { parametro: "NO2", valor: 25.0, unidad: "ug/m3", limite: 200, cumplimiento: "CUMPLE" }
            ],
            resultadosResumen: "Los niveles de material particulado y gases contaminantes se encuentran dentro de los límites establecidos por la Resolución 2254 de 2017.",
            municipio: "La Dorada",
            departamento: "Caldas"
        }
    },
    {
        name: "EMISION_RUIDO",
        file: "FO-PO-PSM-65-06 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE EMISIÓN DE RUIDO-plantilla.docx",
        aiData: {
            cliente: "BIOGER S.A.S. E.S.P.",
            nit: "900.222.333-4",
            tituloInforme: "INFORME DE EMISIÓN DE RUIDO - RS LA DORADA",
            puntos: [
                { nombre: "Fuente Emisora 1", descripcion: "Zona de Descarga", norte: "624151.0", este: "1051242.0" }
            ],
            resultadosResumen: "Se evidencia cumplimiento de los estándares máximos permisibles de emisión de ruido para el sector industrial.",
            municipio: "La Dorada",
            departamento: "Caldas"
        },
        samplingResults: {
            resultados: [
                { laeq: 68.5, valor: 68.5, cumplimiento: "CUMPLE" },
                { laeq: 70.2, valor: 70.2, cumplimiento: "CUMPLE" }
            ],
            condiciones: {
                temperatura: "28.5",
                humedad: "65",
                presion: "1012",
                velocidadViento: "1.2",
                direccionViento: "NW"
            }
        }
    }
];

async function generate() {
    console.log("🚀 Iniciando generación de informes de ejemplo con datos enriquecidos...");
    const outputDir = path.join(__dirname, 'output_samples');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    for (const t of templates) {
        console.log(`📄 Generando: ${t.name}...`);
        const oit = {
            ...mockOITBase,
            aiData: JSON.stringify({ parsedData: t.aiData }),
            stepValidations: t.samplingResults ? JSON.stringify({ "0": { results: t.samplingResults } }) : "{}"
        };

        try {
            const mapper = new TemplateDataMapper(t.file, oit as any, "Informe detallado para revisión del cliente.");
            const data = mapper.generateData();

            const buffer = await docxService.generateDocument(t.file, data);
            const outputPath = path.join(outputDir, `INFORME_FINAL_${t.name}.docx`);
            fs.writeFileSync(outputPath, buffer);
            console.log(`✅ Guardado: ${outputPath}`);
        } catch (err) {
            console.error(`❌ Error en ${t.name}:`, err);
        }
    }
}

generate().catch(console.error);
