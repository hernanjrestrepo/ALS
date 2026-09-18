import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Get all quotations
export const getQuotations = async (req: Request, res: Response) => {
    try {
        const quotations = await prisma.quotation.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                linkedOITs: {
                    select: { id: true, oitNumber: true, status: true }
                },
                client: { select: { id: true, name: true } },
                service: { select: { id: true, name: true } }
            }
        });
        res.json(quotations);
    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({ error: 'Error al obtener cotizaciones' });
    }
};

// Get single quotation by ID
export const getQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const quotation = await prisma.quotation.findUnique({
            where: { id },
            include: {
                linkedOITs: {
                    select: { id: true, oitNumber: true, status: true, description: true }
                },
                client: true,
                service: true
            }
        });

        if (!quotation) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        res.json(quotation);
    } catch (error) {
        console.error('Error fetching quotation:', error);
        res.status(500).json({ error: 'Error al obtener cotización' });
    }
};

// Create new quotation
export const createQuotation = async (req: Request, res: Response) => {
    try {
        const { quotationNumber, description, clientName, clientId, serviceId } = req.body;
        const file = req.file;

        // Generate quotation number if not provided
        const finalQuotationNumber = quotationNumber || `COT-${Date.now()}`;

        // Store file URL with /uploads/ prefix for consistency
        const fileUrl = file ? `/uploads/${file.filename}` : undefined;

        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber: finalQuotationNumber,
                description,
                clientName,
                clientId: clientId || undefined,
                serviceId: serviceId || undefined,
                fileUrl,
                status: file ? 'ANALYZING' : 'PENDING'
            }
        });

        res.status(201).json(quotation);

        // Trigger analysis in background if file was uploaded
        if (file && fileUrl) {
            runQuotationAnalysis(quotation.id, fileUrl).catch(err => {
                console.error('Error in background quotation analysis:', err);
            });
        }
    } catch (error) {
        console.error('Error creating quotation:', error);
        res.status(500).json({ error: 'Error al crear cotización' });
    }
};

// Update quotation
export const updateQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { quotationNumber, description, clientName, status } = req.body;
        const file = req.file;

        const data: any = {};
        if (quotationNumber) data.quotationNumber = quotationNumber;
        if (description !== undefined) data.description = description;
        if (clientName !== undefined) data.clientName = clientName;
        if (status) data.status = status;

        let shouldReanalyze = false;
        if (file) {
            data.fileUrl = `/uploads/${file.filename}`;
            data.status = 'ANALYZING';
            shouldReanalyze = true;
        }

        const quotation = await prisma.quotation.update({
            where: { id },
            data
        });

        res.json(quotation);

        // Trigger re-analysis if file was updated
        if (shouldReanalyze && quotation.fileUrl) {
            runQuotationAnalysis(id, quotation.fileUrl).catch(err => {
                console.error('Error in background quotation re-analysis:', err);
            });
        }
    } catch (error) {
        console.error('Error updating quotation:', error);
        res.status(500).json({ error: 'Error al actualizar cotización' });
    }
};

// Delete quotation
export const deleteQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if quotation is linked to any OITs
        const linkedOITs = await prisma.oIT.count({
            where: { quotationId: id }
        });

        if (linkedOITs > 0) {
            return res.status(400).json({
                error: `No se puede eliminar: esta cotización está vinculada a ${linkedOITs} OIT(s)`
            });
        }

        // Get quotation to delete file
        const quotation = await prisma.quotation.findUnique({ where: { id } });

        if (quotation?.fileUrl) {
            try {
                fs.unlinkSync(quotation.fileUrl);
            } catch (e) {
                console.warn('Could not delete file:', e);
            }
        }

        await prisma.quotation.delete({ where: { id } });
        res.json({ message: 'Cotización eliminada' });
    } catch (error) {
        console.error('Error deleting quotation:', error);
        res.status(500).json({ error: 'Error al eliminar cotización' });
    }
};

// Analyze quotation for compliance
export const analyzeQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        if (!quotation.fileUrl) {
            return res.status(400).json({ error: 'La cotización no tiene archivo adjunto para analizar' });
        }

        // Update status to analyzing
        await prisma.quotation.update({
            where: { id },
            data: { status: 'ANALYZING' }
        });

        // Return immediate response
        res.json({
            message: 'Análisis iniciado',
            quotationId: id,
            status: 'ANALYZING'
        });

        // Run analysis in background
        runQuotationAnalysis(id, quotation.fileUrl).catch(err => {
            console.error('Error in background quotation analysis:', err);
        });

    } catch (error) {
        console.error('Error analyzing quotation:', error);
        res.status(500).json({ error: 'Error al analizar cotización' });
    }
};

// Background analysis function
async function runQuotationAnalysis(quotationId: string, fileUrl: string) {
    try {
        console.log(`[Quotation] Starting compliance analysis for ${quotationId}`);

        // Import services
        const { pdfService } = require('../services/pdf.service');
        const { aiService } = require('../services/ai.service');

        // Resolve file path
        const uploadsRoot = path.join(__dirname, '../../');
        let filePath = fileUrl;
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(uploadsRoot, fileUrl.replace(/^\//, ''));
        }
        if (!fs.existsSync(filePath)) {
            filePath = path.join(uploadsRoot, 'uploads', path.basename(fileUrl));
        }

        if (!fs.existsSync(filePath)) {
            console.error(`[Quotation] File not found: ${filePath}`);
            await prisma.quotation.update({
                where: { id: quotationId },
                data: {
                    status: 'REVIEW_REQUIRED',
                    complianceResult: JSON.stringify({
                        error: 'Archivo no encontrado',
                        message: 'No se pudo localizar el archivo de cotización para análisis'
                    })
                }
            });
            return;
        }

        // Extract text from PDF
        console.log(`[Quotation] Extracting text from: ${filePath}`);
        let extractedText = '';
        try {
            extractedText = await pdfService.extractText(filePath);
            console.log(`[Quotation] Extracted ${extractedText.length} characters`);
        } catch (extractError) {
            console.error('[Quotation] Text extraction error:', extractError);
            extractedText = 'Error al extraer texto del documento';
        }

        // Fetch ALL standards from database - no limit
        console.log(`[Quotation] Fetching ALL standards from database...`);
        const standards = await prisma.standard.findMany({
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[Quotation] Found ${standards.length} total standards to verify against`);

        // Build standards content for AI prompt - include FULL content of each standard
        const standardsContent = standards.map(s => {
            return `
### NORMA: ${s.title}
**Categoría:** ${s.category || 'general'}
**Tipo:** ${s.type}
**Descripción:** ${s.description || 'N/A'}
**Contenido Normativo Completo:**
${s.content || 'Sin contenido'}
`;
        }).join('\n---\n');

        // Build EXHAUSTIVE compliance check prompt
        const systemPrompt = `Eres un auditor de calidad que SOLO reporta errores REALES.

REGLA #1: NO INVENTES ERRORES
- Si un parámetro (como pH, DBO, etc.) APARECE en el documento, NO lo reportes como faltante
- Lee el documento COMPLETO antes de decidir qué falta
- Si no estás 100% seguro de que algo falta, NO lo reportes

REGLA #2: NO INVENTES NORMAS
- Solo usa las normas que el documento MENCIONA en "Documentos de referencia"
- Si el documento dice "Resolución 0699", solo verificas contra 0699
- NO uses otras normas aunque las conozcas`;

        const prompt = `
## DOCUMENTO A ANALIZAR
${extractedText}

## NORMAS DISPONIBLES (solo como referencia)
${standardsContent || 'Sin normas configuradas.'}

## INSTRUCCIONES

PASO 1: Lee el documento y encuentra la sección "Documentos de referencia" o "Normativa"
PASO 2: Lista SOLO las normas que el documento menciona (ej: "Resolución 0699")
PASO 3: Lee TODOS los parámetros/análisis que el documento ofrece
PASO 4: Si alguna norma mencionada exige un parámetro que NO está en el documento, repórtalo

⚠️ MUY IMPORTANTE - ANTI-ALUCINACIÓN:
- Si el documento incluye "pH" en su lista de análisis, NO reportes "pH faltante"
- Si el documento incluye "Coliformes", NO reportes "Coliformes faltante"  
- SOLO reporta como faltante algo que REALMENTE no está en el documento
- Si no hay errores reales, responde con "compliant": true y "issues": []

## RESPONDE EN JSON:
{
  "compliant": true si no hay errores reales / false si hay errores,
  "score": 100 si cumple / menos si hay errores reales,
  "summary": "Descripción breve",
  "appliedStandards": ["solo las normas que el DOCUMENTO menciona"],
  "foundParameters": ["lista de parámetros que SÍ encontraste en el documento"],
  "issues": [solo errores REALES - si no hay, dejar vacío],
  "compliantItems": ["requisitos que sí cumple"],
  "missingParameters": [solo parámetros que REALMENTE faltan],
  "recommendations": ["recomendaciones si aplica"]
}

Recuerda: Es mejor reportar 0 errores que inventar errores falsos.

`;

        // Run AI compliance check
        console.log(`[Quotation] Running AI compliance check...`);
        let complianceResult: any;

        try {
            const aiResponse = await aiService.chat(prompt, undefined, systemPrompt);

            // Parse JSON response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
            complianceResult = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('[Quotation] Error parsing AI compliance response:', parseError);
            complianceResult = {
                compliant: false,
                score: 0,
                summary: 'Error al analizar la respuesta de la IA.',
                issues: [{
                    severity: 'WARNING',
                    category: 'Sistema',
                    description: 'No se pudo completar el análisis automático',
                    recommendation: 'Revisar manualmente la cotización'
                }],
                recommendations: ['Verificar manualmente el cumplimiento normativo']
            };
        }

        // Ensure required fields
        complianceResult.appliedStandards = complianceResult.appliedStandards || standards.map(s => s.title);
        complianceResult.issues = complianceResult.issues || [];
        complianceResult.analyzedAt = new Date().toISOString();
        complianceResult.standardsCount = standards.length;

        // Determine final status
        let finalStatus = 'REVIEW_REQUIRED';
        if (complianceResult.compliant === true && complianceResult.score >= 80) {
            finalStatus = 'COMPLIANT';
        } else if (complianceResult.compliant === false || complianceResult.score < 50) {
            finalStatus = 'NON_COMPLIANT';
        }

        // Also run general document analysis for additional info
        const generalAnalysis = await aiService.analyzeDocument(extractedText);

        // Update quotation with results. approvedForOit es el bloqueo real pedido en
        // la reunion del 2026-09-18: solo una cotizacion COMPLIANT puede usarse para
        // crear una OIT (createOITAsync lo verifica) - antes esto era solo informativo.
        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                status: finalStatus,
                extractedText: extractedText.substring(0, 10000),
                aiData: JSON.stringify({
                    ...generalAnalysis,
                    rawResponse: generalAnalysis.rawResponse
                }),
                complianceResult: JSON.stringify(complianceResult),
                approvedForOit: finalStatus === 'COMPLIANT'
            }
        });

        console.log(`[Quotation] Compliance check complete for ${quotationId}.Status: ${finalStatus}, Score: ${complianceResult.score}/100`);

    } catch (error: any) {
        console.error(`[Quotation] Analysis failed for ${quotationId}:`, error);
        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                status: 'REVIEW_REQUIRED',
                complianceResult: JSON.stringify({
                    error: error.message || 'Error desconocido',
                    message: 'El análisis automático falló. Por favor revise manualmente.',
                    issues: [{
                        severity: 'CRITICAL',
                        category: 'Sistema',
                        description: `Error en análisis: ${error.message}`,
                        recommendation: 'Contactar soporte técnico'
                    }]
                })
            }
        });
    }
}

// Correo automatico -> resumen (pedido en la reunion 2026-09-18): procesa el texto
// de una solicitud de cotizacion recibida por correo y genera un resumen ejecutivo
// para que el area comercial solo tenga que ponerle precio, en vez de leer el
// correo completo y armar la cotizacion desde cero.
//
// IMPORTANTE: este endpoint recibe el CONTENIDO del correo (asunto + cuerpo) ya
// extraido - no lee ningun buzon por si mismo. Conectarlo a un buzon real
// (reenvio automatico, IMAP, o SES receiving) es una decision de infraestructura
// pendiente, igual que paso con la verificacion de SES: requiere elegir el
// mecanismo y, segun cual sea, credenciales o acceso a DNS que solo Hernan puede dar.
export const processEmailRequest = async (req: Request, res: Response) => {
    try {
        const { fromEmail, subject, body } = req.body;
        if (!body || typeof body !== 'string' || body.trim().length < 10) {
            return res.status(400).json({ error: 'Falta el cuerpo del correo (campo "body")' });
        }

        const { aiService } = require('../services/ai.service');

        const systemPrompt = 'Eres un asistente que procesa solicitudes de cotizacion de servicios ambientales recibidas por correo, para el area comercial de un laboratorio ambiental.';
        const prompt = `Un cliente envio este correo solicitando una cotizacion. Extrae la informacion y responde SOLO con JSON valido, sin texto adicional:

{
  "clientNameGuess": "nombre del cliente o empresa que se identifica en el correo, o null si no es claro",
  "siteGuess": "sitio o ubicacion mencionada, o null",
  "requestedServices": ["lista de servicios ambientales solicitados, en lenguaje claro"],
  "requiredDocuments": ["documentos o requisitos que el cliente menciona que exige (manual de contratistas, polizas, etc.), vacio si no menciona ninguno"],
  "summary": "resumen ejecutivo de 2-4 frases de lo que se necesita, para que el area comercial solo tenga que ponerle precio",
  "missingInfo": ["informacion que falta para poder cotizar con precision, vacio si no falta nada"]
}

CORREO (de: ${fromEmail || 'remitente no especificado'}, asunto: ${subject || 'sin asunto'}):
${body.substring(0, 8000)}

JSON:`;

        const aiResponse = await aiService.chat(prompt, undefined, systemPrompt);
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        let extracted: any;
        try {
            extracted = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
        } catch (e) {
            extracted = { summary: 'No se pudo procesar automaticamente el correo. Revisar manualmente.', requestedServices: [], requiredDocuments: [], missingInfo: [] };
        }

        // Se crea como borrador (PENDING, sin archivo) para que el area comercial la
        // complete: le asigne el Cliente real (creandolo si no existe todavia, con su
        // documentacion), el Servicio, el precio, y el documento formal de cotizacion.
        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber: `SOL-${Date.now()}`,
                description: extracted.summary || 'Solicitud recibida por correo - revisar y completar',
                clientName: extracted.clientNameGuess || undefined,
                status: 'PENDING',
                aiData: JSON.stringify({
                    source: 'email',
                    fromEmail: fromEmail || null,
                    subject: subject || null,
                    ...extracted
                })
            }
        });

        // Notifica a todo el equipo comercial (ADMIN+) para que la complete
        const commercialTeam = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
            select: { id: true }
        });
        const { createNotification } = require('./notification.controller');
        for (const u of commercialTeam) {
            await createNotification(
                u.id,
                'Nueva solicitud de cotización por correo',
                `${extracted.clientNameGuess || 'Cliente sin identificar'}: ${extracted.summary || 'Revisar solicitud recibida'}`.substring(0, 400),
                'INFO'
            );
        }

        res.status(201).json({ quotation, extracted });
    } catch (error) {
        console.error('Error processing email request:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud de correo' });
    }
};

