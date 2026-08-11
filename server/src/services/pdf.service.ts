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
    stepValidations: string | null;
    finalAnalysis: string | null;
    createdAt: Date;
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

    async generateSamplingReport(oit: OIT, date: string): Promise<string> {
        const { marked } = await import('marked');
        
        let stepsHTML = '';
        if (oit.stepValidations) {
            try {
                const validations = JSON.parse(oit.stepValidations);
                const steps = JSON.parse(oit.aiData || '{}').data?.samplingPlan?.steps || [];
                
                validations.forEach((v: any, index: number) => {
                    const step = steps[index] || {};
                    stepsHTML += `
                        <div class="step">
                            <h3>${step.description || 'Paso ' + (index + 1)}</h3>
                            <p><strong>Resultado:</strong> ${v.validated ? 'Validado' : 'No validado'}</p>
                            <p>${v.data?.value || ''}</p>
                            ${v.feedback ? `<div class="markdown">${marked.parse(v.feedback)}</div>` : ''}
                        </div>
                    `;
                });
            } catch (e) {
                console.error('Error parsing steps for PDF:', e);
            }
        }

        const html = `
            <html>
                <head><style>body { font-family: sans-serif; padding: 20px; }</style></head>
                <body>
                    <h1>Informe de Muestreo - ${oit.oitNumber}</h1>
                    <p><strong>Descripción:</strong> ${oit.description}</p>
                    <p><strong>Ubicación:</strong> ${oit.location}</p>
                    <hr/>
                    ${stepsHTML}
                    ${oit.finalAnalysis ? `<h2>Análisis Final</h2><div class="markdown">${marked.parse(oit.finalAnalysis)}</div>` : ''}
                </body>
            </html>
        `;

        return this.generatePDFFromHTML(html, `report-${oit.oitNumber}.pdf`);
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
