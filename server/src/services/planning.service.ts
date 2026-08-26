import { prisma } from '../lib/prisma';
import { aiService } from './ai.service';
import fs from 'fs';
import path from 'path';
// import { pdfService } from './pdf.service'; // Circular dependency if not careful


// Utility types
interface ServiceExtraction {
    name: string;
    matcher: string;
    templateNumbers: (string | number)[];
}

interface AnalysisResult {
    totalServicesFound: number;
    services: ServiceExtraction[];
}

export const planningService = {
    /**
     * Parse text to find services and suggest templates
     */
    async runOITAnalysis(oitId: string): Promise<AnalysisResult> {
        console.log(`[Planning] Starting analysis for OIT: ${oitId}`);

        // 1. Fetch OIT with assigned engineers
        const oit = await prisma.oIT.findUnique({
            where: { id: oitId },
            include: { assignedEngineers: { include: { user: true } } }
        });

        if (!oit) throw new Error('OIT not found');

        // 2. Fetch all templates to provide context to AI
        const templates = await prisma.samplingTemplate.findMany({
            select: { id: true, name: true, oitType: true, steps: true }
        });

        // 3. Prepare context from files (simulation if no text extracted)
        // In a real scenario, this would come from the uploaded PDF text extraction
        // For now, we use a placeholder or previous extraction if stored
        let relevantText = oit.description || '';

        // Try to read extracted text from a file if it exists (mock)
        // const textPath = path.join(__dirname, '../../uploads', `text_${oit.oitNumber}.txt`);
        // if (fs.existsSync(textPath)) relevantText = fs.readFileSync(textPath, 'utf-8');

        // Improved Text Extraction Logic (if available in a real implementation)
        // ...

        // 4. Construct AI Prompt
        const templatesList = templates.map((t, index) => ({
            index: index + 1, // 1-based index for AI
            id: t.id,
            name: t.name,
            type: t.oitType
        }));

        const prompt = `Analiza el siguiente texto de una Orden de Servicio (OIT) y determina qué servicios de muestreo se requieren.
        
        **TU TAREA:**
        1. Identifica los servicios mencionados en el texto.
        2. Para cada servicio, selecciona la PLANTILLA más adecuada de la lista proporcionada.
        3. Clasifica el servicio en un GRUPO (AIRE, RUIDO, AGUA, FUENTES_FIJAS, BIOTA, SUELOS, OTRO).
        
        **CONTEXTO OIT:**
        - Número: ${oit.oitNumber}
        - Descripción: ${oit.description}
        - Ubicación: ${oit.location}
        
        **TEXTO DEL DOCUMENTO (EXTRACTO):**
        ${relevantText.substring(0, 5000)}
        ...
        
        **PLANTILLAS DISPONIBLES:**
        ${JSON.stringify(templatesList, null, 2)}
        
        **FORMATO DE RESPUESTA (JSON):**
        [
            {
                "serviceName": "Nombre exacto del servicio encontrado",
                "templateId": "ID de la plantilla correspondiente (o null si no hay)",
                "group": "GRUPO DEL SERVICIO"
            }
        ]
        
        Responde SOLO con el JSON válido.`;

        try {
            console.log('[Planning] Sending prompt to AI...');
            // Fix: chat() accepts (prompt, systemPrompt?, model?)
            // We'll just pass prompt and use default model for now, or pass model as 3rd arg if supported
            const aiResponse = await aiService.chat(prompt);

            console.log('[Planning] AI Response:', aiResponse);

            let services: any[] = [];
            try {
                const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                services = JSON.parse(cleanJson);
            } catch (e) {
                console.error('[Planning] Failed to parse AI JSON:', e);
                // Fallback regex compatible with older ES versions (no /s flag)
                const match = aiResponse.match(/\[[\s\S]*\]/);
                if (match) {
                    try { services = JSON.parse(match[0]); } catch (e2) { }
                }
            }

            if (!Array.isArray(services)) services = [];

            const validServices: ServiceExtraction[] = services.map(s => {
                let tIds: string[] = [];
                if (s.templateId) {
                    tIds = [s.templateId];
                } else if (templates.length > 0) {
                    console.warn(`[Planning] Service '${s.serviceName}' has no template. Fallback to default: ${templates[0].name}`);
                    tIds = [templates[0].id];
                }

                return {
                    name: s.serviceName || 'Servicio Detectado',
                    matcher: s.group || 'GENERAL',
                    templateNumbers: tIds
                };
            });

            return {
                totalServicesFound: validServices.length,
                services: validServices
            };

        } catch (error) {
            console.error('[Planning] AI Analysis Failed:', error);
            // Fallback: Return 0 services found
            return { totalServicesFound: 0, services: [] };
        }
    },

    /**
     * Generate specific planning/proposal document
     */
    async generatePlanningDocument(oitId: string): Promise<string> {
        return '';
    },

    // --- Legacy / Stub Methods for Controller Compatibility ---
    async generateProposal(oitId: string) {
        return { success: true, message: 'Proposal generation stub' };
    },

    async acceptProposal(oitId: string) {
        return { success: true, message: 'Proposal accepted stub' };
    },

    async rejectProposal(oitId: string) {
        return { success: true, message: 'Proposal rejected stub' };
    }
};

export default planningService;
