"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface PositionData {
  id: string;
  title: string;
  description: string | null;
  levelId: string | null;
  level: {
    id: string;
    name: string;
    order: number;
  } | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
}

interface PositionsState {
  positions: PositionData[];
  isLoading: boolean;
  error: string | null;
}

interface PositionsActions {
  fetchPositions: () => Promise<void>;
  addPosition: (
    position: Omit<PositionData, "id" | "createdAt" | "updatedAt" | "orgId" | "level" | "active">,
  ) => Promise<PositionData>;
  updatePosition: (
    id: string,
    updates: Partial<Omit<PositionData, "id" | "createdAt" | "updatedAt" | "orgId" | "level">>,
  ) => Promise<PositionData>;
  deletePosition: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type PositionsStore = PositionsState & PositionsActions;

export const usePositionsStore = create<PositionsStore>()(
  devtools(
    (set) => ({
      positions: [],
      isLoading: false,
      error: null,

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      fetchPositions: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/positions");
          if (!response.ok) {
            throw new Error("Error al cargar posiciones");
          }
          const data = await response.json();
          set({ positions: data, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage, isLoading: false });
        }
      },

      addPosition: async (positionData) => {
        try {
          const response = await fetch("/api/positions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(positionData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error ?? "Error al crear posición");
          }

          const newPosition = await response.json();
          set((state) => ({
            positions: [...state.positions, newPosition],
          }));

          return newPosition;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage });
          throw error;
        }
      },

      updatePosition: async (id, updates) => {
        try {
          const response = await fetch(`/api/positions/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error ?? "Error al actualizar posición");
          }

          const updatedPosition = await response.json();
          set((state) => ({
            positions: state.positions.map((position) => (position.id === id ? updatedPosition : position)),
          }));

          return updatedPosition;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          set({ error: errorMessage });
          throw error;
        }
      },

      deletePosition: (id) => {
        set((state) => ({
          positions: state.positions.filter((position) => position.id !== id),
        }));
      },
    }),
    {
      name: "positions-store",
    },
  ),
);
