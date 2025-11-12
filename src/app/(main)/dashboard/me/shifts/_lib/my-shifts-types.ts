/**
 * Tipos para el Módulo "Mis Turnos" (Empleados)
 */

import type { Shift } from "@/app/(main)/dashboard/shifts/_lib/types";

/**
 * Solicitud de Cambio de Turno
 * Un empleado puede solicitar cambiar o intercambiar un turno
 */
export interface ShiftChangeRequest {
  id: string;
  shiftId: string; // Turno que se quiere cambiar
  requesterId: string; // Empleado que solicita
  requesterName: string; // Nombre del empleado que solicita
  reason: string; // Motivo del cambio
  status: "pending" | "approved" | "rejected";
  suggestedEmployeeId?: string; // Empleado sugerido para intercambio (opcional)
  suggestedEmployeeName?: string;
  suggestedDate?: string; // Fecha alternativa sugerida (opcional)
  reviewerId?: string; // Manager que revisa
  reviewerName?: string;
  reviewNotes?: string; // Comentarios del reviewer
  createdAt: Date;
  reviewedAt?: Date;
}

/**
 * Input para crear una solicitud de cambio
 */
export interface ShiftChangeRequestInput {
  shiftId: string;
  reason: string;
  suggestedEmployeeId?: string;
  suggestedDate?: string;
}

/**
 * Métricas personales de turnos
 */
export interface MyShiftsMetrics {
  // Horas esta semana
  weekHoursAssigned: number; // Horas asignadas esta semana
  weekHoursContracted: number; // Horas contratadas por semana
  weekProgress: number; // Porcentaje (0-100)

  // Próximo turno
  nextShift: Shift | null;
  hoursUntilNextShift: number; // Horas hasta el próximo turno

  // Turnos este mes
  monthTotalShifts: number;
  monthTotalHours: number;

  // Balance semanal
  weekBalance: number; // Diferencia entre asignadas y contratadas (puede ser negativo)
  weekBalanceStatus: "under" | "ok" | "over"; // Menos de lo esperado, OK, más de lo esperado
}

/**
 * Configuración de exportación
 */
export interface ExportConfig {
  format: "pdf" | "ical";
  range: "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
}

/**
 * Filtros para mis turnos
 */
export interface MyShiftsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  costCenterId?: string;
  zoneId?: string;
  status?: "draft" | "published" | "all";
}
