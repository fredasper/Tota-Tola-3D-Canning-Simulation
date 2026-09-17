/**
 * Factory Simulation Engine
 * Manages all stations and overall production metrics
 */

import { Station } from './Station.js';
import CONFIG from '../config/settings.js';

export class Factory {
    constructor() {
        // Parameters
        this.productionSpeed = CONFIG.simulation.defaultSpeed;
        this.cansPerBatch = CONFIG.simulation.defaultBatchSize;
        this.simDuration = CONFIG.simulation.defaultDuration;
        this.productionMode = 'standard';

        // Time tracking
        this.elapsedTime = 0;
        this.isRunning = false;
        this.lastUpdateTime = Date.now();

        // Create stations
        this.stations = {};
        this.stationOrder = ['mixing', 'carbonation', 'filling', 'capping', 'packing'];
        this.initializeStations();

        // Production metrics
        this.totalCansProduced = 0;
        this.productionHistory = [];
        this.currentThroughput = 0;
    }

    /**
     * Initialize all stations
     */
    initializeStations() {
        Object.keys(CONFIG.stations).forEach(key => {
            const config = CONFIG.stations[key];
            this.stations[key] = new Station(key, config, config.defaultEfficiency);
        });
    }

    /**
     * Start simulation
     */
    start() {
        this.isRunning = true;
        this.elapsedTime = 0;
        this.totalCansProduced = 0;
        this.productionHistory = [];
        this.resetStations();
    }

    /**
     * Stop simulation
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Reset all stations
     */
    resetStations() {
        Object.values(this.stations).forEach(station => {
            station.reset();
        });
    }

    /**
     * Update simulation state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.isRunning) return;

        const adjustedDelta = deltaTime * this.productionSpeed;
        this.elapsedTime += adjustedDelta;

        // Stop if duration exceeded
        if (this.elapsedTime >= this.simDuration) {
            this.stop();
            return;
        }

        // Update all stations
        this.stationOrder.forEach(stationKey => {
            this.stations[stationKey].update(adjustedDelta, this.productionSpeed);
        });

        // Update total production (from last station)
        this.totalCansProduced = this.stations.packing.cansProcessed;

        // Calculate metrics
        this.calculateMetrics();

        // Record history
        this.recordHistory();
    }

    /**
     * Calculate efficiency and metrics
     */
    calculateMetrics() {
        // Calculate throughput (cans per minute)
        this.currentThroughput = (this.totalCansProduced / Math.max(this.elapsedTime, 1)) * 60;
    }

    /**
     * Record production history for timeline
     */
    recordHistory() {
        // Record every ~0.5 seconds
        if (this.elapsedTime % 0.5 < 0.016) {
            this.productionHistory.push({
                time: this.elapsedTime,
                rate: this.currentThroughput
            });

            // Keep only last 120 points
            if (this.productionHistory.length > CONFIG.ui.chart.maxDataPoints) {
                this.productionHistory.shift();
            }
        }
    }

    /**
     * Set production speed multiplier
     * @param {number} speed - Speed multiplier
     */
    setProductionSpeed(speed) {
        this.productionSpeed = Math.max(
            CONFIG.simulation.minSpeed,
            Math.min(CONFIG.simulation.maxSpeed, speed)
        );
    }

    /**
     * Set cans per batch
     * @param {number} cans - Number of cans
     */
    setCansPerBatch(cans) {
        this.cansPerBatch = Math.max(
            CONFIG.simulation.minBatchSize,
            Math.min(CONFIG.simulation.maxBatchSize, cans)
        );
    }

    /**
     * Set simulation duration
     * @param {number} duration - Duration in seconds
     */
    setSimulationDuration(duration) {
        this.simDuration = Math.max(
            CONFIG.simulation.minDuration,
            Math.min(CONFIG.simulation.maxDuration, duration)
        );
    }

    /**
     * Set production mode
     * @param {string} mode - 'standard', 'express', or 'testing'
     */
    setProductionMode(mode) {
        this.productionMode = mode;
        const modifier = CONFIG.modes[mode]?.efficiencyModifier || 0;

        Object.values(this.stations).forEach(station => {
            station.applyEfficiencyModifier(modifier);
        });
    }

    /**
     * Find bottleneck station (lowest efficiency)
     * @returns {string} Station name
     */
    findBottleneck() {
        let bottleneck = null;
        let minEfficiency = 100;

        this.stationOrder.forEach(key => {
            const efficiency = this.stations[key].getEfficiencyPercent();
            if (efficiency < minEfficiency) {
                minEfficiency = efficiency;
                bottleneck = this.stations[key].config.name;
            }
        });

        return bottleneck || 'None';
    }

    /**
     * Get overall factory status
     * @returns {object} Status with label and color
     */
    getOverallStatus() {
        let avgEfficiency = 0;
        this.stationOrder.forEach(key => {
            avgEfficiency += this.stations[key].getEfficiencyPercent();
        });
        avgEfficiency /= this.stationOrder.length;

        for (const threshold of ['optimal', 'caution', 'warning', 'critical']) {
            const config = CONFIG.efficiency[threshold];
            if (avgEfficiency >= config.min) {
                return {
                    label: this.getStatusLabel(threshold),
                    class: `status-${threshold}`,
                    avgEfficiency
                };
            }
        }

        return { label: '✕ CRITICAL', class: 'status-critical', avgEfficiency: 0 };
    }

    /**
     * Get status label with icon
     * @param {string} status - Status type
     * @returns {string} Formatted label
     */
    getStatusLabel(status) {
        const labels = {
            optimal: '✓ OPTIMAL',
            caution: '⚠ CAUTION',
            warning: '✕ WARNING',
            critical: '✕ CRITICAL'
        };
        return labels[status] || status;
    }

    /**
     * Get average fill level
     * @returns {number} Average fill level 0-100
     */
    getAverageFillLevel() {
        const fillLevels = [
            this.stations.mixing.fillLevel || 0,
            this.stations.filling.fillLevel || 0
        ];
        return fillLevels.reduce((a, b) => a + b, 0) / fillLevels.length;
    }

    /**
     * Get average cycle time
     * @returns {number} Average cycle time in minutes
     */
    getAverageCycleTime() {
        const totalTime = this.stationOrder.reduce((sum, key) => {
            return sum + this.stations[key].config.cycleTime;
        }, 0);
        return totalTime / this.stationOrder.length;
    }

    /**
     * Get all current metrics
     * @returns {object} Metrics object
     */
    getMetrics() {
        return {
            elapsedTime: this.elapsedTime,
            totalCansProduced: this.totalCansProduced,
            productionRate: this.currentThroughput,
            cycleTime: this.getAverageCycleTime(),
            fillLevel: this.getAverageFillLevel(),
            isRunning: this.isRunning,
            bottleneck: this.findBottleneck(),
            overallStatus: this.getOverallStatus(),
            productionHistory: this.productionHistory,
            stationStates: this.getStationStates(),
            productionSpeed: this.productionSpeed,
            cansPerBatch: this.cansPerBatch,
            simDuration: this.simDuration
        };
    }

    /**
     * Get all station states
     * @returns {object} States keyed by station name
     */
    getStationStates() {
        const states = {};
        this.stationOrder.forEach(key => {
            states[key] = this.stations[key].getState();
        });
        return states;
    }

    /**
     * Get efficiency status class for a station
     * @param {string} stationKey - Station key
     * @returns {string} CSS class
     */
    getStationStatusClass(stationKey) {
        const efficiency = this.stations[stationKey].getEfficiencyPercent();
        
        for (const threshold of ['optimal', 'caution', 'warning', 'critical']) {
            if (efficiency >= CONFIG.efficiency[threshold].min) {
                return `status-${threshold}`;
            }
        }
        
        return 'status-critical';
    }

    /**
     * Get efficiency status label for a station
     * @param {string} stationKey - Station key
     * @returns {string} Status label
     */
    getStationStatus(stationKey) {
        const efficiency = this.stations[stationKey].getEfficiencyPercent();
        
        for (const threshold of ['optimal', 'caution', 'warning', 'critical']) {
            if (efficiency >= CONFIG.efficiency[threshold].min) {
                return CONFIG.efficiency[threshold].label;
            }
        }
        
        return CONFIG.efficiency.critical.label;
    }
}

export default Factory;
