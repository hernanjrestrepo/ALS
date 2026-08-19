const path = require('path');
const fs = require('fs');
const { pdfService } = require('./dist/services/pdf.service');
const { aiService } = require('./dist/services/ai.service');
const { docxService } = require('./dist/services/docx.service');
const { TemplateDataMapper } = require('./dist/config/templateDataMapper');

async function main() {
    const [templateFile, labPdf, outFile, oitNumber, description] = process.argv.slice(2);
    if (!templateFile || !labPdf || !outFile) {
        console.error('Usage: node test_full_pipeline.js <templateFile> <labPdf> <outFile> <oitNumber> <description>');
        process.exit(1);
    }

    console.log('=== 1. Extract PDF ===');
    const text = await pdfService.extractText(path.resolve(labPdf));
    console.log(`extracted ${text.length} chars`);

    console.log('=== 2. AI analysis ===');
    const t0 = Date.now();
    const aiDataJson = await aiService.analyzeLabResults(text, description || oitNumber);
    console.log(`took ${(Date.now() - t0) / 1000} s`);
    const parsed = JSON.parse(aiDataJson);
    console.log('cliente:', (parsed.parsedData && parsed.parsedData.cliente) || '(vacío)');
    console.log('resultados count:', (parsed.parsedData && parsed.parsedData.resultados && parsed.parsedData.resultados.length) || 0);

    console.log('=== 3. Build TemplateDataMapper ===');
    const oit = {
        id: 'test-oit-id',
        oitNumber: oitNumber || 'TEST-001',
        scheduledDate: new Date().toISOString(),
        aiData: aiDataJson,
        oitFileUrl: 'test-oit-file.pdf',
    };
    const mapper = new TemplateDataMapper(templateFile, oit, parsed.rawText || '');
    const data = mapper.generateData();
    console.log(`generated ${Object.keys(data).length} data keys`);

    console.log('=== 4. Render DOCX ===');
    const buffer = await docxService.generateDocument(templateFile, data);
    fs.writeFileSync(path.resolve(outFile), buffer);
    console.log(`wrote ${outFile} ${buffer.length} bytes`);
}

main().catch(e => {
    console.error('PIPELINE FAILED:', e);
    process.exit(1);
});
