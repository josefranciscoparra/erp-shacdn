/**
 * Utilidades para el Dashboard de Turnos
 *
 * Funciones para calcular métricas, avisos y estadísticas
 * a partir de los datos mock del módulo de turnos.
 */

import type { Shift, EmployeeShift, Zone, CostCenter } from "./types";

// ==================== TIPOS ====================

export interface DashboardMetrics {
  totalShifts: number;
  draftShifts: number;
  publishedShifts: number;
  conflictShifts: number;
  averageCoverage: number;
  employeesWithShifts: number;
  totalEmployees: number;
  totalHoursAssigned: number;
  totalHoursContracted: number;
}

export interface CriticalAlert {
  id: string;
  type: "conflict" | "coverage" | "unpublished" | "no_shifts" | "hours";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  count?: number;
  linkTo?: string; // URL para navegar al detalle
  employeeId?: string;
  zoneId?: string;
  date?: string;
  affectedEmployees?: string[]; // Nombres de empleados afectados
  affectedEmployeeIds?: string[]; // IDs de empleados afectados
  weekDisplay?: string; // Formato: "Semana 10-16 Nov 2025"
  dateDisplay?: string; // Formato: "10 Nov 2025"
}

export interface CenterSummary {
  costCenterId: string;
  costCenterName: string;
  totalShifts: number;
  draftShifts: number;
  publishedShifts: number;
  conflictShifts: number;
  averageCoverage: number;
  alerts: CriticalAlert[];
}

export interface CoverageStats {
  zoneId: string;
  zoneName: string;
  date: string;
  morning: { assigned: number; required: number; percentage: number };
  afternoon: { assigned: number; required: number; percentage: number };
  night: { assigned: number; required: number; percentage: number };
  overall: number; // Promedio general del día
}

export interface EmployeeHoursStats {
  employeeId: string;
  employeeName: string;
  assignedHours: number;
  contractHours: number;
  percentage: number;
  status: "under" | "ok" | "over";
}

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

// ==================== MÉTRICAS PRINCIPALES ====================

/**
 * Calcula las métricas principales del dashboard
 */
export function getDashboardMetrics(
  shifts: Shift[],
  employees: EmployeeShift[],
  zones: Zone[],
  dateRange: DateRange,
): DashboardMetrics {
  // Filtrar turnos por rango de fechas
  const filteredShifts = shifts.filter((s) => s.date >= dateRange.start && s.date <= dateRange.end);

  // Contar por estado
  const draftShifts = filteredShifts.filter((s) => s.status === "draft").length;
  const publishedShifts = filteredShifts.filter((s) => s.status === "published").length;
  const conflictShifts = filteredShifts.filter((s) => s.status === "conflict").length;

  // Empleados con turnos
  const employeeIds = new Set(filteredShifts.map((s) => s.employeeId));
  const employeesWithShifts = employeeIds.size;
  const totalEmployees = employees.filter((e) => e.usesShiftSystem).length;

  // Horas
  const totalHoursAssigned = filteredShifts.reduce((acc, shift) => {
    return acc + calculateShiftDuration(shift.startTime, shift.endTime, shift.breakMinutes ?? 0);
  }, 0);

  const totalHoursContracted = employees
    .filter((e) => e.usesShiftSystem)
    .reduce((acc, emp) => {
      // Calcular semanas en el rango
      const weeks = calculateWeeksInRange(dateRange);
      return acc + (emp.contractHours / 7) * 7 * weeks; // Horas semanales * semanas
    }, 0);

  // Cobertura promedio
  const coverageStats = zones.map((zone) => {
    const zoneCoverage = getCoverageStatsForZone(zone, filteredShifts, dateRange);
    // Evitar división por cero: si no hay días, retornar 0
    if (zoneCoverage.length === 0) return 0;
    const sum = zoneCoverage.reduce((acc, day) => acc + day.overall, 0);
    return sanitizeNumber(sum / zoneCoverage.length, 0);
  });

  // Usar safeAverage para evitar NaN/Infinity
  const averageCoverage = safeAverage(coverageStats);

  return {
    totalShifts: filteredShifts.length,
    draftShifts,
    publishedShifts,
    conflictShifts,
    averageCoverage,
    employeesWithShifts,
    totalEmployees,
    totalHoursAssigned,
    totalHoursContracted,
  };
}

// ==================== AVISOS CRÍTICOS ====================

/**
 * Detecta todos los avisos críticos del sistema
 */
export function getCriticalAlerts(
  shifts: Shift[],
  employees: EmployeeShift[],
  zones: Zone[],
  costCenters: CostCenter[],
  dateRange: DateRange,
): CriticalAlert[] {
  const alerts: CriticalAlert[] = [];

  // Filtrar turnos por rango
  const filteredShifts = shifts.filter((s) => s.date >= dateRange.start && s.date <= dateRange.end);

  // 1. Turnos con conflictos
  const conflictShifts = filteredShifts.filter((s) => s.status === "conflict");
  if (conflictShifts.length > 0) {
    const affectedEmployeeIds = [...new Set(conflictShifts.map((s) => s.employeeId))];
    const affectedEmployees = affectedEmployeeIds
      .map((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName}` : null;
      })
      .filter((name): name is string => name !== null);

    alerts.push({
      id: "conflicts",
      type: "conflict",
      severity: "error",
      title: "Turnos con conflictos",
      description: `${conflictShifts.length} ${conflictShifts.length === 1 ? "turno tiene" : "turnos tienen"} conflictos detectados`,
      count: conflictShifts.length,
      linkTo: "/dashboard/shifts?status=conflict",
      affectedEmployees,
      affectedEmployeeIds,
      weekDisplay: formatWeekRange(dateRange.start, dateRange.end),
    });
  }

  // 2. Zonas con cobertura < 70%
  const lowCoverageZones = zones.filter((zone) => {
    const coverageStats = getCoverageStatsForZone(zone, filteredShifts, dateRange);
    // Calcular promedio seguro para evitar NaN
    if (coverageStats.length === 0) return false;
    const sum = coverageStats.reduce((acc, day) => acc + day.overall, 0);
    const avgCoverage = sanitizeNumber(sum / coverageStats.length, 0);
    return avgCoverage < 70;
  });

  if (lowCoverageZones.length > 0) {
    // Obtener empleados asignados a estas zonas
    const zoneIds = new Set(lowCoverageZones.map((z) => z.id));
    const affectedEmployeeIds = [
      ...new Set(filteredShifts.filter((s) => zoneIds.has(s.zoneId)).map((s) => s.employeeId)),
    ];
    const affectedEmployees = affectedEmployeeIds
      .map((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName}` : null;
      })
      .filter((name): name is string => name !== null);

    alerts.push({
      id: "low-coverage",
      type: "coverage",
      severity: "error",
      title: "Cobertura crítica",
      description: `${lowCoverageZones.length} ${lowCoverageZones.length === 1 ? "zona tiene" : "zonas tienen"} menos del 70% de cobertura`,
      count: lowCoverageZones.length,
      affectedEmployees,
      affectedEmployeeIds,
      weekDisplay: formatWeekRange(dateRange.start, dateRange.end),
    });
  }

  // 3. Turnos sin publicar (próximos 7 días)
  const today = new Date();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const unpublishedShifts = filteredShifts.filter((s) => {
    const shiftDate = new Date(s.date);
    return s.status === "draft" && shiftDate >= today && shiftDate <= sevenDaysFromNow;
  });

  if (unpublishedShifts.length > 0) {
    const affectedEmployeeIds = [...new Set(unpublishedShifts.map((s) => s.employeeId))];
    const affectedEmployees = affectedEmployeeIds
      .map((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName}` : null;
      })
      .filter((name): name is string => name !== null);

    alerts.push({
      id: "unpublished",
      type: "unpublished",
      severity: "warning",
      title: "Turnos sin publicar",
      description: `${unpublishedShifts.length} ${unpublishedShifts.length === 1 ? "turno" : "turnos"} en borrador para los próximos 7 días`,
      count: unpublishedShifts.length,
      affectedEmployees,
      affectedEmployeeIds,
      weekDisplay: formatWeekRange(dateRange.start, dateRange.end),
    });
  }

  // 4. Empleados sin turnos
  const employeesWithShifts = new Set(filteredShifts.map((s) => s.employeeId));
  const employeesWithoutShifts = employees.filter((e) => e.usesShiftSystem && !employeesWithShifts.has(e.id));

  if (employeesWithoutShifts.length > 0) {
    const affectedEmployees = employeesWithoutShifts.map((e) => `${e.firstName} ${e.lastName}`);
    const affectedEmployeeIds = employeesWithoutShifts.map((e) => e.id);

    alerts.push({
      id: "no-shifts",
      type: "no_shifts",
      severity: "warning",
      title: "Empleados sin turnos",
      description: `${employeesWithoutShifts.length} ${employeesWithoutShifts.length === 1 ? "empleado" : "empleados"} sin asignación en este período`,
      count: employeesWithoutShifts.length,
      affectedEmployees,
      affectedEmployeeIds,
      weekDisplay: formatWeekRange(dateRange.start, dateRange.end),
    });
  }

  // 5. Empleados con horas fuera de rango
  const hoursStats = getEmployeeHoursStats(filteredShifts, employees, dateRange);
  const outOfRangeEmployees = hoursStats.filter((stat) => stat.status !== "ok");

  if (outOfRangeEmployees.length > 0) {
    const affectedEmployees = outOfRangeEmployees.map((stat) => stat.employeeName);
    const affectedEmployeeIds = outOfRangeEmployees.map((stat) => stat.employeeId);

    alerts.push({
      id: "hours-range",
      type: "hours",
      severity: "warning",
      title: "Horas fuera de rango",
      description: `${outOfRangeEmployees.length} ${outOfRangeEmployees.length === 1 ? "empleado tiene" : "empleados tienen"} horas asignadas fuera del rango óptimo`,
      count: outOfRangeEmployees.length,
      affectedEmployees,
      affectedEmployeeIds,
      weekDisplay: formatWeekRange(dateRange.start, dateRange.end),
    });
  }

  return alerts;
}

// ==================== RESUMEN POR CENTRO ====================

/**
 * Calcula el resumen de cada centro de trabajo
 */
export function getCenterSummaries(
  shifts: Shift[],
  employees: EmployeeShift[],
  zones: Zone[],
  costCenters: CostCenter[],
  dateRange: DateRange,
): CenterSummary[] {
  return costCenters.map((center) => {
    // Filtrar turnos del centro
    const centerShifts = shifts.filter(
      (s) => s.costCenterId === center.id && s.date >= dateRange.start && s.date <= dateRange.end,
    );

    // Zonas del centro
    const centerZones = zones.filter((z) => z.costCenterId === center.id);

    // Métricas
    const draftShifts = centerShifts.filter((s) => s.status === "draft").length;
    const publishedShifts = centerShifts.filter((s) => s.status === "published").length;
    const conflictShifts = centerShifts.filter((s) => s.status === "conflict").length;

    // Cobertura
    const coverageStats = centerZones.map((zone) => {
      const zoneCoverage = getCoverageStatsForZone(zone, centerShifts, dateRange);
      // Evitar división por cero
      if (zoneCoverage.length === 0) return 0;
      const sum = zoneCoverage.reduce((acc, day) => acc + day.overall, 0);
      return sanitizeNumber(sum / zoneCoverage.length, 0);
    });

    // Usar safeAverage para evitar NaN/Infinity
    const averageCoverage = safeAverage(coverageStats);

    // Avisos específicos del centro
    const alerts = getCriticalAlerts(centerShifts, employees, centerZones, [center], dateRange);

    return {
      costCenterId: center.id,
      costCenterName: center.name,
      totalShifts: centerShifts.length,
      draftShifts,
      publishedShifts,
      conflictShifts,
      averageCoverage,
      alerts,
    };
  });
}

// ==================== ESTADÍSTICAS DE COBERTURA ====================

/**
 * Calcula la cobertura de una zona en un rango de fechas
 */
function getCoverageStatsForZone(zone: Zone, shifts: Shift[], dateRange: DateRange): CoverageStats[] {
  const stats: CoverageStats[] = [];
  const dates = getDatesInRange(dateRange);

  dates.forEach((date) => {
    const dayShifts = shifts.filter((s) => s.zoneId === zone.id && s.date === date);

    // Calcular cobertura por franja
    const morningCoverage = calculateCoverageForTimeSlot(dayShifts, "08:00", "16:00");
    const afternoonCoverage = calculateCoverageForTimeSlot(dayShifts, "16:00", "00:00");
    const nightCoverage = calculateCoverageForTimeSlot(dayShifts, "00:00", "08:00");

    stats.push({
      zoneId: zone.id,
      zoneName: zone.name,
      date,
      morning: {
        assigned: morningCoverage,
        required: zone.requiredCoverage.morning,
        percentage: zone.requiredCoverage.morning > 0 ? (morningCoverage / zone.requiredCoverage.morning) * 100 : 100,
      },
      afternoon: {
        assigned: afternoonCoverage,
        required: zone.requiredCoverage.afternoon,
        percentage:
          zone.requiredCoverage.afternoon > 0 ? (afternoonCoverage / zone.requiredCoverage.afternoon) * 100 : 100,
      },
      night: {
        assigned: nightCoverage,
        required: zone.requiredCoverage.night,
        percentage: zone.requiredCoverage.night > 0 ? (nightCoverage / zone.requiredCoverage.night) * 100 : 100,
      },
      overall: sanitizeNumber(
        ((morningCoverage / (zone.requiredCoverage.morning || 1)) * 100 +
          (afternoonCoverage / (zone.requiredCoverage.afternoon || 1)) * 100 +
          (nightCoverage / (zone.requiredCoverage.night || 1)) * 100) /
          3,
        0,
      ),
    });
  });

  return stats;
}

/**
 * Calcula cuántos empleados cubren una franja horaria
 */
function calculateCoverageForTimeSlot(shifts: Shift[], slotStart: string, slotEnd: string): number {
  return shifts.filter((shift) => {
    const shiftStartMinutes = timeToMinutes(shift.startTime);
    const shiftEndMinutes = timeToMinutes(shift.endTime);
    const slotStartMinutes = timeToMinutes(slotStart);
    const slotEndMinutes = timeToMinutes(slotEnd);

    // Detectar si el turno cubre parte de la franja
    return shiftStartMinutes < slotEndMinutes && shiftEndMinutes > slotStartMinutes;
  }).length;
}

// ==================== ESTADÍSTICAS DE HORAS POR EMPLEADO ====================

/**
 * Calcula las horas asignadas vs. contratadas por empleado
 */
export function getEmployeeHoursStats(
  shifts: Shift[],
  employees: EmployeeShift[],
  dateRange: DateRange,
): EmployeeHoursStats[] {
  const weeks = calculateWeeksInRange(dateRange);

  return employees
    .filter((e) => e.usesShiftSystem)
    .map((employee) => {
      const employeeShifts = shifts.filter(
        (s) => s.employeeId === employee.id && s.date >= dateRange.start && s.date <= dateRange.end,
      );

      const assignedHours = employeeShifts.reduce((acc, shift) => {
        return acc + calculateShiftDuration(shift.startTime, shift.endTime, shift.breakMinutes ?? 0);
      }, 0);

      const contractHours = (employee.contractHours / 7) * 7 * weeks; // Horas semanales * semanas

      const percentage = contractHours > 0 ? (assignedHours / contractHours) * 100 : 0;

      let status: "under" | "ok" | "over" = "ok";
      if (percentage < 70) status = "under";
      else if (percentage > 130) status = "over";

      return {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        assignedHours,
        contractHours,
        percentage,
        status,
      };
    });
}

// ==================== UTILIDADES DE NÚMEROS ====================

/**
 * Garantiza que un número sea finito y válido
 * @param value - Valor a validar
 * @param fallback - Valor por defecto si es inválido (default: 0)
 * @returns Número válido
 */
export function sanitizeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Calcula porcentaje seguro evitando división por cero
 * @param numerator - Numerador
 * @param denominator - Denominador
 * @returns Porcentaje (0-100+) o 0 si hay error
 */
export function safePercentage(numerator: number, denominator: number): number {
  if (denominator === 0 || !Number.isFinite(denominator)) return 0;
  const result = (numerator / denominator) * 100;
  return sanitizeNumber(result, 0);
}

/**
 * Calcula promedio seguro de un array de números
 * @param values - Array de valores
 * @returns Promedio o 0 si el array está vacío o tiene valores inválidos
 */
export function safeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  // Filtrar valores no finitos (NaN, Infinity, -Infinity)
  const validValues = values.filter((v) => Number.isFinite(v));
  if (validValues.length === 0) return 0;
  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return sanitizeNumber(sum / validValues.length, 0);
}

// ==================== UTILIDADES ====================

/**
 * Formatea una fecha en español (ej: "10 Nov 2025")
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Formatea un rango de fechas como semana (ej: "Semana 10-16 Nov 2025")
 */
function formatWeekRange(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  if (start.getMonth() === end.getMonth()) {
    return `Semana ${start.getDate()}-${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  } else {
    return `Semana ${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  }
}

/**
 * Calcula la duración de un turno en horas (restando descansos)
 */
function calculateShiftDuration(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Si endTime < startTime, el turno cruza medianoche
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  // Restar minutos de descanso
  return (endMinutes - startMinutes - breakMinutes) / 60;
}

/**
 * Convierte HH:mm a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Genera array de fechas en un rango
 */
function getDatesInRange(range: DateRange): string[] {
  const dates: string[] = [];
  const start = new Date(range.start);
  const end = new Date(range.end);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }

  return dates;
}

/**
 * Calcula cuántas semanas hay en un rango de fechas
 */
function calculateWeeksInRange(range: DateRange): number {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.ceil(days / 7));
}
