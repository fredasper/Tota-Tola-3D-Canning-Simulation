/**
 * Simulation Store (Zustand)
 * Centralized state management for the factory simulation
 */

import { create } from 'zustand';
import {
  FactoryMetrics,
  ProductionMode,
} from '@/types/simulation';

interface SimulationStore {
  // State
  isRunning: boolean;
  metrics: FactoryMetrics | null;
  productionMode: ProductionMode;
  productionSpeed: number;
  cansPerBatch: number;
  simDuration: number;

  // Actions
  startSimulation: () => void;
  stopSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  updateMetrics: (metrics: Partial<FactoryMetrics>) => void;
  setProductionMode: (mode: ProductionMode) => void;
  setProductionSpeed: (speed: number) => void;
  setCansPerBatch: (cans: number) => void;
  setSimDuration: (duration: number) => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  isRunning: false,
  metrics: null,
  productionMode: 'standard',
  productionSpeed: 1.0,
  cansPerBatch: 50,
  simDuration: 60,

  startSimulation: () => set({ isRunning: true }),
  stopSimulation: () => set({ isRunning: false }),
  pauseSimulation: () => set({ isRunning: false }),
  resetSimulation: () =>
    set({
      isRunning: false,
      metrics: null,
      productionSpeed: 1.0,
      cansPerBatch: 50,
      simDuration: 60,
    }),
  updateMetrics: (newMetrics) =>
    set((state) => ({
      metrics: state.metrics ? { ...state.metrics, ...newMetrics } : (newMetrics as FactoryMetrics),
    })),
  setProductionMode: (mode) => set({ productionMode: mode }),
  setProductionSpeed: (speed) => set({ productionSpeed: speed }),
  setCansPerBatch: (cans) => set({ cansPerBatch: cans }),
  setSimDuration: (duration) => set({ simDuration: duration }),
}));
