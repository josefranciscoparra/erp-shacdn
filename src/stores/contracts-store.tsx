"use client";

import { create } from "zustand";

// Tipo de horario (escalable a 3 modos)
export type ScheduleType = "FLEXIBLE" | "FIXED" | "SHIFT";

// Estado de contrato fijo discontinuo
export type DiscontinuousStatus = "ACTIVE" | "PAUSED";

export interface Position {
  id: string;
  title: string;
  level?: {
    name: string;
  } | null;
}

export interface Department {
  id: string;
  name: string;
}

export interface CostCenter {
  id: string;
  name: string;
  code: string | null;
}

export interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
}

export interface ContractPauseHistoryEntry {
  id: string;
  action: "PAUSE" | "RESUME";
  startDate: string;
  endDate: string | null;
  reason: string | null;
  performedBy: string;
  performedAt: string;
  performedByName?: string | null;
  performedByEmail?: string | null;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  employeeNumber: string | null;
}

export interface Contract {
  id: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  weeklyHours: number;
  workingDaysPerWeek?: number | null;
  grossSalary: number | null;
  hasIntensiveSchedule?: boolean | null;
  intensiveStartDate?: string | null;
  intensiveEndDate?: string | null;
  intensiveWeeklyHours?: number | null;
  hasCustomWeeklyPattern?: boolean | null;
  mondayHours?: number | null;
  tuesdayHours?: number | null;
  wednesdayHours?: number | null;
  thursdayHours?: number | null;
  fridayHours?: number | null;
  saturdayHours?: number | null;
  sundayHours?: number | null;
  intensiveMondayHours?: number | null;
  intensiveTuesdayHours?: number | null;
  intensiveWednesdayHours?: number | null;
  intensiveThursdayHours?: number | null;
  intensiveFridayHours?: number | null;
  intensiveSaturdayHours?: number | null;
  intensiveSundayHours?: number | null;
  // Nuevos campos para FLEXIBLE, FIXED, SHIFTS
  scheduleType?: ScheduleType;
  workMonday?: boolean | null;
  workTuesday?: boolean | null;
  workWednesday?: boolean | null;
  workThursday?: boolean | null;
  workFriday?: boolean | null;
  workSaturday?: boolean | null;
  workSunday?: boolean | null;
  hasFixedTimeSlots?: boolean | null;
  mondayStartTime?: string | null;
  mondayEndTime?: string | null;
  tuesdayStartTime?: string | null;
  tuesdayEndTime?: string | null;
  wednesdayStartTime?: string | null;
  wednesdayEndTime?: string | null;
  thursdayStartTime?: string | null;
  thursdayEndTime?: string | null;
  fridayStartTime?: string | null;
  fridayEndTime?: string | null;
  saturdayStartTime?: string | null;
  saturdayEndTime?: string | null;
  sundayStartTime?: string | null;
  sundayEndTime?: string | null;
  // Pausas/Breaks para horario FIXED
  mondayBreakStartTime?: string | null;
  mondayBreakEndTime?: string | null;
  tuesdayBreakStartTime?: string | null;
  tuesdayBreakEndTime?: string | null;
  wednesdayBreakStartTime?: string | null;
  wednesdayBreakEndTime?: string | null;
  thursdayBreakStartTime?: string | null;
  thursdayBreakEndTime?: string | null;
  fridayBreakStartTime?: string | null;
  fridayBreakEndTime?: string | null;
  saturdayBreakStartTime?: string | null;
  saturdayBreakEndTime?: string | null;
  sundayBreakStartTime?: string | null;
  sundayBreakEndTime?: string | null;
  // Franjas horarias para jornada intensiva en horario FIXED
  intensiveMondayStartTime?: string | null;
  intensiveMondayEndTime?: string | null;
  intensiveTuesdayStartTime?: string | null;
  intensiveTuesdayEndTime?: string | null;
  intensiveWednesdayStartTime?: string | null;
  intensiveWednesdayEndTime?: string | null;
  intensiveThursdayStartTime?: string | null;
  intensiveThursdayEndTime?: string | null;
  intensiveFridayStartTime?: string | null;
  intensiveFridayEndTime?: string | null;
  intensiveSaturdayStartTime?: string | null;
  intensiveSaturdayEndTime?: string | null;
  intensiveSundayStartTime?: string | null;
  intensiveSundayEndTime?: string | null;
  // Pausas durante jornada intensiva en horario FIXED
  intensiveMondayBreakStartTime?: string | null;
  intensiveMondayBreakEndTime?: string | null;
  intensiveTuesdayBreakStartTime?: string | null;
  intensiveTuesdayBreakEndTime?: string | null;
  intensiveWednesdayBreakStartTime?: string | null;
  intensiveWednesdayBreakEndTime?: string | null;
  intensiveThursdayBreakStartTime?: string | null;
  intensiveThursdayBreakEndTime?: string | null;
  intensiveFridayBreakStartTime?: string | null;
  intensiveFridayBreakEndTime?: string | null;
  intensiveSaturdayBreakStartTime?: string | null;
  intensiveSaturdayBreakEndTime?: string | null;
  intensiveSundayBreakStartTime?: string | null;
  intensiveSundayBreakEndTime?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  position: Position | null;
  department: Department | null;
  costCenter: CostCenter | null;
  manager: Manager | null;
  employee?: Employee;
  // Fijo discontinuo
  discontinuousStatus?: DiscontinuousStatus | null;
  pauseHistory?: ContractPauseHistoryEntry[];
}

export interface ContractsResponse {
  contracts: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateContractData {
  contractType: string;
  startDate: string;
  endDate?: string | null;
  weeklyHours: number;
  workingDaysPerWeek?: number | null;
  grossSalary?: number | null;
  hasIntensiveSchedule?: boolean | null;
  intensiveStartDate?: string | null;
  intensiveEndDate?: string | null;
  intensiveWeeklyHours?: number | null;
  hasCustomWeeklyPattern?: boolean | null;
  mondayHours?: number | null;
  tuesdayHours?: number | null;
  wednesdayHours?: number | null;
  thursdayHours?: number | null;
  fridayHours?: number | null;
  saturdayHours?: number | null;
  sundayHours?: number | null;
  intensiveMondayHours?: number | null;
  intensiveTuesdayHours?: number | null;
  intensiveWednesdayHours?: number | null;
  intensiveThursdayHours?: number | null;
  intensiveFridayHours?: number | null;
  intensiveSaturdayHours?: number | null;
  intensiveSundayHours?: number | null;
  // Nuevos campos para FLEXIBLE, FIXED, SHIFTS
  scheduleType?: ScheduleType;
  workMonday?: boolean;
  workTuesday?: boolean;
  workWednesday?: boolean;
  workThursday?: boolean;
  workFriday?: boolean;
  workSaturday?: boolean;
  workSunday?: boolean;
  hasFixedTimeSlots?: boolean;
  mondayStartTime?: string;
  mondayEndTime?: string;
  tuesdayStartTime?: string;
  tuesdayEndTime?: string;
  wednesdayStartTime?: string;
  wednesdayEndTime?: string;
  thursdayStartTime?: string;
  thursdayEndTime?: string;
  fridayStartTime?: string;
  fridayEndTime?: string;
  saturdayStartTime?: string;
  saturdayEndTime?: string;
  sundayStartTime?: string;
  sundayEndTime?: string;
  // Pausas/Breaks para horario FIXED
  mondayBreakStartTime?: string;
  mondayBreakEndTime?: string;
  tuesdayBreakStartTime?: string;
  tuesdayBreakEndTime?: string;
  wednesdayBreakStartTime?: string;
  wednesdayBreakEndTime?: string;
  thursdayBreakStartTime?: string;
  thursdayBreakEndTime?: string;
  fridayBreakStartTime?: string;
  fridayBreakEndTime?: string;
  saturdayBreakStartTime?: string;
  saturdayBreakEndTime?: string;
  sundayBreakStartTime?: string;
  sundayBreakEndTime?: string;
  // Franjas horarias para jornada intensiva en horario FIXED
  intensiveMondayStartTime?: string;
  intensiveMondayEndTime?: string;
  intensiveTuesdayStartTime?: string;
  intensiveTuesdayEndTime?: string;
  intensiveWednesdayStartTime?: string;
  intensiveWednesdayEndTime?: string;
  intensiveThursdayStartTime?: string;
  intensiveThursdayEndTime?: string;
  intensiveFridayStartTime?: string;
  intensiveFridayEndTime?: string;
  intensiveSaturdayStartTime?: string;
  intensiveSaturdayEndTime?: string;
  intensiveSundayStartTime?: string;
  intensiveSundayEndTime?: string;
  // Pausas durante jornada intensiva en horario FIXED
  intensiveMondayBreakStartTime?: string;
  intensiveMondayBreakEndTime?: string;
  intensiveTuesdayBreakStartTime?: string;
  intensiveTuesdayBreakEndTime?: string;
  intensiveWednesdayBreakStartTime?: string;
  intensiveWednesdayBreakEndTime?: string;
  intensiveThursdayBreakStartTime?: string;
  intensiveThursdayBreakEndTime?: string;
  intensiveFridayBreakStartTime?: string;
  intensiveFridayBreakEndTime?: string;
  intensiveSaturdayBreakStartTime?: string;
  intensiveSaturdayBreakEndTime?: string;
  intensiveSundayBreakStartTime?: string;
  intensiveSundayBreakEndTime?: string;
  positionId?: string | null;
  departmentId?: string | null;
  costCenterId?: string | null;
  managerId?: string | null;
}

export interface UpdateContractData extends Partial<CreateContractData> {
  active?: boolean;
}

export interface BulkUpdateContractData {
  weeklyHours?: number | null;
  workingDaysPerWeek?: number | null;
  hasIntensiveSchedule?: boolean | null;
  intensiveStartDate?: string | null;
  intensiveEndDate?: string | null;
  intensiveWeeklyHours?: number | null;
  hasCustomWeeklyPattern?: boolean | null;
  mondayHours?: number | null;
  tuesdayHours?: number | null;
  wednesdayHours?: number | null;
  thursdayHours?: number | null;
  fridayHours?: number | null;
  saturdayHours?: number | null;
  sundayHours?: number | null;
  intensiveMondayHours?: number | null;
  intensiveTuesdayHours?: number | null;
  intensiveWednesdayHours?: number | null;
  intensiveThursdayHours?: number | null;
  intensiveFridayHours?: number | null;
  intensiveSaturdayHours?: number | null;
  intensiveSundayHours?: number | null;
}

interface ContractsState {
  // Data
  contracts: Contract[];
  selectedContract: Contract | null;

  // UI State
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isBulkUpdating: boolean;
  error: string | null;

  // Pagination
  page: number;
  limit: number;
  total: number;
  totalPages: number;

  // Filters
  status: "all" | "active" | "inactive";

  // Actions
  fetchContracts: (employeeId: string, params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  fetchAllContracts: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  createContract: (employeeId: string, data: CreateContractData) => Promise<Contract>;
  updateContract: (contractId: string, data: UpdateContractData) => Promise<Contract>;
  bulkUpdateContracts: (contractIds: string[], data: BulkUpdateContractData) => Promise<Contract[]>;
  deleteContract: (contractId: string) => Promise<void>;
  setSelectedContract: (contract: Contract | null) => void;
  setStatus: (status: "all" | "active" | "inactive") => void;
  setPage: (page: number) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  contracts: [],
  selectedContract: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isBulkUpdating: false,
  error: null,
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  status: "all" as const,
};

export const useContractsStore = create<ContractsState>((set, get) => ({
  ...initialState,

  fetchContracts: async (employeeId: string, params = {}) => {
    const { page = 1, limit = 10, status = "all" } = params;

    set({ isLoading: true, error: null });

    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status !== "all") {
        searchParams.append("status", status);
      }

      const response = await fetch(`/api/employees/${employeeId}/contracts?${searchParams}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al cargar contratos");
      }

      const data: ContractsResponse = await response.json();

      set({
        contracts: data.contracts,
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
        status: status as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  fetchAllContracts: async (params = {}) => {
    const { page = 1, limit = 10, status = "all" } = params;

    set({ isLoading: true, error: null });

    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status !== "all") {
        searchParams.append("status", status);
      }

      const response = await fetch(`/api/contracts?${searchParams}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al cargar contratos");
      }

      const data: ContractsResponse = await response.json();

      set({
        contracts: data.contracts,
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
        status: status as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  createContract: async (employeeId: string, data: CreateContractData) => {
    set({ isCreating: true, error: null });

    try {
      const response = await fetch(`/api/employees/${employeeId}/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al crear contrato");
      }

      const newContract: Contract = await response.json();

      // Actualizar la lista de contratos
      const { contracts } = get();
      set({
        contracts: [newContract, ...contracts],
        total: get().total + 1,
        isCreating: false,
      });

      return newContract;
    } catch (error: any) {
      set({
        error: error.message,
        isCreating: false,
      });
      throw error;
    }
  },

  updateContract: async (contractId: string, data: UpdateContractData) => {
    set({ isUpdating: true, error: null });

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al actualizar contrato");
      }

      const updatedContract: Contract = await response.json();

      // Actualizar la lista de contratos
      const { contracts } = get();
      set({
        contracts: contracts.map((contract) => (contract.id === contractId ? updatedContract : contract)),
        selectedContract: get().selectedContract?.id === contractId ? updatedContract : get().selectedContract,
        isUpdating: false,
      });

      return updatedContract;
    } catch (error: any) {
      set({
        error: error.message,
        isUpdating: false,
      });
      throw error;
    }
  },

  bulkUpdateContracts: async (contractIds: string[], data: BulkUpdateContractData) => {
    set({ isBulkUpdating: true, error: null });

    try {
      const response = await fetch("/api/contracts/bulk-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ contractIds, data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al actualizar contratos");
      }

      const result = await response.json();
      const updatedContracts: Contract[] = result.contracts;

      // Actualizar la lista de contratos
      const { contracts } = get();
      const updatedContractsMap = new Map(updatedContracts.map((c) => [c.id, c]));

      set({
        contracts: contracts.map((contract) =>
          updatedContractsMap.has(contract.id) ? updatedContractsMap.get(contract.id)! : contract,
        ),
        isBulkUpdating: false,
      });

      return updatedContracts;
    } catch (error: any) {
      set({
        error: error.message,
        isBulkUpdating: false,
      });
      throw error;
    }
  },

  deleteContract: async (contractId: string) => {
    set({ isDeleting: true, error: null });

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al eliminar contrato");
      }

      // Actualizar la lista de contratos (marcar como inactivo)
      const { contracts } = get();
      set({
        contracts: contracts.map((contract) =>
          contract.id === contractId ? { ...contract, active: false } : contract,
        ),
        total: get().total - 1,
        selectedContract: get().selectedContract?.id === contractId ? null : get().selectedContract,
        isDeleting: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isDeleting: false,
      });
      throw error;
    }
  },

  setSelectedContract: (contract: Contract | null) => {
    set({ selectedContract: contract });
  },

  setStatus: (status: "all" | "active" | "inactive") => {
    set({ status, page: 1 }); // Reset page when changing status
  },

  setPage: (page: number) => {
    set({ page });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));
