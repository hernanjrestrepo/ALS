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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss';
class AIService {
    constructor() {
        this.baseURL = OLLAMA_URL;
        this.defaultModel = DEFAULT_MODEL;
    }
    isAvailable() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios_1.default.get(`${this.baseURL}/api/tags`, { timeout: 2000 });
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    getModels() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.baseURL}/api/tags`);
                return response.data.models.map((m) => m.name);
            }
            catch (error) {
                return [];
            }
        });
    }
    chunkText(text, size) {
        const chunks = [];
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substring(i, i + size));
        }
        return chunks;
    }
    cascadeSummary(text, objective) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Larger chunks to reduce sequential API calls (Kimi can handle it)
            const chunks = this.chunkText(text, 30000);
            console.log(`[AI] Cascade Summary: ${chunks.length} chunks. Objective: ${objective}`);
            const summaries = [];
            for (let i = 0; i < chunks.length; i++) {
                console.log(`[AI] Summarizing chunk ${i + 1}/${chunks.length}...`);
                const prompt = `Actúa como Analista Técnico de Muestreo Ambiental.
            OBJETIVO: ${objective}
            
            INSTRUCCIÓN CRÍTICA: Extrae TODOS los nombres de servicios (ej: Ruido, Aguas, Aire, Suelo), parámetros a medir, ubicación exacta y fechas. NO omitas ningún servicio técnico.
            
            BLOQUE A ANALIZAR (${i + 1}/${chunks.length}):
            ${chunks[i]}
            
            Resumen técnico (enfocado en servicios y ubicación):`;
                try {
                    const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
                        model: this.defaultModel,
                        prompt,
                        stream: false,
                    });
                    summaries.push(response.data.response);
                }
                catch (error) {
                    console.error(`Error chunk ${i}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                    summaries.push(`[Error en bloque ${i + 1}]`);
                }
            }
            return summaries.join('\n\n--- CONTINUACIÓN ---\n\n');
        });
    }
    chat(message, model, system) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const useModel = model || this.defaultModel;
            console.log(`[AI] Sending Chat Request. Model: ${useModel}`);
            try {
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
                    model: useModel,
                    system: system || 'Eres un asistente experto en ingeniería ambiental y normativa colombiana.',
                    prompt: message,
                    stream: false,
                });
                return response.data.response || '';
            }
            catch (error) {
                console.error('AI Chat error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw error;
            }
        });
    }
    analyzeDocument(documentText) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const available = yield this.isAvailable();
            if (!available)
                return this.heuristicAnalysis(documentText);
            try {
                let processedText = documentText;
                if (documentText.length > 25000) {
                    console.log(`[AI] Document too large (${documentText.length}). Starting Cascade Summary...`);
                    processedText = yield this.cascadeSummary(documentText, 'Extraer lista de servicios y ubicación para programación');
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
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
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
                console.log(`[AI] Result Status: ${parsed.status}. Services: ${((_a = parsed.services) === null || _a === void 0 ? void 0 : _a.length) || 0}`);
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
            }
            catch (error) {
                console.error('AI Analysis error:', ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                return this.heuristicAnalysis(documentText);
            }
        });
    }
    extractOITData(documentText) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const safeText = documentText.substring(0, 15000);
                const prompt = `Extrae número de OIT y descripción. Responde SOLO JSON:
            {"valid":true, "data":{"oitNumber":"", "description":"", "status":"PENDING"}}
            Texto: ${safeText}`;
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
                    model: this.defaultModel,
                    prompt,
                    stream: false,
                    format: 'json',
                });
                const text = response.data.response.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(text);
            }
            catch (error) {
                return { valid: false, message: 'Error' };
            }
        });
    }
    heuristicAnalysis(text) {
        return { status: 'alerta', alerts: ['Offline'], missing: [], evidence: [], services: [], location: null };
    }
    recommendResources(documentText) {
        return __awaiter(this, void 0, void 0, function* () {
            return ['GPS', 'Vehículo'];
        });
    }
    analyzeLabResults(documentText, oitContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
                    model: this.defaultModel,
                    prompt: `Analiza: ${documentText.substring(0, 15000)}`,
                    stream: false,
                });
                return response.data.response || '';
            }
            catch (error) {
                return 'Error';
            }
        });
    }
    analyzeSamplingResults(samplingData, oitContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return 'Analizado';
        });
    }
    analyzeSamplingSheets(documentText, oitContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return { summary: 'OK', quality: 'buena', findings: [], recommendations: [] };
        });
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
