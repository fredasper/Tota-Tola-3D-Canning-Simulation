/** Production controls and real-world line test settings. */

'use client';

import { useState } from 'react';
import {
  FactoryMetrics,
  LineConfigurationUpdate,
  LineId,
  ProductionMode,
  StationKey,
} from '@/types/simulation';
import { formatNumber } from '@/utils/helpers';
import CONFIG, { CAN_FORMATS } from '@/lib/config';

type DurationUnit = 'minutes' | 'hours' | 'infinite';

interface ControlPanelProps {
  metrics: FactoryMetrics | null;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onDurationChange: (duration: number | null) => void;
  onLineConfigChange: (update: LineConfigurationUpdate) => void;
  onModeChange: (mode: ProductionMode) => void;
  onTogglePower?: (key: StationKey) => void;
  onToggleLinePower?: (line: LineId, enabled?: boolean) => void;
  onPowerAll?: (enabled: boolean) => void;
}

export function ControlPanel({
  metrics,
  isRunning,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
  onDurationChange,
  onLineConfigChange,
  onModeChange,
  onTogglePower: _onTogglePower,
  onToggleLinePower,
  onPowerAll,
}: ControlPanelProps) {
  const [durationUnit, setDurationUnit] = useState<Exclude<DurationUnit, 'infinite'>>('minutes');

  if (!metrics) {
    return (
      <div className="flex flex-col gap-3 p-4 text-center">
        <p className="text-xs text-slate-400">Loading control interface...</p>
      </div>
    );
  }

  const selectedDurationUnit: DurationUnit = metrics.isInfiniteDuration ? 'infinite' : durationUnit;
  const durationValue =
    durationUnit === 'hours'
      ? trimDuration(metrics.simDuration / 3600)
      : trimDuration(metrics.simDuration / 60);

  const setDurationUnitAndValue = (nextUnit: DurationUnit) => {
    if (nextUnit === 'infinite') {
      onDurationChange(null);
      return;
    }

    setDurationUnit(nextUnit);
    const fallbackDuration = nextUnit === 'hours' ? 60 * 60 : 15 * 60;
    onDurationChange(metrics.isInfiniteDuration ? fallbackDuration : metrics.simDuration);
  };

  const updateDuration = (rawValue: string) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return;
    const seconds = numericValue * (durationUnit === 'hours' ? 3600 : 60);
    onDurationChange(seconds);
  };

  const updateNumber = (rawValue: string, field: keyof LineConfigurationUpdate, multiplier = 1) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return;
    onLineConfigChange({ [field]: numericValue * multiplier });
  };

  const speedPresets = [0.5, 1.0, 2.0, 5.0, 10.0];
  const ratePresets = [3600, 4800, 6000, 7200, 9000];

  return (
    <div className="flex flex-col gap-5 text-slate-200">
      {/* ── Section 1: Execution Control ── */}
      <section className="glass-panel-subtle flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-orange-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Run Operations
            </h3>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isRunning
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isRunning ? 'RUNNING' : 'STANDBY'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={isRunning ? onStop : onStart}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold shadow-md transition active:scale-95 ${
              isRunning
                ? 'border border-amber-500/60 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:brightness-110 shadow-amber-500/20'
                : 'border border-emerald-500/60 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110 shadow-emerald-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause Production
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Start Production
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 py-2.5 text-xs font-bold text-slate-300 shadow-md transition hover:border-red-500/60 hover:bg-red-950/40 hover:text-red-300 active:scale-95"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Reset Run
          </button>
        </div>
      </section>

      {/* ── Section 2: Playback Clock ── */}
      <section className="glass-panel-subtle flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Playback Speed
          </h3>
          <span className="font-mono text-xs font-extrabold text-orange-400">
            {formatNumber(metrics.productionSpeed, 2)}x
          </span>
        </div>

        <input
          aria-label="Simulation playback speed"
          type="range"
          min={CONFIG.simulation.minSpeed}
          max={CONFIG.simulation.maxSpeed}
          step={0.25}
          value={metrics.productionSpeed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="slider my-1"
        />

        {/* Quick Speed Preset Pills */}
        <div className="flex justify-between gap-1.5">
          {speedPresets.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSpeedChange(speed)}
              className={`flex-1 rounded-lg py-1 text-[11px] font-bold font-mono transition ${
                Math.abs(metrics.productionSpeed - speed) < 0.1
                  ? 'border border-orange-500/80 bg-orange-500/20 text-orange-300'
                  : 'border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </section>

      {/* ── Section 3: Operating Stress Mode ── */}
      <section className="glass-panel-subtle flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Production Mode
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'standard', label: 'Standard', desc: 'Nominal 100%' },
            { id: 'express', label: 'Express', desc: '+Speed, +Defects' },
            { id: 'testing', label: 'Calibrated', desc: 'Validation Lab' },
            { id: 'overload', label: 'Overload', desc: '150% Stress' },
          ].map((mode) => {
            const isSelected = metrics.productionMode === mode.id;
            const isOverload = mode.id === 'overload';
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onModeChange(mode.id as ProductionMode)}
                className={`flex flex-col items-start rounded-xl p-2.5 text-left transition ${
                  isSelected
                    ? isOverload
                      ? 'border border-rose-500/80 bg-rose-950/60 shadow-lg shadow-rose-950/50'
                      : 'border border-orange-500/80 bg-orange-950/60 shadow-lg shadow-orange-950/50'
                    : 'border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    isSelected
                      ? isOverload
                        ? 'text-rose-300'
                        : 'text-orange-300'
                      : 'text-slate-200'
                  }`}
                >
                  {mode.label}
                </span>
                <span className="text-[10px] text-slate-400">{mode.desc}</span>
              </button>
            );
          })}
        </div>

        {metrics.productionMode === 'overload' && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/50 bg-rose-950/50 p-2.5 text-[11px] leading-relaxed text-rose-300 animate-fade-in">
            <span className="text-sm">⚠️</span>
            <div>
              <strong>Overload Active (150%):</strong> Stations sustain extreme kinematic stresses, causing frequent thermal jams and degraded efficiency alarms.
            </div>
          </div>
        )}
      </section>

      {/* ── Section 4: Line Engineering & Can Parameters ── */}
      <section className="glass-panel-subtle flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Can & Packaging Specs
          </h3>
        </div>

        {/* Can Format */}
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Can Format</span>
          <select
            value={metrics.lineState.canFormat}
            onChange={(event) => onLineConfigChange({ canFormat: event.target.value as keyof typeof CAN_FORMATS })}
            className="glass-input"
          >
            {Object.values(CAN_FORMATS).map((format) => (
              <option key={format.key} value={format.key} className="bg-slate-900 text-slate-100">
                {format.label} • {format.diameterMm}mm ⌀ × {format.heightMm}mm
              </option>
            ))}
          </select>
        </label>

        {/* Case Packaging Format & Nominal Rate */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Case Format</span>
            <select
              value={metrics.lineState.caseSize}
              onChange={(event) => onLineConfigChange({ caseSize: Number(event.target.value) })}
              className="glass-input"
            >
              <option value={12} className="bg-slate-900 text-slate-100">12 cans / tray</option>
              <option value={24} className="bg-slate-900 text-slate-100">24 cans / case</option>
              <option value={48} className="bg-slate-900 text-slate-100">48 cans / bulk</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Nominal Rate</span>
            <input
              key={`rate-${metrics.lineState.nominalCansPerHour}`}
              type="number"
              min={3000}
              max={10500}
              step={100}
              defaultValue={metrics.lineState.nominalCansPerHour}
              onBlur={(event) => updateNumber(event.target.value, 'nominalCansPerHour')}
              className="glass-input font-mono"
            />
          </label>
        </div>

        {/* Quick Rate Preset Buttons */}
        <div className="flex justify-between gap-1">
          {ratePresets.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onLineConfigChange({ nominalCansPerHour: r })}
              className={`flex-1 rounded-lg py-1 text-[10px] font-mono transition ${
                metrics.lineState.nominalCansPerHour === r
                  ? 'border border-orange-500/80 bg-orange-500/20 text-orange-300 font-bold'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              {r / 1000}k
            </button>
          ))}
        </div>

        {/* Linear Conveyor Velocity */}
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Conveyor Velocity</span>
            <span className="font-mono text-[11px] text-slate-400">
              {formatNumber(metrics.lineState.conveyorMetersPerSecond * 60, 1)} m/min
            </span>
          </div>
          <input
            key={`conveyor-${metrics.lineState.conveyorMetersPerSecond}`}
            type="number"
            min={4.8}
            max={24}
            step={0.1}
            defaultValue={formatNumber(metrics.lineState.conveyorMetersPerSecond * 60, 1)}
            onBlur={(event) => updateNumber(event.target.value, 'conveyorMetersPerSecond', 1 / 60)}
            className="glass-input font-mono"
          />
        </label>
      </section>

      {/* ── Section 5: Run Duration ── */}
      <section className="glass-panel-subtle flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Run Duration
          </h3>
        </div>

        <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          {(['minutes', 'hours', 'infinite'] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setDurationUnitAndValue(unit)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
                selectedDurationUnit === unit
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {unit === 'infinite' ? 'Continuous' : unit}
            </button>
          ))}
        </div>

        {selectedDurationUnit !== 'infinite' && (
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Run Length ({durationUnit})
            </span>
            <input
              key={`${durationUnit}-${metrics.simDuration}`}
              type="number"
              min={durationUnit === 'hours' ? 1 / 60 : 1}
              max={durationUnit === 'hours' ? 24 : 24 * 60}
              step={durationUnit === 'hours' ? 0.25 : 1}
              defaultValue={durationValue}
              onBlur={(event) => updateDuration(event.target.value)}
              className="glass-input font-mono"
            />
          </label>
        )}
      </section>

      {/* ── Section 6: Dual Station Power Controls (Station 1 & Station 2) ── */}
      <section className="glass-panel-subtle flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Station Power Controls
            </h3>
            <p className="text-[10px] text-slate-400">
              Independently turn Station 1 or 2 on/off to scale plant throughput.
            </p>
          </div>
          {onPowerAll && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 p-0.5">
              <button
                type="button"
                onClick={() => onPowerAll(true)}
                className="rounded px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
              >
                Both On
              </button>
              <span className="text-slate-700 text-[10px]">|</span>
              <button
                type="button"
                onClick={() => onPowerAll(false)}
                className="rounded px-2 py-0.5 text-[10px] font-bold text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300 active:scale-95"
              >
                Both Off
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Throughput Impact Indicator */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Production Output:</span>
            <span
              className={`font-mono font-bold ${
                metrics.line1Enabled && metrics.line2Enabled
                  ? 'text-emerald-400'
                  : metrics.line1Enabled || metrics.line2Enabled
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {metrics.line1Enabled && metrics.line2Enabled
                ? '100% (Both Stations Running)'
                : metrics.line1Enabled || metrics.line2Enabled
                ? '50% (Single Station Running)'
                : '0% (Both Stations Stopped)'}
            </span>
          </div>
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                metrics.line1Enabled && metrics.line2Enabled
                  ? 'w-full bg-emerald-500'
                  : metrics.line1Enabled || metrics.line2Enabled
                  ? 'w-1/2 bg-amber-500'
                  : 'w-0 bg-rose-500'
              }`}
            />
          </div>
        </div>

        {/* Station 1 & Station 2 Power Toggles */}
        <div className="flex flex-col gap-2.5">
          {/* Station 1 (Line 1 - Alpha) */}
          <div
            className={`flex items-center justify-between rounded-xl border p-3 transition ${
              metrics.line1Enabled
                ? 'border-emerald-500/40 bg-slate-900/70 shadow-sm shadow-emerald-950/20'
                : 'border-slate-800/60 bg-slate-950/70 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-orange-500/40 bg-orange-500/15 font-mono text-[10px] font-bold text-orange-400">
                  01
                </span>
                <span
                  className={`text-xs font-bold ${
                    metrics.line1Enabled ? 'text-slate-100' : 'text-slate-400'
                  }`}
                >
                  Station 1 (Line 1 - Alpha)
                </span>
                {!metrics.line1Enabled && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-slate-400">
                    OFFLINE
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {metrics.line1Enabled
                  ? `Active • Output: ${formatNumber(metrics.line1Rate, 0)} cans/min (~${formatNumber(
                      metrics.line1Rate * 60,
                      0
                    )} CPH)`
                  : 'Powered Off • 0 cans/min output'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleLinePower?.('line1')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                metrics.line1Enabled
                  ? 'border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:border-rose-500/60 hover:bg-rose-500/20 hover:text-rose-300'
                  : 'border border-slate-700 bg-slate-800/90 text-slate-400 hover:border-emerald-500/60 hover:bg-emerald-500/20 hover:text-emerald-300'
              }`}
              title={metrics.line1Enabled ? 'Turn Station 1 OFF' : 'Turn Station 1 ON'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  metrics.line1Enabled
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : 'bg-slate-500'
                }`}
              />
              <span>{metrics.line1Enabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Station 2 (Line 2 - Beta) */}
          <div
            className={`flex items-center justify-between rounded-xl border p-3 transition ${
              metrics.line2Enabled
                ? 'border-emerald-500/40 bg-slate-900/70 shadow-sm shadow-emerald-950/20'
                : 'border-slate-800/60 bg-slate-950/70 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/15 font-mono text-[10px] font-bold text-amber-400">
                  02
                </span>
                <span
                  className={`text-xs font-bold ${
                    metrics.line2Enabled ? 'text-slate-100' : 'text-slate-400'
                  }`}
                >
                  Station 2 (Line 2 - Beta)
                </span>
                {!metrics.line2Enabled && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-slate-400">
                    OFFLINE
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {metrics.line2Enabled
                  ? `Active • Output: ${formatNumber(metrics.line2Rate, 0)} cans/min (~${formatNumber(
                      metrics.line2Rate * 60,
                      0
                    )} CPH)`
                  : 'Powered Off • 0 cans/min output'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleLinePower?.('line2')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                metrics.line2Enabled
                  ? 'border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:border-rose-500/60 hover:bg-rose-500/20 hover:text-rose-300'
                  : 'border border-slate-700 bg-slate-800/90 text-slate-400 hover:border-emerald-500/60 hover:bg-emerald-500/20 hover:text-emerald-300'
              }`}
              title={metrics.line2Enabled ? 'Turn Station 2 OFF' : 'Turn Station 2 ON'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  metrics.line2Enabled
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : 'bg-slate-500'
                }`}
              />
              <span>{metrics.line2Enabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function trimDuration(value: number): string {
  return Number(value.toFixed(value < 1 ? 2 : 1)).toString();
}
