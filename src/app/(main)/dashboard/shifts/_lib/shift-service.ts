/**
 * Servicio de Turnos (Adaptador para Backend Real)
 *
 * Conecta el store de Zustand con las Server Actions de schedules-v2.ts.
 * Realiza la conversión de tipos entre el modelo Prisma y el modelo UI.
 */

import { minutesToTime, timeToMinutes } from "@/lib/schedule-helpers";
import {
  createManualShiftAssignment,
  deleteManualShiftAssignment,
  deleteManualShiftAssignmentById,
  getManualShiftAssignmentsForRange,
  getCostCentersForFilters,
  getEmployeesForBulkAssignment,
  searchEmployees as searchEmployeesAction,
} from "@/server/actions/schedules-v2.ts";

import { formatDateISO } from "./shift-utils";
import type {
  Shift,
  ShiftInput,
  ShiftFilters,
  ShiftServiceResponse,
  EmployeeShift,
  CostCenter,
  Zone,
  ZoneInput,
  ShiftTemplate,
  TemplateInput,
  ApplyTemplateInput,
  ApplyTemplateResponse,
  PublishShiftsResponse,
} from "./types";

// ==================== ADAPTADOR ====================

export const shiftService = {
  /**
   * Obtiene turnos según filtros
   */
  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    const { employeeId, dateFrom, dateTo, costCenterId } = filters;

    if (!dateFrom || !dateTo) {
      // Si no hay fechas, devolver vacío (o defaults de la semana actual si quisiéramos)
      return [];
    }

    // 1. Obtener empleados (si no se especifica uno, obtener todos los filtrados por centro)
    let employeeIds: string[] = [];
    if (employeeId) {
      employeeIds = [employeeId];
    } else {
      // Necesitamos obtener los IDs de empleados para consultar sus turnos
      // Usamos el helper existente para obtener empleados
      const employees = await getEmployeesForBulkAssignment("dummy", {
        costCenterIds: costCenterId ? [costCenterId] : undefined,
      });
      employeeIds = employees.map((e) => e.id);
    }

    if (employeeIds.length === 0) return [];

    // 2. Llamar a la server action
    const assignments = await getManualShiftAssignmentsForRange(employeeIds, new Date(dateFrom), new Date(dateTo));

    // 3. Mapear a modelo UI (Shift)
    return assignments.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      date: formatDateISO(a.date),
      startTime: a.startTimeMinutes !== null ? minutesToTime(a.startTimeMinutes) : "09:00", // Default si es null
      endTime: a.endTimeMinutes !== null ? minutesToTime(a.endTimeMinutes) : "17:00", // Default si es null
      costCenterId: a.costCenterId ?? a.orgId, // Fallback a orgId si no hay centro específico
      zoneId: "default", // TODO: Implementar zonas reales
      role: a.scheduleTemplate.name,
      status: "published", // Por defecto published para manual
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  },

  /**
   * Crea un nuevo turno manual
   */
  async createShift(data: ShiftInput): Promise<ShiftServiceResponse> {
    const result = await createManualShiftAssignment({
      employeeId: data.employeeId,
      date: new Date(data.date),
      scheduleTemplateId: "cmi4mjybh000hsf96s6i76mt3", // TODO: Usar selector de plantillas en el diálogo
      startTimeMinutes: timeToMinutes(data.startTime),
      endTimeMinutes: timeToMinutes(data.endTime),
      costCenterId: data.costCenterId,
      // zoneId: data.zoneId // Ignoramos zona por ahora en el backend
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    // Devolver el shift creado (construido con los datos de entrada + ID generado)
    return {
      success: true,
      data: {
        id: result.data.id,
        employeeId: data.employeeId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        costCenterId: data.costCenterId,
        zoneId: data.zoneId,
        status: "published",
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "Manual Shift", // Placeholder
      },
    };
  },

  /**
   * Actualiza un turno existente
   */
  async updateShift(id: string, data: Partial<ShiftInput>): Promise<ShiftServiceResponse> {
    // Reutilizamos create (upsert) para actualizar, pero necesitamos todos los datos
    // En una implementación real, createManualShiftAssignment usa upsert por (employeeId, date)
    // Pero si cambiamos la fecha o empleado, es un delete + create.
    // Asumiremos que el ID del turno manual es estable si no cambia la PK compuesta.

    // Por ahora, para simplificar y dado que la API usa upsert por fecha/empleado:
    if (!data.employeeId || !data.date) {
      return { success: false, error: "Faltan datos obligatorios para actualizar" };
    }

    const result = await createManualShiftAssignment({
      employeeId: data.employeeId,
      date: new Date(data.date),
      scheduleTemplateId: "cmi4mjybh000hsf96s6i76mt3", // TODO: Recuperar el template actual
      startTimeMinutes: data.startTime ? timeToMinutes(data.startTime) : undefined,
      endTimeMinutes: data.endTime ? timeToMinutes(data.endTime) : undefined,
      costCenterId: data.costCenterId,
      // zoneId: data.zoneId
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        id: result.data.id,
        employeeId: data.employeeId,
        date: data.date,
        startTime: data.startTime ?? "00:00",
        endTime: data.endTime ?? "00:00",
        costCenterId: data.costCenterId ?? "",
        zoneId: data.zoneId ?? "",
        status: "published",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  },

  /**
   * Elimina un turno
   */
  async deleteShift(id: string): Promise<boolean> {
    const result = await deleteManualShiftAssignmentById(id);
    return result.success;
  },

  /**
   * Mover un turno (Drag & Drop)
   */
  async moveShift(
    // @ts-expect-error - Store pasa el objeto completo
    currentShift: Shift,
    newEmployeeId?: string,
    newDate?: string,
    newZoneId?: string,
  ): Promise<{ success: boolean; updatedShift?: Shift; conflicts?: any[] }> {
    // 1. Eliminar el turno original
    const deleteResult = await deleteManualShiftAssignmentById(currentShift.id);
    if (!deleteResult.success) {
      return { success: false, conflicts: [] };
    }

    // 2. Preparar datos para el nuevo turno
    const createData: ShiftInput = {
      employeeId: newEmployeeId ?? currentShift.employeeId,
      date: newDate ?? currentShift.date,
      startTime: currentShift.startTime,
      endTime: currentShift.endTime,
      costCenterId: currentShift.costCenterId, // Mantenemos centro
      zoneId: newZoneId ?? currentShift.zoneId ?? "default",
      // role, notes se pierden si no están en ShiftInput o si createManualShiftAssignment no los soporta aún
    };

    // 3. Crear el nuevo turno
    const createResult = await this.createShift(createData);

    if (!createResult.success || !createResult.data) {
      // TODO: Rollback? Re-crear el original?
      console.error("Failed to create new shift after deleting old one during move");
      return { success: false, conflicts: [] };
    }

    return {
      success: true,
      updatedShift: createResult.data,
      conflicts: createResult.validation?.conflicts,
    };
  },

  /**
   * Copiar un turno (Alt + Drag)
   */
  async copyShift(
    shiftId: string,
    newEmployeeId?: string,
    newDate?: string,
    newZoneId?: string,
  ): Promise<{ success: boolean; updatedShift?: Shift; conflicts?: any[] }> {
    return { success: false }; // Placeholder
  },

  /**
   * Redimensionar turno
   */
  async resizeShift(shiftId: string, newStartTime: string, newEndTime: string): Promise<ShiftServiceResponse> {
    return { success: false, error: "Not implemented" };
  },

  // ========== EMPLEADOS Y CENTROS ==========

  async getShiftEmployees(costCenterId?: string): Promise<EmployeeShift[]> {
    const employees = await getEmployeesForBulkAssignment("dummy", {
      costCenterIds: costCenterId ? [costCenterId] : undefined,
    });

    return employees.map((e) => ({
      id: e.id,
      firstName: e.fullName.split(" ")[0],
      lastName: e.fullName.split(" ").slice(1).join(" "),
      contractHours: 40, // TODO: Sacar del contrato real
      usesShiftSystem: true,
      costCenterId: undefined, // TODO
      absences: [],
    }));
  },

  async getCostCenters(): Promise<CostCenter[]> {
    const centers = await getCostCentersForFilters();
    return centers.map((c) => ({
      id: c.id,
      name: c.name,
      timezone: "Europe/Madrid",
      active: true,
    }));
  },

  async searchEmployees(term: string) {
    return await searchEmployeesAction(term);
  },

  // ========== MOCKS / PLACEHOLDERS PARA FUNCIONES NO IMPLEMENTADAS EN BACKEND AÚN ==========

  async getZones(costCenterId?: string): Promise<Zone[]> {
    return [];
  },
  async createZone(data: ZoneInput): Promise<Zone> {
    throw new Error("Not implemented");
  },
  async updateZone(id: string, data: Partial<ZoneInput>): Promise<Zone> {
    throw new Error("Not implemented");
  },
  async deleteZone(id: string): Promise<boolean> {
    return true;
  },

  async getTemplates(): Promise<ShiftTemplate[]> {
    return [];
  },
  async createTemplate(data: TemplateInput): Promise<ShiftTemplate> {
    throw new Error("Not implemented");
  },
  async updateTemplate(id: string, data: Partial<TemplateInput>): Promise<ShiftTemplate> {
    throw new Error("Not implemented");
  },
  async deleteTemplate(id: string): Promise<boolean> {
    return true;
  },

  async applyTemplate(input: ApplyTemplateInput): Promise<ApplyTemplateResponse> {
    return { success: false, totalCreated: 0 };
  },

  async copyWeek(from: string, to: string, filters: ShiftFilters): Promise<number> {
    return 0;
  },
  async publishShifts(filters: ShiftFilters): Promise<PublishShiftsResponse> {
    return { success: true, publishedCount: 0 };
  },
  async deleteMultipleShifts(ids: string[]): Promise<number> {
    return 0;
  },
};
