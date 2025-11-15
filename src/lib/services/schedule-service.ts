/**
 * Servicio de Abstracción de Horarios
 *
 * Encapsula la lógica compleja de horarios FIXED/FLEXIBLE/SHIFTS
 * Proporciona una API simple y consistente para TimeNow y otras integraciones
 *
 * IMPORTANTE: Este servicio NO reescribe la lógica existente, solo la encapsula
 * La lógica real está en /src/server/actions/admin-time-tracking.ts
 *
 * Beneficios:
 * - API simple y predecible para consumidores
 * - Un solo lugar para lógica de horarios
 * - Facilita migración futura al modelo normalizado
 * - Reduce duplicación de código condicional
 */

import { getExpectedHoursForDay, getEmployeeEntryTime } from "@/server/actions/admin-time-tracking";
import type {
  DaySchedule,
  ClockInWindow,
  ClockOutWindow,
  BreakPeriod,
  DayCompliance,
  ComplianceOptions,
  ClockValidationResult,
} from "@/types/schedule";

export class ScheduleService {
  /**
   * Obtiene el horario completo para un día específico
   *
   * Esta función encapsula getExpectedHoursForDay + getEmployeeEntryTime
   * y retorna un objeto unificado con toda la información necesaria.
   *
   * @param employeeId - ID del empleado
   * @param date - Fecha a consultar (default: hoy)
   * @returns DaySchedule con toda la información del día
   *
   * @example
   * const schedule = await ScheduleService.getScheduleForDate(employeeId, new Date());
   * if (schedule.isWorkingDay) {
   *   console.log(`Debe entrar a las ${schedule.expectedEntryTime}`);
   * }
   */
  static async getScheduleForDate(employeeId: string, date: Date = new Date()): Promise<DaySchedule> {
    // Ejecutar ambas consultas en paralelo (optimización)
    const [dayInfo, entryTime] = await Promise.all([
      getExpectedHoursForDay(employeeId, date),
      getEmployeeEntryTime(employeeId, date),
    ]);

    // Calcular hora de salida esperada desde las horas y hora de entrada
    let expectedExitTime: string | null = null;
    if (entryTime && dayInfo.hoursExpected > 0) {
      expectedExitTime = this.calculateExpectedExitTime(entryTime, dayInfo.hoursExpected);
    }

    return {
      hoursExpected: dayInfo.hoursExpected,
      isWorkingDay: dayInfo.isWorkingDay,
      isHoliday: dayInfo.isHoliday,
      holidayName: dayInfo.holidayName,
      hasActiveContract: dayInfo.hasActiveContract,
      expectedEntryTime: entryTime,
      expectedExitTime,
      breakStart: null, // TODO: Implementar cuando tengamos break times en admin-time-tracking
      breakEnd: null,
      period: {
        type: "REGULAR", // TODO: Detectar si es intensivo según fecha
        weeklyHours: dayInfo.hoursExpected * 5, // Estimación
      },
    };
  }

  /**
   * Verifica si el empleado debería estar trabajando en una fecha
   *
   * @param employeeId - ID del empleado
   * @param date - Fecha a verificar (default: hoy)
   * @returns true si es día laborable y no festivo
   *
   * @example
   * if (await ScheduleService.shouldBeWorking(employeeId)) {
   *   // Enviar aviso de "no ha fichado"
   * }
   */
  static async shouldBeWorking(employeeId: string, date: Date = new Date()): Promise<boolean> {
    const schedule = await this.getScheduleForDate(employeeId, date);
    return schedule.isWorkingDay && !schedule.isHoliday && schedule.hasActiveContract;
  }

  /**
   * Obtiene la ventana de tolerancia para fichaje de entrada
   *
   * @param employeeId - ID del empleado
   * @param date - Fecha a consultar (default: hoy)
   * @param toleranceMinutes - Tolerancia en minutos (default: 15)
   * @returns ClockInWindow o null si no tiene hora de entrada definida
   *
   * @example
   * const window = await ScheduleService.getClockInWindow(employeeId);
   * if (window) {
   *   console.log(`Ventana de fichaje: ${window.earliest} - ${window.latest}`);
   * }
   */
  static async getClockInWindow(
    employeeId: string,
    date: Date = new Date(),
    toleranceMinutes = 15,
  ): Promise<ClockInWindow | null> {
    const entryTime = await getEmployeeEntryTime(employeeId, date);
    if (!entryTime) return null;

    const [hour, minute] = entryTime.split(":").map(Number);
    const expectedEntry = new Date(date);
    expectedEntry.setHours(hour, minute, 0, 0);

    return {
      earliest: new Date(expectedEntry.getTime() - toleranceMinutes * 60 * 1000),
      expected: expectedEntry,
      latest: new Date(expectedEntry.getTime() + toleranceMinutes * 60 * 1000),
      toleranceMinutes,
    };
  }

  /**
   * Obtiene la ventana de tolerancia para fichaje de salida
   *
   * @param employeeId - ID del empleado
   * @param date - Fecha a consultar (default: hoy)
   * @param toleranceMinutes - Tolerancia en minutos (default: 15)
   * @returns ClockOutWindow o null si no tiene hora de salida definida
   */
  static async getClockOutWindow(
    employeeId: string,
    date: Date = new Date(),
    toleranceMinutes = 15,
  ): Promise<ClockOutWindow | null> {
    const schedule = await this.getScheduleForDate(employeeId, date);
    if (!schedule.expectedExitTime) return null;

    const [hour, minute] = schedule.expectedExitTime.split(":").map(Number);
    const expectedExit = new Date(date);
    expectedExit.setHours(hour, minute, 0, 0);

    return {
      earliest: new Date(expectedExit.getTime() - toleranceMinutes * 60 * 1000),
      expected: expectedExit,
      toleranceMinutes,
    };
  }

  /**
   * Obtiene los periodos de pausa/descanso para un día
   *
   * TODO: Implementar cuando tengamos break times en el modelo
   *
   * @param employeeId - ID del empleado
   * @param date - Fecha a consultar (default: hoy)
   * @returns Array de periodos de pausa
   */
  static async getBreakTimes(employeeId: string, date: Date = new Date()): Promise<BreakPeriod[]> {
    const schedule = await this.getScheduleForDate(employeeId, date);

    if (!schedule.breakStart || !schedule.breakEnd) {
      return [];
    }

    const durationMinutes = this.calculateMinutesBetween(schedule.breakStart, schedule.breakEnd);

    return [
      {
        startTime: schedule.breakStart,
        endTime: schedule.breakEnd,
        durationMinutes,
      },
    ];
  }

  /**
   * Calcula el compliance de un día (horas trabajadas vs. esperadas)
   *
   * @param hoursExpected - Horas esperadas
   * @param hoursWorked - Horas trabajadas
   * @param options - Opciones de cálculo
   * @returns DayCompliance con estado y porcentaje
   *
   * @example
   * const compliance = ScheduleService.calculateCompliance(8, 7.5);
   * console.log(compliance.status); // "INCOMPLETE"
   * console.log(compliance.compliance); // 93.75
   */
  static calculateCompliance(
    hoursExpected: number,
    hoursWorked: number,
    options: ComplianceOptions = {},
  ): Pick<DayCompliance, "compliance" | "status"> {
    const { completeThreshold = 95, incompleteThreshold = 70 } = options;

    const compliance = hoursExpected > 0 ? (hoursWorked / hoursExpected) * 100 : 0;

    let status: DayCompliance["status"];
    if (compliance >= completeThreshold) {
      status = "COMPLETED";
    } else if (compliance >= incompleteThreshold) {
      status = "INCOMPLETE";
    } else {
      status = "ABSENT";
    }

    return {
      compliance: Math.round(compliance * 100) / 100,
      status,
    };
  }

  /**
   * Valida un fichaje de entrada
   *
   * @param employeeId - ID del empleado
   * @param clockTime - Hora de fichaje
   * @param date - Fecha del fichaje
   * @param options - Opciones de validación
   * @returns ClockValidationResult
   *
   * @example
   * const result = await ScheduleService.validateClockIn(employeeId, new Date());
   * if (!result.isValid) {
   *   console.log(result.message); // "Llegaste 20 minutos tarde"
   * }
   */
  static async validateClockIn(
    employeeId: string,
    clockTime: Date,
    date: Date = new Date(),
    options: ComplianceOptions = {},
  ): Promise<ClockValidationResult> {
    const { absenceMarginMinutes = 15 } = options;

    const window = await this.getClockInWindow(employeeId, date, absenceMarginMinutes);

    if (!window) {
      // No tiene hora de entrada definida (FLEXIBLE sin franjas)
      return {
        isValid: true,
        isOutsideWindow: false,
        isAbsent: false,
        differenceMinutes: 0,
      };
    }

    const differenceMinutes = Math.round((clockTime.getTime() - window.expected.getTime()) / (60 * 1000));
    const isOutsideWindow = clockTime < window.earliest || clockTime > window.latest;
    const isAbsent = clockTime > window.latest;

    return {
      isValid: !isOutsideWindow,
      message: isOutsideWindow
        ? differenceMinutes > 0
          ? `Llegaste ${differenceMinutes} minutos tarde`
          : `Llegaste ${Math.abs(differenceMinutes)} minutos temprano`
        : undefined,
      isOutsideWindow,
      isAbsent,
      differenceMinutes,
    };
  }

  /**
   * Valida un fichaje de salida
   *
   * @param employeeId - ID del empleado
   * @param clockTime - Hora de fichaje
   * @param date - Fecha del fichaje
   * @returns ClockValidationResult
   */
  static async validateClockOut(
    employeeId: string,
    clockTime: Date,
    date: Date = new Date(),
  ): Promise<ClockValidationResult> {
    const window = await this.getClockOutWindow(employeeId, date);

    if (!window) {
      // No tiene hora de salida definida
      return {
        isValid: true,
        isOutsideWindow: false,
        isAbsent: false,
        differenceMinutes: 0,
      };
    }

    const differenceMinutes = Math.round((clockTime.getTime() - window.expected.getTime()) / (60 * 1000));
    const isOutsideWindow = clockTime < window.earliest;

    return {
      isValid: !isOutsideWindow,
      message: isOutsideWindow ? `Saliste ${Math.abs(differenceMinutes)} minutos antes de tiempo` : undefined,
      isOutsideWindow,
      isAbsent: false, // No aplica para salida
      differenceMinutes,
    };
  }

  // ============================================================================
  // UTILIDADES PRIVADAS
  // ============================================================================

  /**
   * Calcula la hora de salida esperada desde hora de entrada + horas a trabajar
   *
   * @private
   * @param entryTime - Hora de entrada (formato "HH:MM")
   * @param hoursToWork - Horas a trabajar
   * @returns Hora de salida esperada (formato "HH:MM")
   */
  private static calculateExpectedExitTime(entryTime: string, hoursToWork: number): string {
    const [hour, minute] = entryTime.split(":").map(Number);
    const entryMinutes = hour * 60 + minute;
    const exitMinutes = entryMinutes + hoursToWork * 60;

    const exitHour = Math.floor(exitMinutes / 60) % 24;
    const exitMinute = Math.floor(exitMinutes % 60);

    return `${String(exitHour).padStart(2, "0")}:${String(exitMinute).padStart(2, "0")}`;
  }

  /**
   * Calcula minutos entre dos horas
   *
   * @private
   * @param startTime - Hora de inicio (formato "HH:MM")
   * @param endTime - Hora de fin (formato "HH:MM")
   * @returns Minutos entre las dos horas
   */
  private static calculateMinutesBetween(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }
}
