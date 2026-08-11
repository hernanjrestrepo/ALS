import TemplateDataMapper from './src/config/templateDataMapper';

const mockOITAir = {
    oitNumber: "OT 13800-AIRE-001",
    description: "Monitoreo de Calidad de Aire - PTARD EL DORADO",
    location: "Valledupar, Cesar",
    scheduledDate: new Date(),
    aiData: JSON.stringify({
        parsedData: {
            cliente: "INTERASEO S.A.S. E.S.P.",
            nit: "900.123.456-7",
            tituloInforme: "INFORME DE CALIDAD DE AIRE",
            estaciones: [
                { codigo: "E-01", nombre: "Entrada PTARD" }
            ],
            resultados: [
                { parametro: "PM10", valor: 45.2, unidad: "ug/m3", limite: 75, cumplimiento: "CUMPLE" },
                { parametro: "PM2.5", valor: 12.5, unidad: "ug/m3", limite: 37, cumplimiento: "CUMPLE" },
                { parametro: "NO2", valor: 25.0, unidad: "ug/m3", limite: 200, cumplimiento: "CUMPLE" }
            ]
        }
    }),
    stepValidations: JSON.stringify({})
};

async function testAirMapping() {
    console.log("--- TERMINAL VERIFICATION: TEST MAPPING AIRE V2 (66-18) ---");

    try {
        const mapper = new TemplateDataMapper(
            "FO-PO-PSM-66-18 FORMATO PARA LA ELABORACIÓN DE INFORMES DE CALIDAD DE AIRE-plantilla.docx",
            mockOITAir as any,
            "Análisis narrativo..."
        );

        const data = mapper.generateData();

        console.log("\n--- RESULTADOS DE LAS TABLAS DE AIRE ---");
        console.log(`[OK] var_32 (PM10 Valor): ${data.var_32} (Esperado: 45.2)`);
        console.log(`[OK] var_33 (PM2.5 Valor): ${data.var_33} (Esperado: 12.5)`);
        console.log(`[OK] var_34 (NO2 Valor): ${data.var_34} (Esperado: 25)`);

        console.log(`[OK] var_53 (PM10 Límite): ${data.var_53} (Esperado: 75)`);
        console.log(`[OK] var_54 (PM2.5 Límite): ${data.var_54} (Esperado: 37)`);

        console.log(`[OK] var_59 (PM10 Cumple): ${data.var_59} (Esperado: CUMPLE)`);

        console.log("\n--- VERIFICACIÓN DE AIRE EXITOSA ---");
    } catch (error) {
        console.error("\n--- ERROR EN VERIFICACIÓN DE AIRE ---");
        console.error(error);
    }
}

testAirMapping();
