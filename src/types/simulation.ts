/**
 * Simulation Types
 * Core type definitions for the factory simulation
 */

export type ProductionMode = 'standard' | 'express' | 'testing' | 'overload';

export type EfficiencyStatus = 'optimal' | 'caution' | 'warning' | 'critical';

export type StationKey = 'mixing' | 'carbonation' | 'filling' | 'capping' | 'packing';

export type CanFormatKey = 'slim250' | 'standard330' | 'standard500';

export type CanStage = 'empty' | 'filling' | 'filled' | 'seaming' | 'packed';

export interface StationConfig {
  name: string;
  cycleTime: number;
  defaultEfficiency: number;
  color: number;
}

export interface StationState {
  key: string;
  config: StationConfig;
  efficiency: number;
  efficiencyPercent: number;
  position: number; // 0-1 cycle progress
  cansProcessed: number;
  fillLevel: number; // 0-100
  pressure: number;
  sealQuality: number;
  boxCount: number;
  isActive: boolean;
  isEnabled: boolean;
  stressLevel: number; // 0-100 mechanical/thermal stress
  isJammed: boolean;
}

export type LineId = 'line1' | 'line2';

export interface FactoryMetrics {
  elapsedTime: number;
  totalCansProduced: number;
  productionRate: number; // cans per minute
  cycleTime: number;
  fillLevel: number;
  isRunning: boolean;
  bottleneck: string;
  overallStatus: StatusInfo;
  productionHistory: ProductionHistoryEntry[];
  stationStates: Record<StationKey, StationState>;
  line1Stations: Record<StationKey, StationState>;
  line2Stations: Record<StationKey, StationState>;
  line1Enabled: boolean;
  line2Enabled: boolean;
  line1Rate: number; // Line 1 cans per minute
  line2Rate: number; // Line 2 cans per minute
  productionSpeed: number;
  cansPerBatch: number;
  simDuration: number;
  isInfiniteDuration: boolean;
  productionMode: ProductionMode;
  lineState: LineState;
  report: SimulationReport | null;
  overloadRatio: number;
  jammedStations: StationKey[];
}

export interface CanSnapshot {
  id: number;
  position: number;
  lane: number;
  fillLevel: number;
  isSeamed: boolean;
  stage: CanStage;
}

export interface CaseSnapshot {
  id: number;
  position: number;
  lane: number;
  canCount: number;
}

export interface LineState {
  canFormat: CanFormatKey;
  canFormatLabel: string;
  canSizeMl: number;
  canDiameterMm: number;
  canHeightMm: number;
  caseSize: number;
  nominalCansPerHour: number;
  nominalCansPerMinute: number;
  conveyorMetersPerSecond: number;
  completedCases: number;
  cansInCaseBuffer: number;
  rejectedCans: number;
  visualCans: CanSnapshot[];
  visibleCases: CaseSnapshot[];
  overloadRatio: number;
}

export interface SimulationReport {
  durationSeconds: number;
  plannedCans: number;
  filledCans: number;
  packedCans: number;
  completedCases: number;
  rejectedCans: number;
  averageCansPerMinute: number;
  availabilityPercent: number;
  performancePercent: number;
  qualityPercent: number;
  oeePercent: number;
  bottleneck: string;
  calibrationNote: string;
  overloadRatio: number;
  peakStressPercent: number;
  downtimeSeconds: number;
}

export interface StatusInfo {
  label: string;
  class: string;
  avgEfficiency: number;
}

export interface ProductionHistoryEntry {
  time: number;
  rate: number;
}

export interface SimulationConfig {
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  minBatchSize: number;
  maxBatchSize: number;
  defaultBatchSize: number;
  minSpeed: number;
  maxSpeed: number;
  defaultSpeed: number;
}

export interface UIColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  critical: string;
}

export interface GraphicsConfig {
  scene: {
    backgroundColor: string;
    fogColor: string;
    fogNear: number;
    fogFar: number;
  };
  camera: {
    fov: number;
    near: number;
    far: number;
    defaultPosition: { x: number; y: number; z: number };
    lookAtPosition: { x: number; y: number; z: number };
  };
  lighting: {
    ambient: { color: string; intensity: number };
    directional: {
      color: string;
      intensity: number;
      position: { x: number; y: number; z: number };
      shadowMapSize: number;
    };
  };
  factory: {
    groundSize: number;
  };
}

export interface LineConfig {
  canFormat: CanFormatKey;
  canFormatLabel: string;
  canSizeMl: number;
  canDiameterMm: number;
  canHeightMm: number;
  caseSize: number;
  nominalCansPerHour: number;
  nominalCanPitchMeters: number;
  conveyorMetersPerSecond: number;
  visualTransportMultiplier: number;
  visualSamplingRatio: number;
  defectRate: number;
  overloadRatio: number;
}

export interface CanFormat {
  key: CanFormatKey;
  label: string;
  volumeMl: number;
  diameterMm: number;
  heightMm: number;
  nominalPitchMeters: number;
}

export type LineConfigurationUpdate = Partial<
  Pick<LineConfig, 'canFormat' | 'caseSize' | 'nominalCansPerHour' | 'conveyorMetersPerSecond' | 'overloadRatio'>
>;
