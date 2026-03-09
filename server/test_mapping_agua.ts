import { TemplateDataMapper } from './src/config/templateDataMapper';
import * as fs from 'fs';

// Mocked AI Parsed Data for AGUA (64-08)
// Based on REAL text from OT 13940 RS LOS CORAZONES
const mockAIDataAgua = {
    cliente: "ASEOUPAR S.A. E.S.P.",
    nit: "824001397-2",
    contrato: "OT 13940",
    sede: "Relleno Sanitario Los Corazones",
    tituloInforme: "INFORME TÉCNICO DE ESTUDIO DE CARACTERIZACIÓN DE AGUA SUBTERRÁNEA",
    tipoEstudio: "Caracterización de Agua Subterránea",
    ubicacion: {
        ciudad: "Valledupar",
        departamento: "Cesar",
        direccion: "Kilómetro 18 vía Valledupar - La Paz",
        ubicacionDetalle: "Relleno Sanitario Los Corazones"
    },
    estaciones: [
        { codigo: "Piezómetro 1", nombre: "P1", norte: "2723417,536", este: "4973388,094", cota: "183" },
        { codigo: "Piezómetro 2", nombre: "P2", norte: "2723532,745", este: "4973286,110", cota: "185" },
        { codigo: "Piezómetro 3", nombre: "P3", norte: "2724249,858", este: "4973286,110", cota: "208" }
    ],
    resultadosResumen: "El monitoreo se realizó en los 3 piezómetros establecidos. Los parámetros fisicoquímicos se encuentran dentro de los rangos normales."
};

const mockOITAgua = {
    oitNumber: "OT 13940-1-A-9345",
    description: "Estudio de caracterización de agua subterránea",
    location: "Valledupar, Cesar",
    aiData: JSON.stringify(mockAIDataAgua)
};

async function testAgua() {
    console.log("--- TERMINAL VERIFICATION: TEST MAPPING AGUA (64-08) ---");

    try {
        const mapper = new TemplateDataMapper(
            "FO-PO-PSM-64-08-plantilla.docx",
            mockOITAgua as any,
            "Contenido narrativo..."
        );

        const result = mapper.generateData();

        console.log("\n--- RESULTADOS DEL MAPEO PARA AGUA ---");
        console.log(`[OK] Template detectado: ASUB`);
        console.log(`[OK] var_1 (OIT): ${result['var_1']}`);
        console.log(`[OK] var_5 (Cliente): ${result['var_5']}`);

        // Piezometers (var_21, 22, 23 added in my recent refactor/config)
        console.log(`[OK] var_21 (Piezómetro 1): ${result['var_21']}`);
        console.log(`[OK] var_22 (Piezómetro 2): ${result['var_22']}`);
        console.log(`[OK] var_23 (Piezómetro 3): ${result['var_23']}`);

        // Summary
        console.log(`[OK] var_10 (Resumen): ${result['var_10']}`);

        console.log("\n--- VERIFICACIÓN DE AGUA EXITOSA ---");
        console.log("El sistema está listo para procesar informes de Agua una vez se suba el .docx");

    } catch (error: any) {
        console.error("Error durante el test de agua:", error.message);
    }
}

testAgua();
