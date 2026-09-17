'use client';

import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
  onEnterStart?: () => void;
}

export function LandingPage({ onEnter, onEnterStart }: LandingPageProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitor fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Lock body scroll and keep window at top while on landing page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleEnterClick = () => {
    if (isExiting) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    onEnterStart?.();
    setIsExiting(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      onEnter();
    }, 650);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-slate-950 text-slate-100 font-sans transition-opacity duration-700 ${
        isExiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* ── Background Factory Image & Cinematic Dark Gradients ── */}
      <div className="fixed inset-0 z-0">
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/factory-hero.jpg`}
          alt="Canning Plant Interior"
          className={`h-full w-full object-cover object-center scale-105 transition-all duration-700 ${
            isExiting ? 'scale-110 blur-sm opacity-0' : 'opacity-100'
          }`}
        />
        {/* Cinematic dark atmospheric overlays */}
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/85" />
      </div>

      {/* ── Top Header Bar ── */}
      <header className="relative z-10 flex w-full items-center justify-end px-6 py-5 sm:px-10">
        {/* F11 Fullscreen Action Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 shadow-lg backdrop-blur-md transition hover:border-orange-500 hover:text-white active:scale-95"
          title="Toggle Fullscreen (F11)"
          aria-label="Toggle Fullscreen (F11)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isFullscreen ? (
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            ) : (
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            )}
          </svg>
          <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-orange-400 border border-slate-700">
            F11
          </span>
        </button>
      </header>

      {/* ── Centered Hero Content ── */}
      <main
        className={`relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto w-full transition-all duration-700 ease-out ${
          isExiting ? 'scale-105 opacity-0 blur-md -translate-y-2' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Centered Brand Emblem */}
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 font-black text-slate-950 shadow-2xl shadow-orange-500/40 ring-2 ring-orange-400/50 mb-3">
          <span className="text-2xl sm:text-3xl font-black tracking-tight">TT</span>
        </div>

        {/* Presentable Plant Title with Elegant Gradient Hairlines */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
          <span className="h-[2px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-orange-500" />
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-[0.25em] text-orange-400 drop-shadow-md">
            TOTA TOLA CANNING PLANT
          </h2>
          <span className="h-[2px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-orange-500" />
        </div>

        {/* Grand Headline (White + Vibrant Amber/Orange Gradient) */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white drop-shadow-2xl uppercase">
          Simulate Real-World <br />
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg">
            Production Line Flow
          </span>
        </h1>

        {/* Clean, Direct Description */}
        <p className="mt-6 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed text-slate-300 drop-shadow">
          Explore the 3D canning plant and watch the automated production lines in action.
          Control the machines, monitor live stats, and test line speeds in real time.
        </p>

        {/* Buttons Row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleEnterClick}
            disabled={isExiting}
            className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-8 py-3.5 text-sm sm:text-base font-black text-white shadow-xl shadow-blue-500/30 ring-2 ring-blue-400/40 transition-all hover:scale-105 hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <span className="text-xs">▶</span>
            <span>{isExiting ? 'ENTERING SIMULATION...' : 'ENTER SIMULATION'}</span>
          </button>

          {/* Quick Camera Navigation Capsule */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-xs text-slate-300 backdrop-blur-md">
            <span className="text-amber-400">❖</span>
            <span>Left-click orbit • Right-click pan • Scroll zoom</span>
          </div>
        </div>
      </main>

      {/* ── Bottom Footer Strip ── */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] text-slate-500 border-t border-slate-800/80 sm:px-10">
        <div>
          Powered by <span className="text-slate-400">Three.js</span> &amp; <span className="text-slate-400">Next.js 15 App Router</span>
        </div>
        <div className="flex items-center gap-3">
          <span>WebGL 2.0 Enabled</span>
          <span className="text-slate-700">•</span>
          <span>Dual 330 mL Canning Lines</span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400">Press F11 for Fullscreen</span>
        </div>
      </footer>
    </div>
  );
}
