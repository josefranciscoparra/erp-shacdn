"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface EmployeeForShift {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  email: string | null;
  photoUrl: string | null;
  position: {
    id: string;
    title: string;
  } | null;
}

export interface ShiftAssignmentData {
  id: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  employeeId: string;
  shiftId: string;
  employee: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
  };
}

interface ShiftAssignmentsState {
  availableEmployees: EmployeeForShift[];
  assignments: ShiftAssignmentData[];
  isLoading: boolean;
  error: string | null;
}

interface ShiftAssignmentsActions {
  fetchAvailableEmployees: (costCenterId: string) => Promise<void>;
  fetchShiftAssignments: (shiftId: string) => Promise<void>;
  assignEmployee: (shiftId: string, employeeId: string, notes?: string) => Promise<void>;
  unassignEmployee: (assignmentId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type ShiftAssignmentsStore = ShiftAssignmentsState & ShiftAssignmentsActions;

export const useShiftAssignmentsStore = create<ShiftAssignmentsStore>()(
  devtools(
    (set) => ({
      availableEmployees: [],
      assignments: [],
      isLoading: false,
      error: null,

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      reset: () => set({ availableEmployees: [], assignments: [], isLoading: false, error: null }),

      fetchAvailableEmployees: async (costCenterId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/shifts/available-employees?costCenterId=${costCenterId}`);
          if (!response.ok) {
            throw new Error("Error al cargar empleados disponibles");
          }
          const data = await response.json();
          set({ availableEmployees: data, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage, isLoading: false });
        }
      },

      fetchShiftAssignments: async (shiftId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/shifts/assignments?shiftId=${shiftId}`);
          if (!response.ok) {
            throw new Error("Error al cargar asignaciones");
          }
          const data = await response.json();
          set({ assignments: data, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage, isLoading: false });
        }
      },

      assignEmployee: async (shiftId: string, employeeId: string, notes?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/shifts/assignments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ shiftId, employeeId, notes }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error ?? "Error al asignar empleado");
          }

          const newAssignment = await response.json();
          set((state) => ({
            assignments: [...state.assignments, newAssignment],
            isLoading: false,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      unassignEmployee: async (assignmentId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/shifts/assignments/${assignmentId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error ?? "Error al desasignar empleado");
          }

          set((state) => ({
            assignments: state.assignments.filter((a) => a.id !== assignmentId),
            isLoading: false,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: "shift-assignments-store",
    },
  ),
);
