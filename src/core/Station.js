/**
 * Station Class
 * Represents a single factory station with its own state and logic
 */

export class Station {
    constructor(key, config, efficiency = 1.0) {
        this.key = key;
        this.config = config;
        this.baseEfficiency = efficiency;
        this.efficiency = efficiency;

        // State tracking
        this.cansProcessed = 0;
        this.currentCans = 0;
        this.position = 0; // 0-1 progress through cycle
        this.isActive = false;

        // Station-specific metrics
        this.fillLevel = 0;
        this.pressure = 0;
        this.sealQuality = 0;
        this.boxCount = 0;

        // History for analysis
        this.processingTimes = [];
        this.efficiencyHistory = [];
    }

    /**
     * Update station state
     * @param {number} deltaTime - Time since last update
     * @param {number} speedMultiplier - Production speed multiplier
     */
    update(deltaTime, speedMultiplier = 1.0) {
        const adjustedDelta = deltaTime * speedMultiplier;
        
        // Update progress through cycle
        this.position += (adjustedDelta / this.config.cycleTime);

        // If cycle complete
        if (this.position >= 1.0) {
            const completedCycles = Math.floor(this.position);
            this.cansProcessed += completedCycles;
            this.position = this.position % 1.0;
        }

        // Update station-specific metrics
        this.updateMetrics(adjustedDelta);

        // Track activity
        this.isActive = this.position > 0;
    }

    /**
     * Update station-specific metrics (override in subclasses if needed)
     * @param {number} deltaTime - Adjusted delta time
     */
    updateMetrics(deltaTime) {
        switch (this.key) {
            case 'mixing':
                this.fillLevel = Math.min(
                    this.fillLevel + (deltaTime / this.config.cycleTime) * 100,
                    100
                );
                break;
            case 'carbonation':
                this.pressure = Math.min(
                    this.pressure + (deltaTime / this.config.cycleTime) * 100,
                    100
                );
                break;
            case 'filling':
                this.fillLevel = Math.min(
                    this.fillLevel + (deltaTime / this.config.cycleTime) * 100,
                    100
                );
                break;
            case 'capping':
                this.sealQuality = Math.min(
                    this.sealQuality + (deltaTime / this.config.cycleTime) * 100,
                    100
                );
                break;
            case 'packing':
                this.boxCount = Math.floor(this.cansProcessed / 24);
                break;
        }
    }

    /**
     * Reset station to initial state
     */
    reset() {
        this.cansProcessed = 0;
        this.currentCans = 0;
        this.position = 0;
        this.isActive = false;
        this.fillLevel = 0;
        this.pressure = 0;
        this.sealQuality = 0;
        this.boxCount = 0;
        this.processingTimes = [];
        this.efficiencyHistory = [];
    }

    /**
     * Set station efficiency (with bounds checking)
     * @param {number} efficiency - Efficiency value 0-1
     */
    setEfficiency(efficiency) {
        this.baseEfficiency = Math.max(0, Math.min(1, efficiency));
        this.efficiency = this.baseEfficiency;
    }

    /**
     * Apply efficiency modifier (for production modes)
     * @param {number} modifier - Efficiency modifier
     */
    applyEfficiencyModifier(modifier) {
        this.efficiency = Math.max(0.5, this.baseEfficiency + modifier);
    }

    /**
     * Get efficiency as percentage
     * @returns {number} Efficiency 0-100
     */
    getEfficiencyPercent() {
        return this.efficiency * 100;
    }

    /**
     * Get current state as object
     * @returns {object} Station state
     */
    getState() {
        return {
            key: this.key,
            name: this.config.name,
            cansProcessed: this.cansProcessed,
            position: this.position,
            efficiency: this.efficiency,
            efficiencyPercent: this.getEfficiencyPercent(),
            isActive: this.isActive,
            fillLevel: this.fillLevel,
            pressure: this.pressure,
            sealQuality: this.sealQuality,
            boxCount: this.boxCount,
            cycleTime: this.config.cycleTime
        };
    }

    /**
     * Record processing time for analysis
     * @param {number} time - Processing time
     */
    recordProcessingTime(time) {
        this.processingTimes.push(time);
        if (this.processingTimes.length > 100) {
            this.processingTimes.shift();
        }
    }

    /**
     * Get average processing time
     * @returns {number} Average time
     */
    getAverageProcessingTime() {
        if (this.processingTimes.length === 0) return 0;
        const sum = this.processingTimes.reduce((a, b) => a + b, 0);
        return sum / this.processingTimes.length;
    }
}

export default Station;
