/**
 * Station Class
 * Represents a single production station
 */

import { StationConfig, StationKey, StationState } from '@/types/simulation';

export class Station {
  private config: StationConfig;
  private efficiency: number;
  private baseEfficiency: number;
  private position: number = 0;
  private cansProcessed: number = 0;
  private fillLevel: number = 0;
  private pressure: number = 0;
  private sealQuality: number = 100;
  private boxCount: number = 0;
  private isActive: boolean = false;
  private isEnabled: boolean = true;
  private stressLevel: number = 0; // 0 - 100%
  private isJammed: boolean = false;
  private key: StationKey;

  constructor(key: StationKey, config: StationConfig, efficiency: number) {
    this.key = key;
    this.config = config;
    this.baseEfficiency = Math.max(0, Math.min(1, efficiency));
    this.efficiency = this.baseEfficiency;
  }

  /**
   * Calculates effective efficiency taking into account power state, mechanical jams and stress
   */
  getEffectiveEfficiency(): number {
    if (!this.isEnabled) {
      return 0; // 0% efficiency when powered off / offline
    }
    if (this.isJammed) {
      return 0.05; // 5% near-stall on jam
    }
    // Stress degrades efficiency from base level down to warning and critical bands
    const stressPenalty = (this.stressLevel / 100) * 0.45;
    return Math.max(0.05, Math.min(1, this.efficiency - stressPenalty));
  }

  /**
   * Set or toggle station power (online / offline)
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.isActive = false;
    }
  }

  isStationEnabled(): boolean {
    return this.isEnabled;
  }

  toggleEnabled(): void {
    this.setEnabled(!this.isEnabled);
  }

  /**
   * Update station state
   */
  update(deltaTime: number, cansPerBatch: number): void {
    if (!this.isEnabled) {
      this.isActive = false;
      return;
    }

    const effectiveEff = this.getEffectiveEfficiency();
    const progress = (deltaTime / this.config.cycleTime) * effectiveEff;
    const completedBatches = Math.floor(this.position + progress);

    this.position = (this.position + progress) % 1;
    this.isActive = this.position > 0 && !this.isJammed;

    if (completedBatches > 0) {
      this.cansProcessed += completedBatches * cansPerBatch;
    }

    // Update station-specific metrics
    this.updateMetrics();
  }

  /**
   * Update station-specific metrics
   */
  private updateMetrics(): void {
    // Filling station: simulate fill level
    if (this.key === 'mixing' || this.key === 'filling') {
      this.fillLevel = this.position * 100;
    }

    // Carbonation station: simulate pressure
    if (this.key === 'carbonation') {
      this.pressure = this.position * 100;
    }

    // Capping station: simulate seal quality
    if (this.key === 'capping') {
      const stressImpact = (this.stressLevel / 100) * 15;
      this.sealQuality = Math.max(0, 100 - this.position * 5 - stressImpact);
    }

    // Packing station: simulate boxes
    if (this.key === 'packing') {
      this.boxCount = Math.floor(this.cansProcessed / 24);
    }
  }

  /**
   * Get full station state
   */
  getState(): StationState {
    const effectiveEff = this.getEffectiveEfficiency();
    return {
      key: this.key,
      config: this.config,
      efficiency: effectiveEff,
      efficiencyPercent: Math.round(effectiveEff * 100),
      position: this.position,
      cansProcessed: this.cansProcessed,
      fillLevel: this.isEnabled ? this.fillLevel : 0,
      pressure: this.isEnabled ? this.pressure : 0,
      sealQuality: this.sealQuality,
      boxCount: this.boxCount,
      isActive: this.isEnabled && this.isActive,
      isEnabled: this.isEnabled,
      stressLevel: Math.round(this.stressLevel),
      isJammed: this.isJammed,
    };
  }

  /**
   * Get efficiency as percentage
   */
  getEfficiencyPercent(): number {
    return Math.round(this.getEffectiveEfficiency() * 100);
  }

  /**
   * Set efficiency with bounds checking
   */
  setEfficiency(efficiency: number): void {
    this.efficiency = Math.max(0, Math.min(1, efficiency));
  }

  /**
   * Set mechanical stress level (0 to 100%)
   */
  setStressLevel(stress: number): void {
    this.stressLevel = Math.max(0, Math.min(100, stress));
  }

  getStressLevel(): number {
    return this.stressLevel;
  }

  /**
   * Set or clear machine jam
   */
  setJammed(jammed: boolean): void {
    this.isJammed = jammed;
  }

  isStationJammed(): boolean {
    return this.isJammed;
  }

  /**
   * Apply efficiency modifier
   */
  applyEfficiencyModifier(modifier: number): void {
    const newEfficiency = this.efficiency + modifier;
    this.setEfficiency(newEfficiency);
  }

  /**
   * Synchronise the visual dashboard state with the line-flow simulation.
   */
  setRuntimeMetrics(metrics: {
    cansProcessed: number;
    position: number;
    fillLevel?: number;
    pressure?: number;
    sealQuality?: number;
    boxCount?: number;
    isActive: boolean;
  }): void {
    this.cansProcessed = metrics.cansProcessed;
    this.position = Math.max(0, Math.min(1, metrics.position));
    this.fillLevel = metrics.fillLevel ?? this.fillLevel;
    this.pressure = metrics.pressure ?? this.pressure;
    this.sealQuality = metrics.sealQuality ?? this.sealQuality;
    this.boxCount = metrics.boxCount ?? this.boxCount;
    this.isActive = this.isEnabled && metrics.isActive && !this.isJammed;
  }

  /**
   * Reset station to initial state
   */
  reset(): void {
    this.position = 0;
    this.cansProcessed = 0;
    this.fillLevel = 0;
    this.pressure = 0;
    this.sealQuality = 100;
    this.boxCount = 0;
    this.isActive = false;
    this.isEnabled = true;
    this.stressLevel = 0;
    this.isJammed = false;
  }
}
