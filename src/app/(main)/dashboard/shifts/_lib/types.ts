/**
 * Tipos TypeScript para el Módulo de Turnos
 *
 * NOTA: Estos tipos son solo para la UI mock.
 * NO representan el schema de Prisma real (pendiente de implementar).
 */

// ==================== TIPOS BASE ====================

/**
 * Estado de un turno
 */
export type ShiftStatus = "draft" | "published" | "conflict";

/**
 * Tipo de turno (para plantillas)
 */
export type ShiftType = "morning" | "afternoon" | "night" | "off" | "saturday" | "sunday" | "custom";

/**
 * Franja horaria para cobertura
 */
export type TimeSlot = "morning" | "afternoon" | "night";

/**
 * Tipo de conflicto detectado
 */
export type ConflictType =
  | "overlap" // Solapamiento con otro turno
  | "min_rest" // Descanso mínimo no cumplido
  | "absence" // Empleado en ausencia (vacaciones/baja)
  | "weekly_hours"; // Excede horas semanales

/**
 * Vista del calendario
 */
export type CalendarView = "week" | "month";

/**
 * Modo de visualización
 */
export type CalendarMode = "employee" | "area";

// ==================== MODELOS PRINCIPALES ====================

/**
 * Zona de trabajo dentro de un lugar (CostCenter)
 * Ejemplo: Cocina, Barra, Recepción, Almacén
 */
export interface Zone {
  id: string;
  name: string;
  costCenterId: string; // Relación con CostCenter existente
  requiredCoverage: RequiredCoverage; // Cobertura requerida por franja
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cobertura requerida por franja horaria
 */
export interface RequiredCoverage {
  morning: number; // Personas requeridas en mañana (ej: 08:00-16:00)
  afternoon: number; // Personas requeridas en tarde (ej: 16:00-00:00)
  night: number; // Personas requeridas en noche (ej: 00:00-08:00)
}

/**
 * Turno individual asignado a un empleado
 */
export interface Shift {
  id: string;
  employeeId: string;
  date: string; // Formato: YYYY-MM-DD
  startTime: string; // Formato: HH:mm (ej: "08:00")
  endTime: string; // Formato: HH:mm (ej: "16:00")
  breakMinutes?: number; // Minutos de descanso (ej: 60 para 1 hora, 30 para media hora)
  costCenterId: string; // Lugar de trabajo
  zoneId: string; // Zona dentro del lugar
  role?: string; // Rol opcional (ej: "Turno mañana", "Supervisor")
  status: ShiftStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plantilla de turnos rotativos
 */
export interface ShiftTemplate {
  id: string;
  name: string;
  pattern: ShiftType[]; // Secuencia de turnos (ej: ['morning', 'afternoon', 'night', 'off'])
  shiftDuration: number; // Horas por turno
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Empleado (versión simplificada para el módulo de turnos)
 * NOTA: Reutiliza el modelo Employee existente + campo usesShiftSystem
 */
export interface EmployeeShift {
  id: string;
  firstName: string;
  lastName: string;
  contractHours: number; // Horas semanales pactadas
  usesShiftSystem: boolean; // TRUE = usa turnos, FALSE = jornada fija
  costCenterId?: string; // Lugar de trabajo por defecto
  absences: Absence[]; // Ausencias registradas (vacaciones, bajas)
}

/**
 * Ausencia de un empleado
 */
export interface Absence {
  start: string; // Formato: YYYY-MM-DD
  end: string; // Formato: YYYY-MM-DD
  reason: string; // "Vacaciones", "Baja médica", etc.
}

/**
 * CostCenter (Lugar de trabajo) - Reutiliza modelo existente
 * NOTA: Ya existe en el sistema, no crear nuevo
 */
export interface CostCenter {
  id: string;
  name: string;
  address?: string;
  timezone: string;
  active: boolean;
}

// ==================== VALIDACIONES Y CONFLICTOS ====================

/**
 * Resultado de validación de un turno
 */
export interface ValidationResult {
  isValid: boolean;
  conflicts: Conflict[];
  warnings: Warning[];
}

/**
 * Conflicto detectado en un turno
 */
export interface Conflict {
  type: ConflictType;
  message: string;
  severity: "error" | "warning";
  relatedShiftId?: string; // ID del turno que causa el conflicto (si aplica)
}

/**
 * Advertencia (menos grave que conflicto)
 */
export interface Warning {
  message: string;
  type: "info" | "warning";
}

// ==================== FILTROS Y NAVEGACIÓN ====================

/**
 * Filtros para el calendario de turnos
 */
export interface ShiftFilters {
  costCenterId?: string; // Filtrar por lugar
  zoneId?: string; // Filtrar por zona
  role?: string; // Filtrar por rol
  status?: ShiftStatus; // Filtrar por estado
  employeeId?: string; // Filtrar por empleado específico
  dateFrom?: string; // Formato: YYYY-MM-DD
  dateTo?: string; // Formato: YYYY-MM-DD
}

/**
 * Configuración de vista del calendario
 */
export interface CalendarConfig {
  view: CalendarView; // 'week' | 'month'
  mode: CalendarMode; // 'employee' | 'area'
  currentDate: Date; // Fecha actual visualizada
  filters: ShiftFilters;
}

// ==================== INPUT/OUTPUT DE FORMULARIOS ====================

/**
 * Datos de entrada para crear/editar turno
 */
export interface ShiftInput {
  employeeId: string;
  date: string; // Formato: YYYY-MM-DD
  startTime: string; // Formato: HH:mm
  endTime: string; // Formato: HH:mm
  breakMinutes?: number; // Minutos de descanso
  costCenterId: string;
  zoneId: string;
  role?: string;
  notes?: string;
}

/**
 * Datos de entrada para aplicar plantilla
 */
export interface ApplyTemplateInput {
  templateId: string;
  employeeIds: string[]; // Empleados a los que aplicar la plantilla
  dateFrom: string; // Formato: YYYY-MM-DD
  dateTo: string; // Formato: YYYY-MM-DD
  costCenterId: string;
  zoneId: string;
  initialGroup: number; // Grupo inicial para rotación (0, 1, 2...)
}

/**
 * Datos de entrada para crear/editar zona
 */
export interface ZoneInput {
  name: string;
  costCenterId: string;
  requiredCoverage: RequiredCoverage;
  active?: boolean;
}

/**
 * Datos de entrada para crear/editar plantilla
 */
export interface TemplateInput {
  name: string;
  pattern: ShiftType[];
  shiftDuration: number;
  description?: string;
  active?: boolean;
}

// ==================== CÁLCULOS Y ESTADÍSTICAS ====================

/**
 * Estadísticas de horas de un empleado en una semana
 */
export interface EmployeeWeekStats {
  employeeId: string;
  weekStart: string; // Formato: YYYY-MM-DD
  assignedHours: number; // Horas asignadas en la semana
  contractHours: number; // Horas pactadas en contrato
  percentage: number; // % de cumplimiento (assignedHours / contractHours * 100)
  status: "under" | "ok" | "over"; // 🔴 < 70%, 🟢 70-130%, 🟡 > 130%
}

/**
 * Estadísticas de cobertura de una zona en un día
 */
export interface ZoneCoverageStats {
  zoneId: string;
  date: string; // Formato: YYYY-MM-DD
  timeSlot: TimeSlot;
  assigned: number; // Personas asignadas
  required: number; // Personas requeridas
  percentage: number; // % de cobertura (assigned / required * 100)
  status: "danger" | "warning" | "ok"; // 🔴 < 70%, 🟡 70-99%, 🟢 >= 100%
}

// ==================== DRAG & DROP ====================

/**
 * Datos para drag & drop de turnos
 */
export interface DragData {
  shiftId: string;
  shift: Shift;
}

/**
 * Datos para drop de turnos
 */
export interface DropData {
  employeeId: string;
  date: string; // Formato: YYYY-MM-DD
}

/**
 * Resultado de operación de drag & drop
 */
export interface DragResult {
  success: boolean;
  updatedShift?: Shift;
  conflicts?: Conflict[];
}

// ==================== UTILIDADES ====================

/**
 * Rango de fechas
 */
export interface DateRange {
  start: string; // Formato: YYYY-MM-DD
  end: string; // Formato: YYYY-MM-DD
}

/**
 * Día de la semana
 */
export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

/**
 * Celda del calendario (empleado + fecha)
 */
export interface CalendarCell {
  employeeId: string;
  date: string; // Formato: YYYY-MM-DD
  shifts: Shift[]; // Turnos en esta celda
  isEmpty: boolean;
}

/**
 * Celda del calendario por área (zona + fecha)
 */
export interface AreaCalendarCell {
  zoneId: string;
  date: string; // Formato: YYYY-MM-DD
  timeSlot: TimeSlot;
  coverage: ZoneCoverageStats;
  shifts: Shift[]; // Turnos en esta celda
}

// ==================== RESPUESTAS DE SERVICIO ====================

/**
 * Respuesta de servicio al crear/actualizar turno
 */
export interface ShiftServiceResponse {
  success: boolean;
  data?: Shift;
  validation?: ValidationResult;
  error?: string;
}

/**
 * Respuesta de servicio al aplicar plantilla
 */
export interface ApplyTemplateResponse {
  success: boolean;
  createdShifts?: Shift[];
  totalCreated: number;
  error?: string;
}

/**
 * Respuesta de servicio al publicar turnos
 */
export interface PublishShiftsResponse {
  success: boolean;
  publishedCount: number;
  publishedShifts?: Shift[];
  error?: string;
}

// ==================== OPCIONES DE CONFIGURACIÓN ====================

/**
 * Configuración global del módulo de turnos
 */
export interface ShiftsModuleConfig {
  minRestHours: number; // Descanso mínimo entre turnos (ej: 12)
  maxWeeklyHoursPercentage: number; // % máximo de horas semanales (ej: 150 = 150%)
  defaultShiftDuration: number; // Duración por defecto de turno (ej: 8)
  enableConflictWarnings: boolean; // Mostrar warnings de conflictos
  enableDragAndDrop: boolean; // Activar drag & drop
}
