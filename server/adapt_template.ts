import PizZip from 'pizzip';
import * as fs from 'fs';
import * as path from 'path';

async function adaptTemplate() {
    console.log("--- INICIANDO ADAPTACIÓN DE PLANTILLA 64-08 (V3) ---");

    const basePath = '/home/dylan/Documentos/Negocios/Paradixe/Als/server/templates/reports/FO-PO-PSM-64-10 FORMATO PARA LA ELABORACIÓN DE INFORME PUNTO SECO-plantilla.docx';
    const outputPath = '/home/dylan/tmp/template_factory/FO-PO-PSM-64-08 FORMATO PARA LA ELABORACIÓN DE INFORME TÉCNICO DE AGUA SUBTERRÁNEA-plantilla.docx';

    if (!fs.existsSync(basePath)) {
        console.error("No se encontró la plantilla base.");
        process.exit(1);
    }

    const content = fs.readFileSync(basePath);
    const zip = new PizZip(content);

    const files = Object.keys(zip.files);
    for (const fileName of files) {
        if (fileName.endsWith('.xml')) {
            const file = zip.file(fileName);
            if (!file) continue;

            let xmlContent = file.asText();
            const originalLength = xmlContent.length;

            // Case-sensitive exact matching for title and code
            xmlContent = xmlContent.split("PUNTO SECO").join("AGUA SUBTERRÁNEA");
            xmlContent = xmlContent.split("64-10").join("64-08");

            if (xmlContent.length !== originalLength) {
                console.log(`Modificando ${fileName}... (Largo: ${originalLength} -> ${xmlContent.length})`);
                zip.file(fileName, xmlContent);
            }
        }
    }

    // Generate the new docx WITH COMPRESSION (DEFLATE)
    const buffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    console.log(`Plantilla 64-08 generada con éxito en: ${outputPath} (Size: ${buffer.length} bytes)`);
}

adaptTemplate();
