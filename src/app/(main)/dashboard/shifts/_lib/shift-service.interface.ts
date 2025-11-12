/**
 * Interfaz del Servicio de Turnos
 *
 * Define el contrato público para operaciones de turnos.
 * Permite intercambiar implementaciones (mock vs API real) sin modificar componentes.
 *
 * IMPORTANTE: Los componentes y el store SOLO deben usar esta interfaz,
 * nunca importar directamente la implementación mock o API.
 */

import type {
  Shift,
  ShiftInput,
  ShiftFilters,
  ShiftServiceResponse,
  Zone,
  ZoneInput,
  ShiftTemplate,
  TemplateInput,
  ApplyTemplateInput,
  ApplyTemplateResponse,
  PublishShiftsResponse,
  ValidationResult,
  EmployeeShift,
  CostCenter,
  EmployeeWeekStats,
  ZoneCoverageStats,
  TimeSlot,
  DragResult,
} from "./types";

/**
 * Interfaz principal del servicio de turnos
 */
export interface IShiftService {
  // ==================== OPERACIONES CRUD DE TURNOS ====================

  /**
   * Obtener turnos filtrados
   * @param filters - Criterios de filtrado
   * @returns Lista de turnos que cumplen los filtros
   */
  getShifts(filters: ShiftFilters): Promise<Shift[]>;

  /**
   * Obtener turno por ID
   * @param id - ID del turno
   * @returns Turno encontrado o null si no existe
   */
  getShiftById(id: string): Promise<Shift | null>;

  /**
   * Crear nuevo turno
   * @param data - Datos del turno a crear
   * @returns Respuesta con el turno creado y validaciones
   */
  createShift(data: ShiftInput): Promise<ShiftServiceResponse>;

  /**
   * Actualizar turno existente
   * @param id - ID del turno a actualizar
   * @param data - Datos parciales a actualizar
   * @returns Respuesta con el turno actualizado y validaciones
   */
  updateShift(id: string, data: Partial<ShiftInput>): Promise<ShiftServiceResponse>;

  /**
   * Eliminar turno
   * @param id - ID del turno a eliminar
   * @returns True si se eliminó correctamente
   */
  deleteShift(id: string): Promise<boolean>;

  /**
   * Mover turno a otro empleado/fecha (drag & drop)
   * @param shiftId - ID del turno a mover
   * @param newEmployeeId - ID del empleado destino
   * @param newDate - Nueva fecha (YYYY-MM-DD)
   * @returns Resultado con turno actualizado y conflictos
   */
  moveShift(shiftId: string, newEmployeeId: string, newDate: string): Promise<DragResult>;

  /**
   * Redimensionar turno (cambiar duración)
   * @param shiftId - ID del turno a redimensionar
   * @param newStartTime - Nueva hora de inicio (HH:mm)
   * @param newEndTime - Nueva hora de fin (HH:mm)
   * @returns Respuesta con turno actualizado y validaciones
   */
  resizeShift(shiftId: string, newStartTime: string, newEndTime: string): Promise<ShiftServiceResponse>;

  // ==================== VALIDACIONES ====================

  /**
   * Validar un turno sin guardarlo
   * @param data - Datos del turno a validar
   * @returns Resultado de validación con conflictos y warnings
   */
  validateShift(data: ShiftInput): Promise<ValidationResult>;

  /**
   * Validar si un turno solapa con otros del mismo empleado
   * @param employeeId - ID del empleado
   * @param date - Fecha del turno (YYYY-MM-DD)
   * @param startTime - Hora de inicio (HH:mm)
   * @param endTime - Hora de fin (HH:mm)
   * @param excludeShiftId - ID de turno a excluir (para edición)
   * @returns True si solapa
   */
  hasOverlap(
    employeeId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: string,
  ): Promise<boolean>;

  /**
   * Validar si se cumple el descanso mínimo
   * @param employeeId - ID del empleado
   * @param date - Fecha del turno (YYYY-MM-DD)
   * @param startTime - Hora de inicio (HH:mm)
   * @returns True si cumple descanso mínimo
   */
  hasMinimumRest(employeeId: string, date: string, startTime: string): Promise<boolean>;

  /**
   * Validar si el empleado está ausente en la fecha
   * @param employeeId - ID del empleado
   * @param date - Fecha a validar (YYYY-MM-DD)
   * @returns True si está ausente
   */
  isEmployeeAbsent(employeeId: string, date: string): Promise<boolean>;

  // ==================== OPERACIONES CRUD DE ZONAS ====================

  /**
   * Obtener todas las zonas
   * @param costCenterId - Filtrar por lugar (opcional)
   * @returns Lista de zonas
   */
  getZones(costCenterId?: string): Promise<Zone[]>;

  /**
   * Obtener zona por ID
   * @param id - ID de la zona
   * @returns Zona encontrada o null
   */
  getZoneById(id: string): Promise<Zone | null>;

  /**
   * Crear nueva zona
   * @param data - Datos de la zona
   * @returns Zona creada
   */
  createZone(data: ZoneInput): Promise<Zone>;

  /**
   * Actualizar zona existente
   * @param id - ID de la zona
   * @param data - Datos parciales a actualizar
   * @returns Zona actualizada
   */
  updateZone(id: string, data: Partial<ZoneInput>): Promise<Zone>;

  /**
   * Eliminar zona
   * @param id - ID de la zona
   * @returns True si se eliminó
   */
  deleteZone(id: string): Promise<boolean>;

  // ==================== OPERACIONES CRUD DE PLANTILLAS ====================

  /**
   * Obtener todas las plantillas
   * @returns Lista de plantillas
   */
  getTemplates(): Promise<ShiftTemplate[]>;

  /**
   * Obtener plantilla por ID
   * @param id - ID de la plantilla
   * @returns Plantilla encontrada o null
   */
  getTemplateById(id: string): Promise<ShiftTemplate | null>;

  /**
   * Crear nueva plantilla
   * @param data - Datos de la plantilla
   * @returns Plantilla creada
   */
  createTemplate(data: TemplateInput): Promise<ShiftTemplate>;

  /**
   * Actualizar plantilla existente
   * @param id - ID de la plantilla
   * @param data - Datos parciales a actualizar
   * @returns Plantilla actualizada
   */
  updateTemplate(id: string, data: Partial<TemplateInput>): Promise<ShiftTemplate>;

  /**
   * Eliminar plantilla
   * @param id - ID de la plantilla
   * @returns True si se eliminó
   */
  deleteTemplate(id: string): Promise<boolean>;

  /**
   * Aplicar plantilla a empleados
   * @param input - Datos para aplicar la plantilla
   * @returns Respuesta con turnos creados
   */
  applyTemplate(input: ApplyTemplateInput): Promise<ApplyTemplateResponse>;

  // ==================== OPERACIONES MASIVAS ====================

  /**
   * Copiar turnos de una semana a otra
   * @param sourceWeekStart - Inicio de semana origen (YYYY-MM-DD)
   * @param targetWeekStart - Inicio de semana destino (YYYY-MM-DD)
   * @param filters - Filtros para seleccionar qué turnos copiar
   * @returns Número de turnos copiados
   */
  copyWeek(sourceWeekStart: string, targetWeekStart: string, filters: ShiftFilters): Promise<number>;

  /**
   * Publicar turnos (cambiar de draft a published)
   * @param filters - Filtros para seleccionar qué turnos publicar
   * @returns Respuesta con turnos publicados
   */
  publishShifts(filters: ShiftFilters): Promise<PublishShiftsResponse>;

  /**
   * Eliminar múltiples turnos
   * @param shiftIds - IDs de turnos a eliminar
   * @returns Número de turnos eliminados
   */
  deleteMultipleShifts(shiftIds: string[]): Promise<number>;

  // ==================== CONSULTAS Y ESTADÍSTICAS ====================

  /**
   * Obtener empleados que usan sistema de turnos
   * @param costCenterId - Filtrar por lugar (opcional)
   * @returns Lista de empleados
   */
  getShiftEmployees(costCenterId?: string): Promise<EmployeeShift[]>;

  /**
   * Obtener lugares de trabajo (CostCenters)
   * @returns Lista de lugares
   */
  getCostCenters(): Promise<CostCenter[]>;

  /**
   * Obtener estadísticas de horas de un empleado en una semana
   * @param employeeId - ID del empleado
   * @param weekStart - Inicio de semana (YYYY-MM-DD)
   * @returns Estadísticas de horas
   */
  getEmployeeWeekStats(employeeId: string, weekStart: string): Promise<EmployeeWeekStats>;

  /**
   * Obtener estadísticas de cobertura de una zona en un día
   * @param zoneId - ID de la zona
   * @param date - Fecha (YYYY-MM-DD)
   * @param timeSlot - Franja horaria
   * @returns Estadísticas de cobertura
   */
  getZoneCoverageStats(zoneId: string, date: string, timeSlot: TimeSlot): Promise<ZoneCoverageStats>;

  /**
   * Obtener turnos de un empleado en un rango de fechas
   * @param employeeId - ID del empleado
   * @param dateFrom - Fecha inicio (YYYY-MM-DD)
   * @param dateTo - Fecha fin (YYYY-MM-DD)
   * @returns Lista de turnos
   */
  getEmployeeShifts(employeeId: string, dateFrom: string, dateTo: string): Promise<Shift[]>;

  /**
   * Obtener turnos de una zona en un rango de fechas
   * @param zoneId - ID de la zona
   * @param dateFrom - Fecha inicio (YYYY-MM-DD)
   * @param dateTo - Fecha fin (YYYY-MM-DD)
   * @returns Lista de turnos
   */
  getZoneShifts(zoneId: string, dateFrom: string, dateTo: string): Promise<Shift[]>;
}

/**
 * Tipo auxiliar para inyección de dependencias
 * Permite crear instancias del servicio con configuración personalizada
 */
export type ShiftServiceFactory = () => IShiftService;

/**
 * Singleton del servicio
 * Esta variable se exporta para que el store y componentes la importen
 */
export let shiftService: IShiftService;

/**
 * Inicializar servicio de turnos
 * Se llama al inicio de la aplicación para configurar la implementación
 * @param implementation - Implementación del servicio (mock o API)
 */
export function initializeShiftService(implementation: IShiftService): void {
  shiftService = implementation;
}
