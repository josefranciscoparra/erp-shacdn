/**
 * Servicio de Turnos (Adaptador para Backend Real)
 *
 * Conecta el store de Zustand con las Server Actions de schedules-v2.ts.
 * Realiza la conversión de tipos entre el modelo Prisma y el modelo UI.
 */

"use client";

import {
  createManualShiftAssignment,
  deleteManualShiftAssignmentById,
  updateManualShiftAssignment,
  getManualShiftAssignmentById,
  getManualShiftAssignmentsForRange,
  getCostCentersForFilters,
  searchEmployees as searchEmployeesAction,
  getShiftEmployeesPaginated,
  getWorkZones,
  createWorkZone,
  updateWorkZone,
  deleteWorkZone as deleteWorkZoneAction,
  copyManualShiftAssignmentsFromWeek,
  publishManualShiftAssignments,
  deleteMultipleManualShiftAssignments,
  getManualShiftTemplates,
  createManualShiftTemplate,
  updateManualShiftTemplate,
  deleteManualShiftTemplate,
  applyManualShiftTemplate,
  restoreManualShiftAssignments,
  getAbsencesForRange,
} from "@/server/actions/schedules-v2.ts";
import { minutesToTime, timeToMinutes } from "@/services/schedules";

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
  Conflict,
  ConflictType,
  ShiftStatus,
  Absence,
} from "./types";

type ServerShiftStatus = "DRAFT" | "PUBLISHED" | "CONFLICT";

interface ManualAssignmentRecord {
  id: string;
  employeeId: string;
  date: Date;
  startTimeMinutes: number | null;
  endTimeMinutes: number | null;
  breakMinutes: number | null;
  costCenterId: string | null;
  workZoneId: string | null;
  customRole: string | null;
  notes: string | null;
  status: ServerShiftStatus;
  scheduleTemplateId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  scheduleTemplate?: { id: string; name: string } | null;
  workZone?: { id: string; name: string } | null;
  employee?: { firstName: string; lastName: string; photoUrl?: string | null } | null;
}

const STATUS_TO_UI: Record<ServerShiftStatus, ShiftStatus> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CONFLICT: "conflict",
};

const STATUS_TO_SERVER: Record<ShiftStatus, ServerShiftStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  conflict: "CONFLICT",
};

export const shiftService = {
  /**
   * Obtiene ausencias (vacaciones/bajas)
   */
  async getAbsences(filters: ShiftFilters): Promise<Absence[]> {
    if (!filters.dateFrom || !filters.dateTo) return [];

    const absences = await getAbsencesForRange(
      toDate(filters.dateFrom),
      toDate(filters.dateTo),
      filters.employeeId ? [filters.employeeId] : undefined,
    );

    return absences.map((abs) => ({
      id: abs.id,
      employeeId: abs.employeeId,
      startDate: formatDateISO(abs.startDate),
      endDate: formatDateISO(abs.endDate),
      type: abs.type,
      code: abs.code,
    }));
  },

  /**
   * Obtiene turnos según filtros activos
   */
  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    if (!filters.dateFrom || !filters.dateTo) {
      return [];
    }

    const assignments = await getManualShiftAssignmentsForRange(
      filters.employeeId ? [filters.employeeId] : undefined,
      toDate(filters.dateFrom),
      toDate(filters.dateTo),
      {
        costCenterId: filters.costCenterId,
        workZoneId: filters.zoneId,
        statuses: filters.status ? [STATUS_TO_SERVER[filters.status]] : undefined,
      },
    );

    return assignments.map(mapAssignmentToShift);
  },

  async getShiftById(id: string): Promise<Shift | null> {
    const assignment = await getManualShiftAssignmentById(id);
    return assignment ? mapAssignmentToShift(assignment as ManualAssignmentRecord) : null;
  },

  /**
   * Crea un nuevo turno manual
   */
  async createShift(data: ShiftInput): Promise<ShiftServiceResponse> {
    try {
      const result = await createManualShiftAssignment({
        employeeId: data.employeeId,
        date: toDate(data.date),
        scheduleTemplateId: data.scheduleTemplateId ?? null,
        startTimeMinutes: timeToMinutes(data.startTime),
        endTimeMinutes: timeToMinutes(data.endTime),
        costCenterId: data.costCenterId,
        workZoneId: normalizeZoneId(data.zoneId),
        breakMinutes: data.breakMinutes,
        customRole: data.role,
        notes: data.notes,
        status: STATUS_TO_SERVER[data.status ?? "draft"],
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error ?? "Error al crear turno" };
      }

      const created = await getManualShiftAssignmentById(result.data.id);
      if (!created) {
        return { success: false, error: "No se pudo recuperar el turno creado" };
      }

      return {
        success: true,
        data: mapAssignmentToShift(created as ManualAssignmentRecord),
        validation: mapValidationResultFromServer(result.validation?.conflicts),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear turno";
      return { success: false, error: errorMessage };
    }
  },

  async updateShift(id: string, data: Partial<ShiftInput>): Promise<ShiftServiceResponse> {
    try {
      const payload: Record<string, unknown> = {};

      if (data.employeeId) payload.employeeId = data.employeeId;
      if (data.date) payload.date = toDate(data.date);
      if (data.startTime) payload.startTimeMinutes = timeToMinutes(data.startTime);
      if (data.endTime) payload.endTimeMinutes = timeToMinutes(data.endTime);
      if (data.costCenterId !== undefined) payload.costCenterId = data.costCenterId;
      if (data.zoneId !== undefined) payload.workZoneId = normalizeZoneId(data.zoneId);
      if (data.scheduleTemplateId !== undefined) payload.scheduleTemplateId = data.scheduleTemplateId;
      if (data.breakMinutes !== undefined) payload.breakMinutes = data.breakMinutes;
      if (data.role !== undefined) payload.customRole = data.role;
      if (data.notes !== undefined) payload.notes = data.notes;
      if (data.status) payload.status = STATUS_TO_SERVER[data.status];

      const result = await updateManualShiftAssignment(id, payload);
      if (!result.success) {
        return { success: false, error: result.error ?? "Error al actualizar turno" };
      }

      const updated = await getManualShiftAssignmentById(id);
      if (!updated) {
        return { success: false, error: "Turno no encontrado tras actualizar" };
      }

      return {
        success: true,
        data: mapAssignmentToShift(updated as ManualAssignmentRecord),
        validation: mapValidationResultFromServer(result.validation?.conflicts),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar turno";
      return { success: false, error: errorMessage };
    }
  },

  async deleteShift(id: string): Promise<boolean> {
    const result = await deleteManualShiftAssignmentById(id);
    return result.success;
  },

  async moveShift(shift: Shift, newEmployeeId?: string, newDate?: string, newZoneId?: string) {
    try {
      const payload: Record<string, unknown> = {};

      if (newEmployeeId && newEmployeeId !== shift.employeeId) {
        payload.employeeId = newEmployeeId;
      }

      if (newDate && newDate !== shift.date) {
        payload.date = toDate(newDate);
      }

      if (newZoneId && newZoneId !== shift.zoneId) {
        payload.workZoneId = newZoneId;
      }

      if (Object.keys(payload).length === 0) {
        return { success: true, updatedShift: shift };
      }

      const result = await updateManualShiftAssignment(shift.id, payload);
      if (!result.success) {
        return {
          success: false,
          conflicts: mapValidationResultFromServer(result.validation?.conflicts)?.conflicts ?? [],
        };
      }

      const updated = await getManualShiftAssignmentById(shift.id);
      const validation = mapValidationResultFromServer(result.validation?.conflicts);
      return {
        success: true,
        updatedShift: updated ? mapAssignmentToShift(updated as ManualAssignmentRecord) : undefined,
        conflicts: validation?.conflicts,
      };
    } catch {
      return { success: false, conflicts: [] };
    }
  },

  async copyShift(shiftId: string, newEmployeeId?: string, newDate?: string, newZoneId?: string) {
    const original = await getManualShiftAssignmentById(shiftId);
    if (!original) {
      return { success: false };
    }

    const payload = {
      employeeId: newEmployeeId ?? original.employeeId,
      date: toDate(newDate ?? formatDateISO(original.date ?? new Date())),
      scheduleTemplateId: original.scheduleTemplateId,
      startTimeMinutes: original.startTimeMinutes ?? undefined,
      endTimeMinutes: original.endTimeMinutes ?? undefined,
      costCenterId: original.costCenterId ?? undefined,
      workZoneId: normalizeZoneId(newZoneId ?? original.workZoneId ?? undefined),
      breakMinutes: original.breakMinutes ?? undefined,
      customRole: original.customRole ?? undefined,
      notes: original.notes ?? undefined,
      status: "DRAFT" as ServerShiftStatus,
    };

    const result = await createManualShiftAssignment(payload);
    if (!result.success || !result.data) {
      return {
        success: false,
        conflicts: mapValidationResultFromServer(result.validation?.conflicts)?.conflicts ?? [],
      };
    }

    const created = await getManualShiftAssignmentById(result.data.id);
    const validation = mapValidationResultFromServer(result.validation?.conflicts);
    return {
      success: true,
      updatedShift: created ? mapAssignmentToShift(created as ManualAssignmentRecord) : undefined,
      conflicts: validation?.conflicts,
    };
  },

  async resizeShift(shiftId: string, newStartTime: string, newEndTime: string): Promise<ShiftServiceResponse> {
    try {
      const result = await updateManualShiftAssignment(shiftId, {
        startTimeMinutes: timeToMinutes(newStartTime),
        endTimeMinutes: timeToMinutes(newEndTime),
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error ?? "Error al actualizar duración",
          validation: mapValidationResultFromServer(result.validation?.conflicts),
        };
      }

      const updated = await getManualShiftAssignmentById(shiftId);
      if (!updated) {
        return { success: false, error: "No se pudo recuperar el turno" };
      }

      return {
        success: true,
        data: mapAssignmentToShift(updated as ManualAssignmentRecord),
        validation: mapValidationResultFromServer(result.validation?.conflicts),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al redimensionar turno";
      return { success: false, error: errorMessage };
    }
  },

  async getShiftEmployees(
    costCenterId?: string,
    page = 1,
    pageSize = 20,
    searchQuery?: string,
  ): Promise<EmployeeShift[]> {
    const result = await getShiftEmployeesPaginated(page, pageSize, { costCenterId, query: searchQuery });

    return result.data.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      employeeNumber: e.employeeNumber,
      position: e.position,
      contractHours: e.contractHours,
      usesShiftSystem: e.usesShiftSystem,
      costCenterId: e.costCenterId ?? undefined,
      absences: e.absences,
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

  async getZones(costCenterId?: string): Promise<Zone[]> {
    const zones = await getWorkZones(costCenterId);
    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      costCenterId: z.costCenterId,
      requiredCoverage: (z.requiredCoverage as any) ?? { morning: 0, afternoon: 0, night: 0 },
      active: z.isActive,
      createdAt: z.createdAt,
      updatedAt: z.updatedAt,
    }));
  },

  async createZone(data: ZoneInput): Promise<Zone> {
    const newZone = await createWorkZone({
      name: data.name,
      costCenterId: data.costCenterId,
      requiredCoverage: data.requiredCoverage,
    });

    return {
      id: newZone.id,
      name: newZone.name,
      costCenterId: newZone.costCenterId,
      requiredCoverage: (newZone.requiredCoverage as any) ?? { morning: 0, afternoon: 0, night: 0 },
      active: newZone.isActive,
      createdAt: newZone.createdAt,
      updatedAt: newZone.updatedAt,
    };
  },

  async updateZone(id: string, data: Partial<ZoneInput>): Promise<Zone> {
    const updatedZone = await updateWorkZone(id, {
      name: data.name,
      isActive: data.active,
      requiredCoverage: data.requiredCoverage,
    });

    return {
      id: updatedZone.id,
      name: updatedZone.name,
      costCenterId: updatedZone.costCenterId,
      requiredCoverage: (updatedZone.requiredCoverage as any) ?? { morning: 0, afternoon: 0, night: 0 },
      active: updatedZone.isActive,
      createdAt: updatedZone.createdAt,
      updatedAt: updatedZone.updatedAt,
    };
  },

  async deleteZone(id: string): Promise<boolean> {
    const result = await deleteWorkZoneAction(id);
    return result.success;
  },

  async getTemplates(): Promise<ShiftTemplate[]> {
    const templates = await getManualShiftTemplates();
    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      pattern: template.pattern as ShiftTemplate["pattern"],
      shiftDuration: template.shiftDurationMinutes / 60,
      active: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }));
  },

  async createTemplate(data: TemplateInput): Promise<ShiftTemplate> {
    const template = await createManualShiftTemplate({
      name: data.name,
      description: data.description,
      pattern: data.pattern,
      shiftDurationMinutes: Math.round(data.shiftDuration * 60),
      isActive: data.active ?? true,
    });

    return {
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      pattern: template.pattern as ShiftTemplate["pattern"],
      shiftDuration: template.shiftDurationMinutes / 60,
      active: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  },

  async updateTemplate(id: string, data: Partial<TemplateInput>): Promise<ShiftTemplate> {
    const template = await updateManualShiftTemplate(id, {
      name: data.name,
      description: data.description,
      pattern: data.pattern,
      shiftDurationMinutes: data.shiftDuration !== undefined ? Math.round(data.shiftDuration * 60) : undefined,
      isActive: data.active,
    });

    return {
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      pattern: template.pattern as ShiftTemplate["pattern"],
      shiftDuration: template.shiftDurationMinutes / 60,
      active: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await deleteManualShiftTemplate(id);
    return result.success;
  },

  async applyTemplate(input: ApplyTemplateInput): Promise<ApplyTemplateResponse> {
    const response = await applyManualShiftTemplate({
      templateId: input.templateId,
      employeeIds: input.employeeIds,
      dateFrom: toDate(input.dateFrom),
      dateTo: toDate(input.dateTo),
      costCenterId: input.costCenterId,
      workZoneId: input.zoneId,
      initialGroup: input.initialGroup,
    });

    if (!response.success) {
      return {
        success: false,
        totalCreated: 0,
        error: response.error,
        conflicts: mapValidationResultFromServer(response.conflicts)?.conflicts,
      };
    }

    return {
      success: true,
      totalCreated: response.created ?? 0,
      skipped: response.skipped ?? 0,
      conflicts: mapValidationResultFromServer(response.conflicts)?.conflicts,
    };
  },

  async copyWeek(from: string, to: string, filters: ShiftFilters, overwrite = false): Promise<number> {
    const response = await copyManualShiftAssignmentsFromWeek(toDate(from), toDate(to), {
      employeeIds: filters.employeeId ? [filters.employeeId] : undefined,
      costCenterId: filters.costCenterId,
      workZoneId: filters.zoneId,
      shouldOverwrite: overwrite,
    });

    return response.success ? (response.data?.copied ?? 0) : 0;
  },

  async restoreWeek(shifts: any[]): Promise<boolean> {
    const response = await restoreManualShiftAssignments(shifts);
    return response.success;
  },

  async publishShifts(filters: ShiftFilters, employeeIds?: string[]): Promise<PublishShiftsResponse> {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, publishedCount: 0, error: "Faltan fechas" };
    }

    // Priorizar la lista explícita de IDs, sino usar el filtro singular
    const targetEmployeeIds = employeeIds ?? (filters.employeeId ? [filters.employeeId] : undefined);

    const response = await publishManualShiftAssignments(toDate(filters.dateFrom), toDate(filters.dateTo), {
      employeeIds: targetEmployeeIds,
      costCenterId: filters.costCenterId,
      workZoneId: filters.zoneId,
      statuses: filters.status ? [STATUS_TO_SERVER[filters.status]] : undefined,
    });

    return {
      success: response.success,
      publishedCount: response.data?.published ?? 0,
      error: response.error,
    };
  },

  async deleteMultipleShifts(ids: string[]): Promise<number> {
    return await deleteMultipleManualShiftAssignments(ids);
  },
};

function mapAssignmentToShift(assignment: ManualAssignmentRecord): Shift {
  const start = assignment.startTimeMinutes ?? 9 * 60;
  const end = assignment.endTimeMinutes ?? start + 8 * 60;

  return {
    id: assignment.id,
    employeeId: assignment.employeeId,
    employeeName: assignment.employee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : undefined,
    employeeAvatar: assignment.employee?.photoUrl ?? undefined,
    date: formatDateISO(assignment.date),
    startTime: minutesToTime(start),
    endTime: minutesToTime(end),
    breakMinutes: assignment.breakMinutes ?? undefined,
    costCenterId: assignment.costCenterId ?? "",
    zoneId: assignment.workZoneId ?? "",
    scheduleTemplateId: assignment.scheduleTemplateId ?? undefined,
    role: assignment.customRole ?? assignment.scheduleTemplate?.name,
    status: STATUS_TO_UI[assignment.status],
    notes: assignment.notes ?? undefined,
    publishedAt: assignment.publishedAt ?? undefined,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function normalizeZoneId(value?: string | null) {
  if (!value) {
    return undefined;
  }
  return value;
}

type ServerValidationConflict = {
  type?: string;
  message: string;
  severity: "error" | "warning";
  relatedAssignmentId?: string;
};

function mapValidationResultFromServer(conflicts?: ServerValidationConflict[]) {
  if (!conflicts || conflicts.length === 0) {
    return undefined;
  }

  return {
    isValid: conflicts.every((conflict) => conflict.severity !== "error"),
    conflicts: conflicts.map(mapConflictFromServer),
    warnings: [],
  };
}

function mapConflictFromServer(conflict: ServerValidationConflict): Conflict {
  return {
    type: (conflict.type as ConflictType) ?? "overlap",
    message: conflict.message,
    severity: conflict.severity,
    relatedShiftId: conflict.relatedAssignmentId,
  };
}
