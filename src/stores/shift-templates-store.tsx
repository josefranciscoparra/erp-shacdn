"use client";

import type { ShiftTemplate } from "@prisma/client";
import { create } from "zustand";

import {
  getShiftTemplates,
  getShiftTemplateById,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
} from "@/server/actions/shifts";

type ShiftTemplateWithRelations = ShiftTemplate & {
  position: {
    id: string;
    title: string;
  } | null;
  costCenter: {
    id: string;
    name: string;
  } | null;
};

interface ShiftTemplatesState {
  // Estado
  templates: ShiftTemplateWithRelations[];
  selectedTemplate: ShiftTemplateWithRelations | null;
  isLoading: boolean;
  error: string | null;

  // Acciones sincrónicas
  setTemplates: (templates: ShiftTemplateWithRelations[]) => void;
  setSelectedTemplate: (template: ShiftTemplateWithRelations | null) => void;
  addTemplate: (template: ShiftTemplateWithRelations) => void;
  updateTemplateLocal: (id: string, data: Partial<ShiftTemplateWithRelations>) => void;
  deleteTemplateLocal: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones asincrónicas
  fetchTemplates: (filters?: { costCenterId?: string; positionId?: string; active?: boolean }) => Promise<void>;
  fetchTemplateById: (id: string) => Promise<void>;
  createTemplate: (data: {
    name: string;
    description?: string;
    defaultStartTime: string;
    defaultEndTime: string;
    defaultRequiredHeadcount?: number;
    positionId?: string;
    costCenterId?: string;
    color?: string;
  }) => Promise<void>;
  updateTemplate: (
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      defaultStartTime: string;
      defaultEndTime: string;
      defaultRequiredHeadcount: number;
      positionId: string | null;
      costCenterId: string | null;
      color: string;
      active: boolean;
    }>,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useShiftTemplatesStore = create<ShiftTemplatesState>((set, get) => ({
  // Estado inicial
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,

  // Acciones sincrónicas
  setTemplates: (templates) => set({ templates }),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  addTemplate: (template) => {
    const currentTemplates = get().templates;
    set({ templates: [...currentTemplates, template] });
  },
  updateTemplateLocal: (id, data) => {
    const currentTemplates = get().templates;
    set({
      templates: currentTemplates.map((t) => (t.id === id ? { ...t, ...data } : t)),
    });
  },
  deleteTemplateLocal: (id) => {
    const currentTemplates = get().templates;
    set({ templates: currentTemplates.filter((t) => t.id !== id) });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Acciones asincrónicas
  fetchTemplates: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const templates = await getShiftTemplates(filters);
      set({ templates, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar plantillas";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchTemplateById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const template = await getShiftTemplateById(id);
      set({ selectedTemplate: template, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar plantilla";
      set({ error: errorMessage, isLoading: false });
    }
  },

  createTemplate: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newTemplate = await createShiftTemplate(data);
      const currentTemplates = get().templates;
      set({
        templates: [...currentTemplates, newTemplate as ShiftTemplateWithRelations],
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear plantilla";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateTemplate: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTemplate = await updateShiftTemplate(id, data);
      const currentTemplates = get().templates;
      set({
        templates: currentTemplates.map((t) => (t.id === id ? (updatedTemplate as ShiftTemplateWithRelations) : t)),
        isLoading: false,
      });

      // Actualizar también selectedTemplate si es el mismo
      const selectedId = get().selectedTemplate?.id;
      if (selectedId === id) {
        set({ selectedTemplate: updatedTemplate as ShiftTemplateWithRelations });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar plantilla";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteTemplate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteShiftTemplate(id);
      const currentTemplates = get().templates;
      set({
        templates: currentTemplates.filter((t) => t.id !== id),
        isLoading: false,
      });

      // Limpiar selectedTemplate si es el mismo
      const selectedId = get().selectedTemplate?.id;
      if (selectedId === id) {
        set({ selectedTemplate: null });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar plantilla";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
}));
