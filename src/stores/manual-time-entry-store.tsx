"use client";

import { create } from "zustand";

import {
  createManualTimeEntryRequest,
  getMyManualTimeEntryRequests,
  cancelManualTimeEntryRequest,
} from "@/server/actions/manual-time-entry";

export interface ManualTimeEntryRequest {
  id: string;
  date: Date;
  clockInTime: Date;
  clockOutTime: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approverName?: string;
  approverComments?: string;
  rejectionReason?: string;
}

interface ManualTimeEntryState {
  // Estado
  requests: ManualTimeEntryRequest[];
  totals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  isLoading: boolean;
  error: string | null;

  // Acciones
  loadRequests: (status?: "PENDING" | "APPROVED" | "REJECTED") => Promise<void>;
  createRequest: (input: {
    dateKey: string;
    reason: string;
    slots: Array<{ startMinutes: number; endMinutes: number; slotType: "WORK" | "BREAK"; order?: number }>;
    timezoneOffsetMinutes: number;
  }) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  requests: [],
  totals: {
    pending: 0,
    approved: 0,
    rejected: 0,
  },
  isLoading: false,
  error: null,
};

export const useManualTimeEntryStore = create<ManualTimeEntryState>((set, get) => ({
  ...initialState,

  loadRequests: async (status) => {
    set({ isLoading: true, error: null });
    try {
      const result = await getMyManualTimeEntryRequests(status);

      set({
        requests: result.requests as ManualTimeEntryRequest[],
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
    set({ isLoading: true, error: null });
    try {
      const slotsJson = JSON.stringify(input.slots);
      await createManualTimeEntryRequest(
        input.dateKey,
        input.reason,
        slotsJson,
        null,
        null,
        input.timezoneOffsetMinutes,
      );

      // Recargar la lista
      await get().loadRequests();

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al crear solicitud",
        isLoading: false,
      });
      throw error; // Re-lanzar para que el componente pueda manejarlo
    }
  },

  cancelRequest: async (requestId) => {
    set({ isLoading: true, error: null });
    try {
      await cancelManualTimeEntryRequest(requestId);

      // Recargar la lista
      await get().loadRequests();

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cancelar solicitud",
        isLoading: false,
      });
      throw error;
    }
  },

  reset: () => set(initialState),
}));
