/**
 * Utilidades para el Panel de Conflictos
 *
 * Funciones para agregar, filtrar y paginar conflictos de turnos.
 */

import type {
  Shift,
  EmployeeShift,
  CostCenter,
  Zone,
  Conflict,
  ConflictType,
  ShiftConflict,
  ConflictsState,
  ConflictsFilter,
  PaginatedConflicts,
} from "./types";

const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  overlap: "Solapamiento",
  min_rest: "Descanso mínimo",
  absence: "Ausencia",
  weekly_hours: "Horas semanales",
};

/**
 * Obtiene el label legible de un tipo de conflicto
 */
export function getConflictTypeLabel(type: ConflictType): string {
  return CONFLICT_TYPE_LABELS[type];
}

/**
 * Agrega todos los conflictos de los turnos en una estructura navegable
 */
export function aggregateShiftConflicts(
  shifts: Shift[],
  employees: EmployeeShift[],
  costCenters: CostCenter[],
  zones: Zone[],
): ConflictsState {
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const costCenterMap = new Map(costCenters.map((c) => [c.id, c]));
  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  // Filtrar turnos con estado "conflict"
  const conflictShifts = shifts.filter((s) => s.status === "conflict");

  // Crear ShiftConflict para cada turno con conflictos
  const shiftConflicts: ShiftConflict[] = conflictShifts.map((shift) => {
    const employee = employeeMap.get(shift.employeeId);
    const costCenter = costCenterMap.get(shift.costCenterId);
    const zone = zoneMap.get(shift.zoneId);

    // Por ahora, generamos conflictos mock basados en el status
    // En el futuro, esto vendría del servidor o se calcularía con validateShiftConflicts
    const conflicts = generateMockConflicts(shift);

    return {
      shiftId: shift.id,
      employeeId: shift.employeeId,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Empleado desconocido",
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      costCenterName: costCenter?.name,
      zoneName: zone?.name,
      conflicts,
      totalConflicts: conflicts.length,
      hasErrors: conflicts.some((c) => c.severity === "error"),
      hasWarnings: conflicts.some((c) => c.severity === "warning"),
    };
  });

  // Agrupar por tipo de conflicto
  const byType: Record<ConflictType, ShiftConflict[]> = {
    overlap: [],
    min_rest: [],
    absence: [],
    weekly_hours: [],
  };

  shiftConflicts.forEach((sc) => {
    sc.conflicts.forEach((conflict) => {
      if (!byType[conflict.type].some((existing) => existing.shiftId === sc.shiftId)) {
        byType[conflict.type].push(sc);
      }
    });
  });

  // Contar errores y warnings
  let errorCount = 0;
  let warningCount = 0;

  shiftConflicts.forEach((sc) => {
    sc.conflicts.forEach((c) => {
      if (c.severity === "error") errorCount++;
      else if (c.severity === "warning") warningCount++;
    });
  });

  return {
    all: shiftConflicts,
    byType,
    totalCount: shiftConflicts.length,
    errorCount,
    warningCount,
  };
}

/**
 * Genera conflictos mock para un turno (temporal hasta integrar con backend)
 */
function generateMockConflicts(shift: Shift): Conflict[] {
  const conflicts: Conflict[] = [];

  // Simulamos que los turnos con status "conflict" tienen algún tipo de conflicto
  // En producción, esto vendría del servidor o se calcularía con las validaciones existentes

  // Por ahora, asignamos conflictos aleatorios pero consistentes basados en el ID
  const hash = shift.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);

  if (hash % 3 === 0) {
    conflicts.push({
      type: "overlap",
      message: "Solapamiento con otro turno del mismo día",
      severity: "error",
    });
  }

  if (hash % 4 === 0) {
    conflicts.push({
      type: "min_rest",
      message: "No cumple el descanso mínimo de 12 horas entre turnos",
      severity: "error",
    });
  }

  if (hash % 5 === 0) {
    conflicts.push({
      type: "weekly_hours",
      message: "Excede el máximo de horas semanales permitidas",
      severity: "warning",
    });
  }

  // Si no hay conflictos generados, añadimos uno genérico
  if (conflicts.length === 0) {
    conflicts.push({
      type: "overlap",
      message: "Conflicto detectado en el turno",
      severity: "error",
    });
  }

  return conflicts;
}

/**
 * Filtra conflictos según los filtros aplicados
 */
export function filterConflicts(conflicts: ShiftConflict[], filters: ConflictsFilter): ShiftConflict[] {
  return conflicts.filter((sc) => {
    // Filtrar por tipo
    if (filters.type !== "all") {
      const hasType = sc.conflicts.some((c) => c.type === filters.type);
      if (!hasType) return false;
    }

    // Filtrar por severidad
    if (filters.severity !== "all") {
      if (filters.severity === "error" && !sc.hasErrors) return false;
      if (filters.severity === "warning" && !sc.hasWarnings) return false;
    }

    // Filtrar por búsqueda (nombre de empleado)
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      if (!sc.employeeName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Pagina los conflictos filtrados
 */
export function paginateConflicts(conflicts: ShiftConflict[], page: number, pageSize: number = 20): PaginatedConflicts {
  const total = conflicts.length;
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);
  const data = conflicts.slice(start, end);

  return {
    data,
    page,
    pageSize,
    total,
    hasMore: end < total,
  };
}

/**
 * Ordena conflictos por severidad (errores primero) y luego por fecha
 */
export function sortConflicts(conflicts: ShiftConflict[]): ShiftConflict[] {
  return [...conflicts].sort((a, b) => {
    // Errores primero
    if (a.hasErrors && !b.hasErrors) return -1;
    if (!a.hasErrors && b.hasErrors) return 1;

    // Luego por fecha (más reciente primero)
    return a.date.localeCompare(b.date);
  });
}

/**
 * Cuenta conflictos por tipo
 */
export function countByType(conflicts: ShiftConflict[]): Record<ConflictType, number> {
  const counts: Record<ConflictType, number> = {
    overlap: 0,
    min_rest: 0,
    absence: 0,
    weekly_hours: 0,
  };

  conflicts.forEach((sc) => {
    sc.conflicts.forEach((c) => {
      counts[c.type]++;
    });
  });

  return counts;
}
