"use client";

import { create } from "zustand";

import {
  approveOverworkAuthorization,
  getOverworkAuthorizationsToApprove,
  rejectOverworkAuthorization,
  type OverworkAuthorizationWithEmployee,
} from "@/server/actions/overwork-authorization";

export type OvertimeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApproverOvertimeState {
  requests: OverworkAuthorizationWithEmployee[];
  totals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  isLoading: boolean;
  error: string | null;

  loadRequests: (status?: OvertimeRequestStatus) => Promise<void>;
  approveRequest: (id: string, compensationType?: string, comments?: string) => Promise<void>;
  rejectRequest: (id: string, rejectionReason: string) => Promise<void>;
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

export const useApproverOvertimeStore = create<ApproverOvertimeState>((set, get) => ({
  ...initialState,

  loadRequests: async (status = "PENDING") => {
    set({ isLoading: true, error: null });
    try {
      const result = await getOverworkAuthorizationsToApprove(status);
      const totals = result.reduce(
        (acc, item) => {
          if (item.status === "PENDING") acc.pending += 1;
          if (item.status === "APPROVED") acc.approved += 1;
          if (item.status === "REJECTED") acc.rejected += 1;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0 },
      );

      set({ requests: result, totals, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar solicitudes",
        isLoading: false,
      });
    }
  },

  approveRequest: async (id, compensationType, comments) => {
    set({ isLoading: true, error: null });
    try {
      await approveOverworkAuthorization({ authorizationId: id, compensationType, comments });
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

  rejectRequest: async (id, rejectionReason) => {
    set({ isLoading: true, error: null });
    try {
      await rejectOverworkAuthorization({ authorizationId: id, rejectionReason });
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
