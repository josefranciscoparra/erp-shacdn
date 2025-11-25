/**
 * Zustand Store para el Módulo de Turnos
 *
 * Estado centralizado que conecta los componentes con el servicio de turnos.
 * IMPORTANTE: Este store usa la interfaz IShiftService, NO el mock directamente.
 * Para cambiar a API real, solo modificar el import de shiftService.
 */

"use client";

import { endOfWeek } from "date-fns";
import { toast } from "sonner";
import { create } from "zustand";

import { aggregateShiftConflicts, filterConflicts, sortConflicts, paginateConflicts } from "../_lib/conflicts-utils";
import { shiftService } from "../_lib/shift-service";
import { getWeekStart, formatDateISO } from "../_lib/shift-utils";
import type {
  Shift,
  ShiftInput,
  ShiftFilters,
  Zone,
  ZoneInput,
  ShiftTemplate,
  TemplateInput,
  ApplyTemplateInput,
  EmployeeShift,
  CostCenter,
  CalendarView,
  CalendarMode,
  ConflictsFilter,
  ConflictsState,
} from "../_lib/types";

// ==================== TIPOS DEL STORE ====================

interface ShiftsState {
  // ========== DATOS ==========
  shifts: Shift[];
  zones: Zone[];
  templates: ShiftTemplate[];
  employees: EmployeeShift[];
  employeesPage: number;
  hasMoreEmployees: boolean;
  isLoadingMoreEmployees: boolean;
  costCenters: CostCenter[];

  // ========== UI STATE ==========
  isLoading: boolean;
  error: string | null;

  // Vista de calendario
  calendarView: CalendarView; // 'week' | 'month'
  calendarMode: CalendarMode; // 'employee' | 'area'
  currentWeekStart: Date; // Lunes de la semana actual
  filters: ShiftFilters;

  // Modales
  isShiftDialogOpen: boolean;
  selectedShift: Shift | null; // null = crear, Shift = editar
  shiftDialogPrefill: Partial<ShiftInput> | null;

  isTemplateDialogOpen: boolean;
  isTemplateApplyDialogOpen: boolean;
  selectedTemplate: ShiftTemplate | null;

  isZoneDialogOpen: boolean;
  selectedZone: Zone | null;

  // Panel de conflictos
  isConflictsPanelOpen: boolean;
  conflictsFilter: ConflictsFilter;
  conflictsPage: number;
  highlightedShiftId: string | null; // Para resaltar turno al navegar desde el panel

  // ========== ACCIONES - CRUD TURNOS ==========
  fetchShifts: () => Promise<void>;
  createShift: (data: ShiftInput) => Promise<void>;
  updateShift: (id: string, data: Partial<ShiftInput>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  moveShift: (shiftId: string, newEmployeeId?: string, newDate?: string, newZoneId?: string) => Promise<void>;
  copyShift: (shiftId: string, newEmployeeId?: string, newDate?: string, newZoneId?: string) => Promise<void>;
  resizeShift: (shiftId: string, newStartTime: string, newEndTime: string) => Promise<void>;

  // ========== ACCIONES - CRUD ZONAS ==========
  fetchZones: () => Promise<void>;
  createZone: (data: ZoneInput) => Promise<void>;
  updateZone: (id: string, data: Partial<ZoneInput>) => Promise<void>;
  deleteZone: (id: string) => Promise<void>;

  // ========== ACCIONES - CRUD PLANTILLAS ==========
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: TemplateInput) => Promise<void>;
  updateTemplate: (id: string, data: Partial<TemplateInput>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  applyTemplate: (input: ApplyTemplateInput) => Promise<void>;

  // ========== ACCIONES - OPERACIONES MASIVAS ==========
  copyPreviousWeek: () => Promise<void>;
  publishShifts: () => Promise<void>;
  deleteMultipleShifts: (shiftIds: string[]) => Promise<void>;

  // ========== ACCIONES - DATOS AUXILIARES ==========
  fetchEmployees: (page?: number) => Promise<void>;
  fetchCostCenters: () => Promise<void>;

  // ========== ACCIONES - UI ==========
  setCalendarView: (view: CalendarView) => void;
  setCalendarMode: (mode: CalendarMode) => void;
  setCurrentWeek: (weekStart: Date) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  setFilters: (filters: Partial<ShiftFilters>) => void;
  clearFilters: () => void;

  // Modales
  openShiftDialog: (shift?: Shift, prefill?: Partial<ShiftInput>) => void;
  closeShiftDialog: () => void;
  openTemplateDialog: (template?: ShiftTemplate) => void;
  closeTemplateDialog: () => void;
  openTemplateApplyDialog: (template?: ShiftTemplate) => void;
  closeTemplateApplyDialog: () => void;
  openZoneDialog: (zone?: Zone) => void;
  closeZoneDialog: () => void;

  // Panel de conflictos
  openConflictsPanel: () => void;
  closeConflictsPanel: () => void;
  setConflictsFilter: (filter: Partial<ConflictsFilter>) => void;
  setConflictsPage: (page: number) => void;
  navigateToShift: (shiftId: string) => void;
  clearHighlightedShift: () => void;

  // Selectores de conflictos
  getConflictsState: () => ConflictsState;
  getFilteredConflicts: () => ReturnType<typeof paginateConflicts>;
  getTotalConflictsCount: () => number;

  // ========== HELPERS ==========
  setError: (error: string | null) => void;
}

// ==================== STORE ====================

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  // ========== ESTADO INICIAL ==========
  shifts: [],
  zones: [],
  templates: [],
  employees: [],
  employeesPage: 1,
  hasMoreEmployees: true,
  isLoadingMoreEmployees: false,
  costCenters: [],

  isLoading: false,
  error: null,

  calendarView: "week",
  calendarMode: "employee",
  currentWeekStart: getWeekStart(new Date()),
  filters: {},

  isShiftDialogOpen: false,
  selectedShift: null,
  shiftDialogPrefill: null,

  isTemplateDialogOpen: false,
  isTemplateApplyDialogOpen: false,
  selectedTemplate: null,

  isZoneDialogOpen: false,
  selectedZone: null,

  // Panel de conflictos
  isConflictsPanelOpen: false,
  conflictsFilter: { type: "all", severity: "all", search: "" },
  conflictsPage: 0,
  highlightedShiftId: null,

  // ========== CRUD TURNOS ==========

  fetchShifts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, currentWeekStart } = get();

      // Si no hay fechas en los filtros, usar la semana actual
      let dateFrom = filters.dateFrom;
      let dateTo = filters.dateTo;

      if (!dateFrom || !dateTo) {
        const weekStart = getWeekStart(currentWeekStart);
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        dateFrom = formatDateISO(weekStart);
        dateTo = formatDateISO(weekEnd);
      }

      const activeFilters = { ...filters, dateFrom, dateTo };
      const shifts = await shiftService.getShifts(activeFilters);
      set({ shifts, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar turnos";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  createShift: async (data: ShiftInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await shiftService.createShift(data);

      if (response.success && response.data) {
        // Guardar warnings en el shift para mostrar borde naranja/rojo
        const newShiftWithWarnings = {
          ...response.data,
          warnings: response.validation?.conflicts ?? [],
        };

        set((state) => ({
          shifts: [...state.shifts, newShiftWithWarnings],
          isLoading: false,
        }));

        toast.success("Turno creado correctamente");

        // Mostrar warnings como toast
        if (response.validation && response.validation.conflicts.length > 0) {
          const warnings = response.validation.conflicts.filter((c) => c.severity === "warning");
          warnings.forEach((w) => toast.warning(w.message));
        }

        get().closeShiftDialog();
      } else {
        throw new Error(response.error ?? "Error al crear turno");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear turno";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  updateShift: async (id: string, data: Partial<ShiftInput>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await shiftService.updateShift(id, data);

      if (response.success && response.data) {
        // Guardar warnings en el shift para mostrar borde naranja/rojo
        const updatedShiftWithWarnings = {
          ...response.data,
          warnings: response.validation?.conflicts ?? [],
        };

        set((state) => ({
          shifts: state.shifts.map((s) => (s.id === id ? updatedShiftWithWarnings : s)),
          isLoading: false,
        }));

        toast.success("Turno actualizado correctamente");

        // Mostrar warnings como toast
        if (response.validation && response.validation.conflicts.length > 0) {
          const warnings = response.validation.conflicts.filter((c) => c.severity === "warning");
          warnings.forEach((w) => toast.warning(w.message));
        }

        get().closeShiftDialog();
      } else {
        throw new Error(response.error ?? "Error al actualizar turno");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar turno";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  deleteShift: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const success = await shiftService.deleteShift(id);

      if (success) {
        set((state) => ({
          shifts: state.shifts.filter((s) => s.id !== id),
          isLoading: false,
        }));

        toast.success("Turno eliminado correctamente");
      } else {
        throw new Error("Error al eliminar turno");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar turno";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  moveShift: async (shiftId: string, newEmployeeId?: string, newDate?: string, newZoneId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const currentShift = get().shifts.find((s) => s.id === shiftId);
      if (!currentShift) throw new Error("Turno no encontrado");

      // @ts-expect-error - Adaptamos la llamada para pasar el shift completo
      const result = await shiftService.moveShift(currentShift, newEmployeeId, newDate, newZoneId);

      if (result.success && result.updatedShift) {
        // Guardar warnings en el shift para mostrar borde naranja/rojo
        const updatedShiftWithWarnings = {
          ...result.updatedShift,
          warnings: result.conflicts ?? [],
        };

        set((state) => ({
          shifts: state.shifts.map((s) => (s.id === shiftId ? updatedShiftWithWarnings : s)),
          isLoading: false,
        }));

        toast.success("Turno movido correctamente");

        // Mostrar warnings como toast
        if (result.conflicts && result.conflicts.length > 0) {
          result.conflicts.forEach((c) => {
            if (c.severity === "warning") {
              toast.warning(c.message);
            }
          });
        }
      } else {
        // Mostrar el mensaje específico del conflicto si existe
        if (result.conflicts && result.conflicts.length > 0) {
          const errorConflict = result.conflicts.find((c) => c.severity === "error");
          throw new Error(errorConflict?.message ?? "No se pudo mover el turno debido a conflictos");
        }
        throw new Error("Error al mover turno");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al mover turno";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  copyShift: async (shiftId: string, newEmployeeId?: string, newDate?: string, newZoneId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await shiftService.copyShift(shiftId, newEmployeeId, newDate, newZoneId);

      if (result.success && result.updatedShift) {
        // Guardar warnings en el shift para mostrar borde naranja/rojo
        const newShiftWithWarnings = {
          ...result.updatedShift,
          warnings: result.conflicts ?? [],
        };

        set((state) => ({
          shifts: [...state.shifts, newShiftWithWarnings],
          isLoading: false,
        }));

        toast.success("Turno copiado correctamente");

        // Mostrar warnings como toast
        if (result.conflicts && result.conflicts.length > 0) {
          result.conflicts.forEach((c) => {
            if (c.severity === "warning") {
              toast.warning(c.message);
            }
          });
        }
      } else {
        throw new Error("Error al copiar turno");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al copiar turno";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  resizeShift: async (shiftId: string, newStartTime: string, newEndTime: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await shiftService.resizeShift(shiftId, newStartTime, newEndTime);

      if (response.success && response.data) {
        set((state) => ({
          shifts: state.shifts.map((s) => (s.id === shiftId ? response.data! : s)),
          isLoading: false,
        }));

        toast.success("Duración actualizada correctamente");
      } else {
        throw new Error(response.error ?? "Error al redimensionar turno");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al redimensionar turno";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  // ========== CRUD ZONAS ==========

  fetchZones: async () => {
    set({ isLoading: true, error: null });
    try {
      const zones = await shiftService.getZones(get().filters.costCenterId);
      set({ zones, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar zonas";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  createZone: async (data: ZoneInput) => {
    set({ isLoading: true, error: null });
    try {
      const newZone = await shiftService.createZone(data);
      set((state) => ({
        zones: [...state.zones, newZone],
        isLoading: false,
      }));

      toast.success("Zona creada correctamente");
      get().closeZoneDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear zona";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  updateZone: async (id: string, data: Partial<ZoneInput>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await shiftService.updateZone(id, data);
      set((state) => ({
        zones: state.zones.map((z) => (z.id === id ? updated : z)),
        isLoading: false,
      }));

      toast.success("Zona actualizada correctamente");
      get().closeZoneDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar zona";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  deleteZone: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const success = await shiftService.deleteZone(id);

      if (success) {
        set((state) => ({
          zones: state.zones.filter((z) => z.id !== id),
          isLoading: false,
        }));

        toast.success("Zona eliminada correctamente");
      } else {
        throw new Error("Error al eliminar zona");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar zona";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  // ========== CRUD PLANTILLAS ==========

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await shiftService.getTemplates();
      set({ templates, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar plantillas";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  createTemplate: async (data: TemplateInput) => {
    set({ isLoading: true, error: null });
    try {
      const newTemplate = await shiftService.createTemplate(data);
      set((state) => ({
        templates: [...state.templates, newTemplate],
        isLoading: false,
      }));

      toast.success("Plantilla creada correctamente");
      get().closeTemplateDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear plantilla";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  updateTemplate: async (id: string, data: Partial<TemplateInput>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await shiftService.updateTemplate(id, data);
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? updated : t)),
        isLoading: false,
      }));

      toast.success("Plantilla actualizada correctamente");
      get().closeTemplateDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar plantilla";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  deleteTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const success = await shiftService.deleteTemplate(id);

      if (success) {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          isLoading: false,
        }));

        toast.success("Plantilla eliminada correctamente");
      } else {
        throw new Error("Error al eliminar plantilla");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar plantilla";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  applyTemplate: async (input: ApplyTemplateInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await shiftService.applyTemplate(input);

      if (!response.success) {
        throw new Error(response.error ?? "Error al aplicar plantilla");
      }

      await get().fetchShifts();
      set({ isLoading: false });
      toast.success(`Plantilla aplicada: ${response.totalCreated} turnos creados`);

      if (response.skipped && response.skipped > 0) {
        toast.warning(`${response.skipped} turnos no se crearon por conflictos`);
      }

      if (response.conflicts && response.conflicts.length > 0) {
        response.conflicts.forEach((conflict) => {
          if (conflict.severity === "warning") {
            toast.warning(conflict.message);
          } else {
            toast.error(conflict.message);
          }
        });
      }

      get().closeTemplateApplyDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al aplicar plantilla";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  // ========== OPERACIONES MASIVAS ==========

  copyPreviousWeek: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentWeek = formatDateISO(get().currentWeekStart);
      const previousWeek = formatDateISO(getPreviousWeek(get().currentWeekStart));

      const copiedCount = await shiftService.copyWeek(previousWeek, currentWeek, get().filters);

      // Refrescar turnos
      await get().fetchShifts();

      toast.success(`${copiedCount} turnos copiados desde la semana anterior`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al copiar semana";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  publishShifts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await shiftService.publishShifts(get().filters);

      if (!response.success) {
        throw new Error(response.error ?? "Error al publicar turnos");
      }

      await get().fetchShifts();
      set({ isLoading: false });
      toast.success(`${response.publishedCount} turnos publicados correctamente`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al publicar turnos";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  deleteMultipleShifts: async (shiftIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const deletedCount = await shiftService.deleteMultipleShifts(shiftIds);

      set((state) => ({
        shifts: state.shifts.filter((s) => !shiftIds.includes(s.id)),
        isLoading: false,
      }));

      toast.success(`${deletedCount} turnos eliminados correctamente`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar turnos";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  // ========== DATOS AUXILIARES ==========

  fetchEmployees: async (page = 1) => {
    const isFirstPage = page === 1;
    if (isFirstPage) {
      set({ isLoading: true, error: null, employeesPage: 1, hasMoreEmployees: true });
    } else {
      set({ isLoadingMoreEmployees: true, error: null });
    }

    try {
      const pageSize = 20;
      const { costCenterId, searchQuery } = get().filters;
      const newEmployees = await shiftService.getShiftEmployees(costCenterId, page, pageSize, searchQuery);

      set((state) => {
        const updatedEmployees = isFirstPage ? newEmployees : [...state.employees, ...newEmployees];

        // Filtrar duplicados por si acaso
        const uniqueEmployees = Array.from(new Map(updatedEmployees.map((e) => [e.id, e])).values());

        return {
          employees: uniqueEmployees,
          employeesPage: page,
          hasMoreEmployees: newEmployees.length === pageSize,
          isLoading: false,
          isLoadingMoreEmployees: false,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar empleados";
      set({ error: errorMessage, isLoading: false, isLoadingMoreEmployees: false });
      toast.error(errorMessage);
    }
  },

  fetchCostCenters: async () => {
    set({ isLoading: true, error: null });
    try {
      const costCenters = await shiftService.getCostCenters();
      set({ costCenters, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cargar lugares";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  // ========== UI ==========

  setCalendarView: (view) => set({ calendarView: view }),
  setCalendarMode: (mode) => set({ calendarMode: mode }),
  setCurrentWeek: (weekStart) => {
    set({ currentWeekStart: weekStart });
    get().fetchShifts();
  },

  goToPreviousWeek: () => {
    const prev = new Date(get().currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    set({ currentWeekStart: getWeekStart(prev) });
    get().fetchShifts();
  },

  goToNextWeek: () => {
    const next = new Date(get().currentWeekStart);
    next.setDate(next.getDate() + 7);
    set({ currentWeekStart: getWeekStart(next) });
    get().fetchShifts();
  },

  goToToday: () => {
    set({ currentWeekStart: getWeekStart(new Date()) });
    get().fetchShifts();
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchShifts();
  },

  clearFilters: () => set({ filters: {} }),

  // Modales
  openShiftDialog: (shift, prefill) =>
    set({ isShiftDialogOpen: true, selectedShift: shift ?? null, shiftDialogPrefill: prefill ?? null }),
  closeShiftDialog: () => set({ isShiftDialogOpen: false, selectedShift: null, shiftDialogPrefill: null }),

  openTemplateDialog: (template) => set({ isTemplateDialogOpen: true, selectedTemplate: template ?? null }),
  closeTemplateDialog: () => set({ isTemplateDialogOpen: false, selectedTemplate: null }),
  openTemplateApplyDialog: (template) => set({ isTemplateApplyDialogOpen: true, selectedTemplate: template ?? null }),
  closeTemplateApplyDialog: () => set({ isTemplateApplyDialogOpen: false, selectedTemplate: null }),

  openZoneDialog: (zone) => set({ isZoneDialogOpen: true, selectedZone: zone ?? null }),
  closeZoneDialog: () => set({ isZoneDialogOpen: false, selectedZone: null }),

  // Panel de conflictos
  openConflictsPanel: () => set({ isConflictsPanelOpen: true, conflictsPage: 0 }),
  closeConflictsPanel: () => set({ isConflictsPanelOpen: false }),

  setConflictsFilter: (filter) =>
    set((state) => ({
      conflictsFilter: { ...state.conflictsFilter, ...filter },
      conflictsPage: 0, // Reset página al cambiar filtros
    })),

  setConflictsPage: (page) => set({ conflictsPage: page }),

  navigateToShift: (shiftId) => {
    // Cerrar panel y resaltar el turno
    set({ isConflictsPanelOpen: false, highlightedShiftId: shiftId });

    // Quitar el resaltado después de 3 segundos
    setTimeout(() => {
      set({ highlightedShiftId: null });
    }, 3000);
  },

  clearHighlightedShift: () => set({ highlightedShiftId: null }),

  // Selectores de conflictos
  getConflictsState: () => {
    const { shifts, employees, costCenters, zones } = get();
    return aggregateShiftConflicts(shifts, employees, costCenters, zones);
  },

  getFilteredConflicts: () => {
    const { shifts, employees, costCenters, zones, conflictsFilter, conflictsPage } = get();
    const conflictsState = aggregateShiftConflicts(shifts, employees, costCenters, zones);
    const filtered = filterConflicts(conflictsState.all, conflictsFilter);
    const sorted = sortConflicts(filtered);
    return paginateConflicts(sorted, conflictsPage, 20);
  },

  getTotalConflictsCount: () => {
    const { shifts } = get();
    return shifts.filter((s) => s.status === "conflict").length;
  },

  // Helpers
  setError: (error) => set({ error }),
}));

// ==================== HELPERS PRIVADOS ====================

function getPreviousWeek(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 7);
  return prev;
}
