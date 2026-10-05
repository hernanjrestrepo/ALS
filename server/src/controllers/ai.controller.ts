import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/ai.service';
import { buildAssistantContext, ASSISTANT_SYSTEM_PROMPT, statusLabel } from '../services/assistantContext';
import fs from 'fs';
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient();


// Preguntas de hecho concreto (estado de una OIT, existencia de una norma) se
// responden DIRECTO desde la base de datos, sin pasar por el modelo de IA local.
// Se probo en vivo que el modelo (7B cuantizado) inventa respuestas incorrectas
// incluso con el dato correcto justo delante en el prompt - para este tipo de
// pregunta no hace falta "generar" nada, el dato ya existe, solo hay que devolverlo.
function tryDeterministicAnswer(
    message: string,
    currentOit: any | null,
    oits: any[],
    standards: any[]
): string | null {
    const msg = message.toLowerCase();

    const asksStatus = /estado|c[oó]mo va|en qu[eé] va/.test(msg);
    const refersToCurrentOit = /esta oit|esa oit|esta orden|dicha oit/.test(msg);
    if (asksStatus && refersToCurrentOit && currentOit) {
        return `El estado de la OIT #${currentOit.oitNumber} es "${statusLabel(currentOit.status)}".`;
    }

    const oitNumberMatch = msg.match(/oit\s*#?\s*([a-z0-9-]{2,})/i);
    if (asksStatus && oitNumberMatch) {
        const number = oitNumberMatch[1];
        const found = oits.find((o: any) => o.oitNumber.toLowerCase() === number.toLowerCase());
        if (found) {
            return `El estado de la OIT #${found.oitNumber} es "${statusLabel(found.status)}".`;
        }
        return `No encontré ninguna OIT con el número "${number}" en el sistema.`;
    }

    const normaMatch = msg.match(/(?:existe|hay|tenemos)\s+(?:la\s+|una\s+)?norma\s+(?:llamada\s+|de\s+)?["']?([^"'?.]+)["']?/i)
        || msg.match(/norma\s+["']?([^"'?.]+)["']?\s+existe/i);
    if (normaMatch) {
        const term = normaMatch[1].trim();
        const matches = standards.filter((s: any) =>
            s.title.toLowerCase().includes(term.toLowerCase())
        );
        if (matches.length > 0) {
            return `Sí, existe en el sistema: ${matches.map((s: any) => `"${s.title}"`).join(', ')}.`;
        }
        return `No encontré ninguna norma que coincida con "${term}" en el sistema. Puede que el nombre sea distinto - revisa el listado completo en el módulo Normas.`;
    }

    return null;
}

export const chat = async (req: Request, res: Response) => {
    try {
        const { message, model, pageContext, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        const userId = (req as any).user?.userId;

        // Foto completa del sistema (una linea por registro; ver services/assistantContext.ts)
        const [oits, quotations, templates, standards, resources, users, nonConformities, unreadNotifications] = await Promise.all([
            prisma.oIT.findMany({
                orderBy: { createdAt: 'desc' },
                take: 200,
                include: { assignedEngineers: { include: { user: { select: { name: true, email: true } } } }, quotation: true }
            }),
            prisma.quotation.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { quotationNumber: true, clientName: true, status: true, approvedForOit: true, createdAt: true, description: true } }),
            prisma.samplingTemplate.findMany({ where: { deletedAt: null } }),
            prisma.standard.findMany({ select: { title: true, type: true, description: true } }),
            prisma.resource.findMany(),
            prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true, role: true } }),
            prisma.nonConformity.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { oit: { select: { oitNumber: true } } } }),
            userId ? prisma.notification.count({ where: { userId, read: false } }) : Promise.resolve(0),
        ]);

        const currentOit: any = pageContext?.oitId ? oits.find((o: any) => o.id === pageContext.oitId) || null : null;

        // Preguntas de hecho concreto se responden directo desde la base de datos,
        // sin arriesgar que el modelo invente algo - ver tryDeterministicAnswer arriba.
        const deterministicAnswer = tryDeterministicAnswer(message, currentOit, oits, standards);
        if (deterministicAnswer) {
            return res.json({ response: deterministicAnswer });
        }

        const context = buildAssistantContext(
            { oits, quotations, templates, standards, resources, users, nonConformities, unreadNotifications },
            message,
            { currentOitId: currentOit?.id }
        );

        // Ultimos turnos de la conversacion (la pagina del Asistente los envia), recortados
        const turns: Array<{ role: string; content: string }> = Array.isArray(history) ? history.slice(-6) : [];
        const historyBlock = turns.length
            ? `CONVERSACIÓN PREVIA:\n${turns.map(t => `${t.role === 'user' ? 'Usuario' : 'Asistente'}: ${String(t.content || '').slice(0, 600)}`).join('\n')}\n\n`
            : '';

        const prompt = `DATOS ACTUALES DEL SISTEMA:\n\n${context}\n\n${historyBlock}PREGUNTA DEL USUARIO: ${message}`;

        const response = await aiService.chat(prompt, model, ASSISTANT_SYSTEM_PROMPT);
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
