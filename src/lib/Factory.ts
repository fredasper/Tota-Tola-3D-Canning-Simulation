/**
 * Event-driven simulation of a compact carbonated-beverage canning plant.
 * Features dual independent production lines: Line 1 (Alpha) and Line 2 (Beta).
 * Lines and individual process machinery can be operated independently,
 * dynamically adjusting plant throughput (e.g. 12,000 CPH dual-line vs 6,000 CPH single-line).
 */

import { Station } from './Station';
import CONFIG, { CAN_FORMATS } from './config';
import {
  CanSnapshot,
  CanStage,
  CaseSnapshot,
  FactoryMetrics,
  LineConfig,
  LineConfigurationUpdate,
  LineId,
  LineState,
  ProductionHistoryEntry,
  ProductionMode,
  SimulationReport,
  StationKey,
  StationState,
  StatusInfo,
} from '@/types/simulation';

const STATION_ORDER: StationKey[] = ['mixing', 'carbonation', 'filling', 'capping', 'packing'];

// Coordinates are metres in the 3D facility layout.
const VISUAL_LINE_START = -64;
const FILLER_START = -4.5;
const FILLER_END = 1.5;
const SEAMER_START = 8.0;
const SEAMER_END = 13.6;
const PACKER_START = 26.0;
const PACKER_END = 32.0;
const VISUAL_LINE_END = 32.0; // Cans convert to cases at packer exit
const PALLETIZER_END = 44.0;
const DOWNSTREAM_LINE_METERS = PACKER_END - FILLER_END;

export class Factory {
  private productionSpeed = CONFIG.simulation.defaultSpeed;
  private cansPerBatch = CONFIG.line.caseSize;
  private simDuration: number | null = CONFIG.simulation.defaultDuration;
  private productionMode: ProductionMode = 'standard';
  private elapsedTime = 0;
  private isRunning = false;

  // Independent process stations for Line 1 (Alpha) and Line 2 (Beta)
  private readonly line1Stations = {} as Record<StationKey, Station>;
  private readonly line2Stations = {} as Record<StationKey, Station>;
  private line1Enabled = true;
  private line2Enabled = true;

  private lineConfig: LineConfig = { ...CONFIG.line };

  private totalCansProduced = 0;
  private grossFilledCans = 0;
  private rejectedCans = 0;
  private completedCases = 0;
  private currentThroughput = 0;
  private productionHistory: ProductionHistoryEntry[] = [];
  private nextHistoryTime = 0;
  private outputAccumulator = 0;
  private pendingCans: Array<{ packAt: number; rejected: boolean }> = [];
  private visualSpawnAccumulatorL1 = 0;
  private visualSpawnAccumulatorL2 = 0;
  private visualCaseAccumulator = 0;
  private nextVisualCanId = 1;
  private nextCaseId = 1;
  private visualCans: CanSnapshot[] = [];
  private visibleCases: CaseSnapshot[] = [];
  private report: SimulationReport | null = null;
  private peakStressPercent = 0;
  private downtimeSeconds = 0;

  constructor() {
    STATION_ORDER.forEach((key) => {
      const stationConfig = CONFIG.stations[key];
      this.line1Stations[key] = new Station(key, stationConfig, stationConfig.defaultEfficiency);
      this.line2Stations[key] = new Station(key, stationConfig, stationConfig.defaultEfficiency);
    });
    this.seedVisualLine();
    this.syncStationMetrics();
  }

  start(): void {
    if (this.elapsedTime > 0 && this.report === null) {
      this.isRunning = true;
      this.syncStationMetrics();
      return;
    }
    this.resetRun();
    this.isRunning = true;
    this.syncStationMetrics();
  }

  stop(): void {
    this.isRunning = false;
    this.syncStationMetrics();
  }

  reset(): void {
    this.isRunning = false;
    this.resetRun();
    this.syncStationMetrics();
  }

  update(deltaTime: number): void {
    if (!this.isRunning) return;

    const remainingTime = this.simDuration === null ? Infinity : this.simDuration - this.elapsedTime;
    if (remainingTime <= 0) {
      this.finishRun();
      return;
    }

    const simulationDelta = Math.min(deltaTime * this.productionSpeed, remainingTime);
    this.elapsedTime += simulationDelta;

    // Machinery Overload Stress Dynamics
    const effectiveOverload =
      this.productionMode === 'overload'
        ? Math.max(this.lineConfig.overloadRatio, 1.35)
        : this.lineConfig.overloadRatio;

    const isOverstressed = effectiveOverload > CONFIG.overload.stressThreshold;

    [this.line1Stations, this.line2Stations].forEach((stationMap) => {
      STATION_ORDER.forEach((key) => {
        const station = stationMap[key];
        let currentStress = station.getStressLevel();
        const componentSensitivity =
          key === 'capping' || key === 'filling' || key === 'packing' ? 1.4 : 0.85;

        if (isOverstressed && this.isRunning) {
          const excess = (effectiveOverload - CONFIG.overload.stressThreshold) * componentSensitivity;
          const stressDelta = excess * CONFIG.overload.stressBuildRate * 100 * simulationDelta;
          currentStress = Math.min(100, currentStress + stressDelta);
        } else {
          const coolDown = CONFIG.overload.stressDecayRate * 100 * simulationDelta;
          currentStress = Math.max(0, currentStress - coolDown);
        }

        station.setStressLevel(currentStress);
        this.peakStressPercent = Math.max(this.peakStressPercent, currentStress);
      });
    });

    const anyJammed =
      STATION_ORDER.some((k) => this.line1Stations[k].isStationJammed()) ||
      STATION_ORDER.some((k) => this.line2Stations[k].isStationJammed());
    if (anyJammed) {
      this.downtimeSeconds += simulationDelta;
    }

    this.advanceProduction(simulationDelta);
    this.advanceVisualLine(simulationDelta);
    this.calculateMetrics();
    this.recordHistory();
    this.syncStationMetrics();

    if (this.simDuration !== null && this.elapsedTime >= this.simDuration) {
      this.finishRun();
    }
  }

  setProductionSpeed(speed: number): void {
    this.productionSpeed = clamp(speed, CONFIG.simulation.minSpeed, CONFIG.simulation.maxSpeed);
  }

  setCansPerBatch(cans: number): void {
    this.setLineConfiguration({ caseSize: cans });
  }

  setSimulationDuration(duration: number | null): void {
    this.simDuration =
      duration === null
        ? null
        : clamp(duration, CONFIG.simulation.minDuration, CONFIG.simulation.maxDuration);
  }

  setLineConfiguration(update: LineConfigurationUpdate): void {
    if (update.canFormat) {
      const canFormat = CAN_FORMATS[update.canFormat];
      this.lineConfig = {
        ...this.lineConfig,
        canFormat: canFormat.key,
        canFormatLabel: canFormat.label,
        canSizeMl: canFormat.volumeMl,
        canDiameterMm: canFormat.diameterMm,
        canHeightMm: canFormat.heightMm,
        nominalCanPitchMeters: canFormat.nominalPitchMeters,
      };
    }

    if (update.caseSize !== undefined) {
      this.lineConfig.caseSize = Math.round(clamp(update.caseSize, 6, 48));
    }
    if (update.nominalCansPerHour !== undefined) {
      this.lineConfig.nominalCansPerHour =
        Math.round(clamp(update.nominalCansPerHour, 3000, 24000) / 100) * 100;
    }
    if (update.conveyorMetersPerSecond !== undefined) {
      this.lineConfig.conveyorMetersPerSecond = clamp(update.conveyorMetersPerSecond, 0.08, 0.4);
    }
    if (update.overloadRatio !== undefined) {
      this.lineConfig.overloadRatio = clamp(
        update.overloadRatio,
        CONFIG.overload.minRatio,
        CONFIG.overload.maxRatio
      );
    }

    this.cansPerBatch = this.lineConfig.caseSize;
    this.syncStationMetrics();
  }

  setOverloadRatio(ratio: number): void {
    this.setLineConfiguration({ overloadRatio: ratio });
  }

  // --- Line & Station Power Control API ---

  toggleStationPower(lineOrKey: LineId | StationKey, maybeKey?: StationKey): void {
    if (maybeKey !== undefined) {
      const line = lineOrKey as LineId;
      const stationMap = line === 'line1' ? this.line1Stations : this.line2Stations;
      stationMap[maybeKey].toggleEnabled();
    } else {
      const key = lineOrKey as StationKey;
      const willEnable =
        !this.line1Stations[key].isStationEnabled() || !this.line2Stations[key].isStationEnabled();
      this.line1Stations[key].setEnabled(willEnable);
      this.line2Stations[key].setEnabled(willEnable);
    }
    this.syncStationMetrics();
  }

  setStationPower(
    lineOrKey: LineId | StationKey,
    keyOrEnabled: StationKey | boolean,
    maybeEnabled?: boolean
  ): void {
    if (maybeEnabled !== undefined) {
      const line = lineOrKey as LineId;
      const key = keyOrEnabled as StationKey;
      const stationMap = line === 'line1' ? this.line1Stations : this.line2Stations;
      stationMap[key].setEnabled(maybeEnabled);
    } else {
      const key = lineOrKey as StationKey;
      const enabled = keyOrEnabled as boolean;
      this.line1Stations[key].setEnabled(enabled);
      this.line2Stations[key].setEnabled(enabled);
    }
    this.syncStationMetrics();
  }

  toggleLinePower(line: LineId, enabled?: boolean): void {
    if (line === 'line1') {
      this.line1Enabled = enabled !== undefined ? enabled : !this.line1Enabled;
      STATION_ORDER.forEach((key) => this.line1Stations[key].setEnabled(this.line1Enabled));
    } else {
      this.line2Enabled = enabled !== undefined ? enabled : !this.line2Enabled;
      STATION_ORDER.forEach((key) => this.line2Stations[key].setEnabled(this.line2Enabled));
    }
    this.syncStationMetrics();
  }

  powerAllStations(enabled: boolean, line?: LineId): void {
    if (!line || line === 'line1') {
      this.line1Enabled = enabled;
      STATION_ORDER.forEach((key) => this.line1Stations[key].setEnabled(enabled));
    }
    if (!line || line === 'line2') {
      this.line2Enabled = enabled;
      STATION_ORDER.forEach((key) => this.line2Stations[key].setEnabled(enabled));
    }
    this.syncStationMetrics();
  }

  toggleStationJam(key: StationKey, line?: LineId): void {
    if (!line || line === 'line1') {
      this.line1Stations[key].setJammed(!this.line1Stations[key].isStationJammed());
    }
    if (!line || line === 'line2') {
      this.line2Stations[key].setJammed(!this.line2Stations[key].isStationJammed());
    }
    this.syncStationMetrics();
  }

  clearAllJams(line?: LineId): void {
    if (!line || line === 'line1') {
      STATION_ORDER.forEach((key) => this.line1Stations[key].setJammed(false));
    }
    if (!line || line === 'line2') {
      STATION_ORDER.forEach((key) => this.line2Stations[key].setJammed(false));
    }
    this.syncStationMetrics();
  }

  setProductionMode(mode: ProductionMode): void {
    this.productionMode = mode;
    [this.line1Stations, this.line2Stations].forEach((stationMap) => {
      if (mode === 'overload') {
        this.lineConfig.overloadRatio = 1.5;
        stationMap.mixing.setEfficiency(0.88);
        stationMap.carbonation.setEfficiency(0.85);
        stationMap.filling.setEfficiency(0.72);
        stationMap.capping.setEfficiency(0.62);
        stationMap.packing.setEfficiency(0.58);
        stationMap.filling.setStressLevel(65);
        stationMap.capping.setStressLevel(85);
        stationMap.packing.setStressLevel(90);
      } else {
        this.lineConfig.overloadRatio = 1.0;
        const modifier = CONFIG.modes[mode].efficiencyModifier;
        STATION_ORDER.forEach((key) => {
          stationMap[key].setEfficiency(CONFIG.stations[key].defaultEfficiency + modifier);
          stationMap[key].setStressLevel(0);
        });
      }
    });
    this.syncStationMetrics();
  }

  findBottleneck(): StationKey {
    return STATION_ORDER.reduce<StationKey>((slowest, key) => {
      const eff1 = this.line1Stations[key].getState().efficiency;
      const eff2 = this.line2Stations[key].getState().efficiency;
      const minEff = Math.min(eff1, eff2);

      const slowestEff1 = this.line1Stations[slowest].getState().efficiency;
      const slowestEff2 = this.line2Stations[slowest].getState().efficiency;
      const minSlowest = Math.min(slowestEff1, slowestEff2);

      return minEff < minSlowest ? key : slowest;
    }, STATION_ORDER[0]);
  }

  getOverallStatus(): StatusInfo {
    const l1Sum = STATION_ORDER.reduce(
      (sum, key) => sum + this.line1Stations[key].getState().efficiencyPercent,
      0
    );
    const l2Sum = STATION_ORDER.reduce(
      (sum, key) => sum + this.line2Stations[key].getState().efficiencyPercent,
      0
    );
    const averageEfficiency = (l1Sum + l2Sum) / (STATION_ORDER.length * 2);

    for (const threshold of ['optimal', 'caution', 'warning', 'critical'] as const) {
      if (averageEfficiency >= CONFIG.efficiency[threshold].min) {
        return {
          label: threshold.toUpperCase(),
          class: `status-${threshold}`,
          avgEfficiency: averageEfficiency,
        };
      }
    }

    return {
      label: 'CRITICAL',
      class: 'status-critical',
      avgEfficiency: averageEfficiency,
    };
  }

  getMetrics(): FactoryMetrics {
    const line1States = this.getStationStatesFor(this.line1Stations);
    const line2States = this.getStationStatesFor(this.line2Stations);
    const effectiveRate = this.effectiveCansPerMinute();
    const l1Rate = this.getLine1CansPerMinute();
    const l2Rate = this.getLine2CansPerMinute();

    return {
      elapsedTime: this.elapsedTime,
      totalCansProduced: this.totalCansProduced,
      productionRate: this.isRunning ? effectiveRate : 0,
      cycleTime: this.isRunning && effectiveRate > 0 ? 60 / effectiveRate : 0,
      fillLevel: this.getAverageFillLevel(),
      isRunning: this.isRunning,
      bottleneck: this.getBottleneckName(),
      overallStatus: this.getOverallStatus(),
      productionHistory: this.productionHistory,
      stationStates: line1States,
      line1Stations: line1States,
      line2Stations: line2States,
      line1Enabled: this.line1Enabled,
      line2Enabled: this.line2Enabled,
      line1Rate: l1Rate,
      line2Rate: l2Rate,
      productionSpeed: this.productionSpeed,
      cansPerBatch: this.cansPerBatch,
      simDuration: this.simDuration ?? 0,
      isInfiniteDuration: this.simDuration === null,
      productionMode: this.productionMode,
      lineState: this.getLineState(),
      report: this.report,
      overloadRatio: this.lineConfig.overloadRatio,
      jammedStations: [
        ...STATION_ORDER.filter((k) => this.line1Stations[k].isStationJammed()),
        ...STATION_ORDER.filter((k) => this.line2Stations[k].isStationJammed()),
      ],
    };
  }

  // --- Core Throughput Calculations per Line ---

  private line1BottleneckEfficiency(): number {
    if (!this.line1Enabled) return 0;
    return Math.min(...STATION_ORDER.map((key) => this.line1Stations[key].getState().efficiency));
  }

  private line2BottleneckEfficiency(): number {
    if (!this.line2Enabled) return 0;
    return Math.min(...STATION_ORDER.map((key) => this.line2Stations[key].getState().efficiency));
  }

  getLine1CansPerMinute(): number {
    if (!this.isRunning || !this.line1Enabled) return 0;
    const effectiveOverload =
      this.productionMode === 'overload'
        ? Math.max(this.lineConfig.overloadRatio, 1.35)
        : this.lineConfig.overloadRatio;
    const nominalPerLine = this.lineConfig.nominalCansPerHour / 2 / 60;
    const conveyorCapPerLine = this.conveyorCapacityCansPerMinute() / 2;

    return (
      Math.min(nominalPerLine * effectiveOverload, conveyorCapPerLine) *
      this.line1BottleneckEfficiency()
    );
  }

  getLine2CansPerMinute(): number {
    if (!this.isRunning || !this.line2Enabled) return 0;
    const effectiveOverload =
      this.productionMode === 'overload'
        ? Math.max(this.lineConfig.overloadRatio, 1.35)
        : this.lineConfig.overloadRatio;
    const nominalPerLine = this.lineConfig.nominalCansPerHour / 2 / 60;
    const conveyorCapPerLine = this.conveyorCapacityCansPerMinute() / 2;

    return (
      Math.min(nominalPerLine * effectiveOverload, conveyorCapPerLine) *
      this.line2BottleneckEfficiency()
    );
  }

  private effectiveCansPerMinute(): number {
    if (!this.isRunning) return 0;
    return this.getLine1CansPerMinute() + this.getLine2CansPerMinute();
  }

  private conveyorCapacityCansPerMinute(): number {
    return (this.lineConfig.conveyorMetersPerSecond / this.lineConfig.nominalCanPitchMeters) * 60;
  }

  private resetRun(): void {
    this.elapsedTime = 0;
    this.totalCansProduced = 0;
    this.grossFilledCans = 0;
    this.rejectedCans = 0;
    this.completedCases = 0;
    this.currentThroughput = 0;
    this.outputAccumulator = 0;
    this.pendingCans = [];
    this.visualSpawnAccumulatorL1 = 0;
    this.visualSpawnAccumulatorL2 = 0;
    this.visualCaseAccumulator = 0;
    this.productionHistory = [];
    this.nextHistoryTime = 0;
    this.report = null;
    this.peakStressPercent = 0;
    this.downtimeSeconds = 0;
    STATION_ORDER.forEach((key) => {
      this.line1Stations[key].reset();
      this.line2Stations[key].reset();
    });
    this.setProductionMode(this.productionMode);
    this.seedVisualLine();
  }

  private advanceProduction(deltaTime: number): void {
    const rate = this.effectiveCansPerMinute();
    if (rate <= 0) return;

    this.outputAccumulator += (rate * deltaTime) / 60;
    const newlyFilled = Math.floor(this.outputAccumulator);
    this.outputAccumulator -= newlyFilled;
    const defectInterval = Math.max(1, Math.round(1 / this.getDefectRate()));
    const downstreamDelay = Math.min(
      8,
      DOWNSTREAM_LINE_METERS / (this.lineConfig.conveyorMetersPerSecond * this.lineConfig.visualTransportMultiplier)
    );

    for (let index = 0; index < newlyFilled; index += 1) {
      const canSequence = this.grossFilledCans + index + 1;
      this.pendingCans.push({
        packAt: this.elapsedTime + downstreamDelay,
        rejected: canSequence % defectInterval === 0,
      });
    }
    this.grossFilledCans += newlyFilled;

    const remainingCans: typeof this.pendingCans = [];
    this.pendingCans.forEach((can) => {
      if (can.packAt > this.elapsedTime) {
        remainingCans.push(can);
      } else if (can.rejected) {
        this.rejectedCans += 1;
      } else {
        this.totalCansProduced += 1;
      }
    });
    this.pendingCans = remainingCans;
    this.completedCases = Math.floor(this.totalCansProduced / this.lineConfig.caseSize);
  }

  private advanceVisualLine(deltaTime: number): void {
    const transportDistance =
      this.lineConfig.conveyorMetersPerSecond * this.lineConfig.visualTransportMultiplier * deltaTime;

    const l1Rate = this.getLine1CansPerMinute();
    const l2Rate = this.getLine2CansPerMinute();
    const l1Active = this.isRunning && this.line1Enabled && l1Rate > 0;
    const l2Active = this.isRunning && this.line2Enabled && l2Rate > 0;

    this.visualCans = this.visualCans
      .map((can) => {
        const canActive = can.lane === 0 ? l1Active : l2Active;
        if (!canActive) return can;
        return this.decorateCan({ ...can, position: can.position + transportDistance });
      })
      .filter((can) => {
        if (can.position <= VISUAL_LINE_END) return true;
        this.visualCaseAccumulator += 1;
        if (this.visualCaseAccumulator >= this.lineConfig.caseSize / this.lineConfig.visualSamplingRatio) {
          this.visualCaseAccumulator = 0;
          this.addVisibleCase(can.lane);
        }
        return false;
      });

    this.visibleCases = this.visibleCases
      .map((caseSnapshot) => {
        const caseActive = caseSnapshot.lane === 0 ? l1Active : l2Active;
        if (!caseActive) return caseSnapshot;
        return { ...caseSnapshot, position: caseSnapshot.position + transportDistance * 0.34 };
      })
      .filter((caseSnapshot) => caseSnapshot.position <= PALLETIZER_END);

    // Spawn Line 1 visual cans (lane 0)
    if (l1Active) {
      const visualCansPerMinL1 = l1Rate / this.lineConfig.visualSamplingRatio;
      this.visualSpawnAccumulatorL1 += (visualCansPerMinL1 * deltaTime) / 60;
      while (this.visualSpawnAccumulatorL1 >= 1) {
        this.visualSpawnAccumulatorL1 -= 1;
        this.visualCans.push(this.decorateCan(this.createVisualCan(VISUAL_LINE_START, 0)));
      }
    }

    // Spawn Line 2 visual cans (lane 1)
    if (l2Active) {
      const visualCansPerMinL2 = l2Rate / this.lineConfig.visualSamplingRatio;
      this.visualSpawnAccumulatorL2 += (visualCansPerMinL2 * deltaTime) / 60;
      while (this.visualSpawnAccumulatorL2 >= 1) {
        this.visualSpawnAccumulatorL2 -= 1;
        this.visualCans.push(this.decorateCan(this.createVisualCan(VISUAL_LINE_START, 1)));
      }
    }
  }

  private seedVisualLine(): void {
    this.visualCans = [-60, -52, -44, -36, -28, -20, -12, -4, 4, 12, 20, 28].flatMap(
      (position) => [
        this.decorateCan({
          id: this.nextVisualCanId++,
          position,
          lane: 0,
          fillLevel: 0,
          isSeamed: false,
          stage: 'empty',
        }),
        this.decorateCan({
          id: this.nextVisualCanId++,
          position,
          lane: 1,
          fillLevel: 0,
          isSeamed: false,
          stage: 'empty',
        }),
      ]
    );
    this.visibleCases = [
      { id: this.nextCaseId++, position: 36, lane: 0, canCount: this.lineConfig.caseSize },
      { id: this.nextCaseId++, position: 43, lane: 0, canCount: this.lineConfig.caseSize },
      { id: this.nextCaseId++, position: 36, lane: 1, canCount: this.lineConfig.caseSize },
      { id: this.nextCaseId++, position: 43, lane: 1, canCount: this.lineConfig.caseSize },
    ];
  }

  private createVisualCan(position: number, lane: number): CanSnapshot {
    return {
      id: this.nextVisualCanId++,
      position,
      lane,
      fillLevel: 0,
      isSeamed: false,
      stage: 'empty',
    };
  }

  private decorateCan(can: CanSnapshot): CanSnapshot {
    let stage: CanStage = 'empty';
    let fillLevel = 0;
    let isSeamed = false;

    if (can.position >= FILLER_START && can.position <= FILLER_END) {
      stage = 'filling';
      fillLevel = ((can.position - FILLER_START) / (FILLER_END - FILLER_START)) * 100;
    } else if (can.position > FILLER_END && can.position < SEAMER_START) {
      stage = 'filled';
      fillLevel = 100;
    } else if (can.position >= SEAMER_START && can.position <= SEAMER_END) {
      stage = 'seaming';
      fillLevel = 100;
      isSeamed = can.position > SEAMER_START + 1.8;
    } else if (can.position > SEAMER_END) {
      stage = can.position >= PACKER_START ? 'packed' : 'filled';
      fillLevel = 100;
      isSeamed = true;
    }

    return { ...can, stage, fillLevel, isSeamed };
  }

  private addVisibleCase(lane: number = 0): void {
    this.visibleCases.push({
      id: this.nextCaseId++,
      position: PACKER_END,
      lane,
      canCount: this.lineConfig.caseSize,
    });
  }

  private getBottleneckName(): string {
    if (!this.line1Enabled && !this.line2Enabled) {
      return 'Plant Inactive (Both Lines Offline)';
    }
    if (!this.line1Enabled) {
      return 'Line 1 (Alpha) Offline';
    }
    if (!this.line2Enabled) {
      return 'Line 2 (Beta) Offline';
    }

    const offlineKeyL1 = STATION_ORDER.find((k) => !this.line1Stations[k].isStationEnabled());
    const offlineKeyL2 = STATION_ORDER.find((k) => !this.line2Stations[k].isStationEnabled());
    if (offlineKeyL1 && offlineKeyL2) {
      return `Dual Offline: L1-${this.line1Stations[offlineKeyL1].getState().config.name} / L2-${this.line2Stations[offlineKeyL2].getState().config.name}`;
    }
    if (offlineKeyL1) {
      return `L1 ${this.line1Stations[offlineKeyL1].getState().config.name} (OFFLINE)`;
    }
    if (offlineKeyL2) {
      return `L2 ${this.line2Stations[offlineKeyL2].getState().config.name} (OFFLINE)`;
    }

    const jammedL1 = STATION_ORDER.find((k) => this.line1Stations[k].isStationJammed());
    const jammedL2 = STATION_ORDER.find((k) => this.line2Stations[k].isStationJammed());
    if (jammedL1) return `L1 ${this.line1Stations[jammedL1].getState().config.name} (JAMMED)`;
    if (jammedL2) return `L2 ${this.line2Stations[jammedL2].getState().config.name} (JAMMED)`;

    const slowestKey = this.findBottleneck();
    const l1Eff = this.line1Stations[slowestKey].getState().efficiencyPercent;
    const l2Eff = this.line2Stations[slowestKey].getState().efficiencyPercent;
    const minEff = Math.min(l1Eff, l2Eff);
    const stationName = this.line1Stations[slowestKey].getState().config.name;
    if (minEff < 70) return `${stationName} (OVERLOAD CRITICAL)`;
    if (minEff < 85) return `${stationName} (HIGH STRESS)`;
    return stationName;
  }

  private getDefectRate(): number {
    let baseRate = this.lineConfig.defectRate;
    if (this.productionMode === 'express') baseRate = this.lineConfig.defectRate * 2;
    if (this.productionMode === 'testing') baseRate = this.lineConfig.defectRate * 0.35;
    if (this.productionMode === 'overload') baseRate = this.lineConfig.defectRate * 4;

    const effectiveOverload =
      this.productionMode === 'overload'
        ? Math.max(this.lineConfig.overloadRatio, 1.35)
        : this.lineConfig.overloadRatio;

    if (effectiveOverload > 1.05) {
      const overloadExcess = (effectiveOverload - 1.0) / 0.6;
      const multiplier = 1 + overloadExcess * (CONFIG.overload.maxDefectMultiplier - 1);
      baseRate *= multiplier;
    }

    const maxSeamerStress = Math.max(
      this.line1Stations.capping.getStressLevel(),
      this.line2Stations.capping.getStressLevel()
    );
    if (maxSeamerStress > 40) {
      baseRate *= 1 + (maxSeamerStress - 40) / 25;
    }

    return Math.min(0.35, baseRate);
  }

  private calculateMetrics(): void {
    this.currentThroughput = this.isRunning ? this.effectiveCansPerMinute() : 0;
  }

  private recordHistory(): void {
    if (this.elapsedTime < this.nextHistoryTime) return;
    this.productionHistory.push({ time: this.elapsedTime, rate: this.currentThroughput });
    if (this.productionHistory.length > CONFIG.ui.chart.maxDataPoints) this.productionHistory.shift();
    this.nextHistoryTime += CONFIG.ui.chart.updateInterval;
  }

  private syncStationMetrics(): void {
    const processPhase = (this.elapsedTime % 30) / 30;

    // Line 1 runtime metrics
    const l1Running = this.isRunning && this.line1Enabled && this.getLine1CansPerMinute() > 0;
    const fillingCansL1 = this.visualCans.filter((can) => can.lane === 0 && can.stage === 'filling');
    const avgFillL1 = fillingCansL1.length
      ? fillingCansL1.reduce((sum, can) => sum + can.fillLevel, 0) / fillingCansL1.length
      : 0;

    this.line1Stations.mixing.setRuntimeMetrics({
      cansProcessed: Math.floor(this.grossFilledCans / 2),
      position: l1Running ? processPhase : 0,
      fillLevel: l1Running ? 65 + Math.sin(this.elapsedTime * 0.7) * 12 : 0,
      isActive: l1Running,
    });
    this.line1Stations.carbonation.setRuntimeMetrics({
      cansProcessed: Math.floor(this.grossFilledCans / 2),
      position: l1Running ? (this.elapsedTime % 20) / 20 : 0,
      pressure: l1Running ? 2.6 + Math.sin(this.elapsedTime) * 0.12 : 0,
      isActive: l1Running,
    });
    this.line1Stations.filling.setRuntimeMetrics({
      cansProcessed: Math.floor(this.grossFilledCans / 2),
      position: l1Running ? avgFillL1 / 100 : 0,
      fillLevel: l1Running ? avgFillL1 : 0,
      isActive: l1Running,
    });
    this.line1Stations.capping.setRuntimeMetrics({
      cansProcessed: Math.floor(this.grossFilledCans / 2),
      position: l1Running ? ((this.elapsedTime * this.getLine1CansPerMinute()) / 60) % 1 : 0,
      sealQuality: 100 - this.getDefectRate() * 100,
      isActive: l1Running,
    });
    this.line1Stations.packing.setRuntimeMetrics({
      cansProcessed: Math.floor(this.totalCansProduced / 2),
      position: l1Running ? this.getLineState().cansInCaseBuffer / this.lineConfig.caseSize : 0,
      boxCount: Math.floor(this.completedCases / 2),
      isActive: l1Running,
    });

    // Line 2 runtime metrics
    const l2Running = this.isRunning && this.line2Enabled && this.getLine2CansPerMinute() > 0;
    const fillingCansL2 = this.visualCans.filter((can) => can.lane === 1 && can.stage === 'filling');
    const avgFillL2 = fillingCansL2.length
      ? fillingCansL2.reduce((sum, can) => sum + can.fillLevel, 0) / fillingCansL2.length
      : 0;

    this.line2Stations.mixing.setRuntimeMetrics({
      cansProcessed: Math.ceil(this.grossFilledCans / 2),
      position: l2Running ? processPhase : 0,
      fillLevel: l2Running ? 65 + Math.sin(this.elapsedTime * 0.7 + 1.5) * 12 : 0,
      isActive: l2Running,
    });
    this.line2Stations.carbonation.setRuntimeMetrics({
      cansProcessed: Math.ceil(this.grossFilledCans / 2),
      position: l2Running ? (this.elapsedTime % 20) / 20 : 0,
      pressure: l2Running ? 2.6 + Math.sin(this.elapsedTime + 1.2) * 0.12 : 0,
      isActive: l2Running,
    });
    this.line2Stations.filling.setRuntimeMetrics({
      cansProcessed: Math.ceil(this.grossFilledCans / 2),
      position: l2Running ? avgFillL2 / 100 : 0,
      fillLevel: l2Running ? avgFillL2 : 0,
      isActive: l2Running,
    });
    this.line2Stations.capping.setRuntimeMetrics({
      cansProcessed: Math.ceil(this.grossFilledCans / 2),
      position: l2Running ? ((this.elapsedTime * this.getLine2CansPerMinute()) / 60) % 1 : 0,
      sealQuality: 100 - this.getDefectRate() * 100,
      isActive: l2Running,
    });
    this.line2Stations.packing.setRuntimeMetrics({
      cansProcessed: Math.ceil(this.totalCansProduced / 2),
      position: l2Running ? this.getLineState().cansInCaseBuffer / this.lineConfig.caseSize : 0,
      boxCount: Math.ceil(this.completedCases / 2),
      isActive: l2Running,
    });
  }

  private finishRun(): void {
    this.isRunning = false;
    this.calculateMetrics();
    this.report = this.createReport();
    this.syncStationMetrics();
  }

  private createReport(): SimulationReport {
    const duration = this.simDuration ?? this.elapsedTime;
    const effectiveOverload =
      this.productionMode === 'overload'
        ? Math.max(this.lineConfig.overloadRatio, 1.35)
        : this.lineConfig.overloadRatio;
    const effectiveTargetPerHour = this.lineConfig.nominalCansPerHour * effectiveOverload;
    const plannedCans = Math.round((effectiveTargetPerHour * duration) / 3600);
    const averageCansPerMinute = (this.totalCansProduced / Math.max(this.elapsedTime, 1)) * 60;
    const performancePercent =
      (averageCansPerMinute / Math.max(effectiveTargetPerHour / 60, 1)) * 100;
    const qualityPercent =
      ((this.grossFilledCans - this.rejectedCans) / Math.max(this.grossFilledCans, 1)) * 100;
    const availabilityPercent = Math.max(
      0,
      Math.min(100, ((duration - this.downtimeSeconds) / Math.max(duration, 1)) * 100)
    );

    const stressNote =
      this.peakStressPercent > 50
        ? ` High equipment strain observed (Peak stress: ${Math.round(this.peakStressPercent)}%).`
        : '';
    const downtimeNote =
      this.downtimeSeconds > 0 ? ` Downtime: ${Math.round(this.downtimeSeconds)}s.` : '';

    return {
      durationSeconds: this.elapsedTime,
      plannedCans,
      filledCans: this.grossFilledCans,
      packedCans: this.completedCases * this.lineConfig.caseSize,
      completedCases: this.completedCases,
      rejectedCans: this.rejectedCans,
      averageCansPerMinute,
      availabilityPercent,
      performancePercent,
      qualityPercent,
      oeePercent: (availabilityPercent * performancePercent * qualityPercent) / 10000,
      bottleneck: this.getBottleneckName(),
      calibrationNote: `${Math.round(effectiveOverload * 100)}% Stress Run (${this.lineConfig.canFormatLabel}) at ${effectiveTargetPerHour.toLocaleString()} target cph with ${this.lineConfig.caseSize}-can cases.${stressNote}${downtimeNote}`,
      overloadRatio: effectiveOverload,
      peakStressPercent: Math.round(this.peakStressPercent),
      downtimeSeconds: Math.round(this.downtimeSeconds),
    };
  }

  private getAverageFillLevel(): number {
    const l1 =
      this.line1Stations.mixing.getState().fillLevel * 0.3 +
      this.line1Stations.filling.getState().fillLevel * 0.7;
    const l2 =
      this.line2Stations.mixing.getState().fillLevel * 0.3 +
      this.line2Stations.filling.getState().fillLevel * 0.7;
    return (l1 + l2) / 2;
  }

  private getLineState(): LineState {
    return {
      canFormat: this.lineConfig.canFormat,
      canFormatLabel: this.lineConfig.canFormatLabel,
      canSizeMl: this.lineConfig.canSizeMl,
      canDiameterMm: this.lineConfig.canDiameterMm,
      canHeightMm: this.lineConfig.canHeightMm,
      caseSize: this.lineConfig.caseSize,
      nominalCansPerHour: this.lineConfig.nominalCansPerHour,
      nominalCansPerMinute: this.lineConfig.nominalCansPerHour / 60,
      conveyorMetersPerSecond: this.lineConfig.conveyorMetersPerSecond,
      completedCases: this.completedCases,
      cansInCaseBuffer: this.totalCansProduced % this.lineConfig.caseSize,
      rejectedCans: this.rejectedCans,
      visualCans: this.visualCans,
      visibleCases: this.visibleCases,
      overloadRatio: this.lineConfig.overloadRatio,
    };
  }

  private getStationStatesFor(
    stationMap: Record<StationKey, Station>
  ): Record<StationKey, StationState> {
    return STATION_ORDER.reduce((states, key) => {
      const stationState = stationMap[key].getState();
      states[key] =
        key === 'packing'
          ? {
              ...stationState,
              config: { ...stationState.config, name: `${this.lineConfig.caseSize}-Can Case Packer` },
            }
          : stationState;
      return states;
    }, {} as Record<StationKey, StationState>);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
