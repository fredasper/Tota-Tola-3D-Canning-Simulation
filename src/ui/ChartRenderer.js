/**
 * Chart Renderer
 * Renders production timeline chart
 */

import CONFIG from '../config/settings.js';

export class ChartRenderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas?.getContext('2d');
        this.width = this.canvas?.width || 250;
        this.height = this.canvas?.height || 150;
    }

    /**
     * Draw production rate chart
     * @param {array} history - Production history data
     */
    draw(history) {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 14, 39, 0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (history.length < 2) return;

        // Calculate scale
        const maxRate = Math.max(...history.map(h => h.rate || 20), 20);
        const timeRange = history[history.length - 1].time - history[0].time || 1;

        // Draw grid
        this.drawGrid(maxRate);

        // Draw line chart
        this.drawLine(history, maxRate);

        // Draw current value point
        this.drawCurrentPoint(history, maxRate);
    }

    /**
     * Draw grid
     * @param {number} maxRate - Maximum rate value
     */
    drawGrid(maxRate) {
        this.ctx.strokeStyle = 'rgba(42, 58, 82, 0.3)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= 4; i++) {
            const y = (this.height / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Draw Y-axis labels
        this.ctx.fillStyle = 'rgba(160, 160, 160, 0.5)';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const value = Math.round((maxRate / 4) * (4 - i));
            const y = (this.height / 4) * i;
            this.ctx.fillText(value, this.width - 2, y + 3);
        }
    }

    /**
     * Draw line chart
     * @param {array} history - Production history
     * @param {number} maxRate - Maximum rate
     */
    drawLine(history, maxRate) {
        this.ctx.strokeStyle = '#ff6b35';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        history.forEach((point, index) => {
            const x = (index / history.length) * this.width;
            const y = this.height - (point.rate / maxRate) * this.height;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    /**
     * Draw current point indicator
     * @param {array} history - Production history
     * @param {number} maxRate - Maximum rate
     */
    drawCurrentPoint(history, maxRate) {
        const lastPoint = history[history.length - 1];
        const lastX = this.width;
        const lastY = this.height - (lastPoint.rate / maxRate) * this.height;

        this.ctx.fillStyle = '#ff6b35';
        this.ctx.beginPath();
        this.ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Glow effect
        this.ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    /**
     * Clear chart
     */
    clear() {
        if (this.ctx) {
            this.ctx.fillStyle = 'rgba(10, 14, 39, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}

export default ChartRenderer;
