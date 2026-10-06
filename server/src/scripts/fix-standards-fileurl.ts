/**
 * Corrige el bug de enero-2026: Standard.fileUrl quedo guardado como ruta
 * absoluta del disco del servidor (file.path de multer) en vez de ruta web
 * relativa. Convierte cada fileUrl absoluto a su equivalente bajo /uploads/,
 * y re-extrae el contenido para las normas que quedaron con content vacio o
 * casi vacio (fallo de extraccion original, ej. XLSX o PDF escaneado).
 *
 * Uso: npx ts-node src/scripts/fix-standards-fileurl.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

const prisma = new PrismaClient();
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

function toWebRelative(fileUrl: string): string | null {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('/uploads/')) return fileUrl; // ya corregido
    const idx = fileUrl.indexOf('/uploads/');
    if (idx === -1) return null;
    return fileUrl.substring(idx);
}

async function main() {
    const standards = await prisma.standard.findMany();
    console.log(`Revisando ${standards.length} normas...`);

    let fixedUrls = 0;
    let fixedContent = 0;

    for (const s of standards) {
        const updates: any = {};

        if (s.fileUrl) {
            const relative = toWebRelative(s.fileUrl);
            if (relative && relative !== s.fileUrl) {
                updates.fileUrl = relative;
            }
        }

        const needsContent = !s.content || s.content.trim().length < 200;
        if (needsContent && s.fileUrl) {
            const relative = toWebRelative(s.fileUrl) || s.fileUrl;
            const absolutePath = relative.startsWith('/uploads/')
                ? path.join(UPLOADS_ROOT, relative.substring('/uploads/'.length))
                : relative;
            if (fs.existsSync(absolutePath) && absolutePath.toLowerCase().endsWith('.pdf')) {
                try {
                    const dataBuffer = fs.readFileSync(absolutePath);
                    const data = await pdfParse(dataBuffer);
                    if (data.text && data.text.trim().length > (s.content?.trim().length || 0)) {
                        updates.content = data.text.substring(0, 100000);
                    }
                } catch (error) {
                    console.warn(`  No se pudo re-extraer "${s.title}": ${error}`);
                }
            } else {
                console.warn(`  "${s.title}": archivo no encontrado o no es PDF en ${absolutePath}`);
            }
        }

        if (Object.keys(updates).length > 0) {
            await prisma.standard.update({ where: { id: s.id }, data: updates });
            if (updates.fileUrl) { fixedUrls++; console.log(`  fileUrl corregido: "${s.title}"`); }
            if (updates.content) { fixedContent++; console.log(`  content re-extraido: "${s.title}" (${updates.content.length} chars)`); }
        }
    }

    console.log(`\nListo. fileUrl corregidos: ${fixedUrls}. content re-extraido: ${fixedContent}.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
