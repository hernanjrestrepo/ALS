import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { createNotification } from './notification.controller';
import { pdfService } from '../services/pdf.service';
import { aiService, AIService } from '../services/ai.service';
import {
    extractQuotationNumber, parseComparisonTargets, buildArticleBlocks, describeTarget,
    detectMatrixMismatches, normalizeParameterChecks, applySystemChecks, buildVerdict, isAITimeout,
    buildCompliancePrompt, COMPLIANCE_SYSTEM_PROMPT, BUILTIN_RULES, ParameterRules,
    pendingNameQuestions, consultationKey,
    ParameterCheck, applyFindingReviews, normCoverage, issueKey, normalizeIssues,
    FINDING_DECISIONS, FindingDecision, FindingReviews,
} from '../services/quotationCompliance';
import { linkOitsToQuotation } from '../services/quotationLink';

const prisma = new PrismaClient();

// Reglas aprendidas por consulta al laboratorio (ParameterRule) + listas fijas.
export async function loadParameterRules(): Promise<ParameterRules> {
    const rows = await prisma.parameterRule.findMany();
    const pair = (r: { nameA: string; nameB: string }) => [r.nameA, r.nameB] as [string, string];
    return {
        equivalent: [...BUILTIN_RULES.equivalent, ...rows.filter(r => r.sameParameter).map(pair)],
        nonEquivalent: [...BUILTIN_RULES.nonEquivalent, ...rows.filter(r => !r.sameParameter).map(pair)],
    };
}

// Usuario de ALS que responde las consultas de equivalencia de parametros (Ana Melendez,
// laboratorio). Se configura con CONSULTA_PARAMETROS_USER_EMAIL.
export const CONSULTA_USER_EMAIL = process.env.CONSULTA_PARAMETROS_USER_EMAIL || 'ana.melendez@alsglobal.com';

// Cuando el sistema no puede decidir si dos nombres son el mismo parametro, deja una
// consulta y avisa en la bandeja de ALS (notificacion al usuario). Una pareja ya
// consultada no vuelve a avisar: la respuesta se guarda y se usa en los siguientes analisis.
export async function registerParameterConsultations(questions: ReturnType<typeof pendingNameQuestions>, quotationNumber: string) {
    if (!questions.length) return;
    const recipient = await prisma.user.findFirst({
        where: { email: { equals: CONSULTA_USER_EMAIL, mode: 'insensitive' }, isActive: true },
        select: { id: true },
    });
    if (!recipient) console.warn(`[Consulta] No hay usuario activo ${CONSULTA_USER_EMAIL}: la consulta queda visible en Consultas de parámetros`);

    for (const q of questions) {
        const key = consultationKey(q.normParameter, q.quotedAs);
        if (await prisma.parameterConsultation.findUnique({ where: { key } })) continue;
        try {
            await prisma.parameterConsultation.create({
                data: {
                    key,
                    normParameter: q.normParameter,
                    quotedAs: q.quotedAs,
                    normReference: q.normReference || null,
                    quotationNumber,
                    notifiedUserId: recipient?.id || null,
                    notifiedAt: recipient ? new Date() : null,
                },
            });
        } catch (error) {
            // Dos analisis a la vez pueden crear la misma consulta: la segunda se ignora.
            console.warn('[Consulta] ya existia:', key);
            continue;
        }
        if (recipient) {
            await createNotification(
                recipient.id,
                'Consulta de parámetro',
                `Cotización ${quotationNumber}: la norma pide «${q.normParameter}» y la cotización trae «${q.quotedAs}». ¿Es el mismo parámetro? Respóndala en Consultas de parámetros.`,
                'WARNING',
            );
        }
    }
}

// Consultas al laboratorio (pendientes y respondidas).
export const listParameterConsultations = async (req: Request, res: Response) => {
    try {
        const rows = await prisma.parameterConsultation.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] });
        res.json(rows);
    } catch (error) {
        console.error('Error listing parameter consultations:', error);
        res.status(500).json({ error: 'Error al listar consultas' });
    }
};

// Registra la respuesta del laboratorio. Si son el mismo parametro (o no lo son), la
// pareja queda como regla y los siguientes analisis ya no preguntan.
export const answerParameterConsultation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { same, note } = req.body || {};
        if (typeof same !== 'boolean') {
            return res.status(400).json({ error: 'Falta "same": true o false' });
        }
        const consultation = await prisma.parameterConsultation.findUnique({ where: { id } });
        if (!consultation) return res.status(404).json({ error: 'Consulta no encontrada' });

        const [updated] = await prisma.$transaction([
            prisma.parameterConsultation.update({
                where: { id },
                data: { status: 'RESPONDIDA', answerSame: same, answerNote: note ? String(note).slice(0, 500) : null, answeredAt: new Date() },
            }),
            prisma.parameterRule.upsert({
                where: { nameA_nameB: { nameA: consultation.normParameter, nameB: consultation.quotedAs } },
                create: { nameA: consultation.normParameter, nameB: consultation.quotedAs, sameParameter: same, source: `consulta ${id}` },
                update: { sameParameter: same, source: `consulta ${id}` },
            }),
        ]);
        res.json(updated);
    } catch (error) {
        console.error('Error answering parameter consultation:', error);
        res.status(500).json({ error: 'Error al registrar la respuesta' });
    }
};

// El numero real (SIACOT-...) se lee del PDF al subirlo, sin esperar a la IA:
// antes solo aparecia al terminar el analisis y la pantalla mostraba COT-<hora>.
async function quotationNumberFromPdf(filePath: string): Promise<string | null> {
    try {
        const { pdfService } = require('../services/pdf.service');
        const found = extractQuotationNumber(await pdfService.extractText(filePath));
        if (!found) return null;
        const clash = await prisma.quotation.findUnique({ where: { quotationNumber: found } });
        return clash ? null : found;
    } catch (error) {
        console.warn('[Quotation] No se pudo leer el numero del PDF al subirlo:', error);
        return null;
    }
}

function parseJson<T>(raw: string | null | undefined): T | null {
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
}

// La pantalla recibe la puntuacion y el estado ya con las decisiones de Ana aplicadas,
// tambien para resultados guardados antes de la regla nueva de puntuacion.
export function withEffectiveCompliance(rawResult: string | null, rawReviews: string | null): string | null {
    const result = parseJson<any>(rawResult);
    if (!result) return rawResult;
    const effective = applyFindingReviews(result, parseJson<FindingReviews>(rawReviews) || {});
    const checks: ParameterCheck[] = Array.isArray(result.parameterChecks) ? result.parameterChecks : [];
    return JSON.stringify({
        ...result,
        score: effective.score,
        coverage: checks.length ? normCoverage(checks) : undefined,
        effectiveStatus: effective.status,
        effectiveCompliant: effective.compliant,
        pendingDecisions: effective.pendingDecisions,
        issues: normalizeIssues(result.issues).map(i => ({ ...i, key: issueKey(i) })),
    });
}

async function reviewerOf(req: Request) {
    const userId = (req as any).user?.userId as string | undefined;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null;
    return { userId, userName: user?.name || 'Usuario' };
}

// Decision sobre un hallazgo por revisar o un incumplimiento. Siempre con comentario:
// queda la justificacion de la excepcion (ACEPTADO), lo que se esta verificando
// (EN_REVISION) o por que no procede (RECHAZADO). Recalcula estado y aprobacion para OIT.
export const reviewFinding = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { key, decision, comment } = req.body || {};
        if (!key || typeof key !== 'string') return res.status(400).json({ error: 'Falta el hallazgo' });
        if (!FINDING_DECISIONS.includes(decision)) return res.status(400).json({ error: 'Decisión no válida' });
        const text = String(comment || '').trim();
        if (text.length < 3) return res.status(400).json({ error: 'Escribe el comentario de la decisión' });

        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) return res.status(404).json({ error: 'Cotización no encontrada' });
        if (quotation.status === 'ANALYZING') return res.status(409).json({ error: 'La cotización se está analizando; espera a que termine' });
        const result = parseJson<any>(quotation.complianceResult);
        const issue = normalizeIssues(result?.issues).find(i => issueKey(i) === key);
        if (!issue) return res.status(404).json({ error: 'Ese hallazgo ya no está en el último análisis' });
        if (issue.severity === 'INFO') return res.status(400).json({ error: 'Los hallazgos informativos no requieren decisión' });

        const reviews = parseJson<FindingReviews>(quotation.findingReviews) || {};
        const previous = reviews[key];
        const { userId, userName } = await reviewerOf(req);
        reviews[key] = {
            decision: decision as FindingDecision,
            comment: text.slice(0, 1000),
            userId, userName, at: new Date().toISOString(),
            history: previous
                ? [...(previous.history || []), { decision: previous.decision, comment: previous.comment, userId: previous.userId, userName: previous.userName, at: previous.at }]
                : [],
        };
        const effective = applyFindingReviews(result, reviews);
        const updated = await prisma.quotation.update({
            where: { id },
            data: { findingReviews: JSON.stringify(reviews), status: effective.status, approvedForOit: effective.approvedForOit },
            include: { linkedOITs: { select: { id: true, oitNumber: true, status: true, description: true } } },
        });
        res.json({ ...updated, complianceResult: withEffectiveCompliance(updated.complianceResult, updated.findingReviews) });
    } catch (error) {
        console.error('Error reviewing finding:', error);
        res.status(500).json({ error: 'Error al registrar la decisión' });
    }
};

// Elemento faltante del analisis subsanado en pantalla (escribir y Enter). Un valor
// vacio lo vuelve a dejar pendiente.
export const resolveMissingElement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const item = String(req.body?.item || '').trim();
        const value = String(req.body?.value ?? '').trim();
        if (!item) return res.status(400).json({ error: 'Falta el elemento' });
        const quotation = await prisma.quotation.findUnique({ where: { id }, select: { aiData: true, missingResolutions: true } });
        if (!quotation) return res.status(404).json({ error: 'Cotización no encontrada' });
        const missing: unknown[] = parseJson<any>(quotation.aiData)?.missing || [];
        if (!missing.map(m => String(m).trim()).includes(item)) return res.status(404).json({ error: 'Ese elemento no está en el análisis' });

        const resolutions = parseJson<Record<string, any>>(quotation.missingResolutions) || {};
        if (value) {
            const { userId, userName } = await reviewerOf(req);
            resolutions[item] = { value: value.slice(0, 500), userId, userName, at: new Date().toISOString() };
        } else {
            delete resolutions[item];
        }
        const updated = await prisma.quotation.update({
            where: { id },
            data: { missingResolutions: JSON.stringify(resolutions) },
            include: { linkedOITs: { select: { id: true, oitNumber: true, status: true, description: true } } },
        });
        res.json({ ...updated, complianceResult: withEffectiveCompliance(updated.complianceResult, updated.findingReviews) });
    } catch (error) {
        console.error('Error resolving missing element:', error);
        res.status(500).json({ error: 'Error al guardar el dato' });
    }
};

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

        res.json({ ...quotation, complianceResult: withEffectiveCompliance(quotation.complianceResult, quotation.findingReviews) });
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

        const pdfNumber = !quotationNumber && file && /\.pdf$/i.test(file.originalname)
            ? await quotationNumberFromPdf(file.path)
            : null;
        const finalQuotationNumber = quotationNumber || pdfNumber || `COT-${Date.now()}`;

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

        linkOitsToQuotation(quotation).catch(err => console.error('[Vinculo] Error vinculando OIT a la cotizacion:', err));

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

// Cotizacion no trae numero real de Sistema Serambiente en ningun campo del
// formulario (hallazgo de la reunion 2026-10-05) - se extrae del propio PDF en
// el mismo analisis que ya se corre al subir el archivo, en vez de agregar un
// campo manual que el area comercial tendria que llenar aparte.
const AUTO_GENERATED_NUMBER = /^COT-\d+$/;

// Background analysis function
export async function runQuotationAnalysis(quotationId: string, fileUrl: string) {
    try {
        console.log(`[Quotation] Starting compliance analysis for ${quotationId}`);


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

        // Solo se compara contra el ARTICULO que la cotizacion pide ("Artículo de la
        // norma a comparar"), no contra el comienzo de la norma: el 2026-10-15 la IA
        // recibio los primeros 8000 caracteres del Decreto 1076 y comparo contra el
        // art. 2.2.3.3.9.3 cuando la cotizacion pedia el 2.2.3.3.9.7.
        const current = await prisma.quotation.findUnique({
            where: { id: quotationId },
            select: { quotationNumber: true, findingReviews: true },
        });
                const allStandards = await prisma.standard.findMany({ orderBy: { createdAt: 'desc' } });
        const targets = parseComparisonTargets(extractedText);
        const { blocks, notFound } = buildArticleBlocks(allStandards, targets);
        const warnings: Array<{ category: string; description: string; recommendation?: string }> = [];

        if (!targets.length) {
            warnings.push({
                category: 'Sin artículo a comparar',
                description: 'La cotización no indica el "Artículo de la norma a comparar", así que no se comparó contra ninguna norma.',
                recommendation: 'Indicar en la cotización la norma y el artículo a comparar, y volver a analizar.',
            });
        }
        for (const t of notFound) {
            warnings.push({
                category: 'Artículo no encontrado',
                description: `La cotización pide comparar con el ${describeTarget(t)} de la norma ${t.normNumber || '(sin número)'}, pero ese artículo no está en las normas cargadas en Xmart.`,
                recommendation: 'Revisar manualmente, o cargar en Normas la versión que trae ese artículo.',
            });
        }

        const comparedAgainst = blocks.map(b => `${b.standardTitle} — ${describeTarget(b.target)}`);
        const matrix = detectMatrixMismatches(extractedText);
        console.log(`[Quotation] Artículos a comparar: ${targets.map(t => `${t.normNumber}/${describeTarget(t)}`).join('; ') || 'ninguno'}. Encontrados: ${comparedAgainst.join('; ') || 'ninguno'}. Muestra: ${matrix.sampleMatrix || '?'}, matriz distinta: ${matrix.mismatches.map(m => m.parameter).join(', ') || 'ninguna'}`);

        let checks: ParameterCheck[] = [];
        let aiNumber = '';
        if (blocks.length) {
            const prompt = buildCompliancePrompt(
                extractedText,
                blocks.map(b => ({ label: `${b.standardTitle} — ${describeTarget(b.target)}`, text: b.text })),
            );
            console.log(`[Quotation] Running AI compliance check...`);
            // La IA local atiende una peticion a la vez: si hay analisis de laboratorio
            // en curso, esta espera detras de ellos. Un timeout se reintenta una vez y,
            // si vuelve a fallar, se dice con claridad (no como "la IA no respondio").
            let aiResponse: string | null = null;
            let timedOut = false;
            for (let attempt = 1; attempt <= 2 && aiResponse === null; attempt++) {
                try {
                    aiResponse = await aiService.chat(prompt, undefined, COMPLIANCE_SYSTEM_PROMPT, AIService.DETERMINISTIC, 1_500_000); // 30-oct: con razonamiento bajo la IA devolvio 0 parametros revisados (invalido); se necesita el razonamiento por defecto, y una cotizacion con 2 decretos (SIACOT-20741) paso de 10 min
                } catch (error) {
                    timedOut = isAITimeout(error);
                    console.error(`[Quotation] Intento ${attempt} de la IA fallido${timedOut ? ' (timeout)' : ''}:`, (error as Error)?.message);
                    if (!timedOut) break;
                    // Espera antes de reintentar: si el analisis de laboratorio sigue en curso, el reintento inmediato vuelve a expirar.
                    if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 90_000));
                }
            }
            if (aiResponse !== null) {
                try {
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
                    checks = normalizeParameterChecks(parsed.parameters);
                    aiNumber = String(parsed.quotationNumberFound || '').trim();
                } catch (parseError) {
                    console.error('[Quotation] Error parsing AI compliance response:', parseError);
                }
            }
            if (!checks.length) {
                warnings.push(timedOut && aiResponse === null
                    ? {
                        category: 'IA ocupada',
                        description: 'La IA tardó más de lo esperado en revisar la cotización (suele pasar cuando hay análisis de laboratorio en curso). No se revisó parámetro por parámetro.',
                        recommendation: 'Volver a analizar en unos minutos.',
                    }
                    : {
                        category: 'Sistema',
                        description: 'La IA respondió, pero no se pudo leer la revisión por parámetro del artículo.',
                        recommendation: 'Volver a analizar, o revisar manualmente.',
                    });
            }
        }

        const rules = await loadParameterRules();
        const unmatchedMatrix = applySystemChecks(checks, matrix.mismatches, extractedText, rules);
        // La consulta al laboratorio es secundaria: si falla, no debe tumbar el veredicto.
        try {
            await registerParameterConsultations(pendingNameQuestions(checks), extractQuotationNumber(extractedText) || aiNumber || current?.quotationNumber || quotationId);
        } catch (error) {
            console.error('[Consulta] No se pudo registrar la consulta de parámetros:', error);
        }
        const verdict = buildVerdict({ checks, unmatchedMatrix, comparedAgainst, warnings });
        const finalStatus = verdict.status;
        const complianceResult = {
            ...verdict,
            appliedStandards: [...new Set(blocks.map(b => b.standardTitle))],
            comparedAgainst,
            sampleMatrix: matrix.sampleMatrix,
            parameterChecks: checks,
            unmatchedMatrix,
            warnings,
            analyzedAt: new Date().toISOString(),
            standardsCount: blocks.length,
        };

        // Also run general document analysis for additional info
        const generalAnalysis = await aiService.analyzeDocument(extractedText);

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

        // Si el documento trae su propio numero de cotizacion y el actual es el
        // autogenerado (COT-<timestamp>), se reemplaza por el real - nunca se
        // pisa un numero que alguien ya haya puesto a mano. Primero el SIACOT del
        // encabezado; la IA solo si el documento no lo trae.
        const foundNumber = extractQuotationNumber(extractedText) || aiNumber;
        if (foundNumber && current && AUTO_GENERATED_NUMBER.test(current.quotationNumber)) {
            const clash = await prisma.quotation.findUnique({ where: { quotationNumber: foundNumber } });
            if (!clash) {
                updateData.quotationNumber = foundNumber;
                console.log(`[Quotation] Numero real detectado en el PDF: "${foundNumber}" (reemplaza el autogenerado)`);
            } else {
                console.warn(`[Quotation] Numero "${foundNumber}" detectado en el PDF ya existe en otra cotizacion - se mantiene el autogenerado`);
            }
        }

        // Update quotation with results. approvedForOit es el bloqueo real pedido en
        // la reunion del 2026-09-18: solo una cotizacion COMPLIANT puede usarse para
        // crear una OIT (createOITAsync lo verifica) - antes esto era solo informativo.
        // Las decisiones de Ana sobre los hallazgos sobreviven a volver a analizar
        // (misma clave = mismo hallazgo); si ya los habia decidido todos, sigue aprobada.
        const reviews = parseJson<FindingReviews>(current?.findingReviews) || {};
        if (Object.keys(reviews).length) {
            const effective = applyFindingReviews(complianceResult, reviews);
            updateData.status = effective.status;
            updateData.approvedForOit = effective.approvedForOit;
        }

        const saved = await prisma.quotation.update({
            where: { id: quotationId },
            data: updateData
        });
        await linkOitsToQuotation(saved).catch(err => console.error('[Vinculo] Error vinculando OIT a la cotizacion:', err));

        console.log(`[Quotation] Compliance check complete for ${quotationId}.Status: ${finalStatus}, Score: ${complianceResult.score}/100, hallazgos: ${verdict.issues.length}`);

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
