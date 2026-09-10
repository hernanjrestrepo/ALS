import { PrismaClient } from '@prisma/client';
import { aiService } from './ai.service';
import { pdfService } from './pdf.service';
import { createNotification } from '../controllers/notification.controller';
import fs from 'fs';
import path from 'path';
import { errorMessage, logError } from '../utils/errors';

const prisma = new PrismaClient();

const OIT_TYPE_CATEGORIES: Record<string, string[]> = {
    'AGUA_SUBTERRANEA': ['AGUA', 'SUBTERRANEA'],
    'RESPEL': ['RESPEL', 'RESIDUOS'],
    'PUNTO_SECO': ['GENERAL'],
    'RUIDO_EMISION': ['RUIDO'],
    'RUIDO_AMBIENTAL': ['RUIDO'],
    'RUIDO_INTRADOMICILIARIO': ['RUIDO'],
    'RUIDO_MIXTO': ['RUIDO'],
    'AIRE': ['AIRE'],
    'OLORES': ['OLORES'],
    'PARTICULAS': ['PARTICULAS_VIABLES'], // Reference: clasificación de Boutin (internacional), no Resolución colombiana
    'BIOTA': ['BIOTA'],
    'SUELO': ['SUELO'],
    'FUENTES_FIJAS_PREVIO': ['FUENTES_FIJAS'],
    'FUENTES_FIJAS': ['FUENTES_FIJAS'],
    'DEFAULT': ['GENERAL']
};

// Matrices sin criterio de cumplimiento normativo aplicable, confirmado por Dirección Técnica
// de Serambiente (2026-08-12): Biota se interpreta con índices ecológicos y potencial
// bioindicador; Suelos no tiene normativa colombiana de referencia y se limita a
// caracterización descriptiva. Para estos casos no se debe emitir veredicto conforme/no conforme.
const NO_COMPLIANCE_VERDICT_TYPES = new Set(['BIOTA', 'SUELO']);

export class ComplianceService {
    private detectOitType(oit: any): string {
        const combined = ((oit.description || '') + (oit.oitNumber || '')).toLowerCase();
        if (combined.includes('subterránea') || combined.includes('subterranea')) return 'AGUA_SUBTERRANEA';
        if (combined.includes('respel') || combined.includes('residuos')) return 'RESPEL';
        if (combined.includes('punto seco')) return 'PUNTO_SECO';
        if (combined.includes('ruido ambiental')) return 'RUIDO_AMBIENTAL';
        if (combined.includes('emisión de ruido') || combined.includes('emision de ruido')) return 'RUIDO_EMISION';
        if (combined.includes('intradomiciliario')) return 'RUIDO_INTRADOMICILIARIO';
        if (combined.includes('fuente fija') || combined.includes('fuentes fijas')) return 'FUENTES_FIJAS';
        if (combined.includes('aire')) return 'AIRE';
        if (combined.includes('olores')) return 'OLORES';
        if (combined.includes('partículas') || combined.includes('particulas')) return 'PARTICULAS';
        if (combined.includes('biota')) return 'BIOTA';
        if (combined.includes('suelo')) return 'SUELO';
        return 'DEFAULT';
    }

    private async getApplicableStandards(oitType: string): Promise<any[]> {
        const categories = OIT_TYPE_CATEGORIES[oitType] || OIT_TYPE_CATEGORIES['DEFAULT'];
        const allCategories = [...categories, ...OIT_TYPE_CATEGORIES['DEFAULT']];
        return prisma.standard.findMany({
            where: {
                OR: [
                    { category: { in: allCategories } },
                    { type: 'OIT' }
                ]
            }
        });
    }

    private async extractQuotationContent(quotationFileUrl: string | null): Promise<string> {
        if (!quotationFileUrl) return '';
        let filePath = quotationFileUrl.startsWith('/') ? quotationFileUrl.substring(1) : quotationFileUrl;
        if (!fs.existsSync(filePath)) {
            filePath = path.join(process.cwd(), filePath);
        }
        if (!fs.existsSync(filePath)) return '';
        try {
            return await pdfService.extractText(filePath);
        } catch (error) {
            logError(`No se pudo extraer texto de la cotizacion (${filePath})`, error);
            return '';
        }
    }

    private async extractOitContent(oitFileUrl: string | null): Promise<string> {
        if (!oitFileUrl) return '';
        let filePath = oitFileUrl.startsWith('/') ? oitFileUrl.substring(1) : oitFileUrl;
        if (!fs.existsSync(filePath)) {
            filePath = path.join(process.cwd(), filePath);
        }
        if (!fs.existsSync(filePath)) return '';
        try {
            return await pdfService.extractText(filePath);
        } catch (error) {
            logError(`No se pudo extraer texto de la OIT (${filePath})`, error);
            return '';
        }
    }

    // Extraccion deterministica de identidad (cliente/sitio), usada solo para
    // el chequeo de cruce OIT<->cotizacion, no para el veredicto de conformidad
    private async extractIdentity(text: string, label: string): Promise<{ client: string; site: string }> {
        if (!text || text.trim().length < 20) return { client: '', site: '' };
        try {
            const prompt = `Extrae SOLO el nombre del cliente y el sitio/ubicación de este documento (${label}). Responde SOLO JSON, sin explicación:
{"client": "", "site": ""}

TEXTO:
${text.substring(0, 6000)}`;
            const response = await aiService.chat(prompt);
            const jsonMatch = response.match(/\{[\s\S]*?\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            return { client: String(parsed.client || '').trim(), site: String(parsed.site || '').trim() };
        } catch (error) {
            logError(`No se pudo extraer identidad de ${label}`, error);
            return { client: '', site: '' };
        }
    }

    // Comparacion deterministica (no IA) por solapamiento de palabras normalizadas.
    // Devuelve un puntaje 0-1; valores bajos con ambos campos no vacios indican
    // que probablemente no son el mismo cliente/sitio.
    private textSimilarity(a: string, b: string): number {
        const normalize = (s: string) => s.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);
        const setA = new Set(normalize(a));
        const setB = new Set(normalize(b));
        if (setA.size === 0 || setB.size === 0) return 1; // sin datos suficientes, no bloquear
        const intersection = [...setA].filter(w => setB.has(w)).length;
        const union = new Set([...setA, ...setB]).size;
        return union === 0 ? 1 : intersection / union;
    }

    private buildStandardsContent(standards: any[]): string {
        // Truncate individual standards to 5000 chars each to stay within context
        return standards.map(s => {
            const content = (s.content || s.description || 'Sin contenido').substring(0, 5000);
            return `### NORMA: ${s.title}\n${content}`;
        }).join('\n---\n');
    }

    async checkCompliance(oitId: string, userId: string) {
        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });
        if (!oit) throw new Error('OIT not found');

        const oitType = this.detectOitType(oit);
        const standards = await this.getApplicableStandards(oitType);

        const quotationContent = await this.extractQuotationContent(oit.quotationFileUrl);
        const oitContent = await this.extractOitContent(oit.oitFileUrl);
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};

        // Verificacion estructurada (deterministica, no IA) de que la cotizacion y
        // la OIT correspondan al mismo cliente/sitio, antes de evaluar conformidad
        // contra la norma. Antes de este chequeo el sistema podia marcar "conforme"
        // una OIT y cotizacion de trabajos distintos porque nunca se cruzaban.
        if (quotationContent.trim().length > 20 && oitContent.trim().length > 20) {
            const [quotationIdentity, oitIdentity] = await Promise.all([
                this.extractIdentity(quotationContent, 'cotización'),
                this.extractIdentity(oitContent, 'OIT'),
            ]);

            const clientSimilarity = this.textSimilarity(quotationIdentity.client, oitIdentity.client);
            const siteSimilarity = this.textSimilarity(quotationIdentity.site, oitIdentity.site);
            const bothHaveClientData = quotationIdentity.client && oitIdentity.client;
            const bothHaveSiteData = quotationIdentity.site && oitIdentity.site;
            const clientMismatch = bothHaveClientData && clientSimilarity < 0.2;
            const siteMismatch = bothHaveSiteData && siteSimilarity < 0.2;

            if (clientMismatch || siteMismatch) {
                const issue = clientMismatch
                    ? `El cliente de la cotización ("${quotationIdentity.client}") no coincide con el de la OIT ("${oitIdentity.client}")`
                    : `El sitio de la cotización ("${quotationIdentity.site}") no coincide con el de la OIT ("${oitIdentity.site}")`;
                logError(`OIT ${oit.oitNumber}: cruce cotizacion/OIT fallido - ${issue}`, new Error(issue));
                const result = {
                    compliant: false,
                    score: 0,
                    oitType,
                    summary: 'La cotización y la OIT no parecen corresponder al mismo trabajo. No se evaluó conformidad contra la norma.',
                    exclusions: [],
                    issues: [issue],
                    recommendations: ['Verifica que se haya adjuntado la cotización correcta para esta OIT.'],
                };
                await createNotification(userId, `Conformidad: ${oit.oitNumber}`, `Posible cruce de documentos equivocado: ${issue}`, 'WARNING', oitId);
                return result;
            }
        }

        // Cascade Summary for Standards if they are too many
        let standardsContent = this.buildStandardsContent(standards);
        if (standardsContent.length > 30000) {
            console.log(`[Compliance] Standards content too large (${standardsContent.length}). Chunking...`);
            standardsContent = await aiService.cascadeSummary(standardsContent, 'Resumir requisitos técnicos clave de estas normas ambientales');
        }

        const noVerdict = NO_COMPLIANCE_VERDICT_TYPES.has(oitType);
        const prompt = noVerdict
            ? `Analiza la información técnica de esta matriz ambiental. No existe normativa colombiana de cumplimiento aplicable para esta matriz (${oitType}); NO emitas un veredicto de conformidad. Limítate a describir e interpretar la información disponible.
## OIT: ${oit.oitNumber} (${oitType})
## COTIZACIÓN: ${quotationContent.substring(0, 10000)}
## REFERENCIAS: ${standardsContent}

Responde SOLO JSON (compliant siempre null, no evalúes conformidad):
{
  "compliant": null,
  "score": null,
  "oitType": "${oitType}",
  "summary": "",
  "exclusions": [],
  "issues": [],
  "recommendations": []
}`
            : `Eres un auditor técnico riguroso. Compara, parámetro por parámetro, lo que pide la COTIZACIÓN contra lo que exige la NORMA aplicable. NO asumas conformidad por defecto — solo marca "compliant": true si verificaste explícitamente que cada parámetro/límite solicitado cumple lo que exige la norma. Si un parámetro, límite de cuantificación, o alcance no está claramente cubierto o coincide, es NO conforme.

## OIT: ${oit.oitNumber} (${oitType})
## COTIZACIÓN: ${quotationContent.substring(0, 10000)}
## NORMAS: ${standardsContent}

Responde SOLO JSON con este formato exacto (compliant es un booleano real basado en tu análisis, score es tu evaluación 0-100, issues debe listar cada discrepancia concreta que encontraste — vacío solo si de verdad no hay ninguna):
{
  "compliant": <true o false, según lo que encontraste>,
  "score": <0 a 100>,
  "oitType": "${oitType}",
  "summary": "<resumen de 2-3 líneas de tu comparación real>",
  "exclusions": [],
  "issues": ["<cada discrepancia concreta encontrada, con el parámetro/límite específico>"],
  "recommendations": []
}`;

        try {
            const aiResponse = await aiService.chat(prompt);
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            const result = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
            if (noVerdict) {
                result.compliant = null;
                result.score = null;
            }

            const notifTitle = noVerdict ? `Análisis técnico: ${oit.oitNumber}` : `Conformidad: ${oit.oitNumber}`;
            const notifBody = noVerdict ? 'Matriz sin veredicto de conformidad (no aplica normativa)' : `Resultado: ${result.score}/100`;
            await createNotification(userId, notifTitle, notifBody, noVerdict ? 'INFO' : (result.compliant ? 'SUCCESS' : 'WARNING'), oitId);
            return result;
        } catch (error) {
            logError(`Analisis de conformidad fallido para OIT ${oitId}`, error);
            await createNotification(
                userId,
                `Error en análisis de conformidad: ${oit.oitNumber}`,
                'No se pudo completar el análisis de conformidad. Revise los archivos de la OIT e intente de nuevo.',
                'ERROR',
                oitId
            );
            return { compliant: false, score: 0, summary: `Error en análisis IA: ${errorMessage(error)}`, error: true };
        }
    }
}

export const complianceService = new ComplianceService();
