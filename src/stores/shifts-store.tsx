"use client";

import type { Shift, ShiftStatus, ShiftType } from "@prisma/client";
import { create } from "zustand";

import { publishShifts as publishShiftsAction } from "@/server/actions/shift-publishing";
import {
  getShifts,
  createShift as createShiftAction,
  updateShift as updateShiftAction,
  deleteShift as deleteShiftAction,
  duplicateShift as duplicateShiftAction,
  createShiftsFromTemplate as createShiftsFromTemplateAction,
} from "@/server/actions/shifts";

type ShiftWithRelations = Shift & {
  position: {
    id: string;
    title: string;
  } | null;
  costCenter: {
    id: string;
    name: string;
  };
  template: {
    id: string;
    name: string;
    color: string;
  } | null;
  assignments: Array<{
    id: string;
    employeeId: string;
    status: string;
  }>;
};

interface ShiftFilters {
  costCenterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: ShiftStatus;
  positionId?: string;
  shiftType?: ShiftType;
}

interface ShiftsState {
  // Estado
  shifts: ShiftWithRelations[];
  selectedShift: ShiftWithRelations | null;
  isLoading: boolean;
  error: string | null;
  filters: ShiftFilters;

  // Acciones sincrónicas
  setShifts: (shifts: ShiftWithRelations[]) => void;
  setSelectedShift: (shift: ShiftWithRelations | null) => void;
  setFilters: (filters: ShiftFilters) => void;
  addShift: (shift: ShiftWithRelations) => void;
  updateShiftLocal: (id: string, data: Partial<ShiftWithRelations>) => void;
  deleteShiftLocal: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones asincrónicas (placeholders para futuros sprints)
  fetchShifts: (filters: ShiftFilters) => Promise<void>;
  createShift: (data: {
    date: Date;
    startTime: string;
    endTime: string;
    costCenterId: string;
    requiredHeadcount?: number;
    positionId?: string;
    shiftType?: ShiftType;
    templateId?: string;
    notes?: string;
  }) => Promise<void>;
  updateShift: (
    id: string,
    data: Partial<{
      date: Date;
      startTime: string;
      endTime: string;
      requiredHeadcount: number;
      positionId: string | null;
      shiftType: ShiftType;
      notes: string | null;
    }>,
  ) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  duplicateShift: (id: string, newDate: Date) => Promise<void>;
  createShiftsFromTemplate: (
    templateId: string,
    dateRange: { start: Date; end: Date },
    costCenterId: string,
  ) => Promise<ShiftWithRelations[]>;
  publishShifts: (shiftIds: string[]) => Promise<void>;
  requestApproval: (shiftIds: string[]) => Promise<void>;
}

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  // Estado inicial
  shifts: [],
  selectedShift: null,
  isLoading: false,
  error: null,
  filters: {},

  // Acciones sincrónicas
  setShifts: (shifts) => set({ shifts }),
  setSelectedShift: (shift) => set({ selectedShift: shift }),
  setFilters: (filters) => set({ filters }),
  addShift: (shift) => {
    const currentShifts = get().shifts;
    set({ shifts: [...currentShifts, shift] });
  },
  updateShiftLocal: (id, data) => {
    const currentShifts = get().shifts;
    set({
      shifts: currentShifts.map((s) => (s.id === id ? { ...s, ...data } : s)),
    });
  },
  deleteShiftLocal: (id) => {
    const currentShifts = get().shifts;
    set({ shifts: currentShifts.filter((s) => s.id !== id) });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Acciones asincrónicas
  fetchShifts: async (filters) => {
    set({ isLoading: true, error: null, filters });
    try {
      const shifts = await getShifts(filters);
      set({ shifts, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar turnos";
      set({ error: errorMessage, isLoading: false });
    }
  },

  createShift: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newShift = await createShiftAction(data);
      get().addShift(newShift);
      set({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear turno";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateShift: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedShift = await updateShiftAction(id, data);
      get().updateShiftLocal(id, updatedShift);
      set({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar turno";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteShift: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteShiftAction(id);
      get().deleteShiftLocal(id);
      set({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar turno";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  duplicateShift: async (id, newDate) => {
    set({ isLoading: true, error: null });
    try {
      const duplicatedShift = await duplicateShiftAction(id, newDate);
      get().addShift(duplicatedShift);
      set({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al duplicar turno";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  createShiftsFromTemplate: async (templateId, dateRange, costCenterId) => {
    set({ isLoading: true, error: null });
    try {
      const newShifts = await createShiftsFromTemplateAction(templateId, dateRange, costCenterId);

      // Añadir todos los turnos nuevos al store
      const currentShifts = get().shifts;
      set({ shifts: [...currentShifts, ...newShifts], isLoading: false });

      return newShifts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear turnos desde plantilla";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  publishShifts: async (shiftIds) => {
    set({ isLoading: true, error: null });
    try {
      const result = await publishShiftsAction(shiftIds);

      if (!result.success) {
        throw new Error(result.errors.join(", "));
      }

      // Actualizar turnos en el store
      const currentShifts = get().shifts;
      const updatedShifts = currentShifts.map((shift) => {
        if (result.publishedIds.includes(shift.id)) {
          return { ...shift, status: "PUBLISHED" as ShiftStatus };
        } else if (result.pendingIds.includes(shift.id)) {
          return { ...shift, status: "PENDING_APPROVAL" as ShiftStatus };
        }
        return shift;
      });

      set({ shifts: updatedShifts, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al publicar turnos";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  requestApproval: async (shiftIds) => {
    set({ isLoading: true, error: null });
    try {
      // requestApproval es lo mismo que publishShifts
      // La configuración determina si va directo a PUBLISHED o a PENDING_APPROVAL
      const result = await publishShiftsAction(shiftIds);

      if (!result.success) {
        throw new Error(result.errors.join(", "));
      }

      // Actualizar turnos en el store
      const currentShifts = get().shifts;
      const updatedShifts = currentShifts.map((shift) => {
        if (result.pendingIds.includes(shift.id)) {
          return { ...shift, status: "PENDING_APPROVAL" as ShiftStatus };
        }
        return shift;
      });

      set({ shifts: updatedShifts, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al solicitar aprobación";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
}));
