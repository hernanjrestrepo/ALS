import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map OIT types to resource matrix types
const OIT_TO_RESOURCE_TYPE: Record<string, string[]> = {
    'AGUA': ['Aguas'],
    'AGUA_POTABLE': ['Aguas'],
    'AGUAS_MARINAS': ['Aguas'],
    'AGUAS_RESIDUALES': ['Aguas'],
    'VERTIMIENTOS': ['Aguas'],
    'PISCINA': ['Aguas'],
    'AIRE': ['Calidad del aire'],
    'FUENTES_FIJAS': ['Fuentes fijas'],
    'RUIDO': ['Ruido'],
    'BIOTA': ['Hidrobiología y Biota'],
    'SUELO': ['Aguas'], // Suelos uses some water equipment
    'SEDIMENTOS': ['Aguas'],
    'LODOS': ['Aguas'],
    'DEFAULT': ['General']
};

class PlanningService {
    /**
     * Cleans AI response by removing markdown code blocks
     */
    private cleanAIResponse(response: string): string {
        // Remove markdown code blocks like ```json ... ```
        let cleaned = response
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        // Extract JSON if still wrapped in text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        return cleaned;
    }

    /**
     * Detect OIT type from description and aiData
     */
    private detectOitType(oit: any): string {
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const description = (oit.description || '').toLowerCase();
        const templateName = (aiData.data?.templateName || '').toLowerCase();

        const combined = `${description} ${templateName}`;

        if (combined.includes('agua potable') || combined.includes('potable')) return 'AGUA_POTABLE';
        if (combined.includes('vertimiento')) return 'VERTIMIENTOS';
        if (combined.includes('marina') || combined.includes('mar')) return 'AGUAS_MARINAS';
        if (combined.includes('residual')) return 'AGUAS_RESIDUALES';
        if (combined.includes('piscina')) return 'PISCINA';
        if (combined.includes('ruido')) return 'RUIDO';
        if (combined.includes('aire') || combined.includes('atmosféric') || combined.includes('calidad del aire')) return 'AIRE';
        if (combined.includes('fuente fija') || combined.includes('chimenea') || combined.includes('emisión')) return 'FUENTES_FIJAS';
        if (combined.includes('biota') || combined.includes('hidrobiolog')) return 'BIOTA';
        if (combined.includes('suelo')) return 'SUELO';
        if (combined.includes('sedimento')) return 'SEDIMENTOS';
        if (combined.includes('lodo')) return 'LODOS';
        if (combined.includes('agua')) return 'AGUA';

        return 'DEFAULT';
    }

    /**
     * Get resources filtered by OIT type
     */
    private async getRelevantResources(oitType: string, limit: number = 5): Promise<any[]> {
        const resourceTypes = OIT_TO_RESOURCE_TYPE[oitType] || OIT_TO_RESOURCE_TYPE['DEFAULT'];

        // Get resources matching the type
        const relevantResources = await prisma.resource.findMany({
            where: {
                status: 'AVAILABLE',
                type: { in: resourceTypes }
            },
            take: limit,
            orderBy: { name: 'asc' }
        });

        // If no resources found for specific type, get general ones
        if (relevantResources.length === 0) {
            return prisma.resource.findMany({
                where: { status: 'AVAILABLE' },
                take: limit,
                orderBy: { name: 'asc' },
                distinct: ['name']
            });
        }

        return relevantResources;
    }

    /**
     * Extracts only the 'Services' section from the document text
     * to avoid AI hallucinating based on irrelevant text (e.g. general conditions)
     */
    private extractServicesSection(text: string): string {
        if (!text) return '';
        const lower = text.toLowerCase();

        // If the document is small, send it all
        if (text.length < 35000) return text;

        // Try to find "SERVICIO 1" specifically as it's the strongest indicator
        const service1Idx = lower.indexOf('servicio 1');

        // If "SERVICIO 1" is found, start a bit before it to get context headers
        if (service1Idx !== -1) {
            const startContext = Math.max(0, service1Idx - 2000);
            return text.substring(startContext, startContext + 35000);
        }

        // Fallback: If no "SERVICIO 1" found, just send the first 35k chars
        // It's better to include the header/intro than to guess wrong and cut off the body.
        return text.substring(0, 35000);
    }

    async generateProposal(oitId: string, documentText?: string) {
        const oit = await prisma.oIT.findUnique({
            where: { id: oitId },
            include: { assignedEngineers: { include: { user: true } } }
        });

        if (!oit) {
            throw new Error('OIT not found');
        }

        // Detect OIT type
        const oitType = this.detectOitType(oit);

        // ... existing resource logic ...
        // (This part is long, omitting for brevity in replacement if possible, but replace_file_content requires context.
        // I will target the specific block where `oit` is fetched and then where `combinedSteps` is processed.)
        // Since I need to replace the fetch at top AND the logic at bottom, and they are far apart, I should use multi_replace.


        // Better Resource Selection Logic
        let resources: any[] = [];
        const { aiService } = await import('./ai.service');

        // 1. Try to get resources from FULL DOCUMENT text if available
        let candidateNames: string[] = [];
        let fullDocumentText = documentText || '';

        // If no documentText provided, try to extract from OIT file FIRST, then Quotation
        if (!fullDocumentText) {
            try {
                const { pdfService } = await import('./pdf.service');
                const fs = await import('fs');

                // 1. Try OIT File
                if (oit.oitFileUrl) {
                    let filePath = oit.oitFileUrl;
                    if (filePath.startsWith('/') && !fs.existsSync(filePath)) {
                        filePath = filePath.substring(1);
                    }
                    if (fs.existsSync(filePath)) {
                        console.log(`[Planning] Extracting text from OIT File: ${filePath}`);
                        const text = await pdfService.extractText(filePath);
                        if (text && text.length > 50) {
                            fullDocumentText = text;
                            console.log(`[Planning] Extracted ${fullDocumentText.length} chars from OIT File`);
                        }
                    }
                }

                // 2. Fallback to Quotation File if OIT text is empty
                if ((!fullDocumentText || fullDocumentText.length < 50) && oit.quotationFileUrl) {
                    let filePath = oit.quotationFileUrl;
                    if (filePath.startsWith('/') && !fs.existsSync(filePath)) {
                        filePath = filePath.substring(1);
                    }
                    if (fs.existsSync(filePath)) {
                        console.log(`[Planning] Extracting text from Quotation File: ${filePath}`);
                        const text = await pdfService.extractText(filePath);
                        if (text && text.length > 50) {
                            fullDocumentText = text;
                            console.log(`[Planning] Extracted ${fullDocumentText.length} chars from Quotation File`);
                        }
                    }
                }
            } catch (extractError) {
                console.error('[Planning] Failed to extract document text:', extractError);
            }
        }

        if (fullDocumentText && fullDocumentText.length > 100) {
            console.log('[Planning] Analyzing FULL DOCUMENT for resources...');
            try {
                candidateNames = await aiService.recommendResources(fullDocumentText);
                console.log('[AI] Resource recommendations:', candidateNames);
            } catch (err) {
                console.error('[Planning] AI Resource Extraction Failed:', err);
            }
        }

        // Deduplicate candidates immediately to avoid redundancy
        candidateNames = [...new Set(candidateNames)];

        // 2. Fallback to existing metadata (Quotation/OIT resources)
        if (candidateNames.length === 0) {
            try {
                if (oit.resources) {
                    const parsed = JSON.parse(oit.resources);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log(`[Planning] Using resources from document analysis: ${parsed.length}`);
                        candidateNames = parsed;
                    }
                }
            } catch (e) { }
        }

        // 3. Last resort: ask AI using description
        if (candidateNames.length === 0 && oit.description) {
            console.log('[Planning] Asking AI for resource recommendations based on description...');
            candidateNames = await aiService.recommendResources(oit.description);
        }

        // 3. Match candidates to DB Resources
        if (candidateNames.length > 0) {
            console.log('[Planning] Matching candidates to DB:', candidateNames);

            // We want unique equipment. If AI asks for "H2S Analyzer", pick ONE.
            const uniqueTypes = new Set<string>();

            for (const name of candidateNames) {
                // Skip generic terms if better matches exist
                // Search available resources loosely matching the name
                const match = await prisma.resource.findFirst({
                    where: {
                        status: 'AVAILABLE',
                        OR: [
                            { name: { contains: name } }, // removed mode: 'insensitive' to avoid sqlite error if not supported or check prisma version. Default contains is case sensitive in some DBs, insensitive in others. SQLite is case insensitive naturally for ASCII? No, depends.
                            // Case insensitive mode requires Prisma feature? 
                            // Safest is to just try. If Postgres, mode: insensitive. If SQLite, it might not support mode.
                            // User environment is Linux, DB is SQLite (from schema).
                            // SQLite contains is case-insensitive usually.
                            { type: { contains: name } },
                            { observations: { contains: name } }
                        ]
                    }
                });

                if (match && !uniqueTypes.has(match.id)) {
                    resources.push(match);
                    uniqueTypes.add(match.id);
                }
            }
        }

        // 4. Fallback to generic relevant resources if nothing found
        if (resources.length === 0) {
            console.log('[Planning] No specific matches, using category fallback.');
            resources = await this.getRelevantResources(oitType, 3);
        }

        console.log(`[Planning] OIT tipo: ${oitType}, recursos finales: ${resources.length}`);

        const templates = await prisma.samplingTemplate.findMany();

        if (templates.length === 0) {
            // No templates available, create generic proposal
            const proposal = {
                templateIds: [],
                templateName: 'Planeación Genérica',
                proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                proposedTime: '09:00',
                steps: [
                    { id: '1', title: 'Preparación de equipos', description: 'Verificar y preparar equipos necesarios' },
                    { id: '2', title: 'Recolección de muestras', description: 'Ejecutar protocolo de muestreo' },
                    { id: '3', title: 'Documentación', description: 'Registrar datos y fotografías' },
                    { id: '4', title: 'Entrega a laboratorio', description: 'Enviar muestras para análisis' }
                ],
                assignedResources: resources.map(r => ({
                    id: r.id,
                    name: r.name,
                    code: r.code,
                    type: r.type,
                    brand: r.brand,
                    model: r.model
                })),
                estimatedDuration: '4 horas'
            };

            let currentAiData: any = { valid: true, data: {} };
            try {
                if (oit.aiData) {
                    const parsed = JSON.parse(oit.aiData);
                    if (parsed.data) currentAiData = parsed;
                    else currentAiData = { valid: true, data: parsed };
                }
            } catch (e) { }

            await prisma.oIT.update({
                where: { id: oitId },
                data: {
                    aiData: JSON.stringify({
                        ...currentAiData,
                        message: 'Propuesta genérica creada',
                        data: { ...currentAiData.data, ...proposal }
                    }),
                    planningProposal: JSON.stringify(proposal)
                }
            });

            return proposal;
        }

        // AI suggests best template

        // Use explicit IDs in the list to avoid confusion with service numbers
        const templatesList = templates.map((t: any, index: number) =>
            `ID ${index + 1}: [${t.oitType}] ${t.name}`
        ).join('\n');

        const systemPrompt = `Eres un Planificador Senior de Operaciones Ambientales especialista en la normativa colombiana. 
Tu responsabilidad es interpretar el documento de la OIT y estructurar la planeación del trabajo.

**TU OBJETIVO:**
1. Identificar EXCLUSIVAMENTE los bloques marcados como "SERVICIO [número]" en el texto del documento. 
2. Extraer el nombre del servicio usando el número y la "MATRIZ" o "PROCEDENCIA" asociada.
3. Asignar el ID de la plantilla que mejor corresponda a los parámetros del servicio.

**REGLAS DE ORO (ESTRICTAS):**
- **DIFERENCIA CLAVE:** "SERVICIO 1" del documento NO TIENE NADA QUE VER con "ID 1" de las plantillas. Son números independientes.
- **PATRÓN 'SERVICIO [N]':** Busca "SERVICIO 1", "SERVICIO 2", etc. Ignora indentación.
- **NO INVENTES SERVICIOS:** Solo usa los que aparecen explícitamente en el documento con "SERVICIO [N]".
- **AGRUPA LOS PARÁMETROS:** Todo lo que esté debajo de "SERVICIO [N]" pertenece a ese servicio.
- **NOMBRE:** El nombre debe ser "SERVICIO [N] - [MATRIZ]". Si hay "PROCEDENCIA" cerca, inclúyela: "SERVICIO [N] - [MATRIZ] - [PROCEDENCIA]".
- **PLANTILLAS:** Usa los IDs de la lista proporcionada (ej. ID 13).

**IMPORTANTE: NO ALUCINES NÚMEROS DE SERVICIO.**
Si el documento dice "SERVICIO 1", "SERVICIO 2", "SERVICIO 3", tu respuesta debe tener SOLO ESOS 3. 
NO agregues "SERVICIO 13" solo porque la plantilla ID 13 encaja.`;

        // Include document content for better analysis (truncated to avoid token limits)
        console.log(`[Planning] Template Selection - fullDocumentText length: ${fullDocumentText?.length || 0}`);

        // Extract using the simplified logic (first 35k chars or context around SERVICIO 1)
        const relevantText = this.extractServicesSection(fullDocumentText || '');
        console.log(`[Planning] Services section length: ${relevantText.length} (original: ${fullDocumentText?.length || 0})`);

        const docPreview = relevantText.substring(0, 35000);
        console.log(`[Planning] Template Selection - docPreview length: ${docPreview.length}`);
        console.log(`[Planning] Doc Start Preview: ${docPreview.substring(0, 500)}`);

        const prompt = `Analiza el texto extraído y genera la estructura de SERVICIOS.

**ESTRUCTURA VISUAL DEL DOCUMENTO:**
El encabezado está distribuido en columnas con mucho espacio:
"                           SERVICIO 1                                               MATRIZ                                        AGUAS"

**TU TAREA:**
1. Encuentra TODOS los "SERVICIO [N]" en el texto.
2. Extrae ese bloque como un SERVICIO ÚNICO.
3. Selecciona de la lista de plantillas el "ID" que cubra los parámetros de ese servicio.

**IMPORTANTE:**
- Si el documento tiene "SERVICIO 1", "SERVICIO 2" y "SERVICIO 3", tu JSON debe tener **exactamente 3 elementos**.
- NO uses los IDs de las plantillas como nombres de servicio.
- NO separes parámetros en servicios nuevos.

**DETALLES DE LA OIT:**
- OIT: ${oit.oitNumber}
- Descripción: ${oit.description || 'N/A'}

${docPreview ? `**Contenido del Documento:**
${docPreview}
...
` : ''}
${docPreview}
...
` : ''
    }

** LISTA DE PLANTILLAS DISPONIBLES(Selecciona el ID):**
    ${ templatesList }

** Responde con este JSON:**
    {
        "totalServicesFound": number,
        "services": [
            {
                "name": "SERVICIO [N] - [MATRIZ/PROCEDENCIA]",
                "templateNumbers": [number] // El ID de la plantilla seleccionada (e.g. 13)
            },
            ...
  ]
    }`;

        let selectedTemplates: any[] = [];
        let aiServicesFound: any[] = [];

        try {
            const aiResponse = await aiService.chat(prompt, undefined, systemPrompt);
            console.log('AI Response for template selection:', aiResponse);

            const cleanedResponse = this.cleanAIResponse(aiResponse);
            const templateSuggestion = JSON.parse(cleanedResponse);

            aiServicesFound = templateSuggestion.services || [];

            // Aggregate ALL template IDs for the flat list (backward compatibility)
            const allIndexes = new Set<string>();
            aiServicesFound.forEach((svc: any) => {
                if (Array.isArray(svc.templateNumbers)) {
                    svc.templateNumbers.forEach((n: any) => allIndexes.add(String(n)));
                }
            });

            const indexes = Array.from(allIndexes);
            const ids = indexes
                .map((idx: any) => {
                    const i = parseInt(idx) - 1;
                    return (i >= 0 && i < templates.length) ? templates[i].id : null;
                })
                .filter(Boolean);

            if (ids.length > 0) {
                selectedTemplates = await prisma.samplingTemplate.findMany({
                    where: { id: { in: ids as string[] } }
                });
            }

            // Hydrate the services with real Template Names/IDs for the frontend
            aiServicesFound = aiServicesFound.map(svc => ({
                ...svc,
                templates: svc.templateNumbers.map((n: number) => {
                    const tIndex = n - 1;
                    if (tIndex >= 0 && tIndex < templates.length) {
                        return {
                            id: templates[tIndex].id,
                            name: templates[tIndex].name,
                            oitType: templates[tIndex].oitType
                        };
                    }
                    return null;
                }).filter(Boolean)
            }));

        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.error('Error details:', error instanceof Error ? error.message : String(error));
        }

        // Fallback to first template if AI fails or returns nothing
        if (selectedTemplates.length === 0) {
            selectedTemplates = [templates[0]];
            aiServicesFound = [{
                name: "Servicio General (Fallback)",
                templates: [{
                    id: templates[0].id,
                    name: templates[0].name,
                    oitType: templates[0].oitType
                }]
            }];
        }

        // Combine steps from all templates
        let combinedSteps: any[] = [];
        selectedTemplates.forEach(t => {
            try {
                const steps = JSON.parse(t.steps);
                combinedSteps = [...combinedSteps, ...steps];
            } catch (e) { }
        });

        // AUTO-FILL HEADER STEPS
        // Populate administrative data automatically from OIT context
        combinedSteps = combinedSteps.map(step => {
            const title = step.title;

            if (title === 'Número OT') {
                return { ...step, value: oit.oitNumber };
            }
            if (title === 'Cliente') {
                try {
                    const aiData = JSON.parse(oit.aiData || '{}');
                    const clientName = aiData.data?.clientName || aiData.clientName || '';
                    if (clientName) return { ...step, value: clientName };
                } catch (e) { }
            }
            if (title === 'Responsable en Campo') {
                if (oit.assignedEngineers && oit.assignedEngineers.length > 0) {
                    return { ...step, value: oit.assignedEngineers.map((ae: any) => ae.user.name).join(', ') };
                }
            }
            if (title === 'Fecha de Inicio' && oit.scheduledDate) {
                return { ...step, value: new Date(oit.scheduledDate).toISOString().slice(0, 16) };
            }
            if (title === 'Fecha de Fin' && oit.scheduledDate) {
                // Default duration 4 hours
                const end = new Date(new Date(oit.scheduledDate).getTime() + 4 * 60 * 60 * 1000);
                return { ...step, value: end.toISOString().slice(0, 16) };
            }
            if (title === 'Coordenadas de la Estación' && oit.location) {
                return { ...step, value: oit.location };
            }
            return step;
        });

        const proposal = {
            templateIds: selectedTemplates.map(t => t.id),
            templateName: selectedTemplates.map(t => t.name).join(' + '),
            proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            proposedTime: '09:00',
            steps: combinedSteps,
            assignedResources: resources.map(r => ({
                id: r.id,
                name: r.name,
                code: r.code,
                type: r.type,
                brand: r.brand,
                model: r.model
            })),
            estimatedDuration: '4 horas'
        };

        let currentAiData: any = { valid: true, data: {} };
        try {
            if (oit.aiData) {
                const parsed = JSON.parse(oit.aiData);
                if (parsed.data) currentAiData = parsed;
                else currentAiData = { valid: true, data: parsed };
            }
        } catch (e) { }

        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                selectedTemplateIds: JSON.stringify(selectedTemplates.map(t => t.id)),
                aiData: JSON.stringify({
                    ...currentAiData,
                    message: 'Propuesta de planificación generada',
                    data: {
                        ...currentAiData.data,
                        ...proposal,
                        services: aiServicesFound // Save the structured services
                    }
                }),
                planningProposal: JSON.stringify(proposal)
            }
        });

        return proposal;
    }

    async acceptProposal(oitId: string) {
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                planningAccepted: true,
                status: 'SCHEDULED'
            }
        });
    }

    async rejectProposal(oitId: string) {
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                planningProposal: null,
                selectedTemplateIds: null
            }
        });
    }
    async updateServiceDates(oitId: string, serviceDates: Record<string, string>) {
        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });
        if (!oit) throw new Error('OIT not found');

        // Merge with existing dates if any
        let currentDates: Record<string, string> = {};
        try {
            if (oit.serviceDates) {
                currentDates = JSON.parse(oit.serviceDates);
            }
        } catch (e) { }

        const updatedDates = { ...currentDates, ...serviceDates };

        // Also update scheduledDate to the earliest date in the set for sorting
        const dates = Object.values(updatedDates).map(d => new Date(d as string).getTime());
        const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : undefined;

        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                serviceDates: JSON.stringify(updatedDates),
                scheduledDate: minDate
            }
        });

        // Update proposal if exists
        try {
            let proposal = oit.planningProposal ? JSON.parse(oit.planningProposal) : null;
            if (proposal) {
                proposal.serviceDates = updatedDates;
                await prisma.oIT.update({
                    where: { id: oitId },
                    data: { planningProposal: JSON.stringify(proposal) }
                });
            }
        } catch (e) { console.error('Error updating proposal dates', e); }

        return updatedDates;
    }
}

export default new PlanningService();
