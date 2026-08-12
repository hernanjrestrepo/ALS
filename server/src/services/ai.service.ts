import axios from 'axios';
import fs from 'fs';
import path from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss';

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

export interface AIAnalysisResult {
    status: 'check' | 'alerta' | 'error';
    alerts: string[];
    missing: string[];
    evidence: string[];
    services?: Array<{
        name: string;
        proposedDate: string | null;
        duration: number;
    }>;
    location?: string | null;
    generalProposedDate?: string | null;
    rawResponse?: string;
}

export class AIService {
    private baseURL: string;
    private defaultModel: string;

    constructor() {
        this.baseURL = OLLAMA_URL;
        this.defaultModel = DEFAULT_MODEL;
    }

    async isAvailable(): Promise<boolean> {
        try {
            await axios.get(`${this.baseURL}/api/tags`, { timeout: 2000 });
            return true;
        } catch (error) {
            return false;
        }
    }

    async getModels(): Promise<string[]> {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`);
            return response.data.models.map((m: any) => m.name);
        } catch (error) {
            return [];
        }
    }

    private chunkText(text: string, size: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substring(i, i + size));
        }
        return chunks;
    }

    public async cascadeSummary(text: string, objective: string): Promise<string> {
        // Larger chunks to reduce sequential API calls (Kimi can handle it)
        const chunks = this.chunkText(text, 30000); 
        console.log(`[AI] Cascade Summary: ${chunks.length} chunks. Objective: ${objective}`);

        const summaries: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`[AI] Summarizing chunk ${i + 1}/${chunks.length}...`);
            const prompt = `Actúa como Analista Técnico de Muestreo Ambiental.
            OBJETIVO: ${objective}
            
            INSTRUCCIÓN CRÍTICA: Extrae TODOS los nombres de servicios (ej: Ruido, Aguas, Aire, Suelo), parámetros a medir, ubicación exacta y fechas. NO omitas ningún servicio técnico.
            
            BLOQUE A ANALIZAR (${i+1}/${chunks.length}):
            ${chunks[i]}
            
            Resumen técnico (enfocado en servicios y ubicación):`;

            try {
                const response = await axios.post(`${this.baseURL}/api/generate`, {
                    model: this.defaultModel,
                    prompt,
                    stream: false,
                });
                summaries.push(response.data.response);
            } catch (error: any) {
                console.error(`Error chunk ${i}:`, error.response?.data || error.message);
                summaries.push(`[Error en bloque ${i+1}]`);
            }
        }
        return summaries.join('\n\n--- CONTINUACIÓN ---\n\n');
    }

    public async chat(message: string, model?: string, system?: string): Promise<string> {
        const useModel = model || this.defaultModel;
        console.log(`[AI] Sending Chat Request. Model: ${useModel}`);
        try {
            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: useModel,
                system: system || 'Eres un asistente experto en ingeniería ambiental y normativa colombiana.',
                prompt: message,
                stream: false,
            });
            return response.data.response || '';
        } catch (error: any) {
            console.error('AI Chat error:', error.response?.data || error.message);
            throw error;
        }
    }

    public async analyzeDocument(documentText: string): Promise<AIAnalysisResult> {
        const available = await this.isAvailable();
        if (!available) return this.heuristicAnalysis(documentText);

        try {
            let processedText = documentText;
            if (documentText.length > 25000) {
                console.log(`[AI] Document too large (${documentText.length}). Starting Cascade Summary...`);
                processedText = await this.cascadeSummary(documentText, 'Extraer lista de servicios y ubicación para programación');
            }

            const prompt = `Analiza los documentos y extrae los servicios técnicos a programar. Responde ÚNICAMENTE con un JSON válido.
            
            FORMATO JSON REQUERIDO:
            {
              "status": "check",
              "alerts": ["alertas si existen"],
              "missing": ["datos faltantes"],
              "evidence": ["evidencias"],
              "services": [
                {
                  "name": "Nombre claro del servicio ambiental",
                  "proposedDate": "YYYY-MM-DD o null",
                  "duration": 1
                }
              ],
              "location": "Ubicación o dirección encontrada",
              "generalProposedDate": "YYYY-MM-DD o null"
            }

            TEXTO:
            ${processedText}

            JSON:`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
                format: 'json',
            });

            let responseText = (response.data.response || '').trim();
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                responseText = responseText.substring(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(responseText);
            console.log(`[AI] Result Status: ${parsed.status}. Services: ${parsed.services?.length || 0}`);

            return {
                status: parsed.status || 'alerta',
                alerts: parsed.alerts || [],
                missing: parsed.missing || [],
                evidence: parsed.evidence || [],
                services: parsed.services || [],
                location: parsed.location || null,
                generalProposedDate: parsed.generalProposedDate || null,
                rawResponse: response.data.response
            };
        } catch (error: any) {
            console.error('AI Analysis error:', error.response?.data || error.message);
            return this.heuristicAnalysis(documentText);
        }
    }

    public async extractOITData(documentText: string): Promise<any> {
        try {
            const safeText = documentText.substring(0, 15000);
            const prompt = `Extrae número de OIT y descripción. Responde SOLO JSON:
            {"valid":true, "data":{"oitNumber":"", "description":"", "status":"PENDING"}}
            Texto: ${safeText}`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
                format: 'json',
            });
            const text = response.data.response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        } catch (error) {
            return { valid: false, message: 'Error' };
        }
    }

    private heuristicAnalysis(text: string): AIAnalysisResult {
        return { status: 'alerta', alerts: ['Offline'], missing: [], evidence: [], services: [], location: null };
    }

    public async recommendResources(documentText: string): Promise<string[]> {
        return ['GPS', 'Vehículo'];
    }

    public async analyzeLabResults(documentText: string, oitContext?: string): Promise<string> {
        try {
            const safeText = documentText.substring(0, 20000);
            const prompt = `Eres Analista Técnico Ambiental de Serambiente. Analiza el siguiente resultado de laboratorio y extrae la información en el formato exacto solicitado.

CONTEXTO DE LA OIT: ${oitContext || 'No especificado'}

DOCUMENTO DE LABORATORIO:
${safeText}

Responde ÚNICAMENTE con un JSON válido con esta forma exacta:
{
  "rawText": "[ESCRIBE AQUÍ 3-5 párrafos de análisis técnico real basado en los resultados encontrados: qué se midió, valores destacados, comparación con la normativa citada si aplica, observaciones relevantes. NO copies estas instrucciones, redacta el análisis real.]",
  "parsedData": {
    "cliente": "Nombre o razón social del cliente/empresa (extraer del documento, NO inventar)",
    "nit": "NIT del cliente si aparece, o cadena vacía",
    "ubicacion": {
      "ciudad": "Ciudad donde se realizó el monitoreo",
      "departamento": "Departamento donde se realizó el monitoreo",
      "direccion": "Dirección de la sede o punto de muestreo si aparece"
    },
    "tipoEstudio": "Descripción corta del tipo de estudio/matriz analizada",
    "tipoMatriz": "Agua | Aire | Ruido | Suelo | Biota | Residuos (la que aplique)",
    "puntos": [
      {
        "id": "Identificador del punto de muestreo",
        "nombre": "Nombre del punto",
        "descripcion": "Descripción del punto",
        "idMuestra": "Identificador de la muestra",
        "hora": "Hora de muestreo si aparece (HH:MM)",
        "latitud": "Latitud si aparece",
        "longitud": "Longitud si aparece",
        "norte": "Coordenada norte si aparece",
        "este": "Coordenada este si aparece"
      }
    ],
    "resultados": [
      {
        "parametro": "Nombre del parámetro medido",
        "valor": "Valor numérico o texto del resultado",
        "unidad": "Unidad de medida",
        "metodo": "Método analítico si aparece",
        "limite": "Límite de cuantificación si aparece",
        "normativa": "Límite normativo aplicable si se identifica",
        "cumple": true
      }
    ]
  }
}

REGLAS ESTRICTAS:
- Extrae SOLO datos que existan literalmente en el documento. Si un dato no aparece, usa cadena vacía "" o null. NUNCA inventes nombres, cifras o ubicaciones.
- "resultados" debe incluir TODOS los parámetros medidos que encuentres en el documento, no solo algunos.
- Responde SOLO el JSON, sin texto adicional antes o después.`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
                format: 'json',
            });

            let responseText = (response.data.response || '').trim();
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                responseText = responseText.substring(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(responseText);
            if (!parsed.rawText) {
                // Model didn't follow the schema; fall back to treating the whole response as narrative
                return JSON.stringify({ rawText: response.data.response || '', parsedData: parsed.parsedData || {} });
            }
            return JSON.stringify(parsed);
        } catch (error: any) {
            console.error('Lab results analysis error:', error.response?.data || error.message);
            return JSON.stringify({ rawText: 'Error en análisis IA de resultados de laboratorio', parsedData: {} });
        }
    }

    public async analyzeSamplingResults(samplingData: any, oitContext?: string): Promise<string> {
        return 'Analizado';
    }

    public async analyzeSamplingSheets(documentText: string, oitContext?: string): Promise<any> {
        return { summary: 'OK', quality: 'buena', findings: [], recommendations: [] };
    }
}

export const aiService = new AIService();
