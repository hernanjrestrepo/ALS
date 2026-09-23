import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

interface OIT {
    id: string;
    oitNumber: string;
    description: string | null;
    location: string | null;
    aiData: string | null;
    samplingData: string | null;
    stepValidations: string | null;
    finalAnalysis: string | null;
    createdAt: Date;
}

export interface TemplateStepInfo {
    id: string;
    title: string;
}

class PDFService {
    /**
     * Extract text from PDF file
     */
    async extractText(filePath: string): Promise<string> {
        try {
            const pdfParse = (await import('pdf-parse')).default;
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw error;
        }
    }

    /**
     * Informe de muestreo. Las respuestas del checklist se guardan en
     * OIT.samplingData (SamplingData del cliente: steps[] con stepId/value);
     * los titulos de cada paso viven en la plantilla (templateSteps).
     */
    async generateSamplingReport(oit: OIT, templateSteps: TemplateStepInfo[] = []): Promise<string> {
        const { marked } = await import('marked');
        const esc = (v: unknown) => String(v ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const titleById = new Map(templateSteps.map(t => [t.id, t.title]));
        let stepsHTML = '';
        let templateName = '';

        try {
            const sampling = oit.samplingData ? JSON.parse(oit.samplingData) : null;
            templateName = sampling?.templateName || '';
            (sampling?.steps || []).forEach((s: any, index: number) => {
                const files: string[] = Array.isArray(s.files) ? s.files : [];
                stepsHTML += `
                    <div class="step">
                        <h3>${index + 1}. ${esc(titleById.get(s.stepId) || 'Paso ' + (index + 1))}</h3>
                        <p><strong>Respuesta:</strong> ${esc(this.formatStepValue(s))}</p>
                        ${s.metadata?.comment ? `<p><strong>Comentario:</strong> ${esc(s.metadata.comment)}</p>` : ''}
                        ${s.timestamp ? `<p class="meta">Registrado: ${esc(s.timestamp)}</p>` : ''}
                        ${files.length ? `<p class="meta">Archivos adjuntos: ${files.map(esc).join(', ')}</p>` : ''}
                    </div>
                `;
            });
        } catch (e) {
            console.error('Error parsing samplingData for PDF:', e);
        }

        const html = `
            <html>
                <head><meta charset="utf-8"><style>
                    body { font-family: sans-serif; padding: 20px; }
                    .step { margin-bottom: 14px; }
                    .meta { color: #666; font-size: 12px; }
                </style></head>
                <body>
                    <h1>Informe de Muestreo - ${esc(oit.oitNumber)}</h1>
                    ${templateName ? `<p><strong>Plantilla:</strong> ${esc(templateName)}</p>` : ''}
                    <p><strong>Descripción:</strong> ${esc(oit.description)}</p>
                    <p><strong>Ubicación:</strong> ${esc(oit.location)}</p>
                    <hr/>
                    ${stepsHTML || '<p>Sin respuestas de muestreo registradas.</p>'}
                    ${oit.finalAnalysis ? `<h2>Análisis Final</h2><div class="markdown">${marked.parse(oit.finalAnalysis)}</div>` : ''}
                </body>
            </html>
        `;

        return this.generatePDFFromHTML(html, `report-${oit.oitNumber}.pdf`);
    }

    private formatStepValue(step: any): string {
        const v = step.value;
        if (v === null || v === undefined || v === '') return '—';
        if (typeof v === 'boolean') return v ? 'Sí' : 'No';
        if (typeof v === 'object') {
            if (step.stepType === 'SIGNATURE') {
                return [v.name, v.role].filter(Boolean).join(' — ') || 'Firmado';
            }
            return JSON.stringify(v);
        }
        return String(v);
    }

    async generatePDFFromHTML(htmlContent: string, filename: string): Promise<string> {
        const uploadsDir = path.join(__dirname, '../../uploads/reports');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const filepath = path.join(uploadsDir, filename);

        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        await page.pdf({ path: filepath, format: 'A4' });
        await browser.close();
        return filepath;
    }
}

export const pdfService = new PDFService();
