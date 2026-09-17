/** Real-time run and line-performance telemetry lined up vertically. */

'use client';

import { FactoryMetrics } from '@/types/simulation';
import { formatNumber, formatTime } from '@/utils/helpers';

interface MetricsDisplayProps {
  metrics: FactoryMetrics | null;
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  if (!metrics) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Stats</h3>
        </div>
        <p className="text-xs text-slate-500">Awaiting simulation data...</p>
      </div>
    );
  }

  const isOverload = metrics.overloadRatio > 1.1;
  const isJammed = metrics.jammedStations.length > 0;

  const metricItems = [
    {
      id: 'rate',
      label: 'Production Rate',
      value: formatNumber(metrics.productionRate, 1),
      unit: 'cans/min',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      highlightColor: 'text-amber-400',
    },
    {
      id: 'takt',
      label: 'Can Takt Time',
      value: metrics.cycleTime > 0 ? formatNumber(metrics.cycleTime, 2) : '--',
      unit: metrics.cycleTime > 0 ? 'sec/can' : '',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      highlightColor: 'text-sky-400',
    },
    {
      id: 'fill',
      label: 'Filler Turret',
      value: formatNumber(metrics.fillLevel, 1),
      unit: '% level',
      progress: Math.min(100, Math.max(0, metrics.fillLevel)),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      ),
      highlightColor: 'text-emerald-400',
    },
    {
      id: 'output',
      label: 'Packed Output',
      value: formatNumber(metrics.totalCansProduced, 0),
      unit: 'cans',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
      highlightColor: 'text-orange-400',
    },
  ];

  const bufferPercent = Math.min(
    100,
    Math.round((metrics.lineState.cansInCaseBuffer / (metrics.lineState.caseSize || 24)) * 100)
  );

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none">
      {/* Header bar with live clock */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {metrics.isRunning && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                metrics.isRunning ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Live Stats
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-slate-900/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-300">
          <span className="text-[9px] uppercase tracking-widest text-slate-500">T+</span>
          {formatTime(metrics.elapsedTime)}
        </div>
      </div>

      {/* Station Capacity & Status Banner */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2 text-[10px]">
        <div className="flex items-center justify-between font-semibold">
          <span className="text-slate-400">Capacity:</span>
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
              ? '100% (Dual Active)'
              : metrics.line1Enabled
              ? '50% (Station 1 Only)'
              : metrics.line2Enabled
              ? '50% (Station 2 Only)'
              : '0% (Both Offline)'}
          </span>
        </div>
      </div>

      {/* Primary Metrics — Lined up vertically in single column */}
      <div className="flex flex-col gap-2">
        {metricItems.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/90"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {item.icon}
                <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500">{item.unit}</span>
            </div>
            
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`font-mono text-xl font-extrabold tracking-tight ${item.highlightColor}`}>
                {item.value}
              </span>
            </div>

            {/* Optional Fill Progress Bar for Filler status */}
            {item.progress !== undefined && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Secondary Line Indicators */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5 text-xs">
        {/* Cases & Buffer */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Packed Cases</span>
          <span className="font-mono text-xs font-bold text-slate-200">
            {formatNumber(metrics.lineState.completedCases, 0)}{' '}
            <span className="text-[10px] font-normal text-slate-500">cases</span>
          </span>
        </div>

        {/* Case Buffer Mini Gauge */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Buffer Fill</span>
            <span className="font-mono text-slate-300">
              {metrics.lineState.cansInCaseBuffer} / {metrics.lineState.caseSize}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-200"
              style={{ width: `${bufferPercent}%` }}
            />
          </div>
        </div>

        {/* Quality Rejects */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-400">QA Rejects</span>
          <span
            className={`font-mono text-xs font-bold ${
              metrics.lineState.rejectedCans > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {formatNumber(metrics.lineState.rejectedCans, 0)}{' '}
            <span className="text-[10px] font-normal text-slate-500">cans</span>
          </span>
        </div>

        {/* Bottleneck Identifier */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-400">Bottleneck</span>
          <span className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-300">
            {metrics.bottleneck}
          </span>
        </div>
      </div>

      {/* Overall Health Pill */}
      <div
        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all shadow-sm ${
          isJammed
            ? 'border-rose-500/50 bg-rose-950/40 text-rose-300 animate-pulse'
            : isOverload
            ? 'border-amber-500/50 bg-amber-950/40 text-amber-300'
            : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {isJammed
          ? `LINE FAULT • ${metrics.jammedStations.length} JAMMED`
          : isOverload
          ? `OVERLOAD • ${Math.round(metrics.overloadRatio * 100)}% CAPACITY`
          : metrics.overallStatus.label}
      </div>
    </div>
  );
}
