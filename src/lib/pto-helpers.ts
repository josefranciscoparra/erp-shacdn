/**
 * Helpers para el Sistema de Balance de PTO en Minutos
 *
 * Este archivo contiene funciones auxiliares para trabajar con minutos
 * en el sistema de gestión de ausencias y balance de vacaciones.
 */

import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";

/**
 * Obtiene los minutos de jornada laboral de un empleado
 *
 * Prioridad:
 * 1. workdayMinutes del contrato (si está explícitamente configurado)
 * 2. Calcular desde ScheduleTemplate (si tiene horarios configurados) [FUTURO - Sprint 5]
 * 3. Calcular desde weeklyHours: (weeklyHours / workingDaysPerWeek) × 60
 *
 * @param employeeId - ID del empleado
 * @param orgId - ID de la organización
 * @returns Minutos de jornada laboral (ej: 480 para 8h)
 * @throws Error si no se encuentra contrato activo
 */
export async function getWorkdayMinutes(employeeId: string, orgId: string): Promise<number> {
  // Buscar contrato activo del empleado
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
      weeklyHours: {
        gt: new Decimal(0),
      },
    },
    include: {
      // 🆕 FUTURO (Sprint 5): Incluir schedule assignments
      // employeeScheduleAssignments: {
      //   where: { active: true },
      //   include: {
      //     scheduleTemplate: true,
      //   },
      //   take: 1,
      // },
    },
  });

  if (!contract) {
    throw new Error("No se encontró un contrato activo para el empleado");
  }

  // Prioridad 1: workdayMinutes explícito
  if (contract.workdayMinutes !== null) {
    return contract.workdayMinutes;
  }

  // Prioridad 2: Calcular desde ScheduleTemplate
  // 🆕 FUTURO (Sprint 5): Implementar cálculo desde horarios
  // const scheduleAssignment = contract.employeeScheduleAssignments?.[0];
  // if (scheduleAssignment?.scheduleTemplate) {
  //   const calculatedMinutes = calculateMinutesFromSchedule(scheduleAssignment.scheduleTemplate);
  //   return calculatedMinutes;
  // }

  // Prioridad 3: Calcular desde weeklyHours / workingDaysPerWeek
  const weeklyHours = Number(contract.weeklyHours);
  const workingDaysPerWeek = contract.workingDaysPerWeek;

  if (workingDaysPerWeek <= 0) {
    throw new Error("workingDaysPerWeek debe ser mayor a 0");
  }

  const dailyHours = weeklyHours / workingDaysPerWeek;
  const dailyMinutes = Math.round(dailyHours * 60);

  return dailyMinutes;
}

/**
 * Formatea minutos a formato legible (días, horas, minutos)
 *
 * Ejemplos:
 * - 480 minutos → "1 día"
 * - 240 minutos → "4h"
 * - 540 minutos → "1 día 1h"
 * - 570 minutos → "1 día 1h 30m"
 * - 90 minutos → "1h 30m"
 * - 30 minutos → "30m"
 *
 * @param minutes - Cantidad de minutos
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns String formateado
 */
export function formatMinutes(minutes: number, workdayMinutes: number = 480): string {
  if (minutes === 0) return "0m";

  const days = Math.floor(minutes / workdayMinutes);
  const remainingMinutes = minutes % workdayMinutes;
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(days === 1 ? "1 día" : `${days} días`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (mins > 0) {
    parts.push(`${mins}m`);
  }

  return parts.join(" ");
}

/**
 * Convierte días (Decimal) a minutos (Int)
 *
 * @param days - Cantidad de días (puede ser Decimal o number)
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns Cantidad de minutos (Int)
 */
export function daysToMinutes(days: Decimal | number, workdayMinutes: number = 480): number {
  const daysAsNumber = typeof days === "number" ? days : Number(days);
  return Math.round(daysAsNumber * workdayMinutes);
}

/**
 * Convierte minutos (Int) a días (Decimal)
 *
 * @param minutes - Cantidad de minutos
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns Cantidad de días (Decimal)
 */
export function minutesToDays(minutes: number, workdayMinutes: number = 480): Decimal {
  const days = minutes / workdayMinutes;
  return new Decimal(days);
}

/**
 * Calcula los minutos efectivos aplicando factor de compensación
 *
 * Ejemplos:
 * - 480 min × 1.0 = 480 min (vacaciones normales)
 * - 480 min × 1.5 = 720 min (turno nocturno)
 * - 480 min × 1.75 = 840 min (festivo trabajado)
 *
 * @param minutes - Minutos base
 * @param compensationFactor - Factor de compensación (Decimal o number)
 * @returns Minutos efectivos (Int)
 */
export function applyCompensationFactor(minutes: number, compensationFactor: Decimal | number): number {
  const factor = typeof compensationFactor === "number" ? compensationFactor : Number(compensationFactor);
  return Math.round(minutes * factor);
}
