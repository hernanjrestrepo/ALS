import { describe, it, expect, vi } from 'vitest';
import { pdfService } from '../src/services/pdf.service';

describe('pdfService.generateSamplingReport', () => {
    it('renders the checklist answers stored in samplingData with template titles', async () => {
        const spy = vi.spyOn(pdfService, 'generatePDFFromHTML').mockResolvedValue('/tmp/x.pdf');
        const oit: any = {
            id: '1', oitNumber: 'OIT-1', description: 'Agua', location: 'Barranquilla',
            aiData: null, stepValidations: null, finalAnalysis: null, createdAt: new Date(),
            samplingData: JSON.stringify({
                templateName: 'Agua potable',
                steps: [
                    { stepId: 'a', stepType: 'INPUT', value: '25 °C', timestamp: '2026-09-22T10:00:00Z' },
                    { stepId: 'b', stepType: 'CHECKBOX', value: true, metadata: { comment: 'Sin novedad <ok>' } },
                ],
            }),
        };

        await pdfService.generateSamplingReport(oit, [
            { id: 'a', title: 'Temperatura' },
            { id: 'b', title: 'Equipo calibrado' },
        ]);

        const html = spy.mock.calls[0][0];
        expect(html).toContain('Temperatura');
        expect(html).toContain('25 °C');
        expect(html).toContain('Equipo calibrado');
        expect(html).toContain('Sí');
        expect(html).toContain('Sin novedad &lt;ok&gt;');
    });
});
