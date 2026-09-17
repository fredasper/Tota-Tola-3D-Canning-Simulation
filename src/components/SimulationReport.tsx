/** End-of-run production report for the configured canning-line simulation. */

'use client';

import { SimulationReport as SimulationReportData } from '@/types/simulation';
import { formatNumber, formatTime } from '@/utils/helpers';

interface SimulationReportProps {
  report: SimulationReportData | null;
}

export function SimulationReport({ report }: SimulationReportProps) {
  if (!report) {
    return (
      <section className="glass-panel border-dashed border-slate-700/60 p-6 text-center">
        <h3 className="text-base font-bold text-slate-200">Simulation Run In Progress</h3>
        <p className="mt-2 text-xs text-slate-400">
          An automated OEE and production yield summary is generated when a configured run duration concludes.
        </p>
      </section>
    );
  }

  const reportItems: [string, string, string?][] = [
    ['Planned Target', `${formatNumber(report.plannedCans, 0)} cans`],
    ['Filled / Good Output', `${formatNumber(report.filledCans, 0)} / ${formatNumber(report.packedCans, 0)} cans`],
    ['Packed Cases', `${formatNumber(report.completedCases, 0)} cases`],
    ['Quality Rejects', `${formatNumber(report.rejectedCans, 0)} cans`, report.rejectedCans > 0 ? 'text-amber-400' : 'text-emerald-400'],
    ['Average Throughput', `${formatNumber(report.averageCansPerMinute, 1)} cans/min`],
    ['Line Bottleneck', report.bottleneck, 'text-orange-400 font-mono'],
  ];

  if ((report.overloadRatio && report.overloadRatio > 1.0) || (report.peakStressPercent && report.peakStressPercent > 0)) {
    reportItems.push(['Operating Load Factor', `${Math.round((report.overloadRatio || 1.0) * 100)}% capacity`]);
    reportItems.push(['Peak Mechanical Strain', `${report.peakStressPercent || 0}%`, 'text-rose-400']);
    if (report.downtimeSeconds && report.downtimeSeconds > 0) {
      reportItems.push(['Unscheduled Downtime', `${report.downtimeSeconds}s`, 'text-rose-400']);
    }
  }

  return (
    <section className="glass-panel flex flex-col gap-5 p-5">
      {/* ── Report Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-emerald-500/50 bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300">
              RUN AUDIT COMPLETE
            </span>
            <span className="text-xs text-slate-400">
              Duration: <strong className="font-mono text-slate-200">{formatTime(report.durationSeconds)}</strong>
            </span>
          </div>
          <h3 className="mt-1 text-base font-extrabold text-white sm:text-lg">
            Canning Line Production Performance Report
          </h3>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => downloadReport(report)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Report
        </button>
      </div>

      {/* ── OEE Core KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Availability" value={report.availabilityPercent} />
        <Kpi label="Performance" value={report.performancePercent} />
        <Kpi label="Quality" value={report.qualityPercent} />
        <Kpi label="Overall OEE" value={report.oeePercent} highlighted />
      </div>

      {/* ── Detailed Telemetry Metrics Grid ── */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {reportItems.map(([label, value, customColor]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 transition hover:border-slate-700"
          >
            <p className="text-[11px] font-medium text-slate-400">{label}</p>
            <p className={`mt-1 text-sm font-bold ${customColor || 'text-slate-100'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Footer / Methodology ── */}
      <p className="border-t border-slate-800/80 pt-3 text-[11px] leading-relaxed text-slate-400">
        {report.calibrationNote}
      </p>
    </section>
  );
}

function Kpi({ label, value, highlighted = false }: { label: string; value: number; highlighted?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl p-3.5 text-center transition ${
        highlighted
          ? 'border border-orange-500/70 bg-gradient-to-b from-orange-950/40 to-slate-900/90 shadow-lg shadow-orange-950/40'
          : 'border border-slate-800/80 bg-slate-900/70'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl font-black ${
          highlighted ? 'text-orange-400' : 'text-emerald-400'
        }`}
      >
        {formatNumber(value, 1)}%
      </p>
    </div>
  );
}

function downloadReport(report: SimulationReportData): void {
  const contents = [
    'TOTA TOLA SMALL CANNING FACTORY - PRODUCTION REPORT',
    `Run time: ${formatTime(report.durationSeconds)}`,
    `Planned output: ${report.plannedCans} cans`,
    `Filled cans: ${report.filledCans}`,
    `Packed cans: ${report.packedCans}`,
    `Packed cases: ${report.completedCases}`,
    `Quality rejects: ${report.rejectedCans}`,
    `Average throughput: ${report.averageCansPerMinute.toFixed(1)} cans/min`,
    `Bottleneck: ${report.bottleneck}`,
    `Availability: ${report.availabilityPercent.toFixed(1)}%`,
    `Performance: ${report.performancePercent.toFixed(1)}%`,
    `Quality: ${report.qualityPercent.toFixed(1)}%`,
    `OEE: ${report.oeePercent.toFixed(1)}%`,
    '',
    report.calibrationNote,
    'Model source: https://www.krones.com/en/company/press/magazine/reference/can-and-bottle-craft-brewery-in-budapest-relies-on-combined-filler-from-kosme.php',
    'Conveyor source: https://www.krones.com/en/products/machines/container-conveyor.php',
  ].join('\n');
  const downloadUrl = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'tota-tola-canning-line-report.txt';
  link.click();
  URL.revokeObjectURL(downloadUrl);
}
