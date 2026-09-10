import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/ai.service';
import fs from 'fs';
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient();

export const chat = async (req: Request, res: Response) => {
    try {
        const { message, model, pageContext } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 🔥 OBTENER TODO EL CONTEXTO DE LA BASE DE DATOS
        const [oits, templates, standards, resources] = await Promise.all([
            prisma.oIT.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50 // Últimos 50 OITs
            }),
            prisma.samplingTemplate.findMany(),
            prisma.standard.findMany(),
            prisma.resource.findMany()
        ]);

        // Si el usuario esta viendo una OIT especifica, se trae su detalle completo
        // para que el asistente responda con contexto exacto de esa pantalla
        let currentOitBlock = '';
        if (pageContext?.oitId) {
            const currentOit = await prisma.oIT.findUnique({
                where: { id: pageContext.oitId },
                include: { assignedEngineers: { include: { user: { select: { name: true, email: true } } } }, quotation: true }
            });
            if (currentOit) {
                currentOitBlock = `
🔎 EL USUARIO ESTÁ VIENDO AHORA MISMO ESTA OIT (responde con esto como prioridad si la pregunta se refiere a "esta OIT", "esta orden", etc.):
- OIT #${currentOit.oitNumber}
  Estado: ${currentOit.status}
  Descripción: ${currentOit.description || 'N/A'}
  Ubicación: ${currentOit.location || 'N/A'}
  Fecha programada: ${currentOit.scheduledDate ? new Date(currentOit.scheduledDate).toLocaleDateString() : 'No programada'}
  Ingenieros asignados: ${currentOit.assignedEngineers.map(a => a.user.name).join(', ') || 'Ninguno'}
  Cotización relacionada: ${currentOit.quotation?.quotationNumber || 'N/A'}
`;
            }
        }

        // Construir contexto enriquecido
        const contextPrompt = `
Eres un asistente experto del sistema ALS Xmart para gestión de Órdenes de Inspección y Toma de muestras (OIT).
${currentOitBlock}
CONTEXTO DE LA BASE DE DATOS:

📊 OITs EN SISTEMA (${oits.length} total):
${oits.slice(0, 10).map((oit: any) => `
- OIT #${oit.oitNumber}
  Estado: ${oit.status}
  Descripción: ${oit.description || 'N/A'}
  Fecha: ${oit.createdAt.toLocaleDateString()}
  Planeación aceptada: ${oit.planningAccepted ? 'Sí' : 'No'}
  Tiene muestreo: ${oit.samplingData ? 'Sí' : 'No'}
`).join('\n')}
${oits.length > 10 ? `... y ${oits.length - 10} OITs más` : ''}

🧪 PLANTILLAS DE MUESTREO (${templates.length} total):
${templates.map((t: any) => `
- ${t.name}
  Tipo OIT: ${t.oitType}
  Descripción: ${t.description}
  Pasos: ${JSON.parse(t.steps).length} pasos configurados
`).join('\n')}

📋 NORMAS Y ESTÁNDARES (${standards.length} total):
${standards.map((s: any) => `
- ${s.title}
  Tipo: ${s.type}
  Descripción: ${s.description}
`).join('\n')}

🔧 RECURSOS DISPONIBLES (${resources.length} total):
${resources.map((r: any) => `
- ${r.name} (${r.type})
  Cantidad: ${r.quantity}
  Estado: ${r.status}
`).join('\n')}

ESTADÍSTICAS:
- OITs Pendientes: ${oits.filter((o: any) => o.status === 'PENDING').length}
- OITs En Análisis: ${oits.filter((o: any) => o.status === 'ANALYZING').length}
- OITs Agendados: ${oits.filter((o: any) => o.status === 'SCHEDULED').length}
- OITs En Progreso: ${oits.filter((o: any) => o.status === 'IN_PROGRESS').length}
- OITs Completados: ${oits.filter((o: any) => o.status === 'COMPLETED').length}

Usa esta información para dar respuestas precisas y útiles sobre el estado del sistema.

PREGUNTA DEL USUARIO: ${message}

Responde de manera clara, profesional y basándote en los datos reales del sistema.
`.trim();

        const response = await aiService.chat(contextPrompt, model);
        res.json({ response });
    } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
};

export const getModels = async (req: Request, res: Response) => {
    try {
        const models = await aiService.getModels();
        const available = await aiService.isAvailable();

        res.status(200).json({
            available,
            models,
            defaultModel: process.env.OLLAMA_MODEL || 'gpt-oss'
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch models' });
    }
};

export const analyzeDocument = async (req: Request, res: Response) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: 'Document text is required' });
        }

        const analysis = await aiService.analyzeDocument(text);
        res.status(200).json(analysis);
    } catch (error) {
        res.status(500).json({ message: 'Analysis failed' });
    }
};

export const recommendResources = async (req: Request, res: Response) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: 'Document text is required' });
        }

        const recommendations = await aiService.recommendResources(text);
        res.status(200).json({ recommendations });
    } catch (error) {
        res.status(500).json({ message: 'Recommendation failed' });
    }
};



export const validateOITDocuments = async (req: Request, res: Response) => {
    try {
        console.log('🔍 [VALIDATE] Iniciando validación de documentos OIT');

        // Check if files were uploaded
        if (!req.files || typeof req.files !== 'object') {
            console.log('❌ [VALIDATE] No se recibieron archivos');
            return res.status(400).json({
                valid: false,
                message: 'Se requieren ambos archivos PDF',
                errors: ['No se recibieron archivos']
            });
        }

        const uploaded = req.files as { [fieldname: string]: Express.Multer.File[] };
        const oitFile = uploaded['oitFile']?.[0];
        const quotationFile = uploaded['quotationFile']?.[0];

        console.log('📄 [VALIDATE] Archivos recibidos:', {
            oitFile: oitFile?.originalname,
            quotationFile: quotationFile?.originalname
        });

        if (!oitFile || !quotationFile) {
            console.log('❌ [VALIDATE] Falta uno o ambos archivos');
            return res.status(400).json({
                valid: false,
                message: 'Se requieren ambos archivos: OIT y Cotización',
                errors: ['Falta uno o ambos archivos PDF']
            });
        }

        // Validate file types
        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(oitFile.mimetype) || !allowedTypes.includes(quotationFile.mimetype)) {
            console.log('❌ [VALIDATE] Formato de archivo inválido');
            return res.status(400).json({
                valid: false,
                message: 'Los archivos deben ser PDF o TXT',
                errors: ['Formato de archivo inválido. Use PDF o TXT.']
            });
        }

        console.log('📦 [VALIDATE] Extrayendo buffers de archivos...');
        // Helper to get a Buffer regardless of storage engine
        const getFileBuffer = async (file: Express.Multer.File): Promise<Buffer> => {
            if (file.buffer) return file.buffer;
            if (file.path) return await fs.promises.readFile(file.path);
            throw new Error('Archivo inválido');
        };
        const oitBuf = await getFileBuffer(oitFile);
        const quotationBuf = await getFileBuffer(quotationFile);
        console.log('✅ [VALIDATE] Buffers extraídos:', {
            oitSize: `${Math.round(oitBuf.length / 1024)}KB`,
            quotationSize: `${Math.round(quotationBuf.length / 1024)}KB`
        });

        console.log('📖 [VALIDATE] Extrayendo texto de documentos...');
        let oitText = '';
        let quotationText = '';

        const extractText = async (file: Express.Multer.File, buffer: Buffer) => {
            if (file.mimetype === 'text/plain') {
                return buffer.toString('utf-8');
            } else if (file.mimetype === 'application/pdf') {
                const res = await pdfParse(buffer);
                return res.text;
            }
            return '';
        };

        try {
            oitText = (await extractText(oitFile, oitBuf)).trim();
            quotationText = (await extractText(quotationFile, quotationBuf)).trim();

            console.log('✅ [VALIDATE] Texto extraído:', {
                oitTextLength: oitText.length,
                quotationTextLength: quotationText.length
            });
        } catch (err) {
            console.log('⚠️ [VALIDATE] Error al extraer texto:', err);
        }

        const MAX_BASE64_CHARS = 8000;
        const fileSummaries = [
            {
                name: oitFile.originalname || 'oit.pdf',
                sizeKB: Math.round(oitBuf.length / 1024),
                base64Preview: oitBuf.toString('base64').slice(0, MAX_BASE64_CHARS),
            },
            {
                name: quotationFile.originalname || 'cotizacion.pdf',
                sizeKB: Math.round(quotationBuf.length / 1024),
                base64Preview: quotationBuf.toString('base64').slice(0, MAX_BASE64_CHARS),
            },
        ];

        console.log('🤖 [VALIDATE] Enviando a servicio de IA...');
        // Combine both texts for analysis
        const combinedText = `
OIT Document:
${oitText}

Cotización Document:
${quotationText}
        `.trim();

        const result = await aiService.extractOITData(combinedText);
        console.log('✅ [VALIDATE] Respuesta de IA recibida:', result);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error validating OIT documents:', error);
        res.status(500).json({
            valid: false,
            message: 'Error al validar documentos',
            errors: [error.message || 'Error interno del servidor']
        });
    }
};
