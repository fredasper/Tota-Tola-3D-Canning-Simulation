/**
 * Application Configuration
 * Centralized configuration for the entire application
 */

import {
  SimulationConfig,
  StationConfig,
  StationKey,
  UIColors,
  GraphicsConfig,
  LineConfig,
  CanFormat,
  CanFormatKey,
} from '@/types/simulation';

/**
 * Container geometry used by the renderer and conveyor model. The 330 mL
 * profile is the default 202/211 can: 66 mm body diameter and 115.2 mm height.
 */
export const CAN_FORMATS = {
  slim250: {
    key: 'slim250',
    label: '250 mL Slim',
    volumeMl: 250,
    diameterMm: 53.3,
    heightMm: 134,
    nominalPitchMeters: 0.1,
  },
  standard330: {
    key: 'standard330',
    label: '330 mL Standard',
    volumeMl: 330,
    diameterMm: 66,
    heightMm: 115.2,
    nominalPitchMeters: 0.12,
  },
  standard500: {
    key: 'standard500',
    label: '500 mL Standard',
    volumeMl: 500,
    diameterMm: 66,
    heightMm: 168,
    nominalPitchMeters: 0.13,
  },
} as const satisfies Record<CanFormatKey, CanFormat>;

export const CONFIG = {
  // Simulation settings
  simulation: {
    defaultDuration: 15 * 60,
    minDuration: 60,
    maxDuration: 24 * 60 * 60,
    minBatchSize: 10,
    maxBatchSize: 200,
    defaultBatchSize: 50,
    minSpeed: 0.25,
    maxSpeed: 20,
    defaultSpeed: 1.0,
  } as SimulationConfig,

  // Station configuration
  stations: {
    mixing: {
      name: 'Syrup Blending',
      cycleTime: 30,
      defaultEfficiency: 0.99,
      color: 0xff6b35,
    },
    carbonation: {
      name: 'Carbonation',
      cycleTime: 20,
      defaultEfficiency: 0.98,
      color: 0xff8555,
    },
    filling: {
      name: 'Counter-pressure Filler',
      cycleTime: 0.6,
      defaultEfficiency: 0.98,
      color: 0xff6b35,
    },
    capping: {
      name: 'Can Seamer',
      cycleTime: 0.5,
      defaultEfficiency: 0.97,
      color: 0xff6b35,
    },
    packing: {
      name: '24-Can Case Packer',
      cycleTime: 15,
      defaultEfficiency: 0.96,
      color: 0xff6b35,
    },
  } satisfies Record<StationKey, StationConfig>,

  // Production modes with efficiency modifiers
  modes: {
    standard: { name: 'Standard (Nominal)', efficiencyModifier: 0 },
    express: { name: 'Express (Fast, +defects)', efficiencyModifier: -0.02 },
    testing: { name: 'Validation run (Calibrated)', efficiencyModifier: 0.01 },
    overload: { name: 'Overload (150% Overlimit Stress)', efficiencyModifier: -0.15 },
  },

  // Small-factory, 330 mL canning line. The nominal 100 cans/minute rate is
  // based on a real 6,000 containers/hour craft-line benchmark.
  line: {
    canFormat: 'standard330',
    canFormatLabel: CAN_FORMATS.standard330.label,
    canSizeMl: CAN_FORMATS.standard330.volumeMl,
    canDiameterMm: CAN_FORMATS.standard330.diameterMm,
    canHeightMm: CAN_FORMATS.standard330.heightMm,
    caseSize: 24,
    nominalCansPerHour: 12000,
    nominalCanPitchMeters: CAN_FORMATS.standard330.nominalPitchMeters,
    conveyorMetersPerSecond: 0.2,
    visualTransportMultiplier: 4,
    visualSamplingRatio: 5,
    defectRate: 0.003,
    overloadRatio: 1.0,
  } as LineConfig,

  // Overload and stress test parameters
  overload: {
    minRatio: 1.0,
    maxRatio: 1.6,
    stressThreshold: 1.12, // Above 112% rated speed, machinery begins accumulating thermal/mechanical strain
    stressDecayRate: 0.05, // Stress relief per second when operating back under nominal
    stressBuildRate: 0.07, // Stress build-up per second under excessive load
    maxDefectMultiplier: 10.0, // Defect rate can multiply up to 10x at peak overload
  },

  // Efficiency thresholds
  efficiency: {
    optimal: { min: 95, max: 100, label: '✓ OPTIMAL', color: 0x4ade80 },
    caution: { min: 85, max: 94, label: '⚠ CAUTION', color: 0xfbbf24 },
    warning: { min: 70, max: 84, label: '✕ WARNING', color: 0xf97316 },
    critical: { min: 0, max: 69, label: '✕ CRITICAL', color: 0xef4444 },
  },

  // Graphics settings
  graphics: {
    scene: {
      backgroundColor: '#1a2640',
      fogColor: '#1a2640',
      fogNear: 40,
      fogFar: 120,
    },
    camera: {
      fov: 75,
      near: 0.1,
      far: 1000,
      defaultPosition: { x: 0, y: 10, z: 25 },
      lookAtPosition: { x: 0, y: 1, z: 0 },
    },
    lighting: {
      ambient: { color: '#ffffff', intensity: 0.5 },
      directional: {
        color: '#ffffff',
        intensity: 1,
        position: { x: 20, y: 20, z: 20 },
        shadowMapSize: 2048,
      },
    },
    factory: {
      groundSize: 100,
    },
  } as GraphicsConfig,

  // UI settings
  ui: {
    colors: {
      primary: '#ff6b35',
      secondary: '#1a2640',
      accent: '#ffffff',
      success: '#4ade80',
      warning: '#facc15',
      error: '#ef4444',
      critical: '#ef4444',
    } as UIColors,
    chart: {
      maxDataPoints: 120,
      updateInterval: 0.5,
    },
  },

  // DOM element IDs (for backward compatibility)
  ids: {
    container: 'canvas-container',
    stationTable: 'stationTableBody',
    chartCanvas: 'productionChart',
    controlPanel: 'controlPanel',
    btnControls: 'btnControls',
    btnStart: 'btnStart',
    btnReset: 'btnReset',
    sliderSpeed: 'sliderSpeed',
    sliderBatch: 'sliderBatch',
    sliderDuration: 'sliderDuration',
    selectMode: 'selectMode',
    metricRate: 'metricRate',
    metricCycle: 'metricCycle',
    metricFill: 'metricFill',
    metricTotal: 'metricTotal',
    overallStatus: 'overallStatus',
    bottleneckInfo: 'bottleneckInfo',
    elapsedTime: 'elapsedTime',
    currentRate: 'currentRate',
  },
};

export default CONFIG;
