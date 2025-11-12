"use client";

import type { ShiftPlanner } from "@prisma/client";
import { create } from "zustand";

import {
  type SerializedShiftConfiguration,
  getShiftConfiguration,
  updateShiftConfiguration,
  getShiftPlanners,
  addShiftPlanner,
  removeShiftPlanner,
  updateShiftPlanner,
} from "@/server/actions/shifts";

type ShiftPlannerWithRelations = ShiftPlanner & {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  costCenter: {
    id: string;
    name: string;
  } | null;
};

interface ShiftConfigurationState {
  // Estado
  config: SerializedShiftConfiguration | null;
  planners: ShiftPlannerWithRelations[];
  isLoading: boolean;
  error: string | null;

  // Acciones sincrónicas
  setConfig: (config: SerializedShiftConfiguration | null) => void;
  setPlanners: (planners: ShiftPlannerWithRelations[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones asincrónicas - Configuración
  fetchConfiguration: () => Promise<void>;
  updateConfiguration: (
    data: Partial<Omit<SerializedShiftConfiguration, "id" | "orgId" | "createdAt" | "updatedAt">>,
  ) => Promise<void>;

  // Acciones asincrónicas - Planificadores
  fetchPlanners: (filters?: { costCenterId?: string }) => Promise<void>;
  addPlanner: (userId: string, costCenterId?: string, isGlobal?: boolean, canApprove?: boolean) => Promise<void>;
  removePlanner: (plannerId: string) => Promise<void>;
  updatePlanner: (
    plannerId: string,
    data: { canApprove?: boolean; isGlobal?: boolean; costCenterId?: string | null },
  ) => Promise<void>;
}

export const useShiftConfigurationStore = create<ShiftConfigurationState>((set, get) => ({
  // Estado inicial
  config: null,
  planners: [],
  isLoading: false,
  error: null,

  // Acciones sincrónicas
  setConfig: (config) => set({ config }),
  setPlanners: (planners) => set({ planners }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Acciones asincrónicas - Configuración
  fetchConfiguration: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await getShiftConfiguration();
      set({ config, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar configuración";
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateConfiguration: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const config = await updateShiftConfiguration(data);
      set({ config, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar configuración";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Acciones asincrónicas - Planificadores
  fetchPlanners: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const planners = await getShiftPlanners(filters);
      set({ planners, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar planificadores";
      set({ error: errorMessage, isLoading: false });
    }
  },

  addPlanner: async (userId, costCenterId, isGlobal, canApprove) => {
    set({ isLoading: true, error: null });
    try {
      const newPlanner = await addShiftPlanner(userId, costCenterId, isGlobal, canApprove);
      const currentPlanners = get().planners;
      set({
        planners: [...currentPlanners, newPlanner as ShiftPlannerWithRelations],
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al añadir planificador";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  removePlanner: async (plannerId) => {
    set({ isLoading: true, error: null });
    try {
      await removeShiftPlanner(plannerId);
      const currentPlanners = get().planners;
      set({
        planners: currentPlanners.filter((p) => p.id !== plannerId),
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar planificador";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updatePlanner: async (plannerId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPlanner = await updateShiftPlanner(plannerId, data);
      const currentPlanners = get().planners;
      set({
        planners: currentPlanners.map((p) => (p.id === plannerId ? (updatedPlanner as ShiftPlannerWithRelations) : p)),
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar planificador";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
}));
