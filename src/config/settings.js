/**
 * Configuration and Settings
 * Centralized configuration for the entire application
 */

export const CONFIG = {
    // Simulation settings
    simulation: {
        defaultDuration: 60, // seconds
        minDuration: 10,
        maxDuration: 120,
        minBatchSize: 10,
        maxBatchSize: 200,
        defaultBatchSize: 50,
        minSpeed: 0.5,
        maxSpeed: 2.0,
        defaultSpeed: 1.0
    },

    // Station configuration
    stations: {
        mixing: {
            name: 'Mixing',
            cycleTime: 2.0,
            defaultEfficiency: 0.98,
            color: 0xff6b35
        },
        carbonation: {
            name: 'Carbonation',
            cycleTime: 2.5,
            defaultEfficiency: 0.95,
            color: 0xff8555
        },
        filling: {
            name: 'Filling',
            cycleTime: 1.5,
            defaultEfficiency: 0.98,
            color: 0xff6b35
        },
        capping: {
            name: 'Capping',
            cycleTime: 1.0,
            defaultEfficiency: 0.92,
            color: 0xff6b35
        },
        packing: {
            name: 'Packing',
            cycleTime: 3.0,
            defaultEfficiency: 0.87,
            color: 0xff6b35
        }
    },

    // Production modes
    modes: {
        standard: { label: 'Standard', efficiencyModifier: 0 },
        express: { label: 'Express', efficiencyModifier: -0.05 },
        testing: { label: 'Testing', efficiencyModifier: 0 }
    },

    // Efficiency thresholds
    efficiency: {
        optimal: { min: 95, color: 0x4ade80, label: 'Optimal' },
        caution: { min: 85, color: 0xfacc15, label: 'Caution' },
        warning: { min: 70, color: 0xef4444, label: 'Warning' },
        critical: { min: 0, color: 0xa855f7, label: 'Critical' }
    },

    // Graphics settings
    graphics: {
        scene: {
            backgroundColor: 0x0a0e27,
            fogColor: 0x0a0e27,
            fogNear: 100,
            fogFar: 500
        },
        camera: {
            fov: 75,
            near: 0.1,
            far: 1000,
            defaultPosition: { x: 15, y: 10, z: 15 },
            lookAtPosition: { x: 0, y: 3, z: 0 }
        },
        lighting: {
            ambient: { color: 0xffffff, intensity: 0.5 },
            directional: {
                color: 0xffffff,
                intensity: 0.8,
                position: { x: 20, y: 30, z: 20 },
                shadowMapSize: 2048
            }
        },
        factory: {
            stationSpacing: 8,
            startX: -16,
            groundSize: 50
        }
    },

    // UI settings
    ui: {
        colors: {
            primary: '#ff6b35',
            secondary: '#0a0e27',
            accent: '#ffffff',
            success: '#4ade80',
            warning: '#facc15',
            error: '#ef4444',
            critical: '#a855f7'
        },
        chart: {
            maxDataPoints: 120,
            updateInterval: 0.5 // seconds
        }
    },

    // DOM element IDs
    ids: {
        container: 'canvas-container',
        stationTable: 'stationTableBody',
        chartCanvas: 'productionChart',
        controlPanel: 'controlPanel',
        btnControls: 'btnControls',
        btnStart: 'btnStart',
        btnReset: 'btnReset',
        // Sliders
        sliderSpeed: 'sliderSpeed',
        sliderBatch: 'sliderBatch',
        sliderDuration: 'sliderDuration',
        selectMode: 'selectMode',
        // Metrics
        metricRate: 'metricRate',
        metricCycle: 'metricCycle',
        metricFill: 'metricFill',
        metricTotal: 'metricTotal',
        // Status
        overallStatus: 'overallStatus',
        bottleneckInfo: 'bottleneckInfo',
        elapsedTime: 'elapsedTime',
        currentRate: 'currentRate'
    }
};

export default CONFIG;
