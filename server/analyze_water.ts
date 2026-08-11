import { docxService } from './src/services/docx.service';
import fs from 'fs';
import path from 'path';

async function generate() {
    const template = "FO-PO-PSM-64-08 FORMATO PARA LA ELABORACIÓN DE INFORME TÉCNICO DE AGUA SUBTERRÁNEA-plantilla.docx";
    console.log(`🔍 Analizando variables de: ${template}`);
    
    // We can't easily extract tags without running the docxtemplater logic
    // but we can look for {var_N} in the XML if we unzip it
    // Or just use the Mapper's existing knowledge
}
generate();
