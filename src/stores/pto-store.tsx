"use client";

import type { AbsenceType } from "@prisma/client";
import { create } from "zustand";

import { DEFAULT_PTO_BALANCE_TYPE, PTO_BALANCE_TYPES, type PtoBalanceType } from "@/lib/pto/balance-types";
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
  // ❌ DEPRECADO - Mantener temporalmente para compatibilidad
  annualAllowance: number;
  daysUsed: number;
  daysPending: number;
  daysAvailable: number;
  // ✅ NUEVOS CAMPOS (en minutos) - USAR ESTOS
  annualAllowanceMinutes?: number;
  minutesUsed?: number;
  minutesPending?: number;
  minutesAvailable?: number;
  workdayMinutesSnapshot?: number;
  hasActiveContract?: boolean;
  hasProvisionalContract?: boolean;
  balanceType?: PtoBalanceType;
  roundingUnit?: number;
  roundingMode?: "DOWN" | "NEAREST" | "UP";
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
  // 🆕 Campos para ausencias parciales
  startTime?: number | null;
  endTime?: number | null;
  durationMinutes?: number | null;
  // 🆕 Campos para justificantes (Mejora 2)
  _count?: {
    documents: number;
  };
}

interface PtoState {
  // Balance
  balance: PtoBalance | null;
  balancesByType: Partial<Record<PtoBalanceType, PtoBalance>>;
  isLoadingBalanceByType: Partial<Record<PtoBalanceType, boolean>>;

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
  loadBalanceByType: (balanceType: PtoBalanceType) => Promise<void>;
  loadRequests: () => Promise<void>;
  loadAbsenceTypes: () => Promise<void>;
  createRequest: (data: {
    absenceTypeId: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
    attachmentUrl?: string;
    // 🆕 Campos para ausencias parciales
    startTime?: number;
    endTime?: number;
    durationMinutes?: number;
  }) => Promise<
    | {
        success: true;
        id: string;
        workingDays: number;
        holidays: Array<{ date: Date; name: string }>;
      }
    | {
        success: false;
        error?: string;
      }
  >;
  cancelRequest: (requestId: string, reason?: string) => Promise<void>;
  calculateWorkingDays: (
    startDate: Date,
    endDate: Date,
    absenceTypeId?: string,
  ) => Promise<{ workingDays: number; holidays: Array<{ date: Date; name: string }> }>;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  balance: null,
  balancesByType: {},
  isLoadingBalanceByType: {},
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
      set((state) => ({
        balance: balance as PtoBalance,
        balancesByType: { ...state.balancesByType, VACATION: balance as PtoBalance },
        isLoadingBalance: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar balance";
      set({
        error: `[Balance] ${message}`,
        isLoadingBalance: false,
      });
    }
  },

  loadBalanceByType: async (balanceType) => {
    set((state) => ({
      isLoadingBalanceByType: { ...state.isLoadingBalanceByType, [balanceType]: true },
      error: null,
    }));

    try {
      const balance = await getMyPtoBalance(balanceType);
      set((state) => ({
        balancesByType: { ...state.balancesByType, [balanceType]: balance as PtoBalance },
        isLoadingBalanceByType: { ...state.isLoadingBalanceByType, [balanceType]: false },
        balance: balanceType === "VACATION" ? (balance as PtoBalance) : state.balance,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar balance";
      set((state) => ({
        error: `[Balance] ${message}`,
        isLoadingBalanceByType: { ...state.isLoadingBalanceByType, [balanceType]: false },
      }));
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

      if (!result.success) {
        set({ isSubmitting: false });
        return { success: false, error: result.error };
      }

      // Recargar balance y solicitudes
      const selectedType = get().absenceTypes.find((type) => type.id === data.absenceTypeId) ?? null;
      const selectedBalanceType: PtoBalanceType =
        (selectedType ? (selectedType as { balanceType?: PtoBalanceType | null }).balanceType : null) ??
        DEFAULT_PTO_BALANCE_TYPE;

      if (selectedType?.affectsBalance) {
        await get().loadBalanceByType(selectedBalanceType);
      } else {
        await get().loadBalance();
      }
      await get().loadRequests();

      set({ isSubmitting: false });

      return {
        success: true,
        id: result.request.id,
        workingDays: result.request.workingDays,
        holidays: result.request.holidays,
      };
    } catch (error) {
      set({
        isSubmitting: false,
      });
      return { success: false, error: "Error al crear solicitud" };
    }
  },

  // Cancelar solicitud
  cancelRequest: async (requestId, reason) => {
    set({ isSubmitting: true, error: null });
    try {
      await cancelPtoRequestAction(requestId, reason);

      // Recargar balances y solicitudes
      await Promise.all(PTO_BALANCE_TYPES.map((type) => get().loadBalanceByType(type)));
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
  calculateWorkingDays: async (startDate, endDate, absenceTypeId) => {
    try {
      let countsCalendarDays = false;

      if (absenceTypeId) {
        const type = get().absenceTypes.find((t) => t.id === absenceTypeId);
        if (type) {
          // @ts-expect-error - El tipo Prisma no se ha regenerado pero el campo existe
          countsCalendarDays = (type as Record<string, unknown>).countsCalendarDays ?? false;
        }
      }

      const result = await calculateWorkingDaysAction(startDate, endDate, "", "", countsCalendarDays);
      return result;
    } catch (error) {
      console.error("Error al calcular días hábiles:", error);
      throw error;
    }
  },

  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
