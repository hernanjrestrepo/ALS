import { TemplateDataMapper } from './src/config/templateDataMapper';
import { docxService } from './src/services/docx.service';
import fs from 'fs';
import path from 'path';

async function generateReport(templateFile: string, oitData: any) {
    console.log(`🚀 Iniciando generación universal para: ${templateFile}`);
    try {
        const mapper = new TemplateDataMapper(templateFile, oitData, oitData.aiData || '');
        const data = await mapper.generateDataAsync();
        const buffer = await docxService.generateDocument(templateFile, data);
        
        const outputPath = path.join(__dirname, 'output_samples', `GENERADO_${templateFile}`);
        if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Informe generado con éxito en: ${outputPath}`);
    } catch (error) {
        console.error(`❌ Error generando informe:`, error);
    }
}

// Ejemplo de uso:
// generateReport('PLANTILLA_AGUA.docx', { oitNumber: 'OT-123', aiData: '...' });
