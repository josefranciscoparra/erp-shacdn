/**
 * Helpers para el Sistema de Balance de PTO en Minutos (SERVIDOR)
 *
 * Este archivo contiene funciones auxiliares que usan Prisma y solo se
 * pueden ejecutar en el servidor (server actions, API routes, etc).
 *
 * Para funciones que se pueden usar en el cliente, ver pto-helpers-client.ts
 */

import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";

// Re-exportar funciones de cliente para compatibilidad con código existente del servidor
export { formatMinutes, daysToMinutes, minutesToDays, applyCompensationFactor } from "./pto-helpers-client";

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
 * Convierte días (Decimal de Prisma) a minutos (Int)
 * Versión del servidor que acepta Decimal de Prisma
 *
 * @param days - Cantidad de días (puede ser Decimal o number)
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns Cantidad de minutos (Int)
 */
export function daysToMinutesDecimal(days: Decimal | number, workdayMinutes: number = 480): number {
  const daysAsNumber = typeof days === "number" ? days : Number(days);
  return Math.round(daysAsNumber * workdayMinutes);
}

/**
 * Convierte minutos (Int) a días (Decimal de Prisma)
 * Versión del servidor que retorna Decimal de Prisma
 *
 * @param minutes - Cantidad de minutos
 * @param workdayMinutes - Minutos de una jornada laboral (por defecto 480 = 8h)
 * @returns Cantidad de días (Decimal)
 */
export function minutesToDaysDecimal(minutes: number, workdayMinutes: number = 480): Decimal {
  const days = minutes / workdayMinutes;
  return new Decimal(days);
}

/**
 * Calcula los minutos efectivos aplicando factor de compensación (Decimal de Prisma)
 * Versión del servidor que acepta Decimal de Prisma
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
export function applyCompensationFactorDecimal(minutes: number, compensationFactor: Decimal | number): number {
  const factor = typeof compensationFactor === "number" ? compensationFactor : Number(compensationFactor);
  return Math.round(minutes * factor);
}
