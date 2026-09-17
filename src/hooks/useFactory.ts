/**
 * useFactory Hook
 * Custom React hook for managing factory simulation
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Factory } from '@/lib/Factory';
import {
  FactoryMetrics,
  LineId,
  LineConfigurationUpdate,
  ProductionMode,
  StationKey,
} from '@/types/simulation';

export function useFactory() {
  const factoryRef = useRef<Factory | null>(null);
  if (factoryRef.current === null) {
    factoryRef.current = new Factory();
  }

  const [metrics, setMetrics] = useState<FactoryMetrics>(() => factoryRef.current!.getMetrics());
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const lastMetricsUpdateRef = useRef<number>(0);

  const refreshMetrics = useCallback(() => {
    if (factoryRef.current) {
      setMetrics(factoryRef.current.getMetrics());
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Main simulation loop
  useEffect(() => {
    const animate = () => {
      if (!factoryRef.current) return;

      const now = Date.now();
      const deltaTime = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      factoryRef.current.update(deltaTime);
      if (now - lastMetricsUpdateRef.current >= 100) {
        refreshMetrics();
        lastMetricsUpdateRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [refreshMetrics]);

  const start = () => {
    factoryRef.current?.start();
    refreshMetrics();
  };

  const stop = () => {
    factoryRef.current?.stop();
    refreshMetrics();
  };

  const reset = () => {
    factoryRef.current?.reset();
    lastFrameTimeRef.current = Date.now();
    refreshMetrics();
  };

  const setProductionSpeed = (speed: number) => {
    factoryRef.current?.setProductionSpeed(speed);
    refreshMetrics();
  };

  const setCansPerBatch = (cans: number) => {
    factoryRef.current?.setCansPerBatch(cans);
    refreshMetrics();
  };

  const setSimulationDuration = (duration: number | null) => {
    factoryRef.current?.setSimulationDuration(duration);
    refreshMetrics();
  };

  const setLineConfiguration = (update: LineConfigurationUpdate) => {
    factoryRef.current?.setLineConfiguration(update);
    refreshMetrics();
  };

  const setOverloadRatio = (ratio: number) => {
    factoryRef.current?.setOverloadRatio(ratio);
    refreshMetrics();
  };

  const toggleStationPower = (lineOrKey: LineId | StationKey, maybeKey?: StationKey) => {
    factoryRef.current?.toggleStationPower(lineOrKey, maybeKey);
    refreshMetrics();
  };

  const setStationPower = (
    lineOrKey: LineId | StationKey,
    keyOrEnabled: StationKey | boolean,
    maybeEnabled?: boolean
  ) => {
    factoryRef.current?.setStationPower(lineOrKey, keyOrEnabled, maybeEnabled);
    refreshMetrics();
  };

  const toggleLinePower = (line: LineId, enabled?: boolean) => {
    factoryRef.current?.toggleLinePower(line, enabled);
    refreshMetrics();
  };

  const powerAllStations = (enabled: boolean, line?: LineId) => {
    factoryRef.current?.powerAllStations(enabled, line);
    refreshMetrics();
  };

  const toggleStationJam = (stationKey: StationKey, line?: LineId) => {
    factoryRef.current?.toggleStationJam(stationKey, line);
    refreshMetrics();
  };

  const clearAllJams = (line?: LineId) => {
    factoryRef.current?.clearAllJams(line);
    refreshMetrics();
  };

  const setProductionMode = (mode: ProductionMode) => {
    factoryRef.current?.setProductionMode(mode);
    refreshMetrics();
  };

  return {
    factory: factoryRef.current,
    metrics,
    isRunning: metrics?.isRunning || false,
    start,
    stop,
    reset,
    setProductionSpeed,
    setCansPerBatch,
    setSimulationDuration,
    setLineConfiguration,
    setOverloadRatio,
    toggleStationPower,
    setStationPower,
    toggleLinePower,
    powerAllStations,
    toggleStationJam,
    clearAllJams,
    setProductionMode,
  };
}
