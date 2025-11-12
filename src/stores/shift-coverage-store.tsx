"use client";

import { create } from "zustand";

import {
  getCoverageAnalysis,
  getCoverageStats,
  getCoverageHeatmap,
  getUnderstaffedShifts,
  type WeekCoverageAnalysis,
  type CoverageStats,
} from "@/server/actions/shift-coverage";

interface CoverageFilters {
  costCenterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface ShiftCoverageState {
  // Estado
  weekAnalysis: WeekCoverageAnalysis | null;
  stats: CoverageStats | null;
  heatmap: {
    days: string[];
    hours: string[];
    data: number[][];
  } | null;
  understaffedShifts: any[]; // TODO: tipar correctamente
  isLoading: boolean;
  error: string | null;
  filters: CoverageFilters;

  // Acciones sincrónicas
  setFilters: (filters: CoverageFilters) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones asincrónicas
  fetchWeekAnalysis: (weekStart: Date, costCenterId?: string) => Promise<void>;
  fetchStats: (dateFrom?: Date, dateTo?: Date, costCenterId?: string) => Promise<void>;
  fetchHeatmap: (weekStart: Date, costCenterId?: string) => Promise<void>;
  fetchUnderstaffedShifts: (dateFrom: Date, dateTo: Date, costCenterId?: string) => Promise<void>;
}

export const useShiftCoverageStore = create<ShiftCoverageState>((set) => ({
  // Estado inicial
  weekAnalysis: null,
  stats: null,
  heatmap: null,
  understaffedShifts: [],
  isLoading: false,
  error: null,
  filters: {},

  // Acciones sincrónicas
  setFilters: (filters) => set({ filters }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Acciones asincrónicas
  fetchWeekAnalysis: async (weekStart, costCenterId) => {
    set({ isLoading: true, error: null });
    try {
      // Calcular fin de semana (domingo)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const analysis = await getCoverageAnalysis(weekStart, weekEnd, costCenterId);
      set({ weekAnalysis: analysis, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar análisis de cobertura";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchStats: async (dateFrom, dateTo, costCenterId) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await getCoverageStats(dateFrom, dateTo, costCenterId);
      set({ stats, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar estadísticas de cobertura";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchHeatmap: async (weekStart, costCenterId) => {
    set({ isLoading: true, error: null });
    try {
      const heatmap = await getCoverageHeatmap(weekStart, costCenterId);
      set({ heatmap, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar heatmap de cobertura";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchUnderstaffedShifts: async (dateFrom, dateTo, costCenterId) => {
    set({ isLoading: true, error: null });
    try {
      const shifts = await getUnderstaffedShifts(dateFrom, dateTo, costCenterId);
      set({ understaffedShifts: shifts, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar turnos con déficit";
      set({ error: errorMessage, isLoading: false });
    }
  },
}));
