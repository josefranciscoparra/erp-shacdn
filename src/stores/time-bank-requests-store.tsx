"use client";

import { create } from "zustand";

import {
  getMyTimeBankRequests,
  createTimeBankRequest as createTimeBankRequestAction,
  cancelTimeBankRequest as cancelTimeBankRequestAction,
  type TimeBankRequestListResult,
} from "@/server/actions/time-bank";

import type { TimeBankRequest, TimeBankRequestStatus, TimeBankRequestType } from "@prisma/client";

interface TimeBankRequestState {
  requests: TimeBankRequest[];
  totals: TimeBankRequestListResult["totals"];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  loadRequests: (status?: TimeBankRequestStatus) => Promise<void>;
  createRequest: (input: { type: TimeBankRequestType; date: Date; minutes: number; reason?: string }) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  reset: () => void;
}

const initialTotals = {
  pending: 0,
  approved: 0,
  rejected: 0,
  cancelled: 0,
};

const initialState: Pick<TimeBankRequestState, "requests" | "totals" | "isLoading" | "isSubmitting" | "error"> = {
  requests: [],
  totals: initialTotals,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const useTimeBankRequestsStore = create<TimeBankRequestState>((set, get) => ({
  ...initialState,
  loadRequests: async (status) => {
    set({ isLoading: true, error: null });
    try {
      const result = await getMyTimeBankRequests(status);
      set({
        requests: result.requests,
        totals: result.totals,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar solicitudes",
        isLoading: false,
      });
    }
  },
  createRequest: async (input) => {
    set({ isSubmitting: true, error: null });
    try {
      await createTimeBankRequestAction(input);
      await get().loadRequests("PENDING");
      set({ isSubmitting: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al crear solicitud",
        isSubmitting: false,
      });
      throw error;
    }
  },
  cancelRequest: async (requestId) => {
    set({ isSubmitting: true, error: null });
    try {
      await cancelTimeBankRequestAction(requestId);
      await get().loadRequests("PENDING");
      set({ isSubmitting: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cancelar solicitud",
        isSubmitting: false,
      });
      throw error;
    }
  },
  reset: () => set(initialState),
}));
