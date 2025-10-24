"use client";

import { create } from "zustand";

import {
  getManualTimeEntryRequestsToApprove,
  approveManualTimeEntryRequest,
  rejectManualTimeEntryRequest,
} from "@/server/actions/approver-manual-time-entry";

export interface ManualTimeEntryRequestToApprove {
  id: string;
  date: Date;
  clockInTime: Date;
  clockOutTime: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approverComments?: string;
  rejectionReason?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string;
    employeeNumber?: string;
  };
}

interface ApproverManualTimeEntryState {
  // Estado
  requests: ManualTimeEntryRequestToApprove[];
  totals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  isLoading: boolean;
  error: string | null;

  // Acciones
  loadRequests: (status?: "PENDING" | "APPROVED" | "REJECTED") => Promise<void>;
  approveRequest: (requestId: string, comments?: string) => Promise<void>;
  rejectRequest: (requestId: string, rejectionReason: string) => Promise<void>;
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

export const useApproverManualTimeEntryStore = create<ApproverManualTimeEntryState>((set, get) => ({
  ...initialState,

  loadRequests: async (status = "PENDING") => {
    set({ isLoading: true, error: null });
    try {
      const result = await getManualTimeEntryRequestsToApprove(status);

      set({
        requests: result.requests as ManualTimeEntryRequestToApprove[],
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

  approveRequest: async (requestId, comments) => {
    set({ isLoading: true, error: null });
    try {
      await approveManualTimeEntryRequest({ requestId, comments });

      // Recargar la lista
      await get().loadRequests("PENDING");

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al aprobar solicitud",
        isLoading: false,
      });
      throw error;
    }
  },

  rejectRequest: async (requestId, rejectionReason) => {
    set({ isLoading: true, error: null });
    try {
      await rejectManualTimeEntryRequest({ requestId, rejectionReason });

      // Recargar la lista
      await get().loadRequests("PENDING");

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al rechazar solicitud",
        isLoading: false,
      });
      throw error;
    }
  },

  reset: () => set(initialState),
}));
