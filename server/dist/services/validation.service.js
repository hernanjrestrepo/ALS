"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationService = void 0;
const ai_service_1 = require("./ai.service");
class ValidationService {
    /**
     * Validate sampling step data against step requirements using AI
     */
    validateStepData(stepDescription, stepRequirements, userData) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield ai_service_1.aiService.chat(validationPrompt);
                // Parse AI response
                const cleanedResponse = this.cleanAIResponse(response);
                const result = JSON.parse(cleanedResponse);
                return {
                    validated: result.validated === true,
                    feedback: result.feedback || 'Validación completada',
                    confidence: result.confidence || 0.8
                };
            }
            catch (error) {
                console.error('Validation error:', error);
                return {
                    validated: false,
                    feedback: 'Error al validar los datos. Por favor intenta de nuevo.',
                    confidence: 0
                };
            }
        });
    }
    /**
     * Generate final comprehensive analysis from all sampling data
     */
    generateFinalAnalysis(oitNumber, templateName, allStepsData) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield ai_service_1.aiService.chat(analysisPrompt);
                return response;
            }
            catch (error) {
                console.error('Analysis generation error:', error);
                throw new Error('Error al generar el análisis final');
            }
        });
    }
    generateFinalReportContent(oit, labResultsText, templateName, samplingSheetAnalysis) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield ai_service_1.aiService.chat(prompt);
                return response;
            }
            catch (error) {
                console.error('Final Report generation error:', error);
                throw new Error('Error al generar el contenido del informe final');
            }
        });
    }
    /**
     * Generate comunicado-style content for a specific service
     * Returns plain text with **bold** markers for section headers
     */
    generateComunicadoContent(oit, labAnalysis, serviceContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Extract just the service type name for emphasis (e.g., "AGUA" from "AGUA (Agua - Checklist, ...)")
                const serviceTypeName = serviceContext.split('(')[0].trim() || serviceContext;
                const prompt = `
            ACTÚA COMO: Juan Bustamante R., Coordinador I+D del Laboratorio Serambiente S.A.S, escribiendo un comunicado técnico para el cliente.
            
            ⚠️ SERVICIO A COMUNICAR: ${serviceTypeName}
            ⚠️ REGLA CRÍTICA: Este comunicado es EXCLUSIVAMENTE sobre ${serviceTypeName}. NO menciones ni analices datos de otros servicios (si el análisis contiene datos de aire, ruido, biota u otros servicios que no sean ${serviceTypeName}, IGNÓRALOS POR COMPLETO).
            
            TAREA: Redactar el CUERPO del comunicado técnico basándote SOLO en los resultados de laboratorio de ${serviceTypeName}.
            
            CONTEXTO:
            - Orden de Servicio: ${oit.oitNumber}
            - Servicio/Tipo: ${serviceContext}
            - Descripción: ${oit.description || 'No especificada'}
            - Ubicación: ${oit.location || 'No especificada'}
            
            ANÁLISIS DE LABORATORIO PARA ${serviceTypeName}:
            "${labAnalysis.slice(0, 6000)}"
            
            INSTRUCCIONES DE FORMATO:
            - Escribe en español formal y técnico.
            - Usa **negritas** (con doble asterisco) para títulos de sección y nombres de parámetros importantes.
            - NO uses formato markdown (ni #, ni tablas, ni listas con -).
            - Estructura el contenido en estas secciones (cada una como párrafo):
              1. **Resumen de resultados** - Qué se evaluó para ${serviceTypeName}, qué puntos/muestras, qué parámetros
              2. **Cumplen con la normatividad:** - Lista de parámetros de ${serviceTypeName} que cumplen
              3. **No cumplen:** - Lista de parámetros de ${serviceTypeName} que no cumplen (si aplica), con valores y límites
              4. **Interpretación general** - Explicación técnica de los hallazgos de ${serviceTypeName}
              5. **Plan de acción sugerido** - Recomendaciones concretas para ${serviceTypeName}
              6. **Conclusión** - Veredicto final breve sobre ${serviceTypeName}
            - Si un parámetro no cumple, explica el valor hallado vs el límite normativo.
            - Sé conciso pero completo. No inventes datos que no estén en el análisis.
            - NO incluyas saludos, firma ni frases de cierre (eso ya lo maneja el sistema).
            - RECUERDA: SOLO habla de ${serviceTypeName}. Ignora cualquier dato de otros servicios.
            `;
                const response = yield ai_service_1.aiService.chat(prompt);
                return response.trim();
            }
            catch (error) {
                console.error('Comunicado content generation error:', error);
                throw new Error('Error al generar contenido del comunicado');
            }
        });
    }
    cleanAIResponse(response) {
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
exports.validationService = new ValidationService();
