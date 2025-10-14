"use client";

import { create } from "zustand";

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
  active: boolean;
  createdAt: string;
  updatedAt: string;
  position: Position | null;
  department: Department | null;
  costCenter: CostCenter | null;
  manager: Manager | null;
  employee?: Employee;
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
