import { createCanvas } from '@napi-rs/canvas';

export class ChartService {
    public static async generateIndicesChart(indices: { name: string, value: number }[]): Promise<Buffer> {
        const width = 600;
        const height = 400;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Chart area
        const margin = 50;
        const chartWidth = width - margin * 2;
        const chartHeight = height - margin * 2;

        // Draw axes
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, height - margin);
        ctx.lineTo(width - margin, height - margin);
        ctx.stroke();

        // Draw bars
        const barWidth = chartWidth / indices.length - 20;
        const maxVal = 1.0;

        indices.forEach((item, i) => {
            const x = margin + 10 + i * (barWidth + 20);
            const barHeight = (item.value / maxVal) * chartHeight;
            const y = height - margin - barHeight;

            // Bar color based on value
            if (item.value <= 0.2) ctx.fillStyle = '#4caf50'; // Green
            else if (item.value <= 0.4) ctx.fillStyle = '#8bc34a'; // Light Green
            else if (item.value <= 0.6) ctx.fillStyle = '#ffeb3b'; // Yellow
            else if (item.value <= 0.8) ctx.fillStyle = '#ff9800'; // Orange
            else ctx.fillStyle = '#f44336'; // Red

            ctx.fillRect(x, y, barWidth, barHeight);

            // Labels
            ctx.fillStyle = '#333333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.name, x + barWidth / 2, height - margin + 20);
            ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
        });

        // Title
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Índices de Contaminación', width / 2, margin - 10);

        return canvas.toBuffer('image/png');
    }
}
