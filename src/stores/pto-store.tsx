"use client";

import type { AbsenceType } from "@prisma/client";
import { create } from "zustand";

import {
  getMyPtoBalance,
  getAbsenceTypes,
  getMyPtoRequests,
  createPtoRequest as createPtoRequestAction,
  cancelPtoRequest as cancelPtoRequestAction,
  calculateWorkingDays as calculateWorkingDaysAction,
} from "@/server/actions/employee-pto";

export interface PtoBalance {
  id: string;
  year: number;
  annualAllowance: number;
  daysUsed: number;
  daysPending: number;
  daysAvailable: number;
  hasActiveContract?: boolean;
  hasProvisionalContract?: boolean;
}

export interface PtoRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason?: string | null;
  attachmentUrl?: string | null;
  submittedAt: Date;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  cancelledAt?: Date | null;
  approverComments?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  absenceType: AbsenceType;
  approver?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PtoState {
  // Balance
  balance: PtoBalance | null;

  // Solicitudes
  requests: PtoRequest[];

  // Tipos de ausencia
  absenceTypes: AbsenceType[];

  // Loading states
  isLoadingBalance: boolean;
  isLoadingRequests: boolean;
  isLoadingTypes: boolean;
  isSubmitting: boolean;

  // Error
  error: string | null;

  // Acciones
  loadBalance: () => Promise<void>;
  loadRequests: () => Promise<void>;
  loadAbsenceTypes: () => Promise<void>;
  createRequest: (data: {
    absenceTypeId: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
    attachmentUrl?: string;
  }) => Promise<{ success: boolean; workingDays?: number; holidays?: Array<{ date: Date; name: string }> }>;
  cancelRequest: (requestId: string, reason?: string) => Promise<void>;
  calculateWorkingDays: (
    startDate: Date,
    endDate: Date,
  ) => Promise<{ workingDays: number; holidays: Array<{ date: Date; name: string }> }>;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  balance: null,
  requests: [],
  absenceTypes: [],
  isLoadingBalance: false,
  isLoadingRequests: false,
  isLoadingTypes: false,
  isSubmitting: false,
  error: null,
};

export const usePtoStore = create<PtoState>((set, get) => ({
  ...initialState,

  // Cargar balance
  loadBalance: async () => {
    set({ isLoadingBalance: true, error: null });
    try {
      const balance = await getMyPtoBalance();
      set({
        balance: balance as PtoBalance,
        isLoadingBalance: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar balance";
      set({
        error: `[Balance] ${message}`,
        isLoadingBalance: false,
      });
    }
  },

  // Cargar solicitudes
  loadRequests: async () => {
    set({ isLoadingRequests: true, error: null });
    try {
      const requests = await getMyPtoRequests();
      set({
        requests: requests as PtoRequest[],
        isLoadingRequests: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar solicitudes";
      set({
        error: `[Solicitudes] ${message}`,
        isLoadingRequests: false,
      });
    }
  },

  // Cargar tipos de ausencia
  loadAbsenceTypes: async () => {
    set({ isLoadingTypes: true, error: null });
    try {
      const types = await getAbsenceTypes();
      set({
        absenceTypes: types,
        isLoadingTypes: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar tipos de ausencia";
      set({
        error: `[Tipos] ${message}`,
        isLoadingTypes: false,
      });
    }
  },

  // Crear solicitud
  createRequest: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const result = await createPtoRequestAction(data);

      // Recargar balance y solicitudes
      await get().loadBalance();
      await get().loadRequests();

      set({ isSubmitting: false });

      return { success: true, workingDays: result.request.workingDays, holidays: result.request.holidays };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear solicitud";
      set({
        error: errorMessage,
        isSubmitting: false,
      });
      throw error;
    }
  },

  // Cancelar solicitud
  cancelRequest: async (requestId, reason) => {
    set({ isSubmitting: true, error: null });
    try {
      await cancelPtoRequestAction(requestId, reason);

      // Recargar balance y solicitudes
      await get().loadBalance();
      await get().loadRequests();

      set({ isSubmitting: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cancelar solicitud",
        isSubmitting: false,
      });
      throw error;
    }
  },

  // Calcular días hábiles
  calculateWorkingDays: async (startDate, endDate) => {
    try {
      const result = await calculateWorkingDaysAction(startDate, endDate, "", "");
      return result;
    } catch (error) {
      console.error("Error al calcular días hábiles:", error);
      throw error;
    }
  },

  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
