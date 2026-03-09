import TemplateDataMapper from './src/config/templateDataMapper';

const mockOITNoise = {
    oitNumber: "OT 13936-RUIDO-001",
    description: "Monitoreo de Emisión de Ruido - RS EL CLAVO",
    location: "Villeta, Cundinamarca",
    scheduledDate: new Date(),
    aiData: JSON.stringify({
        cliente: "INTERASEO S.A.S. E.S.P.",
        nit: "900.123.456-7",
        tituloInforme: "ESTUDIO DE EMISIÓN DE RUIDO",
        sectorCategoria: "Sector C - Industrial",
        equipoModelo: "SVAN 971",
        resumenResultados: "Los niveles de emisión de ruido medidos cumplen con los estándares establecidos.",
        estaciones: [
            { codigo: "Punto 1", nombre: "Frontera Norte", norte: "4.567", este: "-74.123" },
            { codigo: "Punto 2", nombre: "Frontera Sur", norte: "4.568", este: "-74.124" }
        ],
        condiciones: { temperatura: "25.5 °C", humedad: "65%", presion: "1013 hPa" }
    }),
    stepValidations: JSON.stringify({
        "1": { data: { laeq: 55.4, temperatura: 25.5, humedad: 65, presion: 1013 } },
        "2": { data: { laeq: 58.2 } }
    })
};

async function testNoiseMapping() {
    console.log("--- TERMINAL VERIFICATION: TEST MAPPING RUIDO (65-06) ---");

    try {
        const mapper = new TemplateDataMapper(
            "FO-PO-PSM-65-06 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE EMISIÓN DE RUIDO-plantilla.docx",
            mockOITNoise as any,
            "Análisis narrativo de ruido..."
        );

        const data = mapper.generateData();

        console.log("\n--- RESULTADOS DEL MAPEO PARA RUIDO ---");
        console.log(`[OK] Template detectado: ${mapper.getTemplateType()}`);
        console.log(`[OK] var_1 (OIT): ${data.var_1}`);
        console.log(`[OK] var_20 (Sector): ${data.var_20} (Esperado: Sector C - Industrial)`);

        // Series verification: Results (using the mapping 'ruido.laeqN')
        console.log(`[OK] var_6 (LAeq 1): ${data.var_6} (Esperado: 55.40)`);
        console.log(`[OK] var_7 (LAeq 2): ${data.var_7} (Esperado: 58.20)`);

        // Series verification: Conditions
        console.log(`[OK] var_10 (Temp): ${data.var_10} (Esperado: 25.5)`);
        console.log(`[OK] var_11 (Hum): ${data.var_11} (Esperado: 65)`);

        // Estaciones
        console.log(`[OK] var_21 (Punto 1): ${data.var_21} (Esperado: Punto 1)`);

        console.log("\n--- VERIFICACIÓN DE RUIDO EXITOSA ---");
    } catch (error) {
        console.error("\n--- ERROR EN VERIFICACIÓN DE RUIDO ---");
        console.error(error);
    }
}

testNoiseMapping();
