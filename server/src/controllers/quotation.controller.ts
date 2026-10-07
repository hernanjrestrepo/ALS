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
        const { quotationNumber, description, clientName, clientId, serviceId, status } = req.body;
        const file = req.file;

        const data: any = {};
        if (quotationNumber) data.quotationNumber = quotationNumber;
        if (description !== undefined) data.description = description;
        if (clientName !== undefined) data.clientName = clientName;
        if (clientId !== undefined) data.clientId = clientId || null;
        if (serviceId !== undefined) data.serviceId = serviceId || null;
        if (status) data.status = status;

        let shouldReanalyze = false;
        if (file) {
            data.fileUrl = `/uploads/${file.filename}`;
            data.status = 'ANALYZING';
            // El archivo cambio: la aprobacion contra la norma ya no aplica hasta que
            // el re-analisis termine (si no, quedaria "aprobada" con un archivo distinto).
            data.approvedForOit = false;
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

// Extrae numeros de norma citados en el propio documento (ej. "Resolucion 0699",
// "Decreto 1076") de forma deterministica, sin IA. Mismo principio que el filtrado
// por categoria que ya usa el motor de OITs (compliance.service.ts): no le pasamos
// a la IA normas que el documento ni siquiera menciona.
function extractCitedStandardNumbers(text: string): Set<string> {
    const regex = /(?:resoluci[oó]n|decreto|res\.?)\s*(?:n[°º]?\.?\s*)?0*(\d{2,4})\b/gi;
    const numbers = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
        numbers.add(match[1].replace(/^0+/, ''));
    }
    return numbers;
}

// Cotizacion no trae numero real de Sistema Serambiente en ningun campo del
// formulario (hallazgo de la reunion 2026-10-05) - se extrae del propio PDF en
// el mismo analisis que ya se corre al subir el archivo, en vez de agregar un
// campo manual que el area comercial tendria que llenar aparte.
const AUTO_GENERATED_NUMBER = /^COT-\d+$/;

// Background analysis function
export async function runQuotationAnalysis(quotationId: string, fileUrl: string) {
    try {
        console.log(`[Quotation] Starting compliance analysis for ${quotationId}`);

        // Import services
        const { pdfService } = require('../services/pdf.service');
        const { aiService, AIService } = require('../services/ai.service');

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
                    approvedForOit: false,
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

        // Filtrar normas: solo las que el documento realmente cita por numero.
        // Si no cita ninguna (o ninguna hace match en la BD), se cae a revisar
        // contra las 29 disponibles - pero siempre con el prompt riguroso, nunca
        // con el sesgo de "mejor no reportar nada" que tenia antes.
        const allStandards = await prisma.standard.findMany({ orderBy: { createdAt: 'desc' } });
        const citedNumbers = extractCitedStandardNumbers(extractedText);
        let standards = citedNumbers.size > 0
            ? allStandards.filter(s => {
                const titleNumbers = extractCitedStandardNumbers(s.title);
                return [...titleNumbers].some(n => citedNumbers.has(n));
            })
            : [];
        const usedFallbackAllStandards = standards.length === 0;
        if (usedFallbackAllStandards) {
            standards = allStandards;
        }

        console.log(`[Quotation] Normas citadas detectadas: ${[...citedNumbers].join(', ') || 'ninguna'}. Usando ${standards.length} de ${allStandards.length} normas${usedFallbackAllStandards ? ' (fallback: sin match, se usan todas)' : ''}.`);

        // Truncar cada norma a 8000 caracteres para no saturar el contexto -
        // igual que hace compliance.service.ts para las OITs.
        const standardsContent = standards.map(s => {
            const content = (s.content || s.description || 'Sin contenido').substring(0, 8000);
            return `### NORMA: ${s.title} (categoría: ${s.category || 'general'})\n${content}`;
        }).join('\n---\n');

        // Auditor riguroso, sin sesgo hacia "mejor 0 errores que inventar" - ese
        // sesgo era la causa real de que cotizaciones con errores reales salieran
        // aprobadas al 100% (hallazgo de la reunion 2026-10-05 con Ana Melendez).
        const systemPrompt = `Eres un auditor técnico riguroso de cotizaciones ambientales. Tu trabajo es encontrar discrepancias reales, no evitarlas.

REGLAS:
- Compara, parámetro por parámetro, lo que la COTIZACIÓN ofrece contra lo que exigen las NORMAS citadas.
- NO asumas conformidad por defecto. Marca "compliant": true SOLO si verificaste explícitamente que cada parámetro/límite exigido está cubierto.
- Si un parámetro, límite de cuantificación o alcance exigido por la norma no está claramente cubierto en la cotización, es una discrepancia real y debes reportarla en "issues".
- No inventes normas ni parámetros que no existan en los documentos proporcionados - pero tampoco ocultes errores reales por evitar un falso positivo.`;

        const prompt = `
## DOCUMENTO A ANALIZAR (COTIZACIÓN)
${extractedText}

## NORMAS APLICABLES
${standardsContent || 'Sin normas disponibles para comparar.'}

## INSTRUCCIONES
1. Identifica qué parámetros/ensayos ofrece la cotización.
2. Para cada norma arriba, identifica qué parámetros/límites exige.
3. Reporta en "issues" cada parámetro exigido que NO esté cubierto por la cotización, citando la norma y el parámetro específico.
4. Si además encuentras en el documento un número de cotización propio de Sistema Serambiente (ej. "Cotización No. 27065", "COT-27065"), extráelo tal cual aparece.

## RESPONDE SOLO JSON:
{
  "compliant": <true o false, según lo que realmente encontraste>,
  "score": <0 a 100>,
  "summary": "<resumen de 2-3 líneas de tu comparación real>",
  "appliedStandards": ${JSON.stringify(standards.map(s => s.title))},
  "issues": ["<cada discrepancia real encontrada, con norma y parámetro específico>"],
  "recommendations": ["<recomendaciones si aplica>"],
  "quotationNumberFound": "<número de cotización encontrado en el documento, o vacío si no aparece>"
}`;

        // Run AI compliance check
        console.log(`[Quotation] Running AI compliance check...`);
        let complianceResult: any;

        try {
            const aiResponse = await aiService.chat(prompt, undefined, systemPrompt, AIService.DETERMINISTIC);

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

        // Si el documento trae su propio numero de cotizacion y el actual es el
        // autogenerado (COT-<timestamp>), se reemplaza por el real - nunca se
        // pisa un numero que alguien ya haya puesto a mano.
        const updateData: any = {
            status: finalStatus,
            extractedText: extractedText.substring(0, 10000),
            aiData: JSON.stringify({
                ...generalAnalysis,
                rawResponse: generalAnalysis.rawResponse
            }),
            complianceResult: JSON.stringify(complianceResult),
            approvedForOit: finalStatus === 'COMPLIANT'
        };

        const foundNumber = String(complianceResult.quotationNumberFound || '').trim();
        if (foundNumber) {
            const current = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { quotationNumber: true } });
            if (current && AUTO_GENERATED_NUMBER.test(current.quotationNumber)) {
                const clash = await prisma.quotation.findUnique({ where: { quotationNumber: foundNumber } });
                if (!clash) {
                    updateData.quotationNumber = foundNumber;
                    console.log(`[Quotation] Numero real detectado en el PDF: "${foundNumber}" (reemplaza el autogenerado)`);
                } else {
                    console.warn(`[Quotation] Numero "${foundNumber}" detectado en el PDF ya existe en otra cotizacion - se mantiene el autogenerado`);
                }
            }
        }

        // Update quotation with results. approvedForOit es el bloqueo real pedido en
        // la reunion del 2026-09-18: solo una cotizacion COMPLIANT puede usarse para
        // crear una OIT (createOITAsync lo verifica) - antes esto era solo informativo.
        await prisma.quotation.update({
            where: { id: quotationId },
            data: updateData
        });

        console.log(`[Quotation] Compliance check complete for ${quotationId}.Status: ${finalStatus}, Score: ${complianceResult.score}/100`);

    } catch (error: any) {
        console.error(`[Quotation] Analysis failed for ${quotationId}:`, error);
        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                status: 'REVIEW_REQUIRED',
                // Un analisis fallido no puede dejar viva una aprobacion anterior
                approvedForOit: false,
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
        const { createDraftFromEmail } = await import('../services/email-intake.service');
        // La IA puede tardar mas de 60 s (carga en frio del modelo) y nginx corta la
        // conexion con 504 - se responde de inmediato y el borrador llega como
        // cotizacion + notificacion al equipo Comercial cuando termine.
        res.status(202).json({ message: 'Solicitud recibida. El borrador y la notificación al equipo Comercial se generan en segundo plano.' });
        createDraftFromEmail({ fromEmail, subject, body }).catch(err => {
            console.error('Error procesando solicitud de correo en segundo plano:', err);
        });
        return;
    } catch (error) {
        console.error('Error processing email request:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud de correo' });
    }
};


// Revisar el buzon de solicitudes ahora mismo (sin esperar a la vuelta periodica).
export const pollMailbox = async (req: Request, res: Response) => {
    try {
        const { pollMailboxNow } = await import('../services/mailbox-poller.service');
        res.json(await pollMailboxNow());
    } catch (error) {
        console.error('Error revisando el buzon de solicitudes:', error);
        res.status(500).json({ error: 'Error al revisar el buzón' });
    }
};
