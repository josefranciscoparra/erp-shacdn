"use client";

import { create } from "zustand";
import {
  clockIn as clockInAction,
  clockOut as clockOutAction,
  startBreak as startBreakAction,
  endBreak as endBreakAction,
  getTodaySummary as getTodaySummaryAction,
  getWeeklySummary as getWeeklySummaryAction,
  getMonthlySummaries as getMonthlySummariesAction,
} from "@/server/actions/time-tracking";

// Tipos para el store
export type ClockStatus = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";

export interface TimeEntry {
  id: string;
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
  timestamp: Date;
  location?: string;
  notes?: string;
}

export interface WorkdaySummary {
  id: string;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
  timeEntries: TimeEntry[];
}

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  days: WorkdaySummary[];
}

interface TimeTrackingState {
  // Estado actual
  currentStatus: ClockStatus;
  todaySummary: WorkdaySummary | null;
  weeklySummary: WeeklySummary | null;
  monthlySummaries: WorkdaySummary[];

  // Loading states
  isLoading: boolean;
  isClocking: boolean;

  // Error
  error: string | null;

  // Acciones
  setCurrentStatus: (status: ClockStatus) => void;
  setTodaySummary: (summary: WorkdaySummary | null) => void;
  setWeeklySummary: (summary: WeeklySummary | null) => void;
  setMonthlySummaries: (summaries: WorkdaySummary[]) => void;
  setLoading: (loading: boolean) => void;
  setClocking: (clocking: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones de fichaje (se conectarán a server actions)
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;

  // Acciones de datos
  loadTodaySummary: () => Promise<void>;
  loadWeeklySummary: () => Promise<void>;
  loadMonthlySummaries: (year: number, month: number) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  currentStatus: "CLOCKED_OUT" as ClockStatus,
  todaySummary: null,
  weeklySummary: null,
  monthlySummaries: [],
  isLoading: false,
  isClocking: false,
  error: null,
};

export const useTimeTrackingStore = create<TimeTrackingState>((set, get) => ({
  ...initialState,

  // Setters
  setCurrentStatus: (status) => set({ currentStatus: status }),
  setTodaySummary: (summary) => set({ todaySummary: summary }),
  setWeeklySummary: (summary) => set({ weeklySummary: summary }),
  setMonthlySummaries: (summaries) => set({ monthlySummaries: summaries }),
  setLoading: (loading) => set({ isLoading: loading }),
  setClocking: (clocking) => set({ isClocking: clocking }),
  setError: (error) => set({ error }),

  // Acciones de fichaje
  clockIn: async () => {
    set({ isClocking: true, error: null });
    try {
      await clockInAction();

      set({
        currentStatus: "CLOCKED_IN",
        isClocking: false
      });

      // Recargar resumen del día
      await get().loadTodaySummary();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al fichar entrada",
        isClocking: false
      });
    }
  },

  clockOut: async () => {
    set({ isClocking: true, error: null });
    try {
      await clockOutAction();

      set({
        currentStatus: "CLOCKED_OUT",
        isClocking: false
      });

      // Recargar resumen del día
      await get().loadTodaySummary();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al fichar salida",
        isClocking: false
      });
    }
  },

  startBreak: async () => {
    set({ isClocking: true, error: null });
    try {
      await startBreakAction();

      set({
        currentStatus: "ON_BREAK",
        isClocking: false
      });

      // Recargar resumen del día
      await get().loadTodaySummary();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al iniciar descanso",
        isClocking: false
      });
    }
  },

  endBreak: async () => {
    set({ isClocking: true, error: null });
    try {
      await endBreakAction();

      set({
        currentStatus: "CLOCKED_IN",
        isClocking: false
      });

      // Recargar resumen del día
      await get().loadTodaySummary();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al finalizar descanso",
        isClocking: false
      });
    }
  },

  // Carga de datos
  loadTodaySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getTodaySummaryAction();

      set({
        todaySummary: summary as any,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar resumen del día",
        isLoading: false
      });
    }
  },

  loadWeeklySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getWeeklySummaryAction();

      set({
        weeklySummary: summary as any,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar resumen semanal",
        isLoading: false
      });
    }
  },

  loadMonthlySummaries: async (year: number, month: number) => {
    set({ isLoading: true, error: null });
    try {
      const summaries = await getMonthlySummariesAction(year, month);

      set({
        monthlySummaries: summaries as any,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar resumen mensual",
        isLoading: false
      });
    }
  },

  // Reset
  reset: () => set(initialState),
}));
