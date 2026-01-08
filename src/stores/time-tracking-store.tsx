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
  getCurrentStatus as getCurrentStatusAction,
  getExpectedHoursForToday as getExpectedHoursForTodayAction,
} from "@/server/actions/time-tracking";

// Tipos para el store
export type ClockStatus = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface TimeEntry {
  id: string;
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | "PROJECT_SWITCH";
  timestamp: Date;
  location?: string;
  notes?: string;
  // Datos de geolocalización
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  isWithinAllowedArea?: boolean;
  distanceFromCenter?: number;
  requiresReview?: boolean;
  // Proyecto asociado (Mejora 4)
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    code: string | null;
    color: string | null;
  } | null;
  task?: string | null;
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

type ClockActionResponse = {
  success: boolean;
  error?: string;
  [key: string]: unknown;
};

let initialLoadPromise: Promise<void> | null = null;

interface TimeTrackingState {
  // Estado actual
  currentStatus: ClockStatus;
  todaySummary: WorkdaySummary | null;
  weeklySummary: WeeklySummary | null;
  monthlySummaries: WorkdaySummary[];

  // Contador en vivo
  liveWorkedMinutes: number;

  // Info del contrato
  expectedDailyHours: number;
  hasActiveContract: boolean;
  isWorkingDay: boolean; // Si hoy es día laborable según contrato

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
  setLiveWorkedMinutes: (minutes: number) => void;
  hydrateFromBootstrap: (payload: {
    currentStatus: ClockStatus;
    todaySummary: WorkdaySummary | null;
    expectedDailyHours: number;
    hasActiveContract: boolean;
    isWorkingDay: boolean;
  }) => void;

  // Acciones de fichaje (se conectarán a server actions)
  clockIn: (
    latitude?: number,
    longitude?: number,
    accuracy?: number,
    projectId?: string,
    task?: string,
  ) => Promise<ClockActionResponse>;
  clockOut: (latitude?: number, longitude?: number, accuracy?: number) => Promise<ClockActionResponse>;
  startBreak: (latitude?: number, longitude?: number, accuracy?: number) => Promise<ClockActionResponse>;
  endBreak: (latitude?: number, longitude?: number, accuracy?: number) => Promise<ClockActionResponse>;

  // Acciones de datos
  loadCurrentStatus: () => Promise<void>;
  loadExpectedDailyHours: () => Promise<void>;
  loadTodaySummary: () => Promise<void>;
  loadWeeklySummary: () => Promise<void>;
  loadMonthlySummaries: (year: number, month: number) => Promise<void>;
  loadInitialData: () => Promise<void>;

  // Reset
  reset: () => void;
  resetStore: () => void;
}

const initialState = {
  currentStatus: "CLOCKED_OUT" as ClockStatus,
  todaySummary: null,
  weeklySummary: null,
  monthlySummaries: [],
  liveWorkedMinutes: 0,
  expectedDailyHours: 8,
  hasActiveContract: true,
  isWorkingDay: true, // Por defecto asumimos que hoy es día laborable
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
  setLiveWorkedMinutes: (minutes) => set({ liveWorkedMinutes: minutes }),
  hydrateFromBootstrap: (payload) =>
    set({
      currentStatus: payload.currentStatus,
      todaySummary: payload.todaySummary,
      liveWorkedMinutes: payload.todaySummary?.totalWorkedMinutes ?? 0,
      expectedDailyHours: payload.expectedDailyHours,
      hasActiveContract: payload.hasActiveContract,
      isWorkingDay: payload.isWorkingDay,
      isLoading: false,
      error: null,
    }),

  // Acciones de fichaje
  clockIn: async (latitude?, longitude?, accuracy?, projectId?, task?) => {
    set({ isClocking: true, error: null });
    try {
      const result = (await clockInAction(latitude, longitude, accuracy, projectId, task)) as ClockActionResponse;

      if (result.success === false) {
        set({
          isClocking: false,
        });
        return result;
      }

      set({
        currentStatus: "CLOCKED_IN",
        isClocking: false,
      });

      // Recargar resumen del día
      await get().loadTodaySummary();

      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al fichar entrada",
        isClocking: false,
      });
      return { success: false, error: "Error al fichar entrada" };
    }
  },

  clockOut: async (latitude?, longitude?, accuracy?) => {
    set({ isClocking: true, error: null });
    try {
      const result = (await clockOutAction(latitude, longitude, accuracy)) as ClockActionResponse;

      if (result.success === false) {
        set({
          isClocking: false,
        });
        return result;
      }

      set({
        currentStatus: "CLOCKED_OUT",
        isClocking: false,
      });

      // Recargar resumen del día
      await get().loadTodaySummary();
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al fichar salida",
        isClocking: false,
      });
      return { success: false, error: "Error al fichar salida" };
    }
  },

  startBreak: async (latitude?, longitude?, accuracy?) => {
    set({ isClocking: true, error: null });
    try {
      const result = (await startBreakAction(latitude, longitude, accuracy)) as ClockActionResponse;

      if (result.success === false) {
        set({
          isClocking: false,
        });
        return result;
      }

      set({
        currentStatus: "ON_BREAK",
        isClocking: false,
      });

      // Recargar resumen del día
      await get().loadTodaySummary();
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al iniciar descanso",
        isClocking: false,
      });
      return { success: false, error: "Error al iniciar descanso" };
    }
  },

  endBreak: async (latitude?, longitude?, accuracy?) => {
    set({ isClocking: true, error: null });
    try {
      const result = (await endBreakAction(latitude, longitude, accuracy)) as ClockActionResponse;

      if (result.success === false) {
        set({
          isClocking: false,
        });
        return result;
      }

      set({
        currentStatus: "CLOCKED_IN",
        isClocking: false,
      });

      // Recargar resumen del día
      await get().loadTodaySummary();
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al finalizar descanso",
        isClocking: false,
      });
      return { success: false, error: "Error al finalizar descanso" };
    }
  },

  // Carga de datos
  loadCurrentStatus: async () => {
    try {
      const status = await getCurrentStatusAction();
      // Si no hay empleado asociado, status será null
      if (status === null) {
        set({ currentStatus: "CLOCKED_OUT" });
        return;
      }
      set({ currentStatus: status.status });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar estado actual",
      });
    }
  },

  loadExpectedDailyHours: async () => {
    try {
      const hoursInfo = await getExpectedHoursForTodayAction();
      set({
        expectedDailyHours: hoursInfo.hoursToday,
        hasActiveContract: hoursInfo.hasActiveContract,
        isWorkingDay: hoursInfo.isWorkingDay,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar horas esperadas",
      });
    }
  },

  loadTodaySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getTodaySummaryAction();

      set({
        todaySummary: summary as any,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar resumen del día",
        isLoading: false,
      });
    }
  },

  loadWeeklySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getWeeklySummaryAction();

      set({
        weeklySummary: summary as any,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar resumen semanal",
        isLoading: false,
      });
    }
  },

  loadMonthlySummaries: async (year: number, month: number) => {
    set({ isLoading: true, error: null });
    try {
      const summaries = await getMonthlySummariesAction(year, month);

      set({
        monthlySummaries: summaries as any,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar resumen mensual",
        isLoading: false,
      });
    }
  },

  loadInitialData: async () => {
    const state = get();

    // Si ya hay datos cargados, no volver a cargar (evita flash al cambiar de página)
    if (state.todaySummary !== null) {
      return;
    }

    if (initialLoadPromise) {
      return initialLoadPromise;
    }

    initialLoadPromise = (async () => {
      set({ isLoading: true, error: null });
      try {
        const startTime = Date.now();

        const [status, summary, hoursInfo] = await Promise.all([
          getCurrentStatusAction(),
          getTodaySummaryAction(),
          getExpectedHoursForTodayAction(),
        ]);

        // Duración mínima de 400ms para que se vea la animación
        const elapsed = Date.now() - startTime;
        const minimumLoadTime = 400;
        if (elapsed < minimumLoadTime) {
          await new Promise((resolve) => setTimeout(resolve, minimumLoadTime - elapsed));
        }

        // Inicializar liveWorkedMinutes con los minutos trabajados actuales
        const initialMinutes = summary?.totalWorkedMinutes ?? 0;

        set({
          currentStatus: status?.status ?? "CLOCKED_OUT",
          todaySummary: summary as any,
          liveWorkedMinutes: initialMinutes,
          expectedDailyHours: hoursInfo.hoursToday,
          hasActiveContract: hoursInfo.hasActiveContract,
          isWorkingDay: hoursInfo.isWorkingDay,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        set({
          error: error instanceof Error ? error.message : "Error al cargar datos",
          isLoading: false,
          // Establecer un summary vacío para evitar skeleton infinito
          todaySummary: {
            id: "error",
            date: new Date(),
            totalWorkedMinutes: 0,
            totalBreakMinutes: 0,
            status: "ABSENT" as const,
            timeEntries: [],
          } as any,
        });
      } finally {
        initialLoadPromise = null;
      }
    })();

    return initialLoadPromise;
  },

  // Reset
  reset: () => set(initialState),
  resetStore: () => set(initialState),
}));
