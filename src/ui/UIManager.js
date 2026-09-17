/**
 * UI Manager
 * Handles all UI updates and event management
 */

import CONFIG from '../config/settings.js';
import ChartRenderer from './ChartRenderer.js';
import { formatTime, formatNumber, getElementById } from '../utils/helpers.js';

export class UIManager {
    constructor(factory) {
        this.factory = factory;
        this.chartRenderer = null;
        this.elements = {};
        this.updateInterval = null;

        this.cacheElements();
        this.initChart();
        this.setupEventListeners();
    }

    /**
     * Cache DOM element references
     */
    cacheElements() {
        // Cache elements from config IDs
        Object.entries(CONFIG.ids).forEach(([key, id]) => {
            this.elements[key] = getElementById(id);
        });
    }

    /**
     * Initialize chart
     */
    initChart() {
        const canvas = this.elements.chartCanvas;
        if (canvas) {
            this.chartRenderer = new ChartRenderer(canvas);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Start/Stop button
        const startButton = this.elements.btnStart;
        if (startButton) {
            startButton.addEventListener('click', () => this.toggleSimulation());
        }

        // Production speed slider
        const speedSlider = this.elements.sliderSpeed;
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.factory.setProductionSpeed(parseFloat(e.target.value));
                const speedValue = document.getElementById('speedValue');
                if (speedValue) {
                    speedValue.textContent = formatNumber(e.target.value, 1) + 'x';
                }
            });
        }

        // Batch size slider
        const batchSlider = this.elements.sliderBatch;
        if (batchSlider) {
            batchSlider.addEventListener('input', (e) => {
                this.factory.setCansPerBatch(parseInt(e.target.value));
                const batchValue = document.getElementById('batchValue');
                if (batchValue) {
                    batchValue.textContent = e.target.value;
                }
            });
        }

        // Duration slider
        const durationSlider = this.elements.sliderDuration;
        if (durationSlider) {
            durationSlider.addEventListener('input', (e) => {
                this.factory.setSimulationDuration(parseFloat(e.target.value));
                const durationValue = document.getElementById('durationValue');
                if (durationValue) {
                    durationValue.textContent = formatTime(parseFloat(e.target.value));
                }
            });
        }

        // Production mode dropdown
        const modeSelect = this.elements.selectMode;
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                this.factory.setProductionMode(e.target.value);
            });
        }

        // Reset button
        const resetButton = this.elements.btnReset;
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetSimulation());
        }

        // Control panel toggle
        const controlsButton = this.elements.btnControls;
        if (controlsButton) {
            controlsButton.addEventListener('click', () => this.toggleControlPanel());
        }
    }

    /**
     * Toggle simulation
     */
    toggleSimulation() {
        if (this.factory.isRunning) {
            this.factory.stop();
        } else {
            this.factory.start();
        }
        this.updateToggleButton();
    }

    /**
     * Reset simulation
     */
    resetSimulation() {
        this.factory.stop();
        this.factory.resetStations();
        this.factory.elapsedTime = 0;
        this.factory.totalCansProduced = 0;
        this.factory.productionHistory = [];
        this.updateMetrics();
        this.updateToggleButton();
    }

    /**
     * Toggle control panel visibility
     */
    toggleControlPanel() {
        const panel = this.elements.controlPanel;
        if (panel) {
            panel.classList.toggle('open');
        }
    }

    /**
     * Update toggle button state
     */
    updateToggleButton() {
        const button = this.elements.btnStart;
        if (button) {
            button.textContent = this.factory.isRunning ? '⏸ PAUSE PRODUCTION' : '▶ START PRODUCTION';
            button.classList.toggle('running', this.factory.isRunning);
        }
    }

    /**
     * Update all UI metrics
     */
    updateMetrics() {
        const metrics = this.factory.getMetrics();

        // Update main metrics
        const timeElement = this.elements.elapsedTime;
        if (timeElement) {
            timeElement.textContent = formatTime(metrics.elapsedTime);
        }

        const producedElement = this.elements.metricTotal;
        if (producedElement) {
            producedElement.textContent = formatNumber(metrics.totalCansProduced, 0);
        }

        const rateElement = this.elements.currentRate;
        if (rateElement) {
            rateElement.textContent = formatNumber(metrics.productionRate, 1) + ' cans/min';
        }

        const bottleneckElement = this.elements.bottleneckInfo;
        if (bottleneckElement) {
            bottleneckElement.textContent = 'Bottleneck: ' + metrics.bottleneck;
        }

        // Update overall status
        this.updateOverallStatus(metrics.overallStatus);

        // Update station table
        this.updateStationTable(metrics.stationStates);

        // Update chart
        if (this.chartRenderer) {
            this.chartRenderer.draw(metrics.productionHistory);
        }
    }

    /**
     * Update overall factory status
     * @param {object} status - Status object
     */
    updateOverallStatus(status) {
        const statusElement = this.elements.overallStatus;
        if (statusElement) {
            statusElement.textContent = status.label;
            statusElement.className = `overall-status ${status.class}`;
        }
    }

    /**
     * Update station status table
     * @param {object} stationStates - Station states object
     */
    updateStationTable(stationStates) {
        const tbody = this.elements.stationTable;
        if (!tbody) return;

        const stationKeys = ['mixing', 'carbonation', 'filling', 'capping', 'packing'];

        stationKeys.forEach(stationKey => {
            const state = stationStates[stationKey];
            let row = document.getElementById(`row-${stationKey}`);

            if (!row) {
                row = document.createElement('tr');
                row.id = `row-${stationKey}`;
                tbody.appendChild(row);
            }

            const statusClass = this.factory.getStationStatusClass(stationKey);
            const statusLabel = this.factory.getStationStatus(stationKey);

            row.innerHTML = `
                <td class="station-name">${CONFIG.stations[stationKey].name}</td>
                <td class="status ${statusClass}">${statusLabel}</td>
                <td>${formatNumber(state.efficiencyPercent, 1)}%</td>
                <td>${formatNumber(state.position * 100, 0)}%</td>
                <td>${formatNumber(state.cansProcessed, 0)}</td>
            `;
        });
    }

    /**
     * Start continuous update loop
     */
    startUpdateLoop() {
        this.updateInterval = setInterval(() => {
            if (this.factory.isRunning) {
                this.updateMetrics();
            }
        }, 100);
    }

    /**
     * Stop update loop
     */
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.stopUpdateLoop();
    }
}

export default UIManager;
