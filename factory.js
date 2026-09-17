/**
 * Factory Simulation Engine for Popa Cola Manufacturing
 * Handles all simulation logic, state management, and calculations
 */

class PopaColaFactory {
    constructor() {
        // Simulation parameters
        this.productionSpeed = 1.0; // Multiplier for speed (0.5x to 2.0x)
        this.cansPerBatch = 50;
        this.simDuration = 60; // seconds
        this.productionMode = 'standard';
        
        // Time tracking
        this.elapsedTime = 0;
        this.isRunning = false;
        this.lastFrameTime = Date.now();
        
        // Station definitions (5 stations as per requirements)
        this.stations = {
            mixing: { name: 'Mixing', cycleTime: 2.0, efficiency: 0.98 },
            carbonation: { name: 'Carbonation', cycleTime: 2.5, efficiency: 0.95 },
            filling: { name: 'Filling', cycleTime: 1.5, efficiency: 0.98 },
            capping: { name: 'Capping', cycleTime: 1.0, efficiency: 0.92 },
            packing: { name: 'Packing', cycleTime: 3.0, efficiency: 0.87 }
        };
        
        this.stationOrder = ['mixing', 'carbonation', 'filling', 'capping', 'packing'];
        
        // Initialize station states
        this.stationStates = {};
        this.stationStates.mixing = { 
            cansProcessed: 0, 
            fillLevel: 0, 
            currentCans: 0,
            position: 0 // 0-1 representing progress through station
        };
        this.stationStates.carbonation = { 
            cansProcessed: 0, 
            pressure: 0, 
            currentCans: 0,
            position: 0
        };
        this.stationStates.filling = { 
            cansProcessed: 0, 
            fillLevel: 0, 
            currentCans: 0,
            position: 0
        };
        this.stationStates.capping = { 
            cansProcessed: 0, 
            sealQuality: 0, 
            currentCans: 0,
            position: 0
        };
        this.stationStates.packing = { 
            cansProcessed: 0, 
            boxCount: 0, 
            currentCans: 0,
            position: 0
        };
        
        // Production metrics
        this.totalCansProduced = 0;
        this.productionHistory = []; // For timeline graph
        this.cycleTimeHistory = [];
        
        // Can queue system
        this.canQueue = {
            atMixing: 0,
            atCarbonation: 0,
            atFilling: 0,
            atCapping: 0,
            atPacking: 0,
            completed: 0
        };
    }

    /**
     * Start the factory simulation
     */
    start() {
        this.isRunning = true;
        this.elapsedTime = 0;
        this.totalCansProduced = 0;
        this.productionHistory = [];
        this.resetStations();
    }

    /**
     * Stop the factory simulation
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Reset all stations to initial state
     */
    resetStations() {
        Object.keys(this.stationStates).forEach(station => {
            this.stationStates[station].cansProcessed = 0;
            this.stationStates[station].currentCans = 0;
            this.stationStates[station].position = 0;
            if (this.stationStates[station].fillLevel !== undefined) {
                this.stationStates[station].fillLevel = 0;
            }
        });
        this.canQueue = {
            atMixing: 0,
            atCarbonation: 0,
            atFilling: 0,
            atCapping: 0,
            atPacking: 0,
            completed: 0
        };
    }

    /**
     * Update simulation state based on delta time
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.isRunning) return;

        const adjustedDelta = deltaTime * this.productionSpeed;
        this.elapsedTime += adjustedDelta;

        // Stop simulation if duration exceeded
        if (this.elapsedTime >= this.simDuration) {
            this.stop();
            return;
        }

        // Process each station
        this.processStations(adjustedDelta);

        // Update metrics
        this.calculateMetrics();

        // Record history for timeline
        this.recordHistory();
    }

    /**
     * Process all stations in sequence
     * @param {number} deltaTime - Adjusted delta time
     */
    processStations(deltaTime) {
        // Process in order: Mixing -> Carbonation -> Filling -> Capping -> Packing
        
        // MIXING STATION
        this.processStation('mixing', deltaTime, () => {
            this.stationStates.mixing.fillLevel = Math.min(
                this.stationStates.mixing.fillLevel + (deltaTime / this.stations.mixing.cycleTime) * 100,
                100
            );
        });

        // CARBONATION STATION
        this.processStation('carbonation', deltaTime, () => {
            this.stationStates.carbonation.pressure = Math.min(
                this.stationStates.carbonation.pressure + (deltaTime / this.stations.carbonation.cycleTime) * 100,
                100
            );
        });

        // FILLING STATION
        this.processStation('filling', deltaTime, () => {
            this.stationStates.filling.fillLevel = Math.min(
                this.stationStates.filling.fillLevel + (deltaTime / this.stations.filling.cycleTime) * 100,
                100
            );
        });

        // CAPPING STATION
        this.processStation('capping', deltaTime, () => {
            this.stationStates.capping.sealQuality = Math.min(
                this.stationStates.capping.sealQuality + (deltaTime / this.stations.capping.cycleTime) * 100,
                100
            );
        });

        // PACKING STATION
        this.processStation('packing', deltaTime, () => {
            // Packing multiple cans into boxes
            const boxCapacity = 24; // 24 cans per box
            const cansInCurrentBox = this.stationStates.packing.currentCans % boxCapacity;
            this.stationStates.packing.boxCount = Math.floor(
                this.stationStates.packing.cansProcessed / boxCapacity
            );
        });
    }

    /**
     * Process a single station
     * @param {string} stationKey - Station identifier
     * @param {number} deltaTime - Delta time
     * @param {Function} updateFn - Function to update station-specific metrics
     */
    processStation(stationKey, deltaTime, updateFn) {
        const station = this.stations[stationKey];
        const state = this.stationStates[stationKey];

        // Update position in station cycle
        state.position += (deltaTime / station.cycleTime);

        // If can completes processing at this station
        if (state.position >= 1.0) {
            const completedCans = Math.floor(state.position);
            state.cansProcessed += completedCans;
            state.currentCans = Math.floor(state.position % 1.0 * this.cansPerBatch);
            state.position = state.position % 1.0;
            this.totalCansProduced = Math.max(
                this.totalCansProduced,
                this.stationStates.packing.cansProcessed
            );
        }

        // Apply station-specific update
        updateFn();
    }

    /**
     * Calculate efficiency and status for each station
     */
    calculateMetrics() {
        // Calculate throughput (cans per minute)
        const throughput = (this.totalCansProduced / Math.max(this.elapsedTime, 1)) * 60;
        
        // Calculate average cycle time
        const totalStationTime = Object.values(this.stations)
            .reduce((sum, s) => sum + s.cycleTime, 0);
        const averageCycleTime = totalStationTime / this.stationOrder.length;

        // Store for later retrieval
        this.currentThroughput = throughput;
        this.currentCycleTime = averageCycleTime;
    }

    /**
     * Record production history for timeline graph
     */
    recordHistory() {
        if (this.elapsedTime % 0.5 < 0.016) { // Record every ~0.5 seconds
            const throughput = (this.totalCansProduced / Math.max(this.elapsedTime, 1)) * 60;
            this.productionHistory.push({
                time: this.elapsedTime,
                rate: throughput
            });

            // Keep only last 120 data points for performance
            if (this.productionHistory.length > 120) {
                this.productionHistory.shift();
            }
        }
    }

    /**
     * Get station efficiency percentage
     * @param {string} stationKey - Station identifier
     * @returns {number} Efficiency 0-100
     */
    getStationEfficiency(stationKey) {
        return this.stations[stationKey].efficiency * 100;
    }

    /**
     * Get station status (Optimal, Caution, Warning, Critical)
     * @param {string} stationKey - Station identifier
     * @returns {string} Status label
     */
    getStationStatus(stationKey) {
        const efficiency = this.getStationEfficiency(stationKey);
        if (efficiency >= 95) return 'Optimal';
        if (efficiency >= 85) return 'Caution';
        if (efficiency >= 70) return 'Warning';
        return 'Critical';
    }

    /**
     * Get station status color class
     * @param {string} stationKey - Station identifier
     * @returns {string} CSS class name
     */
    getStationStatusClass(stationKey) {
        const efficiency = this.getStationEfficiency(stationKey);
        if (efficiency >= 95) return 'status-optimal';
        if (efficiency >= 85) return 'status-caution';
        if (efficiency >= 70) return 'status-warning';
        return 'status-critical';
    }

    /**
     * Find bottleneck station
     * @returns {string} Name of bottleneck station
     */
    findBottleneck() {
        let bottleneck = null;
        let minEfficiency = 100;

        Object.keys(this.stations).forEach(key => {
            const efficiency = this.getStationEfficiency(key);
            if (efficiency < minEfficiency) {
                minEfficiency = efficiency;
                bottleneck = this.stations[key].name;
            }
        });

        return bottleneck || 'None';
    }

    /**
     * Get overall factory status
     * @returns {object} Status object with label and color
     */
    getOverallStatus() {
        let avgEfficiency = 0;
        Object.keys(this.stations).forEach(key => {
            avgEfficiency += this.getStationEfficiency(key);
        });
        avgEfficiency /= Object.keys(this.stations).length;

        if (avgEfficiency >= 95) {
            return { label: '✓ OPTIMAL', class: 'status-optimal' };
        } else if (avgEfficiency >= 85) {
            return { label: '⚠ CAUTION', class: 'status-caution' };
        } else if (avgEfficiency >= 70) {
            return { label: '✕ WARNING', class: 'status-warning' };
        }
        return { label: '✕ CRITICAL', class: 'status-critical' };
    }

    /**
     * Get average fill level across all stations
     * @returns {number} Average fill level 0-100
     */
    getAverageFillLevel() {
        const fillLevels = [
            this.stationStates.mixing.fillLevel || 0,
            this.stationStates.filling.fillLevel || 0
        ];
        return fillLevels.reduce((a, b) => a + b, 0) / fillLevels.length;
    }

    /**
     * Set production speed multiplier
     * @param {number} speed - Speed multiplier (0.5 to 2.0)
     */
    setProductionSpeed(speed) {
        this.productionSpeed = Math.max(0.5, Math.min(2.0, speed));
    }

    /**
     * Set cans per batch
     * @param {number} cans - Number of cans
     */
    setCansPerBatch(cans) {
        this.cansPerBatch = Math.max(10, Math.min(200, cans));
    }

    /**
     * Set simulation duration
     * @param {number} duration - Duration in seconds
     */
    setSimulationDuration(duration) {
        this.simDuration = Math.max(10, Math.min(120, duration));
    }

    /**
     * Set production mode
     * @param {string} mode - 'standard', 'express', or 'testing'
     */
    setProductionMode(mode) {
        this.productionMode = mode;
        // Adjust efficiency based on mode
        if (mode === 'express') {
            Object.keys(this.stations).forEach(key => {
                this.stations[key].efficiency = Math.max(0.8, this.stations[key].efficiency - 0.05);
            });
        } else if (mode === 'standard') {
            // Reset to default
            this.stations.mixing.efficiency = 0.98;
            this.stations.carbonation.efficiency = 0.95;
            this.stations.filling.efficiency = 0.98;
            this.stations.capping.efficiency = 0.92;
            this.stations.packing.efficiency = 0.87;
        }
    }

    /**
     * Get all current metrics as object
     * @returns {object} Metrics object
     */
    getMetrics() {
        return {
            elapsedTime: this.elapsedTime,
            totalCansProduced: this.totalCansProduced,
            productionRate: this.currentThroughput || 0,
            cycleTime: this.currentCycleTime || 0,
            fillLevel: this.getAverageFillLevel(),
            isRunning: this.isRunning,
            bottleneck: this.findBottleneck(),
            overallStatus: this.getOverallStatus(),
            productionHistory: this.productionHistory,
            stationStates: this.stationStates,
            stations: this.stations
        };
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PopaColaFactory;
}
