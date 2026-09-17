/** Live SCADA process station status dashboard. */

'use client';

import { useState } from 'react';
import { FactoryMetrics, LineId, StationKey, StationState } from '@/types/simulation';
import { formatNumber } from '@/utils/helpers';

interface StationStatusTableProps {
  metrics: FactoryMetrics | null;
  onTogglePower?: (key: StationKey) => void;
  onToggleLinePower?: (line: LineId, enabled?: boolean) => void;
  onPowerAll?: (enabled: boolean) => void;
}

const stations = [
  { key: 'mixing', id: '01', desc: 'Syrup Blending Skid' },
  { key: 'carbonation', id: '02', desc: 'CO₂ Saturation Skid' },
  { key: 'filling', id: '03', desc: '12-Valve Rotary Turret' },
  { key: 'capping', id: '04', desc: '8-Head Rotary Double Seamer' },
  { key: 'packing', id: '06', desc: '24-Can Case Packer' },
] as const;

export function StationStatusTable({
  metrics,
  onTogglePower: _onTogglePower,
  onToggleLinePower,
  onPowerAll,
}: StationStatusTableProps) {
  const [selectedLine, setSelectedLine] = useState<'line1' | 'line2'>('line1');

  if (!metrics) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="text-xs text-slate-400">Awaiting station status data...</p>
      </div>
    );
  }

  const isOverload = metrics.overloadRatio > 1.1;
  const isFault = metrics.jammedStations.length > 0;
  const currentStationStates =
    selectedLine === 'line1'
      ? metrics.line1Stations || metrics.stationStates
      : metrics.line2Stations || metrics.stationStates;
  const isCurrentLineEnabled = selectedLine === 'line1' ? metrics.line1Enabled : metrics.line2Enabled;

  return (
    <section className="glass-panel flex flex-col gap-4 p-5">
      {/* ── Table Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 sm:text-base">
              Process Station Status & Power
            </h3>
            {isOverload && (
              <span className="rounded-md border border-amber-500/50 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 shadow-sm">
                {Math.round(metrics.overloadRatio * 100)}% OVERLOAD
              </span>
            )}
            {isFault && (
              <span className="rounded-md border border-rose-500/60 bg-rose-950/70 px-2 py-0.5 text-[10px] font-extrabold text-rose-300 animate-pulse shadow-sm">
                ALARM: {metrics.jammedStations.length} FAULT
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Independent telemetry and power isolators for Station 1 (Alpha) and Station 2 (Beta).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onPowerAll && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
              <button
                type="button"
                onClick={() => onPowerAll(true)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
                title="Power on all stations"
              >
                All On
              </button>
              <span className="text-slate-700">|</span>
              <button
                type="button"
                onClick={() => onPowerAll(false)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300 active:scale-95"
                title="Power off all stations"
              >
                All Off
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-300">
            <span className="text-[10px] uppercase text-slate-500">Active Bottleneck:</span>
            <span className="font-mono text-orange-400">{metrics.bottleneck}</span>
          </div>
        </div>
      </div>

      {/* ── Dual Station Power & Throughput Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Station 1 Card */}
        <div
          className={`flex items-center justify-between rounded-xl border p-3 transition ${
            metrics.line1Enabled
              ? 'border-emerald-500/40 bg-slate-900/60'
              : 'border-slate-800/60 bg-slate-950/70 opacity-60'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-orange-500/40 bg-orange-500/15 font-mono text-[10px] font-bold text-orange-400">
                01
              </span>
              <span className="text-xs font-bold text-slate-100">
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
                ? `Output: ${formatNumber(metrics.line1Rate, 0)} cans/min (~${formatNumber(
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

        {/* Station 2 Card */}
        <div
          className={`flex items-center justify-between rounded-xl border p-3 transition ${
            metrics.line2Enabled
              ? 'border-emerald-500/40 bg-slate-900/60'
              : 'border-slate-800/60 bg-slate-950/70 opacity-60'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/15 font-mono text-[10px] font-bold text-amber-400">
                02
              </span>
              <span className="text-xs font-bold text-slate-100">
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
                ? `Output: ${formatNumber(metrics.line2Rate, 0)} cans/min (~${formatNumber(
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

      {/* ── Line View Selector Tabs ── */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setSelectedLine('line1')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedLine === 'line1'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Station 1 Telemetry (Line 1)
          </button>
          <button
            type="button"
            onClick={() => setSelectedLine('line2')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedLine === 'line2'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Station 2 Telemetry (Line 2)
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Showing: <strong className="text-slate-200">{selectedLine === 'line1' ? 'Station 1 (Alpha)' : 'Station 2 (Beta)'}</strong>
        </span>
      </div>

      {/* ── Table Grid ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
              <th className="pb-3 pl-2">Station</th>
              <th className="pb-3 text-center">Status</th>
              <th className="pb-3 text-center">Efficiency</th>
              <th className="pb-3 text-center">Condition</th>
              <th className="pb-3 text-center">Cycle Progress</th>
              <th className="pb-3 text-center">Mechanical Strain</th>
              <th className="pb-3 pr-2 text-right">Throughput</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {stations.map(({ key, id, desc }) => {
              const state: StationState = currentStationStates[key];
              const isEnabled = isCurrentLineEnabled && state?.isEnabled !== false;
              const isJammed = state?.isJammed ?? false;
              const cyclePct = isEnabled && state ? Math.round(state.position * 100) : 0;

              return (
                <tr
                  key={key}
                  className={`transition duration-150 ${
                    !isEnabled
                      ? 'bg-slate-950/40 opacity-60'
                      : isJammed
                      ? 'bg-rose-950/30'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  {/* Station Name & ID */}
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg border font-mono text-[11px] font-bold ${
                        isEnabled
                          ? 'border-slate-800 bg-slate-900 text-orange-400'
                          : 'border-slate-800/80 bg-slate-950 text-slate-600'
                      }`}>
                        {id}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isEnabled ? 'text-slate-100' : 'text-slate-400 line-through decoration-slate-600'}`}>
                            {state.config.name}
                          </span>
                          {!isEnabled ? (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                              OFFLINE
                            </span>
                          ) : isJammed ? (
                            <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white animate-pulse">
                              JAMMED
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-slate-400">{desc}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Indicator */}
                  <td className="py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                        isEnabled
                          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border border-slate-800 bg-slate-900/60 text-slate-500'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'}`} />
                      <span>{isEnabled ? 'RUNNING' : 'STOPPED'}</span>
                    </span>
                  </td>

                  {/* Efficiency */}
                  <td className="py-3.5 text-center">
                    <span
                      className={`font-mono text-sm font-extrabold ${
                        !isEnabled
                          ? 'text-slate-500'
                          : state.efficiencyPercent < 70
                          ? 'text-rose-400 animate-pulse'
                          : state.efficiencyPercent < 85
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {isEnabled ? `${formatNumber(state.efficiencyPercent, 0)}%` : '0%'}
                    </span>
                  </td>

                  {/* Condition Badge */}
                  <td className="py-3.5 text-center">
                    {!isEnabled ? (
                      <span className="inline-block rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                        OFFLINE
                      </span>
                    ) : isJammed ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/60 bg-rose-950/60 px-2.5 py-1 text-[10px] font-extrabold text-rose-300 animate-pulse">
                        FAULT
                      </span>
                    ) : (
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold ${getBadgeStyle(state.efficiencyPercent)}`}>
                        {getStatusLabel(state.efficiencyPercent)}
                      </span>
                    )}
                  </td>

                  {/* Cycle Progress Mini Bar */}
                  <td className="py-3.5 text-center">
                    <div className="mx-auto flex max-w-[120px] flex-col gap-1">
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span>{cyclePct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-150"
                          style={{ width: `${cyclePct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Strain Level */}
                  <td className="py-3.5 text-center">
                    <div className="mx-auto flex max-w-[100px] flex-col gap-1">
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span
                          className={
                            state.stressLevel > 40
                              ? 'text-rose-400 font-bold'
                              : state.stressLevel > 15
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }
                        >
                          {state.stressLevel}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            state.stressLevel > 40
                              ? 'bg-rose-500'
                              : state.stressLevel > 15
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, state.stressLevel)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Cans Processed Throughput */}
                  <td className="py-3.5 pr-2 text-right">
                    <span className="font-mono font-bold text-slate-200">
                      {formatNumber(state.cansProcessed, 0)}
                    </span>
                    <span className="ml-1 text-[10px] text-slate-500">cans</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getBadgeStyle(efficiency: number): string {
  if (efficiency >= 95) return 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400';
  if (efficiency >= 85) return 'bg-amber-950/60 border border-amber-500/40 text-amber-300';
  if (efficiency >= 70) return 'bg-orange-950/60 border border-orange-500/40 text-orange-300';
  return 'bg-rose-950/80 border border-rose-500/70 text-rose-300 animate-pulse';
}

function getStatusLabel(efficiency: number): string {
  if (efficiency >= 95) return 'OPTIMAL';
  if (efficiency >= 85) return 'CAUTION';
  if (efficiency >= 70) return 'WARNING';
  return 'CRITICAL';
}
