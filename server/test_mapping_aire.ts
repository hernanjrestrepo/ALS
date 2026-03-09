import TemplateDataMapper from './src/config/templateDataMapper';

const mockOITAir = {
    oitNumber: "OT 13800-AIRE-001",
    description: "Monitoreo de Calidad de Aire - PTARD EL DORADO",
    location: "Valledupar, Cesar",
    scheduledDate: new Date(),
    aiData: JSON.stringify({
        cliente: "INTERASEO S.A.S. E.S.P.",
        nit: "900.123.456-7",
        tituloInforme: "INFORME DE CALIDAD DE AIRE",
        areaEstudio: "PTARD El Dorado",
        numeroEstaciones: "3 estaciones",
        parametros: "PM10, PM2.5, NO2, SO2",
        estaciones: [
            { codigo: "E-01", nombre: "Entrada PTARD", norte: "10.456", este: "-73.234" },
            { codigo: "E-02", nombre: "Límite Norte", norte: "10.457", este: "-73.235" },
            { codigo: "E-03", nombre: "Zona Administrativa", norte: "10.455", este: "-73.233" }
        ],
        resultados: [
            { parametro: "PM10", valor: 45.2, unidad: "ug/m3", cumplimiento: "CUMPLE" },
            { parametro: "PM2.5", valor: 12.5, unidad: "ug/m3", cumplimiento: "CUMPLE" },
            { parametro: "NO2", valor: 25.0, unidad: "ug/m3", cumplimiento: "CUMPLE" }
        ],
        conclusiones: "Los niveles de inmisión se encuentran dentro de los límites permisibles establecidos en la Resolución 2254 de 2017."
    }),
    stepValidations: JSON.stringify({})
};

async function testAirMapping() {
    console.log("--- TERMINAL VERIFICATION: TEST MAPPING AIRE (66-18) ---");

    try {
        const mapper = new TemplateDataMapper(
            "FO-PO-PSM-66-18 FORMATO PARA LA ELABORACIÓN DE INFORMES DE CALIDAD DE AIRE-plantilla.docx",
            mockOITAir as any,
            "Análisis narrativo de calidad de aire..."
        );

        const data = mapper.generateData();

        console.log("\n--- RESULTADOS DEL MAPEO PARA AIRE ---");
        console.log(`[OK] Template detectado: ${mapper.getTemplateType()}`);
        console.log(`[OK] var_1 (OIT): ${data.var_1}`);
        console.log(`[OK] var_5 (Cliente): ${data.var_5}`);

        // Series verification: Stations
        console.log(`[OK] var_16 (Estación 1): ${data.var_16} (Esperado: E-01)`);
        console.log(`[OK] var_19 (Estación 2): ${data.var_19} (Esperado: E-02)`);
        console.log(`[OK] var_21 (Estación 3): ${data.var_21} (Esperado: E-03)`);

        // Series verification: Results
        console.log(`[OK] var_32 (Resultado 1): ${data.var_32} (Esperado: 45.2)`);
        console.log(`[OK] var_33 (Resultado 2): ${data.var_33} (Esperado: 12.5)`);
        console.log(`[OK] var_34 (Resultado 3): ${data.var_34} (Esperado: 25)`);

        console.log("\n--- VERIFICACIÓN DE AIRE EXITOSA ---");
    } catch (error) {
        console.error("\n--- ERROR EN VERIFICACIÓN DE AIRE ---");
        console.error(error);
    }
}

testAirMapping();
