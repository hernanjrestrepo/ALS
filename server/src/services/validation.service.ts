import { aiService } from './ai.service';

interface ValidationResult {
    validated: boolean;
    feedback: string;
    confidence: number;
}

class ValidationService {
    /**
     * Validate sampling step data against step requirements using AI
     */
    async validateStepData(
        stepDescription: string,
        stepRequirements: string,
        userData: any
    ): Promise<ValidationResult> {
        try {
            const validationPrompt = `Eres un validador experto de datos de muestreo ambiental.

DESCRIPCIÓN DEL PASO:
${stepDescription}

REQUISITOS:
${stepRequirements}

DATOS PROPORCIONADOS POR EL USUARIO (JSON):
${JSON.stringify(userData, null, 2)}

TAREA:
Evalúa si los datos proporcionados cumplen con los requisitos del paso de muestreo.
ATENCIÓN: El valor principal ingresado por el usuario se encuentra en el campo "value" del JSON de datos.

Verifica:
1. Completitud: ¿El campo "value" tiene contenido válido según lo solicitado?
2. Formato: ¿Los datos tienen el formato correcto?
3. Coherencia: ¿Los datos son lógicos y consistentes?

RESPONDE EN JSON CON ESTE FORMATO:
{
  "validated": true/false,
  "feedback": "Explicación detallada de por qué se aprueba o rechaza",
  "confidence": 0.0-1.0
}`;

            const response = await aiService.chat(validationPrompt);

            // Parse AI response
            const cleanedResponse = this.cleanAIResponse(response);
            const result = JSON.parse(cleanedResponse);

            return {
                validated: result.validated === true,
                feedback: result.feedback || 'Validación completada',
                confidence: result.confidence || 0.8
            };

        } catch (error) {
            console.error('Validation error:', error);
            return {
                validated: false,
                feedback: 'Error al validar los datos. Por favor intenta de nuevo.',
                confidence: 0
            };
        }
    }

    /**
     * Generate final comprehensive analysis from all sampling data
     */
    async generateFinalAnalysis(
        oitNumber: string,
        templateName: string,
        allStepsData: Array<{ step: string; data: any; validation: any }>
    ): Promise<string> {
        try {
            const analysisPrompt = `Eres un analista experto en muestreo ambiental.

OIT: ${oitNumber}
PLANTILLA: ${templateName}

DATOS RECOPILADOS EN TODOS LOS PASOS:
${JSON.stringify(allStepsData, null, 2)}

TAREA:
Genera un análisis comprehensivo del muestreo realizado. Incluye:

1. RESUMEN EJECUTIVO
   - Objetivo del muestreo
   - Metodología aplicada
   - Principales hallazgos

2. ANÁLISIS POR PASO
   - Evaluación de cada paso completado
   - Calidad de los datos recopilados
   - Observaciones relevantes

3. CUMPLIMIENTO NORMATIVO
   - Verificación de cumplimiento con estándares
   - Requisitos satisfechos
   - Áreas de atención

4. CONCLUSIONES Y RECOMENDACIONES
   - Conclusiones principales
   - Recomendaciones para próximos pasos
   - Acciones sugeridas

IMPORTANTE: Responde en español, de forma profesional y técnica.`;

            const response = await aiService.chat(analysisPrompt);

            return response;

        } catch (error) {
            console.error('Analysis generation error:', error);
            throw new Error('Error al generar el análisis final');
        }
    }
    async generateFinalReportContent(oit: any, labResultsText: string, templateName?: string, samplingSheetAnalysis?: any): Promise<string> {
        try {
            const prompt = `
            ACTÚA COMO: Consultor Ambiental Senior.
            TAREA: Redactar el INFORME TÉCNICO FINAL para el cliente.
            
            CONTEXTO:
            - Orden de Servicio: ${oit.oitNumber}
            - Servicio/Tipo de Muestreo: ${templateName || oit.description || 'General'}
            - Descripción OIT: ${oit.description}
            - Hallazgos de Campo: ${oit.finalAnalysis || 'Sin observaciones mayores'}
            
            ANÁLISIS DE PLANILLAS DE CAMPO (Verificación de Calidad):
            ${samplingSheetAnalysis ? JSON.stringify(samplingSheetAnalysis, null, 2) : 'No se dispone de análisis de planillas detallado.'}

            DATOS DE LABORATORIO (Extraídos del anexo):
            "${labResultsText.slice(0, 8000)}"...
            
            ESTRUCTURA DEL INFORME (Markdown):
            # INFORME TÉCNICO - ${templateName || 'MONITOREO AMBIENTAL'}
            
            ## 1. RESUMEN EJECUTIVO
            Breve síntesis enfocada en el servicio "${templateName || 'General'}".
            
            ## 2. RESULTADOS DE CAMPO Y CALIDAD
            Resumen de lo observado durante la toma de muestras basándose en los hallazgos de campo y el análisis de calidad de las planillas.
            
            ## 3. ANÁLISIS DE LABORATORIO
            Interpretación detallada de los resultados obtenidos para este tipo de servicio.
            
            ## 4. CONCLUSIONES Y RECOMENDACIONES
            Veredicto final sobre el cumplimiento y recomendaciones técnicas.
            
            IMPORTANTE:
            - Usa un tono formal y técnico.
            - Céntrate exclusivamente en el servicio: "${templateName || 'General'}".
            - Integra la información de calidad de las planillas en la sección 2.
            `;
            const response = await aiService.chat(prompt);
            return response;
        } catch (error) {
            console.error('Final Report generation error:', error);
            throw new Error('Error al generar el contenido del informe final');
        }
    }

    /**
     * Generate comunicado-style content for a specific service
     * Returns plain text with **bold** markers for section headers
     */
    async generateComunicadoContent(oit: any, labAnalysis: string, serviceContext: string): Promise<string> {
        try {
            const prompt = `
            ACTÚA COMO: Juan Bustamante R., Coordinador I+D del Laboratorio Serambiente S.A.S, escribiendo un comunicado técnico para el cliente.
            TAREA: Redactar el CUERPO del comunicado técnico basándote en los resultados de laboratorio analizados.
            
            CONTEXTO:
            - Orden de Servicio: ${oit.oitNumber}
            - Servicio/Tipo: ${serviceContext}
            - Descripción: ${oit.description || 'No especificada'}
            - Ubicación: ${oit.location || 'No especificada'}
            
            ANÁLISIS DE LABORATORIO YA PROCESADO:
            "${labAnalysis.slice(0, 6000)}"
            
            INSTRUCCIONES DE FORMATO:
            - Escribe en español formal y técnico.
            - Usa **negritas** (con doble asterisco) para títulos de sección y nombres de parámetros importantes.
            - NO uses formato markdown (ni #, ni tablas, ni listas con -).
            - Estructura el contenido en estas secciones (cada una como párrafo):
              1. **Resumen de resultados** - Qué se evaluó, qué puntos/muestras, qué parámetros
              2. **Cumplen con la normatividad:** - Lista de parámetros que cumplen
              3. **No cumplen:** - Lista de parámetros que no cumplen (si aplica), con valores y límites
              4. **Interpretación general** - Explicación técnica de los hallazgos
              5. **Plan de acción sugerido** - Recomendaciones concretas con sub-secciones en negrita
              6. **Conclusión** - Veredicto final breve
            - Si un parámetro no cumple, explica el valor hallado vs el límite normativo.
            - Sé conciso pero completo. No inventes datos que no estén en el análisis.
            - NO incluyas saludos, firma ni frases de cierre (eso ya lo maneja el sistema).
            - NO incluyas la frase "Estas hipótesis parten solo de teoría..." (eso ya lo maneja el sistema).
            `;
            const response = await aiService.chat(prompt);
            return response.trim();
        } catch (error) {
            console.error('Comunicado content generation error:', error);
            throw new Error('Error al generar contenido del comunicado');
        }
    }

    private cleanAIResponse(response: string): string {
        let cleaned = response.trim();

        // Remove markdown code blocks
        cleaned = cleaned.replace(/```json\s*/gi, '');
        cleaned = cleaned.replace(/```\s*/g, '');

        // Try to extract JSON object if embedded in text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        return cleaned;
    }
}

export const validationService = new ValidationService();
