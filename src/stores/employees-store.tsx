"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type EmployeeData = {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  email: string | null;
  active: boolean;
  department?: {
    name: string;
  } | null;
  position?: {
    title: string;
  } | null;
  employmentContracts: {
    contractType: string;
    startDate: Date;
    endDate: Date | null;
    active: boolean;
  }[];
  user?: {
    email: string;
    role: string;
  } | null;
};

type EmployeesState = {
  employees: EmployeeData[];
  loading: boolean;
  error: string | null;
};

type EmployeesActions = {
  fetchEmployees: () => Promise<void>;
  addEmployee: (employee: EmployeeData) => void;
  updateEmployee: (id: string, updates: Partial<EmployeeData>) => void;
  deleteEmployee: (id: string) => void;
  reset: () => void;
};

const initialState: EmployeesState = {
  employees: [],
  loading: false,
  error: null,
};

export const useEmployeesStore = create<EmployeesState & EmployeesActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchEmployees: async () => {
      set({ loading: true, error: null });
      try {
        const response = await fetch("/api/employees");
        if (!response.ok) {
          throw new Error("Error al cargar empleados");
        }
        const employees = await response.json();
        set({ employees, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          loading: false,
        });
      }
    },

    addEmployee: (employee) => {
      set((state) => ({
        employees: [...state.employees, employee],
      }));
    },

    updateEmployee: (id, updates) => {
      set((state) => ({
        employees: state.employees.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp)),
      }));
    },

    deleteEmployee: (id) => {
      set((state) => ({
        employees: state.employees.filter((emp) => emp.id !== id),
      }));
    },

    reset: () => {
      set(initialState);
    },
  })),
);
