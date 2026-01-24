"use client";

import { create } from "zustand";

import {
  getOnCallInterventionsToApprove,
  approveOnCallIntervention,
  rejectOnCallIntervention,
} from "@/server/actions/approver-on-call";

export interface OnCallInterventionToApprove {
  id: string;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requiresApproval: boolean;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  approverComments?: string | null;
  rejectionReason?: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string | null;
    employeeNumber?: string | null;
  };
}

interface ApproverOnCallState {
  requests: OnCallInterventionToApprove[];
  totals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  isLoading: boolean;
  error: string | null;
  loadRequests: (status?: "PENDING" | "APPROVED" | "REJECTED") => Promise<void>;
  approveRequest: (interventionId: string, comments?: string) => Promise<void>;
  rejectRequest: (interventionId: string, rejectionReason: string) => Promise<void>;
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

export const useApproverOnCallStore = create<ApproverOnCallState>((set, get) => ({
  ...initialState,

  loadRequests: async (status = "PENDING") => {
    set({ isLoading: true, error: null });
    try {
      const result = await getOnCallInterventionsToApprove(status);
      set({
        requests: result.requests as OnCallInterventionToApprove[],
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

  approveRequest: async (interventionId, comments) => {
    set({ isLoading: true, error: null });
    try {
      await approveOnCallIntervention({ interventionId, comments });
      await get().loadRequests("PENDING");
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al aprobar intervención",
        isLoading: false,
      });
      throw error;
    }
  },

  rejectRequest: async (interventionId, rejectionReason) => {
    set({ isLoading: true, error: null });
    try {
      await rejectOnCallIntervention({ interventionId, rejectionReason });
      await get().loadRequests("PENDING");
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al rechazar intervención",
        isLoading: false,
      });
      throw error;
    }
  },

  reset: () => set(initialState),
}));
