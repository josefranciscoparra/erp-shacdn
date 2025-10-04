"use client";

import { create } from "zustand";

// Tipos para filtros
export interface TimeTrackingFilters {
  employeeId?: string;
  departmentId?: string;
  costCenterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
}

// Tipos para los datos
export interface TimeTrackingRecord {
  id: string;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
  employee: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
    department?: {
      id: string;
      name: string;
    } | null;
    costCenter?: {
      id: string;
      name: string;
    } | null;
  };
  timeEntries: Array<{
    id: string;
    entryType: string;
    timestamp: Date;
  }>;
}

export interface EmployeeStatus {
  id: string;
  name: string | null;
  email: string;
  department: string;
  costCenter: string;
  status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
  lastAction: Date | null;
  todayWorkedMinutes: number;
  todayBreakMinutes: number;
  clockIn?: Date;
  clockOut?: Date;
}

export interface TimeTrackingStats {
  totalRecords: number;
  totalWorkedHours: number;
  totalBreakHours: number;
  statusCounts: {
    IN_PROGRESS: number;
    COMPLETED: number;
    INCOMPLETE: number;
    ABSENT: number;
  };
  averageWorkedMinutesPerDay: number;
}

export interface FilterOption {
  id: string;
  name: string;
}

interface AdminTimeTrackingState {
  // Datos
  records: TimeTrackingRecord[];
  currentEmployees: EmployeeStatus[];
  stats: TimeTrackingStats | null;

  // Opciones de filtros
  employees: FilterOption[];
  departments: FilterOption[];
  costCenters: FilterOption[];

  // Filtros actuales
  filters: TimeTrackingFilters;

  // Loading states
  isLoading: boolean;
  isExporting: boolean;

  // Error
  error: string | null;

  // Acciones
  setRecords: (records: TimeTrackingRecord[]) => void;
  setCurrentEmployees: (employees: EmployeeStatus[]) => void;
  setStats: (stats: TimeTrackingStats | null) => void;
  setEmployees: (employees: FilterOption[]) => void;
  setDepartments: (departments: FilterOption[]) => void;
  setCostCenters: (costCenters: FilterOption[]) => void;
  setFilters: (filters: TimeTrackingFilters) => void;
  setLoading: (loading: boolean) => void;
  setExporting: (exporting: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
  resetFilters: () => void;
}

const initialState = {
  records: [],
  currentEmployees: [],
  stats: null,
  employees: [],
  departments: [],
  costCenters: [],
  filters: {},
  isLoading: false,
  isExporting: false,
  error: null,
};

export const useAdminTimeTrackingStore = create<AdminTimeTrackingState>((set) => ({
  ...initialState,

  // Setters
  setRecords: (records) => set({ records }),
  setCurrentEmployees: (employees) => set({ currentEmployees: employees }),
  setStats: (stats) => set({ stats }),
  setEmployees: (employees) => set({ employees }),
  setDepartments: (departments) => set({ departments }),
  setCostCenters: (costCenters) => set({ costCenters }),
  setFilters: (filters) => set({ filters }),
  setLoading: (loading) => set({ isLoading: loading }),
  setExporting: (exporting) => set({ isExporting: exporting }),
  setError: (error) => set({ error }),

  // Reset
  reset: () => set(initialState),
  resetFilters: () => set({ filters: {} }),
}));
