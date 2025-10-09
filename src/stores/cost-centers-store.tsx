"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface CostCenterData {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  timezone: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CostCentersState {
  costCenters: CostCenterData[];
  isLoading: boolean;
  error: string | null;
}

interface CostCentersActions {
  fetchCostCenters: () => Promise<void>;
  addCostCenter: (costCenter: Omit<CostCenterData, "id" | "createdAt" | "updatedAt">) => Promise<CostCenterData>;
  updateCostCenter: (
    id: string,
    updates: Partial<Omit<CostCenterData, "id" | "createdAt" | "updatedAt">>,
  ) => Promise<CostCenterData>;
  deleteCostCenter: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type CostCentersStore = CostCentersState & CostCentersActions;

export const useCostCentersStore = create<CostCentersStore>()(
  devtools(
    (set, get) => ({
      costCenters: [],
      isLoading: false,
      error: null,

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      fetchCostCenters: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/cost-centers");
          if (!response.ok) {
            throw new Error("Error al cargar centros de coste");
          }
          const data = await response.json();
          set({ costCenters: data, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage, isLoading: false });
        }
      },

      addCostCenter: async (costCenterData) => {
        try {
          const response = await fetch("/api/cost-centers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(costCenterData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error ?? "Error al crear centro de coste");
          }

          const newCostCenter = await response.json();
          set((state) => ({
            costCenters: [...state.costCenters, newCostCenter],
          }));

          return newCostCenter;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage });
          throw error;
        }
      },

      updateCostCenter: async (id, updates) => {
        try {
          const response = await fetch(`/api/cost-centers/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error ?? "Error al actualizar centro de coste");
          }

          const updatedCostCenter = await response.json();
          set((state) => ({
            costCenters: state.costCenters.map((costCenter) => (costCenter.id === id ? updatedCostCenter : costCenter)),
          }));

          return updatedCostCenter;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage });
          throw error;
        }
      },

      deleteCostCenter: (id) => {
        set((state) => ({
          costCenters: state.costCenters.filter((costCenter) => costCenter.id !== id),
        }));
      },
    }),
    {
      name: "cost-centers-store",
    },
  ),
);
