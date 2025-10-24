"use client";

import { create } from "zustand";

import { getMonthlyCalendarData, type MonthlyCalendarData } from "@/server/actions/time-calendar";

interface TimeCalendarState {
  monthlyData: MonthlyCalendarData | null;
  selectedMonth: number; // 1-12
  selectedYear: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedMonth: (month: number, year: number) => void;
  loadMonthlyData: (year: number, month: number) => Promise<void>;
  reset: () => void;
}

const initialState = {
  monthlyData: null,
  selectedMonth: new Date().getMonth() + 1, // Mes actual (1-12)
  selectedYear: new Date().getFullYear(),
  isLoading: false,
  error: null,
};

export const useTimeCalendarStore = create<TimeCalendarState>((set, get) => ({
  ...initialState,

  setSelectedMonth: (month, year) => {
    set({ selectedMonth: month, selectedYear: year });
    // Cargar datos del nuevo mes
    get().loadMonthlyData(year, month);
  },

  loadMonthlyData: async (year, month) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getMonthlyCalendarData(year, month);
      set({
        monthlyData: data,
        selectedMonth: month,
        selectedYear: year,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar datos del calendario",
        isLoading: false,
      });
    }
  },

  reset: () => set(initialState),
}));
