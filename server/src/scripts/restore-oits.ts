import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

async function restore() {
  console.log('🔍 Iniciando escaneo de OITs en:', UPLOADS_DIR);
  const files = fs.readdirSync(UPLOADS_DIR);
  const oitFiles = files.filter(f => f.startsWith('oitFile-') && f.endsWith('.pdf'));
  
  console.log(`📄 Encontrados ${oitFiles.length} archivos de OIT`);
  
  for (const filename of oitFiles) {
    const filePath = path.join(UPLOADS_DIR, filename);
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text;
      
      // Heuristic extraction
      const oitMatch = text.match(/No\.\s*OIT\s*(\d+)/i);
      const oitNumber = oitMatch ? oitMatch[1] : `OIT-${filename.split('-')[1]}`;
      
      const clientMatch = text.match(/NOMBRE\s*EMPRESA:\s*(.+)/i) || text.match(/CLIENTE:\s*(.+)/i);
      const clientName = clientMatch ? clientMatch[1].trim() : 'Cliente desconocido';
      
      const locationMatch = text.match(/DIRECCIÓN:\s*(.+)/i);
      const location = locationMatch ? locationMatch[1].trim() : 'Sin dirección';

      const quotationMatch = text.match(/No\.\s*COTIZACIÓN\s*([^\n\r]+)/i);
      const quotationNumber = quotationMatch ? quotationMatch[1].trim() : `COT-${filename.split('-')[1]}`;

      console.log(`✅ Detectada OIT ${oitNumber} para ${clientName} (${filename})`);

      // @ts-ignore
      const quotation = await prisma.quotation.upsert({
        where: { quotationNumber },
        update: { clientName },
        create: {
            quotationNumber,
            clientName,
            status: 'COMPLIANT'
        }
      });

      // @ts-ignore
      await prisma.oIT.upsert({
        where: { oitNumber },
        update: {
            oitFileUrl: filePath,
            location: location,
            quotationId: quotation.id
        },
        create: {
          oitNumber,
          location,
          status: 'COMPLETED',
          oitFileUrl: filePath,
          description: `Restaurada desde ${filename}`,
          quotationId: quotation.id
        }
      });
      
    } catch (e: any) {
      console.error(`❌ Error en ${filename}:`, e.message);
    }
  }
}

restore().then(() => prisma.$disconnect());
