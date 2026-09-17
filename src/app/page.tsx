/** Main application page for the small beverage-factory digital twin. */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useFactory } from '@/hooks/useFactory';
import { Factory3D, Factory3DHandle, cameraStations } from '@/components/Factory3D';
import { MetricsDisplay } from '@/components/MetricsDisplay';
import { ControlPanel } from '@/components/ControlPanel';
import { StationStatusTable } from '@/components/StationStatusTable';
import { SimulationReport } from '@/components/SimulationReport';
import { LandingPage } from '@/components/LandingPage';
import { SimulationReport as SimReportType } from '@/types/simulation';

export default function Home() {
  const [showLanding, setShowLanding] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [activeLine, setActiveLine] = useState<'overview' | 'line1' | 'line2'>('overview');
  const [activeStation, setActiveStation] = useState('overview');
  const [hideUI, setHideUI] = useState(false);
  const [reportHistory, setReportHistory] = useState<(SimReportType & { id: number; timestamp: string })[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const lastReportRef = useRef<SimReportType | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const factory3DRef = useRef<Factory3DHandle>(null);
  const {
    metrics,
    isRunning,
    start,
    stop,
    reset,
    setProductionSpeed,
    setSimulationDuration,
    setLineConfiguration,
    setProductionMode,
    toggleStationPower,
    toggleLinePower,
    powerAllStations,
  } = useFactory();

  // Track and show report history modal when runs end
  useEffect(() => {
    if (metrics.report && metrics.report !== lastReportRef.current) {
      lastReportRef.current = metrics.report;
      const newId = Date.now();
      setReportHistory((prev) => [
        { ...metrics.report!, id: newId, timestamp: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      setSelectedReportId(newId);
    } else if (!metrics.report) {
      lastReportRef.current = null;
    }
  }, [metrics.report]);

  // Close controls dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showControls &&
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setShowControls(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showControls]);

  // Enter simulation handlers - immediately transition camera to overview and scroll to top
  const handleEnterStart = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    factory3DRef.current?.focusStation('overview' as any);
    setActiveLine('overview');
    setActiveStation('overview');
  };

  const handleEnterSimulation = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    factory3DRef.current?.focusStation('overview' as any);
    setActiveLine('overview');
    setActiveStation('overview');
    setShowLanding(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  };

  // Scroll to absolute top whenever landing mode changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [showLanding]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* ── 3D factory as fixed full-page background ── */}
      <Factory3D
        ref={factory3DRef}
        metrics={metrics}
        activeLine={activeLine}
        containerClassName="fixed inset-0 z-0"
      />

      {/* ── 3D viewport overlay section (full screen height) ── */}
      <div className="pointer-events-none relative h-screen w-full overflow-hidden">

        {/* ── Top command bar ── */}
        <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-3 px-4 pt-3.5">
          {/* Brand & Factory State - Extended Presentable Reach */}
          <div
            className={`pointer-events-auto relative flex w-full max-w-[calc(100vw-220px)] sm:max-w-[480px] md:max-w-[530px] overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/85 px-4 py-2.5 shadow-2xl backdrop-blur-2xl transition duration-300 ${
              hideUI ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Top gradient highlight rim */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 to-transparent" />

            <div className="flex w-full items-center gap-3.5">
              {/* Prestigious Industrial Monogram Badge */}
              <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/40">
                <span className="font-black text-xl tracking-tight">TT</span>
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950 ring-1 ring-slate-800">
                  <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                </span>
              </div>

              {/* Title & Status Hierarchy */}
              <div className="flex flex-1 flex-col justify-center min-w-0">
                {/* Micro Sub-Header with Twin Lines and Standby Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-orange-400/90 truncate">
                    <span>Beverage Packaging Operations</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-orange-300">
                      Twin Lines
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                        isRunning
                          ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-sm shadow-emerald-500/20'
                          : 'border border-slate-700 bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {isRunning ? 'RUNNING' : 'STANDBY'}
                    </span>
                  </div>
                </div>

                {/* Primary Title - Bigger & Prominent */}
                <h1 className="text-lg font-black tracking-tight text-white sm:text-xl md:text-2xl drop-shadow-sm truncate mt-0.5">
                  TOTA TOLA CANNING PLANT
                </h1>
              </div>
            </div>
          </div>

          {/* Action Button Cluster */}
          <div className="pointer-events-auto flex items-center gap-2">
            {!hideUI && (
              <>
                {/* Start / Pause Button - Solid High-Contrast, 100% visible on white/dark */}
                <button
                  type="button"
                  onClick={isRunning ? stop : start}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-xl transition active:scale-95 ${
                    isRunning
                      ? 'border-2 border-amber-400 bg-amber-500 text-slate-950 hover:bg-amber-400 hover:border-amber-300 shadow-amber-500/30'
                      : 'border-2 border-emerald-400 bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:border-emerald-300 shadow-emerald-500/30'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Start
                    </>
                  )}
                </button>

                {/* Station 1 Power Toggle */}
                <button
                  type="button"
                  onClick={() => toggleLinePower('line1')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-xl backdrop-blur-md transition active:scale-95 ${
                    metrics?.line1Enabled
                      ? 'border-emerald-500/70 bg-emerald-950/70 text-emerald-300 hover:border-rose-500/80 hover:bg-rose-950/70 hover:text-rose-300'
                      : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-emerald-500/80 hover:text-emerald-300'
                  }`}
                  title={metrics?.line1Enabled ? 'Station 1 Running • Click to Turn OFF' : 'Station 1 Stopped • Click to Turn ON'}
                >
                  <span className={`h-2 w-2 rounded-full ${metrics?.line1Enabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'}`} />
                  <span>Station 1: <strong>{metrics?.line1Enabled ? 'ON' : 'OFF'}</strong></span>
                </button>

                {/* Station 2 Power Toggle */}
                <button
                  type="button"
                  onClick={() => toggleLinePower('line2')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-xl backdrop-blur-md transition active:scale-95 ${
                    metrics?.line2Enabled
                      ? 'border-emerald-500/70 bg-emerald-950/70 text-emerald-300 hover:border-rose-500/80 hover:bg-rose-950/70 hover:text-rose-300'
                      : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-emerald-500/80 hover:text-emerald-300'
                  }`}
                  title={metrics?.line2Enabled ? 'Station 2 Running • Click to Turn OFF' : 'Station 2 Stopped • Click to Turn ON'}
                >
                  <span className={`h-2 w-2 rounded-full ${metrics?.line2Enabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'}`} />
                  <span>Station 2: <strong>{metrics?.line2Enabled ? 'ON' : 'OFF'}</strong></span>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/95 px-3.5 py-2 text-xs font-bold text-slate-100 shadow-xl backdrop-blur-md transition hover:border-rose-500 hover:bg-rose-500/20 hover:text-rose-200 active:scale-95"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Reset
                </button>

                {/* Settings / Tuning Button */}
                <button
                  ref={hamburgerRef}
                  type="button"
                  onClick={() => setShowControls(!showControls)}
                  aria-label={showControls ? 'Close settings' : 'Open settings'}
                  aria-expanded={showControls}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-xl backdrop-blur-md transition ${
                    showControls
                      ? 'border-orange-500 bg-orange-500/30 text-orange-200'
                      : 'border-slate-700 bg-slate-950/95 text-slate-100 hover:border-slate-500 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Tuning
                </button>
              </>
            )}

            {/* Zen / Fullscreen UI Toggle */}
            <button
              type="button"
              onClick={() => {
                setHideUI(!hideUI);
                if (showControls) setShowControls(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 text-slate-300 shadow-lg backdrop-blur-md transition hover:border-slate-700 hover:text-white"
              aria-label={hideUI ? 'Show UI' : 'Hide UI'}
              title={hideUI ? 'Show UI' : 'Hide UI (Zen Mode)'}
            >
              {hideUI ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* ── Settings / Controls Slide-over Drawer ── */}
        {!hideUI && showControls && (
          <div
            ref={controlsRef}
            className="pointer-events-auto absolute right-4 top-16 z-40 max-h-[calc(100vh-5rem)] w-[380px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-2xl animate-fade-in"
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Line Parameters & Configuration
              </span>
              <button
                type="button"
                onClick={() => setShowControls(false)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close tuning"
              >
                ✕
              </button>
            </div>
            <ControlPanel
              metrics={metrics}
              isRunning={isRunning}
              onStart={start}
              onStop={stop}
              onReset={reset}
              onSpeedChange={setProductionSpeed}
              onDurationChange={setSimulationDuration}
              onLineConfigChange={setLineConfiguration}
              onModeChange={setProductionMode}
              onTogglePower={toggleStationPower}
              onToggleLinePower={toggleLinePower}
              onPowerAll={powerAllStations}
            />
          </div>
        )}

        {/* ── Left-Side Vertical Telemetry Stack (Lined Up On Left) ── */}
        {!hideUI && (
          <div
            className={`pointer-events-auto absolute top-24 left-3 z-20 flex items-center transition-transform duration-300 ease-in-out ${
              showMetrics ? 'translate-x-0' : '-translate-x-[calc(280px+0.75rem)]'
            }`}
          >
            <div className="w-[280px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-7.5rem)] overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-950/85 shadow-2xl backdrop-blur-xl">
              <MetricsDisplay metrics={metrics} />
            </div>

            {/* Toggle Handle / Tab on the right side of the panel (Vertically Centered & Highlighted when Hidden) */}
            <button
              type="button"
              onClick={() => setShowMetrics(!showMetrics)}
              className={`group flex items-center justify-center rounded-r-2xl transition-all duration-200 active:scale-95 ${
                showMetrics
                  ? 'h-16 w-8 border-y border-r border-slate-700/80 bg-slate-950/95 text-slate-300 shadow-xl backdrop-blur-md hover:border-slate-500 hover:bg-slate-900 hover:text-white'
                  : 'h-24 w-11 border-y-2 border-r-2 border-amber-300 bg-gradient-to-r from-orange-500 via-amber-500 to-amber-400 text-slate-950 shadow-2xl shadow-orange-500/50 ring-4 ring-orange-500/30 hover:brightness-110 hover:w-12 hover:shadow-orange-500/80'
              }`}
              aria-label={showMetrics ? 'Hide Live Stats' : 'Show Live Stats'}
              title={showMetrics ? 'Hide Live Stats' : 'Show Live Stats'}
            >
              {showMetrics ? (
                <svg
                  className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-950">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span className="text-[9px] font-black tracking-widest [writing-mode:vertical-lr] rotate-180">
                    STATS
                  </span>
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        )}

        {/* ── Camera station navigation dock — bottom-center ── */}
        {!hideUI && (
          <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex w-full max-w-3xl -translate-x-1/2 flex-col items-center gap-2 px-4">
            <div className="glass-panel flex flex-col items-center gap-2 p-2 px-3">
              {/* Primary Line / Mode Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    factory3DRef.current?.focusStation('overview' as any);
                    setActiveLine('overview');
                    setActiveStation('overview');
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    activeLine === 'overview'
                      ? 'border border-sky-500/80 bg-sky-500/20 text-sky-300 shadow-sm shadow-sky-500/20'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  Overview
                </button>

                <button
                  type="button"
                  onClick={() => {
                    factory3DRef.current?.focusStation('line1_filling' as any);
                    setActiveLine('line1');
                    setActiveStation('line1_filling');
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    activeLine === 'line1'
                      ? 'border border-orange-500/80 bg-orange-500/20 text-orange-300 shadow-sm shadow-orange-500/20'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${metrics?.line1Enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  Station 1 (Line 1)
                  {!metrics?.line1Enabled && <span className="text-[10px] text-rose-400 font-semibold">[OFF]</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    factory3DRef.current?.focusStation('line2_filling' as any);
                    setActiveLine('line2');
                    setActiveStation('line2_filling');
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    activeLine === 'line2'
                      ? 'border border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-sm shadow-amber-500/20'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${metrics?.line2Enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  Station 2 (Line 2)
                  {!metrics?.line2Enabled && <span className="text-[10px] text-rose-400 font-semibold">[OFF]</span>}
                </button>
              </div>

              {/* Station Ribbon (Smooth expansion when Line 1 or Line 2 is active) */}
              <div
                className={`flex w-full flex-wrap justify-center gap-1 overflow-hidden transition-all duration-300 ease-in-out ${
                  activeLine !== 'overview' ? 'max-h-16 opacity-100 pt-1 border-t border-slate-800/60' : 'max-h-0 opacity-0'
                }`}
              >
                {cameraStations
                  .filter((station) => station.id.startsWith(activeLine))
                  .map((station) => {
                    const stationKey = station.id.includes('mixing')
                      ? 'mixing'
                      : station.id.includes('carbonation')
                      ? 'carbonation'
                      : station.id.includes('filling')
                      ? 'filling'
                      : station.id.includes('seaming')
                      ? 'capping'
                      : station.id.includes('packing')
                      ? 'packing'
                      : null;
                    const isOffline = stationKey && metrics?.stationStates[stationKey]?.isEnabled === false;

                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => {
                          factory3DRef.current?.focusStation(station.id as any);
                          setActiveStation(station.id);
                        }}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition transform hover:scale-105 ${
                          activeStation === station.id
                            ? 'border border-orange-500/80 bg-orange-500/30 text-orange-200 font-bold'
                            : isOffline
                            ? 'border border-slate-800 bg-slate-950/80 text-slate-500 opacity-60'
                            : 'border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isOffline ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" title="Station is Offline" />
                        ) : stationKey ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                        ) : null}
                        <span>{station.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* High-contrast camera navigation guide badge */}
            <div className="pointer-events-none flex items-center gap-2 rounded-full border border-slate-700/90 bg-slate-950/95 px-4 py-1.5 shadow-2xl backdrop-blur-md">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-100">
                <span className="text-orange-400">❖</span> Drag to orbit
              </span>
              <span className="text-slate-600 font-black">•</span>
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-100">
                <span className="text-sky-400">✥</span> Right-click to pan
              </span>
              <span className="text-slate-600 font-black">•</span>
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-100">
                <span className="text-emerald-400">↕</span> Scroll to zoom
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Station table + report — below 3D view (scroll down to view) ── */}
      {!hideUI && (
        <div className="relative z-10 px-4 py-8 max-w-7xl mx-auto flex flex-col gap-8">
          <StationStatusTable
            metrics={metrics}
            onTogglePower={toggleStationPower}
            onToggleLinePower={toggleLinePower}
            onPowerAll={powerAllStations}
          />

          {reportHistory.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Simulation Run History
              </h2>
              <div className="flex flex-col gap-6">
                {/* Latest run fully expanded */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Latest Completed Run • {reportHistory[0].timestamp}
                  </div>
                  <SimulationReport report={reportHistory[0]} />
                </div>

                {/* Past runs archive */}
                {reportHistory.length > 1 && (
                  <div className="glass-panel flex flex-col gap-3 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Archived Run Records ({reportHistory.length - 1})
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                      {reportHistory.slice(1).map((historyReport) => (
                        <div
                          key={historyReport.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 transition hover:border-slate-700 hover:bg-slate-900/80"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-200">{historyReport.timestamp}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              OEE: <strong className="font-mono text-emerald-400">{historyReport.oeePercent.toFixed(1)}%</strong> • Output: {historyReport.packedCans} cans • Rejects: {historyReport.rejectedCans}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedReportId(historyReport.id)}
                            className="btn-secondary py-1 px-3 text-[11px]"
                          >
                            View Audit
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Report Audit Modal ── */}
      {selectedReportId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedReportId(null)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Close report"
            >
              ✕
            </button>
            <div className="mb-4">
              <span className="rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                AUDIT LOG
              </span>
              <h2 className="mt-2 text-xl font-black text-white">
                {selectedReportId === reportHistory[0]?.id ? 'Simulation Run Complete' : 'Archived Run Audit'}
              </h2>
            </div>
            <SimulationReport report={reportHistory.find(r => r.id === selectedReportId) || reportHistory[0]} />
          </div>
        </div>
      )}

      {/* ── Landing Page Intro Overlay ── */}
      {showLanding && (
        <LandingPage
          onEnterStart={handleEnterStart}
          onEnter={handleEnterSimulation}
        />
      )}
    </div>
  );
}
