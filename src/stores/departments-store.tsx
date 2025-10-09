"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type DepartmentData = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  costCenter?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    email: string | null;
  } | null;
  _count?: {
    employmentContracts: number;
  };
};

type DepartmentsState = {
  departments: DepartmentData[];
  isLoading: boolean;
  error: string | null;
};

type DepartmentsActions = {
  fetchDepartments: () => Promise<void>;
  addDepartment: (department: DepartmentData) => void;
  updateDepartment: (id: string, updates: Partial<DepartmentData>) => void;
  deleteDepartment: (id: string) => void;
  reset: () => void;
};

const initialState: DepartmentsState = {
  departments: [],
  isLoading: false,
  error: null,
};

export const useDepartmentsStore = create<DepartmentsState & DepartmentsActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchDepartments: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/departments");
        if (!response.ok) {
          throw new Error("Error al cargar departamentos");
        }
        const departments = await response.json();
        set({ departments, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
      }
    },

    addDepartment: (department) => {
      set((state) => ({
        departments: [...state.departments, department],
      }));
    },

    updateDepartment: (id, updates) => {
      set((state) => ({
        departments: state.departments.map((dept) => (dept.id === id ? { ...dept, ...updates } : dept)),
      }));
    },

    deleteDepartment: (id) => {
      set((state) => ({
        departments: state.departments.filter((dept) => dept.id !== id),
      }));
    },

    reset: () => {
      set(initialState);
    },
  })),
);
