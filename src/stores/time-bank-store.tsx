"use client";

import { create } from "zustand";

import { getMyTimeBankSummary, type TimeBankSummaryResponse } from "@/server/actions/time-bank";

interface TimeBankState {
  summary: TimeBankSummaryResponse | null;
  isLoading: boolean;
  error: string | null;
  loadSummary: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const initialState: Pick<TimeBankState, "summary" | "isLoading" | "error"> = {
  summary: null,
  isLoading: false,
  error: null,
};

export const useTimeBankStore = create<TimeBankState>((set, get) => ({
  ...initialState,
  loadSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getMyTimeBankSummary();
      set({ summary, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar la bolsa de horas",
        isLoading: false,
      });
    }
  },
  refresh: async () => {
    await get().loadSummary();
  },
  reset: () => set(initialState),
}));
